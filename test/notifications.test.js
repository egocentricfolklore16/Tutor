import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveSessionDateTime,
  normalizeNotificationPreferences,
  isQuietHoursActive,
  getNotificationPreferences,
  persistNotificationPreferences,
  getStoredNotifications,
  writeNotification,
  recordNotification,
  markAllNotificationsRead,
  dismissNotification,
  scheduleStudyReminder,
  requestBrowserNotificationPermission,
  NOTIFICATION_STORAGE_KEY,
  defaultNotificationPreferences,
} from "../src/lib/notifications.js";

function createMockStorage() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
    _store: store,
  };
}

function setMockNavigator(mockNav) {
  const originalNavDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "navigator", {
    value: mockNav,
    configurable: true,
    writable: true,
  });
  return () => {
    if (originalNavDescriptor) {
      Object.defineProperty(globalThis, "navigator", originalNavDescriptor);
    } else {
      delete globalThis.navigator;
    }
  };
}

// 1. resolveSessionDateTime tests
test("resolveSessionDateTime parses YYYY-MM-DD date and HH:MM time correctly", () => {
  const session = { date: "2026-04-10", startTime: "14:30" };
  const scheduled = resolveSessionDateTime(session);
  assert.ok(scheduled instanceof Date);
  assert.equal(scheduled.getFullYear(), 2026);
  assert.equal(scheduled.getMonth(), 3); // April is month 3 (0-indexed)
  assert.equal(scheduled.getDate(), 10);
  assert.equal(scheduled.getHours(), 14);
  assert.equal(scheduled.getMinutes(), 30);
});

test("resolveSessionDateTime handles Date instance and uppercase field keys (Date, Start)", () => {
  const dateObj = new Date("2026-05-15T00:00:00.000Z");
  const session = { Date: dateObj, Start: "08:15" };
  const scheduled = resolveSessionDateTime(session);
  assert.ok(scheduled instanceof Date);
  assert.equal(scheduled.getHours(), 8);
  assert.equal(scheduled.getMinutes(), 15);
});

test("resolveSessionDateTime falls back to 09:00 if start time is missing", () => {
  const session = { date: "2026-06-01" };
  const scheduled = resolveSessionDateTime(session);
  assert.equal(scheduled.getHours(), 9);
  assert.equal(scheduled.getMinutes(), 0);
});

test("resolveSessionDateTime returns null for invalid or missing date inputs", () => {
  assert.equal(resolveSessionDateTime(null), null);
  assert.equal(resolveSessionDateTime({}), null);
  assert.equal(resolveSessionDateTime({ date: "not-a-valid-date" }), null);
});

// 2. normalizeNotificationPreferences & storage preferences tests
test("normalizeNotificationPreferences merges defaults with custom user preferences", () => {
  const custom = { studyReminders: false, quietHours: { start: "23:00" } };
  const normalized = normalizeNotificationPreferences(custom);
  assert.equal(normalized.studyReminders, false);
  assert.equal(normalized.browserPush, true);
  assert.equal(normalized.quietHours.enabled, true);
  assert.equal(normalized.quietHours.start, "23:00");
  assert.equal(normalized.quietHours.end, "08:00");
});

test("getNotificationPreferences handles corrupted JSON safely by clearing localStorage", () => {
  const mockStorage = createMockStorage();
  globalThis.localStorage = mockStorage;
  const PREF_KEY = "hyper-tutor-notification-preferences";

  try {
    mockStorage.setItem(PREF_KEY, "{corrupted_json_payload");
    const prefs = getNotificationPreferences();
    assert.deepEqual(prefs, normalizeNotificationPreferences(defaultNotificationPreferences));
    assert.equal(mockStorage.getItem(PREF_KEY), null, "Corrupted key should be removed from localStorage");
  } finally {
    delete globalThis.localStorage;
  }
});

test("persistNotificationPreferences normalizes and stores preferences in localStorage", () => {
  const mockStorage = createMockStorage();
  globalThis.localStorage = mockStorage;
  const PREF_KEY = "hyper-tutor-notification-preferences";

  try {
    const saved = persistNotificationPreferences({ studyReminders: false });
    assert.equal(saved.studyReminders, false);
    const storedRaw = mockStorage.getItem(PREF_KEY);
    assert.ok(storedRaw);
    const parsed = JSON.parse(storedRaw);
    assert.equal(parsed.studyReminders, false);
  } finally {
    delete globalThis.localStorage;
  }
});

// 3. isQuietHoursActive tests
test("isQuietHoursActive evaluates overnight quiet hours (e.g. 22:00 to 08:00)", () => {
  const quietHours = { enabled: true, start: "22:00", end: "08:00" };

  const nightTime = new Date("2026-04-10T23:30:00");
  assert.equal(isQuietHoursActive(quietHours, nightTime), true, "23:30 should be in quiet hours");

  const earlyMorning = new Date("2026-04-10T05:15:00");
  assert.equal(isQuietHoursActive(quietHours, earlyMorning), true, "05:15 should be in quiet hours");

  const midDay = new Date("2026-04-10T14:00:00");
  assert.equal(isQuietHoursActive(quietHours, midDay), false, "14:00 should NOT be in quiet hours");
});

test("isQuietHoursActive evaluates same-day quiet hours (e.g. 13:00 to 15:00)", () => {
  const quietHours = { enabled: true, start: "13:00", end: "15:00" };

  const insideRange = new Date("2026-04-10T14:00:00");
  assert.equal(isQuietHoursActive(quietHours, insideRange), true, "14:00 should be in quiet hours");

  const beforeRange = new Date("2026-04-10T11:00:00");
  assert.equal(isQuietHoursActive(quietHours, beforeRange), false, "11:00 should NOT be in quiet hours");

  const afterRange = new Date("2026-04-10T16:00:00");
  assert.equal(isQuietHoursActive(quietHours, afterRange), false, "16:00 should NOT be in quiet hours");
});

test("isQuietHoursActive returns false when disabled or start equals end time", () => {
  const disabled = { enabled: false, start: "22:00", end: "08:00" };
  assert.equal(isQuietHoursActive(disabled, new Date("2026-04-10T23:30:00")), false);

  const equalTime = { enabled: true, start: "22:00", end: "22:00" };
  assert.equal(isQuietHoursActive(equalTime, new Date("2026-04-10T22:00:00")), false);
});

// 4. Notification storage and muting operations
test("writeNotification caps stored notifications at 25 items", () => {
  const mockStorage = createMockStorage();
  globalThis.localStorage = mockStorage;

  try {
    for (let i = 0; i < 30; i++) {
      writeNotification({ title: `Notification ${i}` });
    }
    const stored = getStoredNotifications();
    assert.equal(stored.length, 25);
    assert.equal(stored[0].title, "Notification 29", "Most recent notification should be at top");
  } finally {
    delete globalThis.localStorage;
  }
});

test("getStoredNotifications handles corrupted JSON or invalid data shape safely", () => {
  const mockStorage = createMockStorage();
  globalThis.localStorage = mockStorage;

  try {
    mockStorage.setItem(NOTIFICATION_STORAGE_KEY, "invalid_json_str");
    assert.deepEqual(getStoredNotifications(), []);
    assert.equal(mockStorage.getItem(NOTIFICATION_STORAGE_KEY), null);

    mockStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify({ notAnArray: true }));
    assert.deepEqual(getStoredNotifications(), []);
    assert.equal(mockStorage.getItem(NOTIFICATION_STORAGE_KEY), null);
  } finally {
    delete globalThis.localStorage;
  }
});

test("recordNotification mutes notifications created during quiet hours", () => {
  const mockStorage = createMockStorage();
  globalThis.localStorage = mockStorage;

  try {
    const prefs = normalizeNotificationPreferences({
      quietHours: { enabled: true, start: "22:00", end: "08:00" },
    });
    const nightTime = new Date("2026-04-10T23:00:00");

    const record = recordNotification(
      { title: "Late Study Alert", body: "Time to rest" },
      prefs,
      nightTime
    );

    assert.equal(record.muted, true);
    const stored = getStoredNotifications();
    assert.equal(stored.length, 1);
    assert.equal(stored[0].muted, true);
  } finally {
    delete globalThis.localStorage;
  }
});

test("markAllNotificationsRead and dismissNotification modify stored notifications correctly", () => {
  const mockStorage = createMockStorage();
  globalThis.localStorage = mockStorage;

  try {
    writeNotification({ id: "item-1", title: "First", read: false });
    writeNotification({ id: "item-2", title: "Second", read: false });

    assert.equal(getStoredNotifications().filter((n) => !n.read).length, 2);

    markAllNotificationsRead();
    assert.equal(getStoredNotifications().filter((n) => !n.read).length, 0);

    dismissNotification("item-1");
    const remaining = getStoredNotifications();
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].id, "item-2");
  } finally {
    delete globalThis.localStorage;
  }
});

// 5. scheduleStudyReminder & permission / duplicate prevention tests
test("scheduleStudyReminder returns null when Notification permission is not granted", async () => {
  const mockNotification = { permission: "denied" };
  globalThis.window = { Notification: mockNotification };
  globalThis.Notification = mockNotification;

  try {
    const session = { id: "s1", date: "2099-01-01", startTime: "10:00" };
    const result = await scheduleStudyReminder(session);
    assert.equal(result, null);
  } finally {
    delete globalThis.window;
    delete globalThis.Notification;
  }
});

test("scheduleStudyReminder returns null when Web Push subscription is active to prevent duplicate notifications", async () => {
  const mockNotification = { permission: "granted" };
  globalThis.window = { Notification: mockNotification };
  globalThis.Notification = mockNotification;
  const restoreNav = setMockNavigator({
    serviceWorker: {
      ready: Promise.resolve({
        pushManager: {
          getSubscription: () => Promise.resolve({ endpoint: "https://push.example.com" }),
        },
      }),
    },
  });

  try {
    const session = { id: "s2", date: "2099-01-01", startTime: "10:00" };
    const result = await scheduleStudyReminder(session);
    assert.equal(result, null, "Should return null because Web Push will handle notification");
  } finally {
    delete globalThis.window;
    delete globalThis.Notification;
    restoreNav();
  }
});

test("scheduleStudyReminder returns null for past session start times", async () => {
  const mockNotification = { permission: "granted" };
  globalThis.window = { Notification: mockNotification };
  globalThis.Notification = mockNotification;
  const restoreNav = setMockNavigator({
    serviceWorker: {
      ready: Promise.resolve({
        pushManager: {
          getSubscription: () => Promise.resolve(null),
        },
      }),
    },
  });

  try {
    const session = { id: "s3", date: "2020-01-01", startTime: "10:00" };
    const result = await scheduleStudyReminder(session);
    assert.equal(result, null, "Should return null for session in the past");
  } finally {
    delete globalThis.window;
    delete globalThis.Notification;
    restoreNav();
  }
});

test("scheduleStudyReminder sets in-tab fallback timer for future sessions when push is inactive", async () => {
  const mockNotification = { permission: "granted" };
  globalThis.window = { Notification: mockNotification };
  globalThis.Notification = mockNotification;
  const mockStorage = createMockStorage();
  globalThis.localStorage = mockStorage;

  const restoreNav = setMockNavigator({
    serviceWorker: {
      ready: Promise.resolve({
        pushManager: {
          getSubscription: () => Promise.resolve(null),
        },
      }),
    },
  });

  try {
    const futureDate = new Date(Date.now() + 3600 * 1000);
    const yyyy = futureDate.getFullYear();
    const mm = String(futureDate.getMonth() + 1).padStart(2, "0");
    const dd = String(futureDate.getDate()).padStart(2, "0");
    const hh = String(futureDate.getHours()).padStart(2, "0");
    const min = String(futureDate.getMinutes()).padStart(2, "0");

    const session = { id: "s4", date: `${yyyy}-${mm}-${dd}`, startTime: `${hh}:${min}`, reminder: 5 };
    const timer = await scheduleStudyReminder(session);
    assert.ok(timer !== null, "Timer should be set when permission granted and no active push subscription");
    clearTimeout(timer);
  } finally {
    delete globalThis.window;
    delete globalThis.Notification;
    delete globalThis.localStorage;
    restoreNav();
  }
});

test("requestBrowserNotificationPermission returns unsupported when window/Notification is missing", async () => {
  const res = await requestBrowserNotificationPermission();
  assert.equal(res, "unsupported");
});
