import test from "node:test";
import assert from "node:assert/strict";

import {
  urlBase64ToUint8Array,
  isPushSupported,
  isIosNeedingInstall,
  getPermissionState,
  enablePush,
  disablePush,
  syncSubscription,
} from "../src/lib/push.js";
import { formatPushError } from "../src/hooks/useNotifications.js";
import supabase from "../src/lib/supabase.js";

// Helper to create valid 65-byte uncompressed EC public key in base64url format
function createValidVapidKey() {
  const bytes = new Uint8Array(65);
  bytes[0] = 0x04; // Uncompressed EC point format header
  for (let i = 1; i < 65; i++) {
    bytes[i] = (i * 7) % 256;
  }
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = globalThis.btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function mockPushGlobals({
  hasWindow = true,
  hasNavigator = true,
  hasServiceWorker = true,
  hasPushManager = true,
  hasNotification = true,
  permission = "granted",
  userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
  isStandalone = false,
  pushSubscription = null,
} = {}) {
  const origWin = Object.getOwnPropertyDescriptor(globalThis, "window");
  const origNav = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const origNotif = Object.getOwnPropertyDescriptor(globalThis, "Notification");

  function MockNotification(title, options) {
    this.title = title;
    this.options = options;
  }
  MockNotification.permission = permission;
  MockNotification.requestPermission = () => Promise.resolve(permission);

  const mockPushManager = {
    getSubscription: () => Promise.resolve(pushSubscription),
    subscribe: ({ applicationServerKey }) => {
      if (!applicationServerKey) {
        return Promise.reject(new Error("Missing applicationServerKey"));
      }
      const mockSub = {
        endpoint: "https://push.example.com/subscriptions/sub_123",
        toJSON: () => ({
          endpoint: "https://push.example.com/subscriptions/sub_123",
          keys: { p256dh: "p256dh_key_abc", auth: "auth_token_xyz" },
        }),
        unsubscribe: () => Promise.resolve(true),
      };
      return Promise.resolve(mockSub);
    },
  };

  const mockRegistration = {
    scope: "/",
    active: true,
    update: () => Promise.resolve(),
    pushManager: mockPushManager,
  };

  const mockServiceWorker = {
    register: () => Promise.resolve(mockRegistration),
    ready: Promise.resolve(mockRegistration),
    getRegistration: () => Promise.resolve(mockRegistration),
  };

  const mockNav = {};
  if (hasNavigator) {
    mockNav.userAgent = userAgent;
    mockNav.standalone = isStandalone;
    if (hasServiceWorker) {
      mockNav.serviceWorker = mockServiceWorker;
    }
  }

  const mockWin = {};
  if (hasWindow) {
    mockWin.navigator = mockNav;
    mockWin.MSStream = undefined;
    mockWin.matchMedia = (query) => ({
      matches: query.includes("standalone") ? isStandalone : false,
    });
    if (hasNotification) {
      mockWin.Notification = MockNotification;
    }
    if (hasPushManager) {
      mockWin.PushManager = function PushManager() {};
    }
  }

  if (hasWindow) {
    Object.defineProperty(globalThis, "window", { value: mockWin, configurable: true, writable: true });
  } else {
    delete globalThis.window;
  }

  if (hasNavigator) {
    Object.defineProperty(globalThis, "navigator", { value: mockNav, configurable: true, writable: true });
  } else {
    delete globalThis.navigator;
  }

  if (hasNotification) {
    Object.defineProperty(globalThis, "Notification", { value: MockNotification, configurable: true, writable: true });
  } else {
    delete globalThis.Notification;
  }

  return () => {
    if (origWin) Object.defineProperty(globalThis, "window", origWin);
    else delete globalThis.window;

    if (origNav) Object.defineProperty(globalThis, "navigator", origNav);
    else delete globalThis.navigator;

    if (origNotif) Object.defineProperty(globalThis, "Notification", origNotif);
    else delete globalThis.Notification;
  };
}

test("urlBase64ToUint8Array validates input and converts valid base64url keys", () => {
  // Invalid or missing inputs throw VAPID_KEY_MISSING
  for (const badVal of [null, undefined, "", "   ", 123, {}]) {
    assert.throws(
      () => urlBase64ToUint8Array(badVal),
      { message: "VAPID_KEY_MISSING" }
    );
  }

  // Malformed base64 strings throw VAPID_KEY_INVALID
  assert.throws(
    () => urlBase64ToUint8Array("!!!invalid-base64-content!!!"),
    { message: "VAPID_KEY_INVALID" }
  );

  // Valid base64url VAPID key converts to Uint8Array accurately
  const validKey = createValidVapidKey();
  const bytes = urlBase64ToUint8Array(validKey);
  assert.ok(bytes instanceof Uint8Array);
  assert.strictEqual(bytes.length, 65);
  assert.strictEqual(bytes[0], 0x04);
});

test("isPushSupported evaluates browser Web Push capabilities accurately", () => {
  // All APIs present -> supported
  const cleanup1 = mockPushGlobals();
  assert.strictEqual(isPushSupported(), true);
  cleanup1();

  // Missing window -> unsupported
  const cleanup2 = mockPushGlobals({ hasWindow: false });
  assert.strictEqual(isPushSupported(), false);
  cleanup2();

  // Missing serviceWorker -> unsupported
  const cleanup3 = mockPushGlobals({ hasServiceWorker: false });
  assert.strictEqual(isPushSupported(), false);
  cleanup3();

  // Missing PushManager -> unsupported
  const cleanup4 = mockPushGlobals({ hasPushManager: false });
  assert.strictEqual(isPushSupported(), false);
  cleanup4();

  // Missing Notification -> unsupported
  const cleanup5 = mockPushGlobals({ hasNotification: false });
  assert.strictEqual(isPushSupported(), false);
  cleanup5();
});

test("isIosNeedingInstall and getPermissionState handle iOS browser vs PWA standalone mode", () => {
  const iosUserAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

  // iOS Safari in browser mode (not standalone) -> isIosNeedingInstall is true, permission is 'ios-install-needed'
  const cleanup1 = mockPushGlobals({
    userAgent: iosUserAgent,
    hasPushManager: false, // iOS Safari in browser mode lacks PushManager
    isStandalone: false,
  });
  assert.strictEqual(isIosNeedingInstall(), true);
  assert.strictEqual(getPermissionState(), "ios-install-needed");
  cleanup1();

  // iOS in standalone PWA mode with push support -> permission returns Notification.permission
  const cleanup2 = mockPushGlobals({
    userAgent: iosUserAgent,
    hasPushManager: true,
    isStandalone: true,
    permission: "granted",
  });
  assert.strictEqual(isIosNeedingInstall(), false);
  assert.strictEqual(getPermissionState(), "granted");
  cleanup2();

  // Desktop browser without push support -> getPermissionState returns 'unsupported'
  const cleanup3 = mockPushGlobals({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    hasPushManager: false,
  });
  assert.strictEqual(isIosNeedingInstall(), false);
  assert.strictEqual(getPermissionState(), "unsupported");
  cleanup3();
});

test("formatPushError maps error codes and handles fallback messages", () => {
  assert.strictEqual(formatPushError("UNSUPPORTED"), "This browser doesn't support push notifications.");
  assert.strictEqual(
    formatPushError("PERMISSION_DENIED"),
    "Notifications are blocked. Click the padlock in the address bar and set Notifications to Allow."
  );
  assert.strictEqual(formatPushError("PERMISSION_DEFAULT"), "Notification permission was not granted.");
  assert.strictEqual(formatPushError("SW_NOT_ACTIVE"), "The notification service didn't start. Refresh the page and try again.");
  assert.strictEqual(formatPushError("VAPID_KEY_MISSING"), "Notifications are misconfigured. Please contact support.");
  assert.strictEqual(formatPushError("VAPID_KEY_INVALID"), "Notifications are misconfigured. Please contact support.");
  assert.ok(formatPushError("PUSH_AbortError").includes("Your browser couldn't reach its push service"));

  // Error object with message property
  assert.strictEqual(formatPushError(new Error("UNSUPPORTED")), "This browser doesn't support push notifications.");

  // Unknown error fallback
  const fallback = formatPushError(new Error("UNKNOWN_FAIL"));
  assert.ok(typeof fallback === "string" && fallback.length > 0);
});

test("enablePush enforces userId, permission granted, VAPID key validity, and saves subscription to DB", async () => {
  const origEnvKey = globalThis.process.env.VITE_VAPID_PUBLIC_KEY;

  try {
    // 1. Missing userId -> throws Error
    await assert.rejects(
      async () => enablePush(null),
      { message: "User ID is required to enable push notifications" }
    );

    // 2. Unsupported push environment -> throws UNSUPPORTED
    const cleanupUnsupported = mockPushGlobals({ hasPushManager: false });
    await assert.rejects(
      async () => enablePush("user_123"),
      { message: "UNSUPPORTED" }
    );
    cleanupUnsupported();

    // 3. Permission denied -> throws PERMISSION_DENIED
    const cleanupDenied = mockPushGlobals({ permission: "denied" });
    await assert.rejects(
      async () => enablePush("user_123"),
      { message: "PERMISSION_DENIED" }
    );
    cleanupDenied();

    // 4. Missing VAPID key in env var -> throws VAPID_KEY_MISSING
    const cleanupGranted = mockPushGlobals({ permission: "granted" });
    globalThis.process.env.VITE_VAPID_PUBLIC_KEY = "";

    await assert.rejects(
      async () => enablePush("user_123"),
      { message: "VAPID_KEY_MISSING" }
    );

    // 5. Invalid VAPID key byte length -> throws VAPID_KEY_INVALID
    globalThis.process.env.VITE_VAPID_PUBLIC_KEY = globalThis.btoa("short_key");
    await assert.rejects(
      async () => enablePush("user_123"),
      { message: "VAPID_KEY_INVALID" }
    );

    // 6. Valid VAPID key -> subscribes pushManager and upserts into push_subscriptions and notification_preferences
    const validVapid = createValidVapidKey();
    globalThis.process.env.VITE_VAPID_PUBLIC_KEY = validVapid;

    const upsertedTables = [];
    const originalFrom = supabase.from;

    supabase.from = (table) => {
      upsertedTables.push(table);
      return {
        upsert: () => Promise.resolve({ error: null }),
      };
    };

    try {
      const sub = await enablePush("user_123");
      assert.ok(sub);
      assert.strictEqual(sub.endpoint, "https://push.example.com/subscriptions/sub_123");
      assert.ok(upsertedTables.includes("push_subscriptions"));
      assert.ok(upsertedTables.includes("notification_preferences"));
    } finally {
      supabase.from = originalFrom;
      cleanupGranted();
    }
  } finally {
    globalThis.process.env.VITE_VAPID_PUBLIC_KEY = origEnvKey;
  }
});

test("disablePush unsubscribes active subscription, deletes from DB, and updates preferences", async () => {
  // Missing userId -> early return no-op
  await disablePush(null);

  let deletedTable = null;
  let deletedEndpoint = null;
  let prefUpdated = false;

  const mockSub = {
    endpoint: "https://push.example.com/subscriptions/sub_123",
    unsubscribe: () => Promise.resolve(true),
  };

  const cleanup = mockPushGlobals({ permission: "granted", pushSubscription: mockSub });
  const originalFrom = supabase.from;

  supabase.from = (table) => {
    if (table === "push_subscriptions") {
      return {
        delete: () => ({
          eq: (col, val) => {
            deletedTable = table;
            deletedEndpoint = val;
            return Promise.resolve({ error: null });
          },
        }),
      };
    }
    if (table === "notification_preferences") {
      return {
        upsert: (payload) => {
          if (payload.push_enabled === false) prefUpdated = true;
          return Promise.resolve({ error: null });
        },
      };
    }
    return originalFrom(table);
  };

  try {
    await disablePush("user_456");
    assert.strictEqual(deletedTable, "push_subscriptions");
    assert.strictEqual(deletedEndpoint, "https://push.example.com/subscriptions/sub_123");
    assert.strictEqual(prefUpdated, true);
  } finally {
    supabase.from = originalFrom;
    cleanup();
  }
});

test("syncSubscription auto-subscribes when no active subscription exists but valid VAPID key is provided", async () => {
  // Missing userId or ungranted permission -> early return
  await syncSubscription(null);

  const origEnvKey = globalThis.process.env.VITE_VAPID_PUBLIC_KEY;
  const validVapid = createValidVapidKey();
  globalThis.process.env.VITE_VAPID_PUBLIC_KEY = validVapid;

  const cleanup = mockPushGlobals({ permission: "granted", pushSubscription: null });
  const upsertedTables = [];
  const originalFrom = supabase.from;

  supabase.from = (table) => {
    upsertedTables.push(table);
    return {
      upsert: () => Promise.resolve({ error: null }),
    };
  };

  try {
    await syncSubscription("user_789");
    assert.ok(upsertedTables.includes("push_subscriptions"));
  } finally {
    supabase.from = originalFrom;
    globalThis.process.env.VITE_VAPID_PUBLIC_KEY = origEnvKey;
    cleanup();
  }
});
