import test from "node:test";
import assert from "node:assert/strict";

// Setup browser globals mock before importing notifications module
const storageMap = new Map();
const mockLocalStorage = {
  getItem: (key) => storageMap.get(key) ?? null,
  setItem: (key, val) => storageMap.set(key, String(val)),
  removeItem: (key) => storageMap.delete(key),
  clear: () => storageMap.clear(),
};

Object.defineProperty(globalThis, "localStorage", {
  value: mockLocalStorage,
  configurable: true,
  writable: true,
});

const dispatchedEvents = [];
let mockNotificationPermission = "granted";
const mockNotificationObj = {
  get permission() {
    return mockNotificationPermission;
  },
  requestPermission: async () => mockNotificationPermission,
};

Object.defineProperty(globalThis, "Notification", {
  value: mockNotificationObj,
  configurable: true,
  writable: true,
});

let mockPushSubscription = null;
const shownNotifications = [];
const mockNavigatorObj = {
  serviceWorker: {
    ready: Promise.resolve({
      pushManager: {
        getSubscription: async () => mockPushSubscription,
      },
      showNotification: async (title, opts) => {
        shownNotifications.push({ title, opts });
      },
    }),
  },
};

Object.defineProperty(globalThis, "navigator", {
  value: mockNavigatorObj,
  configurable: true,
  writable: true,
});

Object.defineProperty(globalThis, "window", {
  value: {
    dispatchEvent: (event) => {
      dispatchedEvents.push(event);
      return true;
    },
    Notification: mockNotificationObj,
    navigator: mockNavigatorObj,
  },
  configurable: true,
  writable: true,
});

// Import notifications module after mocking environment
import {
  resolveSessionDateTime,
  normalizeNotificationPreferences,
  isQuietHoursActive,
  writeNotification,
  recordNotification,
  getStoredNotifications,
  hasActivePushSubscription,
  scheduleStudyReminder,
  scheduleSessionRemindersFromSessions,
  markAllNotificationsRead,
  dismissNotification,
  requestBrowserNotificationPermission,
  NOTIFICATION_STORAGE_KEY,
} from "../src/lib/notifications.js";

test("resolveSessionDateTime parses session dates and times correctly", () => {
  // YYYY-MM-DD date and 14:30 start time
  const session1 = { Date: "2026-04-15", Start: "14:30" };
  const date1 = resolveSessionDateTime(session1);
  assert.ok(date1 instanceof Date);
  assert.equal(date1.getFullYear(), 2026);
  assert.equal(date1.getMonth(), 3); // 0-indexed April
  assert.equal(date1.getDate(), 15);
  assert.equal(date1.getHours(), 14);
  assert.equal(date1.getMinutes(), 30);

  // Lowercase properties and default start time (09:00)
  const session2 = { date: "2026-05-20" };
  const date2 = resolveSessionDateTime(session2);
  assert.equal(date2.getHours(), 9);
  assert.equal(date2.getMinutes(), 0);

  // Date instance
  const session3 = { date: new Date("2026-06-10T00:00:00Z"), startTime: "10:15" };
  const date3 = resolveSessionDateTime(session3);
  assert.equal(date3.getHours(), 10);
  assert.equal(date3.getMinutes(), 15);

  // Returns null for invalid or missing sessions
  assert.equal(resolveSessionDateTime(null), null);
  assert.equal(resolveSessionDateTime({ date: "invalid-date" }), null);
});

test("normalizeNotificationPreferences merges default and custom preferences safely", () => {
  const custom = {
    studyReminders: false,
    quietHours: { start: "23:00" },
  };

  const normalized = normalizeNotificationPreferences(custom);
  assert.equal(normalized.studyReminders, false);
  assert.equal(normalized.browserPush, true); // Retains default
  assert.equal(normalized.quietHours.start, "23:00");
  assert.equal(normalized.quietHours.end, "08:00"); // Retains default
  assert.equal(normalized.quietHours.enabled, true); // Retains default
});

test("isQuietHoursActive evaluates overnight and same-day quiet hour ranges accurately", () => {
  const overnight = { enabled: true, start: "22:00", end: "08:00" };

  // Active at 11:30 PM (23:30)
  const time2330 = new Date("2026-04-15T23:30:00");
  assert.equal(isQuietHoursActive(overnight, time2330), true);

  // Active at 3:00 AM (03:00)
  const time0300 = new Date("2026-04-15T03:00:00");
  assert.equal(isQuietHoursActive(overnight, time0300), true);

  // Inactive at 12:00 PM (12:00)
  const time1200 = new Date("2026-04-15T12:00:00");
  assert.equal(isQuietHoursActive(overnight, time1200), false);

  // Same-day range: 13:00 to 16:00
  const sameDay = { enabled: true, start: "13:00", end: "16:00" };
  const time1400 = new Date("2026-04-15T14:00:00");
  assert.equal(isQuietHoursActive(sameDay, time1400), true);

  const time1700 = new Date("2026-04-15T17:00:00");
  assert.equal(isQuietHoursActive(sameDay, time1700), false);

  // Disabled quiet hours
  assert.equal(isQuietHoursActive({ enabled: false, start: "22:00", end: "08:00" }, time2330), false);

  // Equal start and end times
  assert.equal(isQuietHoursActive({ enabled: true, start: "12:00", end: "12:00" }, time1200), false);
});

test("writeNotification stores notifications and caps storage at 25 items", () => {
  storageMap.clear();

  for (let i = 1; i <= 30; i++) {
    writeNotification({ id: `notif-${i}`, title: `Notification ${i}` });
  }

  const stored = getStoredNotifications();
  assert.equal(stored.length, 25);
  // First item should be the most recent (notif-30)
  assert.equal(stored[0].id, "notif-30");
  // Oldest items (notif-1 through notif-5) should be dropped
  assert.ok(!stored.some((n) => n.id === "notif-1"));
});

test("getStoredNotifications recovers gracefully from corrupted JSON in localStorage", () => {
  storageMap.set(NOTIFICATION_STORAGE_KEY, "{invalid_json");

  const result = getStoredNotifications();
  assert.deepEqual(result, []);
  // Corrupted key should have been cleared
  assert.equal(mockLocalStorage.getItem(NOTIFICATION_STORAGE_KEY), null);
});

test("recordNotification mutes notifications during quiet hours", () => {
  storageMap.clear();

  const activeQuietHours = {
    quietHours: { enabled: true, start: "22:00", end: "08:00" },
  };

  // During quiet hours (23:00)
  const quietTime = new Date("2026-04-15T23:00:00");
  const recorded = recordNotification({ title: "Late Study Alert" }, activeQuietHours, quietTime);

  assert.equal(recorded.muted, undefined); // writeNotification return value
  const stored = getStoredNotifications();
  assert.equal(stored[0].muted, true); // Muted in storage

  // Outside quiet hours (10:00 AM)
  const activeTime = new Date("2026-04-15T10:00:00");
  recordNotification({ title: "Day Alert" }, activeQuietHours, activeTime);
  const updatedStored = getStoredNotifications();
  assert.equal(updatedStored[0].muted, undefined);
});

test("hasActivePushSubscription reflects Service Worker push subscription status", async () => {
  mockPushSubscription = null;
  assert.equal(await hasActivePushSubscription(), false);

  mockPushSubscription = { endpoint: "https://push.service.com/sub/123" };
  assert.equal(await hasActivePushSubscription(), true);
});

test("scheduleStudyReminder suppresses local in-tab timer when Web Push is active to prevent duplicates", async () => {
  mockNotificationPermission = "granted";
  mockPushSubscription = { endpoint: "https://push.service.com/sub/123" };

  const session = {
    id: "sess_101",
    Date: "2099-01-01",
    Start: "10:00",
    reminder: 15,
  };

  // Because Web Push subscription is active, scheduleStudyReminder returns null (suppressing local in-tab timer)
  const timer = await scheduleStudyReminder(session);
  assert.equal(timer, null);
});

test("scheduleStudyReminder schedules in-tab timer when permission is granted and Web Push is inactive", async () => {
  mockNotificationPermission = "granted";
  mockPushSubscription = null;

  const originalDateNow = Date.now;
  // Deterministic reference time: 2026-04-15T09:00:00.000Z
  const mockNow = new Date("2026-04-15T09:00:00.000Z").getTime();
  Date.now = () => mockNow;

  try {
    const session = {
      id: "sess_202",
      Date: "2026-04-15",
      Start: "10:00",
      reminder: 15, // Reminder starts at 09:45 (45 minutes in future relative to mockNow)
    };

    const timer = await scheduleStudyReminder(session);
    assert.ok(timer !== null);
    clearTimeout(timer);
  } finally {
    Date.now = originalDateNow;
  }
});

test("scheduleStudyReminder returns null if Notification permission is denied or session is in past", async () => {
  mockPushSubscription = null;

  // Denied permission
  mockNotificationPermission = "denied";
  const sessionFuture = { id: "sess_303", Date: "2099-01-01", Start: "10:00" };
  assert.equal(await scheduleStudyReminder(sessionFuture), null);

  // Past session
  mockNotificationPermission = "granted";
  const sessionPast = { id: "sess_404", Date: "2020-01-01", Start: "10:00" };
  assert.equal(await scheduleStudyReminder(sessionPast), null);
});

test("scheduleSessionRemindersFromSessions filters invalid/null reminders and processes arrays", async () => {
  mockNotificationPermission = "denied"; // Quick return null for test
  const sessions = [
    { id: "s1", Date: "2099-01-01" },
    { id: "s2", Date: "2020-01-01" },
  ];

  const results = await Promise.all(scheduleSessionRemindersFromSessions(sessions));
  assert.deepEqual(results.filter(Boolean), []);
  assert.deepEqual(scheduleSessionRemindersFromSessions(null), []);
});

test("markAllNotificationsRead and dismissNotification update stored notification read/active state", () => {
  storageMap.clear();

  writeNotification({ id: "n1", title: "Unread 1", read: false });
  writeNotification({ id: "n2", title: "Unread 2", read: false });

  markAllNotificationsRead();
  const allRead = getStoredNotifications();
  assert.equal(allRead.every((n) => n.read === true), true);

  dismissNotification("n1");
  const remaining = getStoredNotifications();
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].id, "n2");
});

test("requestBrowserNotificationPermission returns current status or unsupported state", async () => {
  mockNotificationPermission = "granted";
  assert.equal(await requestBrowserNotificationPermission(), "granted");

  mockNotificationPermission = "denied";
  assert.equal(await requestBrowserNotificationPermission(), "denied");
});
