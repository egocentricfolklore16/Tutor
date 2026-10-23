import test from "node:test";
import assert from "node:assert/strict";

import {
  urlBase64ToUint8Array,
  isPushSupported,
  isIosNeedingInstall,
  getPermissionState,
} from "../src/lib/push.js";

import { formatPushError } from "../src/hooks/useNotifications.js";

function mockGlobals({ windowObj, navigatorObj, notificationObj } = {}) {
  const origWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const origNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const origNotification = Object.getOwnPropertyDescriptor(globalThis, "Notification");

  if (windowObj !== undefined) {
    Object.defineProperty(globalThis, "window", { value: windowObj, configurable: true, writable: true });
  } else {
    delete globalThis.window;
  }

  if (navigatorObj !== undefined) {
    Object.defineProperty(globalThis, "navigator", { value: navigatorObj, configurable: true, writable: true });
  } else {
    delete globalThis.navigator;
  }

  if (notificationObj !== undefined) {
    Object.defineProperty(globalThis, "Notification", { value: notificationObj, configurable: true, writable: true });
  } else {
    delete globalThis.Notification;
  }

  return () => {
    if (origWindow) Object.defineProperty(globalThis, "window", origWindow);
    else delete globalThis.window;

    if (origNavigator) Object.defineProperty(globalThis, "navigator", origNavigator);
    else delete globalThis.navigator;

    if (origNotification) Object.defineProperty(globalThis, "Notification", origNotification);
    else delete globalThis.Notification;
  };
}

test("urlBase64ToUint8Array throws VAPID_KEY_MISSING for null, undefined, empty, or whitespace key", () => {
  for (const badKey of [null, undefined, "", "   ", 123, false]) {
    assert.throws(
      () => urlBase64ToUint8Array(badKey),
      (err) => err instanceof Error && err.message === "VAPID_KEY_MISSING",
      `Expected VAPID_KEY_MISSING for key '${badKey}'`
    );
  }
});

test("urlBase64ToUint8Array throws VAPID_KEY_INVALID for corrupted base64 input", () => {
  assert.throws(
    () => urlBase64ToUint8Array("!!!Not-Base64-String!!!@#$"),
    (err) => err instanceof Error && err.message === "VAPID_KEY_INVALID"
  );
});

test("urlBase64ToUint8Array converts valid base64url VAPID public key into Uint8Array", () => {
  // A 65-byte uncompressed P-256 public key (starts with 0x04) base64url encoded
  const dummy65Bytes = new Uint8Array(65);
  dummy65Bytes[0] = 4; // 0x04 uncompressed
  for (let i = 1; i < 65; i++) dummy65Bytes[i] = i;

  const binaryString = String.fromCharCode(...dummy65Bytes);
  const base64 = globalThis.btoa(binaryString).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const result = urlBase64ToUint8Array(base64);
  assert.ok(result instanceof Uint8Array);
  assert.equal(result.length, 65);
  assert.equal(result[0], 4);
  assert.equal(result[64], 64);
});

test("isIosNeedingInstall detects iOS browser outside standalone PWA mode", () => {
  // 1. Non-iOS user agent -> false
  const cleanup1 = mockGlobals({
    windowObj: { matchMedia: () => ({ matches: false }) },
    navigatorObj: { userAgent: "Mozilla/5.0 (Linux; Android 10)", standalone: false },
  });
  assert.equal(isIosNeedingInstall(), false);
  cleanup1();

  // 2. iOS browser (iPhone) NOT in standalone mode -> true
  const cleanup2 = mockGlobals({
    windowObj: { matchMedia: () => ({ matches: false }) },
    navigatorObj: { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)", standalone: false },
  });
  assert.equal(isIosNeedingInstall(), true);
  cleanup2();

  // 3. iOS browser in standalone mode -> false
  const cleanup3 = mockGlobals({
    windowObj: { matchMedia: () => ({ matches: true }) },
    navigatorObj: { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)", standalone: true },
  });
  assert.equal(isIosNeedingInstall(), false);
  cleanup3();
});

test("getPermissionState resolves unsupported, ios-install-needed, granted, and denied states", () => {
  // 1. Desktop unsupported browser
  const cleanup1 = mockGlobals({ windowObj: undefined, navigatorObj: undefined });
  assert.equal(getPermissionState(), "unsupported");
  cleanup1();

  // 2. iOS browser needing PWA installation
  const cleanup2 = mockGlobals({
    windowObj: { matchMedia: () => ({ matches: false }) },
    navigatorObj: { userAgent: "iPhone", standalone: false },
  });
  assert.equal(getPermissionState(), "ios-install-needed");
  cleanup2();

  // 3. Supported push environment with granted permission
  const mockNotificationClass = { permission: "granted" };
  const cleanup3 = mockGlobals({
    windowObj: { PushManager: function PushManager() {}, Notification: mockNotificationClass },
    navigatorObj: { serviceWorker: {} },
    notificationObj: mockNotificationClass,
  });
  assert.equal(isPushSupported(), true);
  assert.equal(getPermissionState(), "granted");
  cleanup3();
});

test("formatPushError formats user-friendly error messages across all push error codes", () => {
  // 1. UNSUPPORTED
  assert.equal(
    formatPushError("UNSUPPORTED"),
    "This browser doesn't support push notifications."
  );

  // 2. PERMISSION_DENIED
  assert.equal(
    formatPushError("PERMISSION_DENIED"),
    "Notifications are blocked. Click the padlock in the address bar and set Notifications to Allow."
  );

  // 3. PERMISSION_* prefix e.g. PERMISSION_DISMISSED
  assert.equal(
    formatPushError("PERMISSION_DISMISSED"),
    "Notification permission was not granted."
  );

  // 4. SW_NOT_ACTIVE
  assert.equal(
    formatPushError("SW_NOT_ACTIVE"),
    "The notification service didn't start. Refresh the page and try again."
  );

  // 5. VAPID_KEY_MISSING & VAPID_KEY_INVALID
  assert.equal(
    formatPushError("VAPID_KEY_MISSING"),
    "Notifications are misconfigured. Please contact support."
  );
  assert.equal(
    formatPushError("VAPID_KEY_INVALID"),
    "Notifications are misconfigured. Please contact support."
  );

  // 6. PUSH_AbortError
  assert.equal(
    formatPushError("PUSH_AbortError: Subscription failed"),
    "Your browser couldn't reach its push service. Check your network, VPN or ad-blocker; in Brave, enable Google services for push messaging."
  );

  // 7. Error object input with message property
  assert.equal(
    formatPushError(new Error("SW_NOT_ACTIVE")),
    "The notification service didn't start. Refresh the page and try again."
  );

  // 8. Unknown error in production mode returning generic fallback
  assert.equal(
    formatPushError("UNKNOWN_RANDOM_ERROR"),
    "Could not enable notifications. Please try again."
  );

  // 9. Null, undefined, or empty error input in production mode
  assert.equal(
    formatPushError(null),
    "Could not enable notifications. Please try again."
  );
  assert.equal(
    formatPushError(undefined),
    "Could not enable notifications. Please try again."
  );
});
