import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveSessionDateTime,
  normalizeNotificationPreferences,
  isQuietHoursActive,
  getStoredNotifications,
  writeNotification,
  recordNotification,
  markAllNotificationsRead,
  dismissNotification,
  hasActivePushSubscription,
  scheduleStudyReminder,
  requestBrowserNotificationPermission,
  getNotificationPreferences,
  NOTIFICATION_STORAGE_KEY,
} from "../src/lib/notifications.js";
import { formatPushError } from "../src/hooks/useNotifications.js";

// Setup mock localStorage
function setupMockLocalStorage() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
  return store;
}

// Setup browser globals helper
function setupMockBrowserGlobals({ permission = "default", pushSubscription = null } = {}) {
  const store = new Map();
  const mockStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };

  const mockNotification = function () {};
  mockNotification.permission = permission;
  mockNotification.requestPermission = async () => permission;

  globalThis.window = globalThis;
  globalThis.localStorage = mockStorage;
  globalThis.Notification = mockNotification;

  Object.defineProperty(globalThis, "navigator", {
    value: {
      serviceWorker: {
        ready: Promise.resolve({
          pushManager: {
            getSubscription: async () => pushSubscription,
          },
          showNotification: async () => {},
        }),
      },
    },
    writable: true,
    configurable: true,
  });

  return {
    cleanup() {
      delete globalThis.window;
      delete globalThis.Notification;
      delete globalThis.localStorage;
    },
  };
}

// --- 1. resolveSessionDateTime tests ---
test("resolveSessionDateTime correctly parses string dates (YYYY-MM-DD) and start times", () => {
  const session = {
    date: "2026-05-10",
    startTime: "14:30",
  };
  const resolved = resolveSessionDateTime(session);
  assert.ok(resolved instanceof Date);
  assert.strictEqual(resolved.getFullYear(), 2026);
  assert.strictEqual(resolved.getMonth(), 4); // May (0-indexed)
  assert.strictEqual(resolved.getDate(), 10);
  assert.strictEqual(resolved.getHours(), 14);
  assert.strictEqual(resolved.getMinutes(), 30);
});

test("resolveSessionDateTime correctly handles Date object inputs and alternative field names (Date, Start)", () => {
  const session = {
    Date: new Date("2026-08-15T00:00:00Z"),
    Start: "10:15",
  };
  const resolved = resolveSessionDateTime(session);
  assert.ok(resolved instanceof Date);
  assert.strictEqual(resolved.getHours(), 10);
  assert.strictEqual(resolved.getMinutes(), 15);
});

test("resolveSessionDateTime falls back to default 09:00 when time is missing or invalid", () => {
  const session = { date: "2026-06-01" };
  const resolved = resolveSessionDateTime(session);
  assert.strictEqual(resolved.getHours(), 9);
  assert.strictEqual(resolved.getMinutes(), 0);
});

test("resolveSessionDateTime returns null for invalid or missing session dates", () => {
  assert.strictEqual(resolveSessionDateTime(null), null);
  assert.strictEqual(resolveSessionDateTime({ date: "not-a-valid-date" }), null);
});

// --- 2. Notification Preferences & Storage Normalization ---
test("normalizeNotificationPreferences fills missing defaults and nested quiet hours", () => {
  const partial = {
    studyReminders: false,
    quietHours: { start: "23:00" },
  };
  const normalized = normalizeNotificationPreferences(partial);
  assert.strictEqual(normalized.studyReminders, false);
  assert.strictEqual(normalized.browserPush, true); // default preserved
  assert.strictEqual(normalized.quietHours.start, "23:00");
  assert.strictEqual(normalized.quietHours.end, "08:00"); // default preserved
});

test("getNotificationPreferences recovers cleanly from corrupted JSON in localStorage", () => {
  setupMockLocalStorage();
  localStorage.setItem("hyper-tutor-notification-preferences", "corrupted{{json");

  const prefs = getNotificationPreferences();
  assert.strictEqual(prefs.browserPush, true);
  assert.strictEqual(localStorage.getItem("hyper-tutor-notification-preferences"), null); // cleared
});

test("getNotificationPreferences clears key when shape is invalid non-object", () => {
  setupMockLocalStorage();
  localStorage.setItem("hyper-tutor-notification-preferences", JSON.stringify("string-payload"));

  const prefs = getNotificationPreferences();
  assert.strictEqual(prefs.browserPush, true);
  assert.strictEqual(localStorage.getItem("hyper-tutor-notification-preferences"), null);
});

// --- 3. Quiet Hours Detection ---
test("isQuietHoursActive identifies active times across midnight boundaries (22:00 - 08:00)", () => {
  const quietHours = { enabled: true, start: "22:00", end: "08:00" };

  const nightTime = new Date("2026-05-10T23:30:00");
  assert.strictEqual(isQuietHoursActive(quietHours, nightTime), true);

  const earlyMorning = new Date("2026-05-10T03:15:00");
  assert.strictEqual(isQuietHoursActive(quietHours, earlyMorning), true);

  const exactStart = new Date("2026-05-10T22:00:00");
  assert.strictEqual(isQuietHoursActive(quietHours, exactStart), true);

  const exactEnd = new Date("2026-05-10T08:00:00");
  assert.strictEqual(isQuietHoursActive(quietHours, exactEnd), false);

  const midDay = new Date("2026-05-10T14:00:00");
  assert.strictEqual(isQuietHoursActive(quietHours, midDay), false);
});

test("isQuietHoursActive identifies daytime interval quiet hours (13:00 - 15:00)", () => {
  const quietHours = { enabled: true, start: "13:00", end: "15:00" };

  const inside = new Date("2026-05-10T14:00:00");
  assert.strictEqual(isQuietHoursActive(quietHours, inside), true);

  const outside = new Date("2026-05-10T16:00:00");
  assert.strictEqual(isQuietHoursActive(quietHours, outside), false);
});

test("isQuietHoursActive returns false when disabled or start equals end", () => {
  const disabled = { enabled: false, start: "22:00", end: "08:00" };
  const equal = { enabled: true, start: "10:00", end: "10:00" };
  const testDate = new Date("2026-05-10T23:00:00");

  assert.strictEqual(isQuietHoursActive(disabled, testDate), false);
  assert.strictEqual(isQuietHoursActive(equal, testDate), false);
});

// --- 4. Storage & Writing Notifications ---
test("writeNotification prepends notification and caps storage at 25 items", () => {
  setupMockLocalStorage();

  for (let i = 1; i <= 30; i++) {
    writeNotification({ title: `Notification ${i}` });
  }

  const stored = getStoredNotifications();
  assert.strictEqual(stored.length, 25);
  assert.strictEqual(stored[0].title, "Notification 30"); // newest first
  assert.strictEqual(stored[24].title, "Notification 6"); // oldest preserved
});

test("recordNotification sets muted: true when quiet hours are active", () => {
  setupMockLocalStorage();
  const preferences = {
    quietHours: { enabled: true, start: "22:00", end: "08:00" },
  };

  const quietTime = new Date("2026-05-10T23:00:00");
  recordNotification({ title: "Late Study Alert" }, preferences, quietTime);

  const stored = getStoredNotifications();
  assert.strictEqual(stored.length, 1);
  assert.strictEqual(stored[0].muted, true);
});

test("getStoredNotifications handles corrupted JSON and invalid shapes safely", () => {
  setupMockLocalStorage();
  localStorage.setItem(NOTIFICATION_STORAGE_KEY, "invalid-json{{");

  assert.deepEqual(getStoredNotifications(), []);
  assert.strictEqual(localStorage.getItem(NOTIFICATION_STORAGE_KEY), null);

  localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify({ notAnArray: true }));
  assert.deepEqual(getStoredNotifications(), []);
  assert.strictEqual(localStorage.getItem(NOTIFICATION_STORAGE_KEY), null);
});

// --- 5. Notification Read & Dismiss Actions ---
test("markAllNotificationsRead and dismissNotification update stored state correctly", () => {
  setupMockLocalStorage();
  const n1 = writeNotification({ title: "First" });
  const n2 = writeNotification({ title: "Second" });

  assert.strictEqual(getStoredNotifications().some((n) => n.read), false);

  markAllNotificationsRead();
  const afterRead = getStoredNotifications();
  assert.strictEqual(afterRead.length, 2);
  assert.ok(afterRead.every((n) => n.read === true));

  dismissNotification(n1.id);
  const afterDismiss = getStoredNotifications();
  assert.strictEqual(afterDismiss.length, 1);
  assert.strictEqual(afterDismiss[0].id, n2.id);
});

// --- 6. Push Subscription & In-Tab Reminder Scheduling ---
test("hasActivePushSubscription correctly checks serviceWorker push subscription", async () => {
  // Test when window/navigator is missing
  const { cleanup } = setupMockBrowserGlobals({ pushSubscription: null });
  cleanup();

  assert.strictEqual(await hasActivePushSubscription(), false);

  // Test active push subscription present
  const mock = setupMockBrowserGlobals({
    pushSubscription: { endpoint: "https://push.example.com" },
  });
  assert.strictEqual(await hasActivePushSubscription(), true);
  mock.cleanup();
});

test("scheduleStudyReminder suppresses in-tab timer when Web Push subscription is active", async () => {
  const mock = setupMockBrowserGlobals({
    permission: "granted",
    pushSubscription: { endpoint: "https://push.example.com" },
  });

  const session = {
    id: "sess_100",
    date: "2099-01-01",
    startTime: "10:00",
    reminder: 15,
  };

  const timer = await scheduleStudyReminder(session);
  assert.strictEqual(timer, null); // Suppressed to avoid duplicate notification!
  mock.cleanup();
});

test("scheduleStudyReminder returns null for past session times or missing permissions", async () => {
  // Missing Notification permission
  const mockNoPerm = setupMockBrowserGlobals({ permission: "denied" });
  assert.strictEqual(await scheduleStudyReminder({ id: "s1", date: "2099-01-01" }), null);
  mockNoPerm.cleanup();

  // Granted permission, but past session time
  const mockGranted = setupMockBrowserGlobals({ permission: "granted" });
  const pastSession = {
    id: "sess_past",
    date: "2020-01-01",
    startTime: "10:00",
  };

  assert.strictEqual(await scheduleStudyReminder(pastSession), null);
  mockGranted.cleanup();
});

// --- 7. Browser Notification Permission Check ---
test("requestBrowserNotificationPermission returns unsupported or existing permission", async () => {
  // Unsupported environment (window/Notification missing)
  delete globalThis.window;
  delete globalThis.Notification;
  assert.strictEqual(await requestBrowserNotificationPermission(), "unsupported");

  // Granted permission
  const mockGranted = setupMockBrowserGlobals({ permission: "granted" });
  assert.strictEqual(await requestBrowserNotificationPermission(), "granted");
  mockGranted.cleanup();

  // Denied permission
  const mockDenied = setupMockBrowserGlobals({ permission: "denied" });
  assert.strictEqual(await requestBrowserNotificationPermission(), "denied");
  mockDenied.cleanup();
});

// --- 8. Push Error Formatting ---
test("formatPushError maps standard push error codes to user-facing error messages", () => {
  assert.strictEqual(
    formatPushError("UNSUPPORTED"),
    "This browser doesn't support push notifications."
  );
  assert.strictEqual(
    formatPushError("PERMISSION_DENIED"),
    "Notifications are blocked. Click the padlock in the address bar and set Notifications to Allow."
  );
  assert.strictEqual(
    formatPushError("SW_NOT_ACTIVE"),
    "The notification service didn't start. Refresh the page and try again."
  );
  assert.strictEqual(
    formatPushError("VAPID_KEY_MISSING"),
    "Notifications are misconfigured. Please contact support."
  );
  assert.strictEqual(
    formatPushError("PUSH_AbortError: Network failed"),
    "Your browser couldn't reach its push service. Check your network, VPN or ad-blocker; in Brave, enable Google services for push messaging."
  );
});
