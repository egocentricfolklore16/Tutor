import test from "node:test";
import assert from "node:assert/strict";
import {
  defaultNotificationPreferences,
  normalizeNotificationPreferences,
  isQuietHoursActive,
  getStoredNotifications,
  writeNotification,
  recordNotification,
  resolveSessionDateTime,
  hasActivePushSubscription,
  scheduleStudyReminder,
  NOTIFICATION_STORAGE_KEY,
} from "../src/lib/notifications.js";

// Mock localStorage helper
function createMockLocalStorage(initialStore = {}) {
  let store = { ...initialStore };
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key, value) {
      store[key] = String(value);
    },
    removeItem(key) {
      delete store[key];
    },
    clear() {
      store = {};
    },
  };
}

test("normalizeNotificationPreferences merges incoming options with defaults", () => {
  const nullResult = normalizeNotificationPreferences(null);
  assert.deepEqual(nullResult, defaultNotificationPreferences);

  const customResult = normalizeNotificationPreferences({
    studyReminders: false,
    quietHours: { start: "23:00" },
  });

  assert.equal(customResult.studyReminders, false);
  assert.equal(customResult.browserPush, true); // retained default
  assert.equal(customResult.quietHours.start, "23:00");
  assert.equal(customResult.quietHours.end, "08:00"); // retained default
});

test("isQuietHoursActive evaluates same-day and overnight quiet hour ranges accurately", () => {
  const originalDate = globalThis.Date;

  // Helper to freeze system time
  const setMockTime = (hours, minutes) => {
    class MockDate extends originalDate {
      constructor(...args) {
        if (args.length > 0) {
          return new originalDate(...args);
        }
        const d = new originalDate("2026-05-10T12:00:00Z");
        d.setHours(hours, minutes, 0, 0);
        return d;
      }
    }
    globalThis.Date = MockDate;
  };

  try {
    // Case 1: Disabled
    assert.equal(isQuietHoursActive({ enabled: false, start: "22:00", end: "08:00" }), false);

    // Case 2: Same-day range (09:00 to 17:00)
    const sameDayConfig = { enabled: true, start: "09:00", end: "17:00" };
    setMockTime(8, 59);
    assert.equal(isQuietHoursActive(sameDayConfig), false);
    setMockTime(9, 0);
    assert.equal(isQuietHoursActive(sameDayConfig), true);
    setMockTime(13, 30);
    assert.equal(isQuietHoursActive(sameDayConfig), true);
    setMockTime(17, 0);
    assert.equal(isQuietHoursActive(sameDayConfig), false);

    // Case 3: Overnight range (22:00 to 08:00)
    const overnightConfig = { enabled: true, start: "22:00", end: "08:00" };
    setMockTime(21, 59);
    assert.equal(isQuietHoursActive(overnightConfig), false);
    setMockTime(22, 0);
    assert.equal(isQuietHoursActive(overnightConfig), true);
    setMockTime(23, 45);
    assert.equal(isQuietHoursActive(overnightConfig), true);
    setMockTime(3, 15);
    assert.equal(isQuietHoursActive(overnightConfig), true);
    setMockTime(7, 59);
    assert.equal(isQuietHoursActive(overnightConfig), true);
    setMockTime(8, 0);
    assert.equal(isQuietHoursActive(overnightConfig), false);

    // Case 4: Equal start and end
    assert.equal(isQuietHoursActive({ enabled: true, start: "10:00", end: "10:00" }), false);
  } finally {
    globalThis.Date = originalDate;
  }
});

test("getStoredNotifications safely handles missing, valid, non-array, and corrupted JSON storage", () => {
  const originalLocalStorage = globalThis.localStorage;

  try {
    // Missing key
    Object.defineProperty(globalThis, "localStorage", {
      value: createMockLocalStorage(),
      configurable: true,
      writable: true,
    });
    assert.deepEqual(getStoredNotifications(), []);

    // Valid array
    const validData = [{ id: "1", title: "Test" }];
    Object.defineProperty(globalThis, "localStorage", {
      value: createMockLocalStorage({
        [NOTIFICATION_STORAGE_KEY]: JSON.stringify(validData),
      }),
      configurable: true,
      writable: true,
    });
    assert.deepEqual(getStoredNotifications(), validData);

    // Non-array shape
    Object.defineProperty(globalThis, "localStorage", {
      value: createMockLocalStorage({
        [NOTIFICATION_STORAGE_KEY]: JSON.stringify({ not: "an array" }),
      }),
      configurable: true,
      writable: true,
    });
    assert.deepEqual(getStoredNotifications(), []);
    assert.equal(globalThis.localStorage.getItem(NOTIFICATION_STORAGE_KEY), null, "Corrupted key removed");

    // Invalid JSON syntax
    Object.defineProperty(globalThis, "localStorage", {
      value: createMockLocalStorage({
        [NOTIFICATION_STORAGE_KEY]: "{ invalid json ",
      }),
      configurable: true,
      writable: true,
    });
    assert.deepEqual(getStoredNotifications(), []);
    assert.equal(globalThis.localStorage.getItem(NOTIFICATION_STORAGE_KEY), null, "Invalid JSON key removed");
  } finally {
    Object.defineProperty(globalThis, "localStorage", {
      value: originalLocalStorage,
      configurable: true,
      writable: true,
    });
  }
});

test("writeNotification and recordNotification enforce 25-item storage cap and quiet hours muted flag", () => {
  const originalLocalStorage = globalThis.localStorage;
  const originalWindow = globalThis.window;
  const originalDate = globalThis.Date;

  Object.defineProperty(globalThis, "localStorage", {
    value: createMockLocalStorage(),
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, "window", {
    value: { dispatchEvent: () => {} },
    configurable: true,
    writable: true,
  });

  try {
    // Test 25-item storage cap
    for (let i = 1; i <= 30; i++) {
      writeNotification({ id: `item-${i}`, title: `Notification ${i}` });
    }

    const stored = getStoredNotifications();
    assert.equal(stored.length, 25, "Notifications capped at maximum of 25 items");
    assert.equal(stored[0].id, "item-30", "Newest notification is at index 0");
    assert.equal(stored[24].id, "item-6", "Oldest notifications beyond 25 items purged");

    // Test quiet hours active -> muted flag attached in storage
    class MockDate extends originalDate {
      constructor(...args) {
        if (args.length > 0) return new originalDate(...args);
        const d = new originalDate("2026-05-10T23:00:00Z");
        return d;
      }
    }
    globalThis.Date = MockDate;

    recordNotification(
      { id: "quiet-1", title: "Midnight Alert" },
      { quietHours: { enabled: true, start: "22:00", end: "08:00" } }
    );

    const updatedStored = getStoredNotifications();
    const quietRecord = updatedStored.find((item) => item.id === "quiet-1");
    assert.ok(quietRecord, "Notification saved to storage");
    assert.equal(quietRecord.muted, true, "Notification tagged as muted in storage during active quiet hours");
  } finally {
    Object.defineProperty(globalThis, "localStorage", {
      value: originalLocalStorage,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      configurable: true,
      writable: true,
    });
    globalThis.Date = originalDate;
  }
});

test("resolveSessionDateTime parses YYYY-MM-DD string, Date object, and custom Start times", () => {
  // Invalid session
  assert.equal(resolveSessionDateTime(null), null);
  assert.equal(resolveSessionDateTime({ Date: "invalid-date" }), null);

  // String YYYY-MM-DD date with custom start time
  const stringSession = { Date: "2026-06-15", Start: "15:45" };
  const resolvedStr = resolveSessionDateTime(stringSession);
  assert.ok(resolvedStr instanceof Date);
  assert.equal(resolvedStr.getFullYear(), 2026);
  assert.equal(resolvedStr.getMonth(), 5); // June (0-indexed)
  assert.equal(resolvedStr.getDate(), 15);
  assert.equal(resolvedStr.getHours(), 15);
  assert.equal(resolvedStr.getMinutes(), 45);

  // Date object with fallback default start time ("09:00")
  const dateObject = new Date(2026, 8, 20); // Sept 20, 2026
  const dateObjSession = { date: dateObject };
  const resolvedObj = resolveSessionDateTime(dateObjSession);
  assert.ok(resolvedObj instanceof Date);
  assert.equal(resolvedObj.getFullYear(), 2026);
  assert.equal(resolvedObj.getMonth(), 8);
  assert.equal(resolvedObj.getDate(), 20);
  assert.equal(resolvedObj.getHours(), 9);
  assert.equal(resolvedObj.getMinutes(), 0);
});

test("hasActivePushSubscription detects presence of serviceWorker and push subscription", async () => {
  const originalWindow = globalThis.window;
  const originalNavigator = globalThis.navigator;

  try {
    // Server / non-browser context
    Object.defineProperty(globalThis, "window", {
      value: undefined,
      configurable: true,
      writable: true,
    });
    assert.equal(await hasActivePushSubscription(), false);

    // Browser context with active push subscription
    Object.defineProperty(globalThis, "window", {
      value: {},
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, "navigator", {
      value: {
        serviceWorker: {
          ready: Promise.resolve({
            pushManager: {
              getSubscription: () => Promise.resolve({ endpoint: "https://push.example.com/sub/123" }),
            },
          }),
        },
      },
      configurable: true,
      writable: true,
    });

    assert.equal(await hasActivePushSubscription(), true);

    // Browser context without subscription
    Object.defineProperty(globalThis, "navigator", {
      value: {
        serviceWorker: {
          ready: Promise.resolve({
            pushManager: {
              getSubscription: () => Promise.resolve(null),
            },
          }),
        },
      },
      configurable: true,
      writable: true,
    });

    assert.equal(await hasActivePushSubscription(), false);
  } finally {
    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, "navigator", {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
  }
});

test("scheduleStudyReminder suppresses local in-tab fallback timer when Web Push subscription is active", async () => {
  const originalWindow = globalThis.window;
  const originalNavigator = globalThis.navigator;
  const originalNotification = globalThis.Notification;

  try {
    Object.defineProperty(globalThis, "window", {
      value: {},
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, "Notification", {
      value: { permission: "granted" },
      configurable: true,
      writable: true,
    });

    // When active push subscription exists, scheduleStudyReminder MUST return null
    Object.defineProperty(globalThis, "navigator", {
      value: {
        serviceWorker: {
          ready: Promise.resolve({
            pushManager: {
              getSubscription: () => Promise.resolve({ endpoint: "https://push.example.com/sub" }),
            },
          }),
        },
      },
      configurable: true,
      writable: true,
    });

    const futureSession = {
      id: "session-101",
      Date: "2099-01-01",
      Start: "10:00",
      reminder: 15,
    };

    const timerResult = await scheduleStudyReminder(futureSession, { studyReminders: true });
    assert.equal(timerResult, null, "Local in-tab fallback suppressed when Web Push subscription is active to prevent duplicate notifications");
  } finally {
    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, "navigator", {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, "Notification", {
      value: originalNotification,
      configurable: true,
      writable: true,
    });
  }
});
