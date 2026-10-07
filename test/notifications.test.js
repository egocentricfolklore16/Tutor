import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeNotificationPreferences,
  isQuietHoursActive,
  resolveSessionDateTime,
  getStoredNotifications,
  writeNotification,
  recordNotification,
  markAllNotificationsRead,
  dismissNotification,
  requestBrowserNotificationPermission,
  persistNotificationPreferences,
  getNotificationPreferences,
  scheduleStudyReminder,
  scheduleSessionRemindersFromSessions,
  NOTIFICATION_STORAGE_KEY,
} from "../src/lib/notifications.js";

// Setup global localStorage mock
let mockStorage = {};
const fakeLocalStorage = {
  getItem: (key) => mockStorage[key] ?? null,
  setItem: (key, val) => { mockStorage[key] = String(val); },
  removeItem: (key) => { delete mockStorage[key]; },
  clear: () => { mockStorage = {}; },
};

Object.defineProperty(globalThis, "localStorage", {
  value: fakeLocalStorage,
  writable: true,
  configurable: true,
});

beforeEach(() => {
  mockStorage = {};
});

test("normalizeNotificationPreferences handles missing, null, or custom preferences", () => {
  // Null / undefined returns default preferences
  const fromNull = normalizeNotificationPreferences(null);
  assert.equal(fromNull.browserPush, true);
  assert.equal(fromNull.studyReminders, true);
  assert.equal(fromNull.quietHours.enabled, true);
  assert.equal(fromNull.quietHours.start, "22:00");
  assert.equal(fromNull.quietHours.end, "08:00");

  // Custom preference override preserves defaults for missing keys
  const custom = normalizeNotificationPreferences({
    studyReminders: false,
    quietHours: { start: "23:00" },
  });
  assert.equal(custom.studyReminders, false);
  assert.equal(custom.browserPush, true);
  assert.equal(custom.quietHours.start, "23:00");
  assert.equal(custom.quietHours.end, "08:00");
  assert.equal(custom.quietHours.enabled, true);
});

test("isQuietHoursActive correctly detects quiet hours across time windows", () => {
  // Disabled quiet hours returns false
  assert.equal(isQuietHoursActive({ enabled: false, start: "22:00", end: "08:00" }, new Date("2026-05-10T23:00:00")), false);

  // Equal start and end times returns false
  assert.equal(isQuietHoursActive({ enabled: true, start: "22:00", end: "22:00" }, new Date("2026-05-10T22:00:00")), false);

  // Daytime quiet hours interval (09:00 - 17:00)
  const daytimeConfig = { enabled: true, start: "09:00", end: "17:00" };

  const insideDay = new Date("2026-05-10T12:30:00");
  assert.equal(isQuietHoursActive(daytimeConfig, insideDay), true);

  const beforeDay = new Date("2026-05-10T08:59:00");
  assert.equal(isQuietHoursActive(daytimeConfig, beforeDay), false);

  const afterDay = new Date("2026-05-10T17:00:00");
  assert.equal(isQuietHoursActive(daytimeConfig, afterDay), false);

  // Overnight quiet hours interval (22:00 - 08:00)
  const overnightConfig = { enabled: true, start: "22:00", end: "08:00" };

  const beforeMidnight = new Date("2026-05-10T23:15:00");
  assert.equal(isQuietHoursActive(overnightConfig, beforeMidnight), true);

  const afterMidnight = new Date("2026-05-10T04:45:00");
  assert.equal(isQuietHoursActive(overnightConfig, afterMidnight), true);

  const midday = new Date("2026-05-10T14:00:00");
  assert.equal(isQuietHoursActive(overnightConfig, midday), false);
});

test("resolveSessionDateTime parses various date and time shapes", () => {
  // YYYY-MM-DD string and HH:MM start time
  const s1 = { date: "2026-06-15", startTime: "14:30" };
  const d1 = resolveSessionDateTime(s1);
  assert.equal(d1.getFullYear(), 2026);
  assert.equal(d1.getMonth(), 5); // 0-indexed June
  assert.equal(d1.getDate(), 15);
  assert.equal(d1.getHours(), 14);
  assert.equal(d1.getMinutes(), 30);

  // Date object and uppercase field names (Date, Start)
  const baseDate = new Date(2026, 8, 10);
  const s2 = { Date: baseDate, Start: "10:15" };
  const d2 = resolveSessionDateTime(s2);
  assert.equal(d2.getFullYear(), 2026);
  assert.equal(d2.getMonth(), 8);
  assert.equal(d2.getDate(), 10);
  assert.equal(d2.getHours(), 10);
  assert.equal(d2.getMinutes(), 15);

  // Fallback to 09:00 if start time missing
  const s3 = { date: "2026-07-20" };
  const d3 = resolveSessionDateTime(s3);
  assert.equal(d3.getHours(), 9);
  assert.equal(d3.getMinutes(), 0);

  // Invalid date returns null
  assert.equal(resolveSessionDateTime(null), null);
  assert.equal(resolveSessionDateTime({ date: "invalid-date" }), null);
});

test("writeNotification and getStoredNotifications manage localStorage and 25-item capping", () => {
  assert.deepEqual(getStoredNotifications(), []);

  // Write 30 notifications to verify capping at 25
  for (let i = 1; i <= 30; i++) {
    writeNotification({ id: `notif-${i}`, title: `Notification ${i}` });
  }

  const stored = getStoredNotifications();
  assert.equal(stored.length, 25);
  // Most recent notification is first
  assert.equal(stored[0].id, "notif-30");
  assert.equal(stored[24].id, "notif-6");
});

test("recordNotification sets muted: true when quiet hours are active", () => {
  const quietHoursConfig = {
    quietHours: { enabled: true, start: "22:00", end: "08:00" },
  };

  // Record during quiet hours (23:00)
  const quietTime = new Date("2026-05-10T23:00:00");
  const notif1 = recordNotification({ title: "Late Study Alert" }, quietHoursConfig, quietTime);

  const stored1 = getStoredNotifications();
  assert.equal(stored1[0].id, notif1.id);
  assert.equal(stored1[0].muted, true);

  // Record during active hours (12:00)
  const activeTime = new Date("2026-05-10T12:00:00");
  const notif2 = recordNotification({ title: "Day Study Alert" }, quietHoursConfig, activeTime);

  const stored2 = getStoredNotifications();
  assert.equal(stored2[0].id, notif2.id);
  assert.equal(stored2[0].muted, undefined);
});

test("handles corrupted or malformed JSON in localStorage gracefully", () => {
  // Store invalid JSON string
  fakeLocalStorage.setItem(NOTIFICATION_STORAGE_KEY, "invalid-json-content{");
  assert.deepEqual(getStoredNotifications(), []);

  // Store valid JSON but non-array shape
  fakeLocalStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify({ error: "not an array" }));
  assert.deepEqual(getStoredNotifications(), []);

  // Store malformed preference JSON
  fakeLocalStorage.setItem("hyper-tutor-notification-preferences", "corrupted-json");
  const prefs = getNotificationPreferences();
  assert.equal(prefs.browserPush, true);
  assert.equal(prefs.studyReminders, true);
});

test("markAllNotificationsRead and dismissNotification modify stored notifications", () => {
  writeNotification({ id: "n1", title: "First", read: false });
  writeNotification({ id: "n2", title: "Second", read: false });

  assert.equal(getStoredNotifications().filter((n) => !n.read).length, 2);

  // Mark all read
  markAllNotificationsRead();
  assert.equal(getStoredNotifications().every((n) => n.read), true);

  // Dismiss notification "n1"
  dismissNotification("n1");
  const remaining = getStoredNotifications();
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].id, "n2");
});

test("persistNotificationPreferences and getNotificationPreferences save and retrieve preferences", () => {
  persistNotificationPreferences({
    studyReminders: false,
    quietHours: { start: "21:30" },
  });

  const retrieved = getNotificationPreferences();
  assert.equal(retrieved.studyReminders, false);
  assert.equal(retrieved.quietHours.start, "21:30");
  assert.equal(retrieved.browserPush, true);
});

test("requestBrowserNotificationPermission returns unsupported when Notification is unavailable", async () => {
  // Save original window if any
  const originalWindow = globalThis.window;
  delete globalThis.window;

  const result = await requestBrowserNotificationPermission();
  assert.equal(result, "unsupported");

  // Restore window
  globalThis.window = originalWindow;
});

test("requestBrowserNotificationPermission respects Notification.permission", async () => {
  const originalWindow = globalThis.window;

  // Mock Notification with 'granted'
  globalThis.window = {
    Notification: { permission: "granted" },
  };

  assert.equal(await requestBrowserNotificationPermission(), "granted");

  // Mock Notification with 'denied'
  globalThis.window.Notification.permission = "denied";
  assert.equal(await requestBrowserNotificationPermission(), "denied");

  globalThis.window = originalWindow;
});

test("scheduleStudyReminder returns null if Notification permission is not granted or studyReminders is disabled", async () => {
  const originalWindow = globalThis.window;

  globalThis.window = {
    Notification: { permission: "denied" },
  };

  const session = {
    id: "session-123",
    date: "2099-01-01",
    startTime: "10:00",
    reminder: 15,
  };

  // Permission denied -> returns null
  assert.equal(await scheduleStudyReminder(session), null);

  // Permission granted, but studyReminders disabled -> returns null
  globalThis.window.Notification.permission = "granted";
  const disabledPrefs = { studyReminders: false };
  assert.equal(await scheduleStudyReminder(session, disabledPrefs), null);

  globalThis.window = originalWindow;
});

test("scheduleStudyReminder suppresses local timer when active Web Push subscription exists", async () => {
  const originalWindow = globalThis.window;
  const originalNavigator = globalThis.navigator;

  // Mock window & navigator serviceWorker with active push subscription
  globalThis.window = {
    Notification: { permission: "granted" },
  };

  const fakeServiceWorker = {
    ready: Promise.resolve({
      pushManager: {
        getSubscription: async () => ({ endpoint: "https://push.example.com/sub/123" }),
      },
    }),
  };

  Object.defineProperty(globalThis, "navigator", {
    value: { serviceWorker: fakeServiceWorker },
    writable: true,
    configurable: true,
  });

  const session = {
    id: "session-webpush",
    date: "2099-01-01",
    startTime: "10:00",
    reminder: 15,
  };

  // Should return null because Web Push is active (avoiding duplicate notifications)
  const result = await scheduleStudyReminder(session);
  assert.equal(result, null);

  // Restore globals
  globalThis.window = originalWindow;
  Object.defineProperty(globalThis, "navigator", {
    value: originalNavigator,
    writable: true,
    configurable: true,
  });
});

test("scheduleStudyReminder sets timer for future session and replaces existing timer on reschedule", async () => {
  const originalWindow = globalThis.window;
  const originalNavigator = globalThis.navigator;

  globalThis.window = {
    Notification: { permission: "granted" },
  };

  // Mock serviceWorker with NO active push subscription
  const fakeServiceWorker = {
    ready: Promise.resolve({
      pushManager: {
        getSubscription: async () => null,
      },
    }),
  };

  Object.defineProperty(globalThis, "navigator", {
    value: { serviceWorker: fakeServiceWorker },
    writable: true,
    configurable: true,
  });

  const futureSession = {
    id: "session-future-1",
    date: "2099-12-31",
    startTime: "18:00",
    reminder: 15,
  };

  const timer1 = await scheduleStudyReminder(futureSession);
  assert.notEqual(timer1, null);

  // Reschedule same session -> should replace timer
  const timer2 = await scheduleStudyReminder(futureSession);
  assert.notEqual(timer2, null);

  // Clear timers
  clearTimeout(timer1);
  clearTimeout(timer2);

  // Test scheduleSessionRemindersFromSessions
  const timers = scheduleSessionRemindersFromSessions([futureSession]);
  timers.forEach((t) => clearTimeout(t));

  // Restore globals
  globalThis.window = originalWindow;
  Object.defineProperty(globalThis, "navigator", {
    value: originalNavigator,
    writable: true,
    configurable: true,
  });
});
