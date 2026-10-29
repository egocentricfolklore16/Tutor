import { test } from "node:test";
import assert from "node:assert/strict";

import {
  resolveSessionDateTime,
  normalizeNotificationPreferences,
  isQuietHoursActive,
  getStoredNotifications,
  writeNotification,
  recordNotification,
  scheduleStudyReminder,
  scheduleGroupSessionReminders,
  scheduleSessionRemindersFromSessions,
  markAllNotificationsRead,
  dismissNotification,
  requestBrowserNotificationPermission,
  persistNotificationPreferences,
  getNotificationPreferences,
  NOTIFICATION_STORAGE_KEY,
} from "../src/lib/notifications.js";

// Pure helper function for quiet hours calculation
function buildNotificationPayload({ type, title, body, conversationId, showPreview = true }) {
  let finalTitle = title || "Hyper Tutor";
  let finalBody = body || "You have a new update.";
  let url = "/community/chat";
  let tag = `notif-${Date.now()}`;

  if (type === "message") {
    url = conversationId ? `/community/chat/${conversationId}` : "/community/chat";
    tag = conversationId ? `chat-${conversationId}` : "chat-general";

    if (!showPreview) {
      finalBody = "Sent you a message";
    } else if (finalBody && finalBody.length > 100) {
      finalBody = finalBody.substring(0, 97) + "...";
    }
  } else if (type === "friend_request") {
    finalTitle = "New friend request";
    url = "/community/friends";
    tag = "friend-requests";
  } else if (type === "friend_accepted") {
    finalTitle = "Friend request accepted";
    url = "/community/friends";
    tag = "friend-accepts";
  }

  return {
    title: finalTitle,
    body: finalBody,
    url,
    tag,
  };
}

function isConversationMuted(mutedUntilISO, nowISO = new Date().toISOString()) {
  if (mutedUntilISO === undefined || mutedUntilISO === null) return false;
  return new Date(mutedUntilISO).getTime() > new Date(nowISO).getTime();
}

function createMockLocalStorage(initialStore = {}) {
  let store = { ...initialStore };
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get _store() {
      return store;
    },
  };
}

function mockBrowserGlobals({ permission = "granted", pushSubscription = null, hasWindow = true, hasNotification = true } = {}) {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalNotification = Object.getOwnPropertyDescriptor(globalThis, "Notification");
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");

  function mockNotificationClass(title, options) {
    this.title = title;
    this.options = options;
  }
  mockNotificationClass.permission = permission;
  mockNotificationClass.requestPermission = () => Promise.resolve("granted");

  const mockWin = hasWindow
    ? {
        Notification: hasNotification ? mockNotificationClass : undefined,
        dispatchEvent: () => {},
        CustomEvent: class CustomEvent {
          constructor(type, eventInitDict) {
            this.type = type;
            this.detail = eventInitDict?.detail;
          }
        },
      }
    : undefined;

  const mockNav = {
    serviceWorker: {
      ready: Promise.resolve({
        pushManager: {
          getSubscription: () => Promise.resolve(pushSubscription),
        },
      }),
    },
  };

  if (mockWin !== undefined) {
    Object.defineProperty(globalThis, "window", { value: mockWin, configurable: true, writable: true });
  } else {
    delete globalThis.window;
  }

  if (hasNotification && mockNotificationClass) {
    Object.defineProperty(globalThis, "Notification", { value: mockNotificationClass, configurable: true, writable: true });
  } else {
    delete globalThis.Notification;
  }

  Object.defineProperty(globalThis, "navigator", { value: mockNav, configurable: true, writable: true });

  return () => {
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else delete globalThis.window;

    if (originalNotification) Object.defineProperty(globalThis, "Notification", originalNotification);
    else delete globalThis.Notification;

    if (originalNavigator) Object.defineProperty(globalThis, "navigator", originalNavigator);
    else delete globalThis.navigator;
  };
}

test("buildNotificationPayload constructs direct message payload with preview", () => {
  const payload = buildNotificationPayload({
    type: "message",
    title: "Alice",
    body: "Hey, do you want to study Calculus together today?",
    conversationId: "conv-123",
    showPreview: true,
  });

  assert.equal(payload.title, "Alice");
  assert.equal(payload.body, "Hey, do you want to study Calculus together today?");
  assert.equal(payload.url, "/community/chat/conv-123");
  assert.equal(payload.tag, "chat-conv-123");
});

test("buildNotificationPayload hides preview when show_message_preview is false", () => {
  const payload = buildNotificationPayload({
    type: "message",
    title: "Bob",
    body: "Confidential message content",
    conversationId: "conv-456",
    showPreview: false,
  });

  assert.equal(payload.body, "Sent you a message");
});

test("buildNotificationPayload truncates message text longer than 100 characters", () => {
  const longText = "a".repeat(120);
  const payload = buildNotificationPayload({
    type: "message",
    title: "Carol",
    body: longText,
    conversationId: "conv-789",
    showPreview: true,
  });

  assert.equal(payload.body.length, 100);
  assert.ok(payload.body.endsWith("..."));
});

test("buildNotificationPayload constructs friend request payload", () => {
  const payload = buildNotificationPayload({
    type: "friend_request",
    body: "David wants to be your friend",
  });

  assert.equal(payload.title, "New friend request");
  assert.equal(payload.url, "/community/friends");
  assert.equal(payload.tag, "friend-requests");
});

test("buildNotificationPayload constructs friend accepted payload", () => {
  const payload = buildNotificationPayload({
    type: "friend_accepted",
    body: "Eve accepted your friend request",
  });

  assert.equal(payload.title, "Friend request accepted");
  assert.equal(payload.url, "/community/friends");
  assert.equal(payload.tag, "friend-accepts");
});

test("isQuietHoursActive detects active quiet hours spanning midnight", () => {
  const quietHours = { enabled: true, start: "22:00", end: "07:00" };
  const d1 = new Date(2026, 4, 15, 23, 30);
  const d2 = new Date(2026, 4, 15, 5, 15);
  const d3 = new Date(2026, 4, 15, 14, 0);

  assert.equal(isQuietHoursActive(quietHours, d1), true);
  assert.equal(isQuietHoursActive(quietHours, d2), true);
  assert.equal(isQuietHoursActive(quietHours, d3), false);
});

test("isQuietHoursActive returns false when quiet hours are disabled", () => {
  const quietHours = { enabled: false, start: "22:00", end: "07:00" };
  const d1 = new Date(2026, 4, 15, 23, 30);
  assert.equal(isQuietHoursActive(quietHours, d1), false);
});

test("isConversationMuted calculates active mute window correctly", () => {
  const futureDate = new Date(Date.now() + 3600000).toISOString();
  const pastDate = new Date(Date.now() - 3600000).toISOString();

  assert.equal(isConversationMuted(futureDate), true);
  assert.equal(isConversationMuted(pastDate), false);
  assert.equal(isConversationMuted(null), false);
});

test("resolveSessionDateTime parses session dates and start times accurately", () => {
  // String YYYY-MM-DD date and HH:MM start time
  const session1 = { date: "2026-06-15", startTime: "14:30" };
  const res1 = resolveSessionDateTime(session1);
  assert.ok(res1 instanceof Date);
  assert.equal(res1.getFullYear(), 2026);
  assert.equal(res1.getMonth(), 5); // June (0-indexed 5)
  assert.equal(res1.getDate(), 15);
  assert.equal(res1.getHours(), 14);
  assert.equal(res1.getMinutes(), 30);

  // Capitalized property names Date and Start, missing start time defaulting to 09:00
  const session2 = { Date: "2026-10-20" };
  const res2 = resolveSessionDateTime(session2);
  assert.equal(res2.getHours(), 9);
  assert.equal(res2.getMinutes(), 0);

  // Date object input
  const dateObj = new Date(2026, 11, 25);
  const session3 = { date: dateObj, startTime: "08:15" };
  const res3 = resolveSessionDateTime(session3);
  assert.equal(res3.getMonth(), 11);
  assert.equal(res3.getDate(), 25);
  assert.equal(res3.getHours(), 8);
  assert.equal(res3.getMinutes(), 15);

  // Invalid date returning null
  assert.equal(resolveSessionDateTime(null), null);
  assert.equal(resolveSessionDateTime({ date: "invalid-date-string" }), null);
});

test("getStoredNotifications handles missing key and corrupted JSON safely", () => {
  const originalLocalStorage = globalThis.localStorage;

  // Missing key -> []
  globalThis.localStorage = createMockLocalStorage();
  assert.deepEqual(getStoredNotifications(), []);

  // Corrupted invalid JSON -> logs error, removes key, returns []
  globalThis.localStorage = createMockLocalStorage({ [NOTIFICATION_STORAGE_KEY]: "{bad json" });
  assert.deepEqual(getStoredNotifications(), []);
  assert.equal(globalThis.localStorage.getItem(NOTIFICATION_STORAGE_KEY), null);

  // Non-array JSON -> clears key, returns []
  globalThis.localStorage = createMockLocalStorage({ [NOTIFICATION_STORAGE_KEY]: JSON.stringify({ not: "an array" }) });
  assert.deepEqual(getStoredNotifications(), []);
  assert.equal(globalThis.localStorage.getItem(NOTIFICATION_STORAGE_KEY), null);

  globalThis.localStorage = originalLocalStorage;
});

test("writeNotification caps stored notifications at 25 items max", () => {
  const originalLocalStorage = globalThis.localStorage;
  globalThis.localStorage = createMockLocalStorage();

  try {
    for (let i = 1; i <= 30; i++) {
      writeNotification({ title: `Notif ${i}`, body: `Content ${i}` });
    }

    const stored = getStoredNotifications();
    assert.equal(stored.length, 25, "Must cap stored notifications at 25 items");
    assert.equal(stored[0].title, "Notif 30", "Latest notification must be first");
    assert.equal(stored[24].title, "Notif 6", "Oldest beyond 25 items must be discarded");
  } finally {
    globalThis.localStorage = originalLocalStorage;
  }
});

test("recordNotification marks notifications muted during quiet hours in both storage and return payload", () => {
  const originalLocalStorage = globalThis.localStorage;
  globalThis.localStorage = createMockLocalStorage();

  try {
    const preferences = normalizeNotificationPreferences({
      quietHours: { enabled: true, start: "22:00", end: "08:00" },
    });

    // Simulated date during quiet hours (23:30)
    const quietDate = new Date(2026, 4, 15, 23, 30);
    const recordedMuted = recordNotification(
      { title: "Quiet Test", body: "Late night alert" },
      preferences,
      quietDate
    );

    assert.equal(recordedMuted.muted, true, "Returned record must have muted: true when quiet hours are active");

    const storedMuted = getStoredNotifications();
    assert.equal(storedMuted[0].muted, true, "Stored notification must have muted: true in localStorage");

    // Simulated date outside quiet hours (14:00)
    const activeDate = new Date(2026, 4, 15, 14, 0);
    const recordedActive = recordNotification(
      { title: "Day Test", body: "Daytime alert" },
      preferences,
      activeDate
    );

    assert.equal(recordedActive.muted, undefined, "Daytime notification should not be muted");
  } finally {
    globalThis.localStorage = originalLocalStorage;
  }
});

test("requestBrowserNotificationPermission handles unsupported, granted, denied, and requested states", async () => {
  // 1. Unsupported environment (no window or no Notification)
  const cleanup1 = mockBrowserGlobals({ hasWindow: false, hasNotification: false });
  assert.equal(await requestBrowserNotificationPermission(), "unsupported");
  cleanup1();

  // 2. Permission already granted
  const cleanup2 = mockBrowserGlobals({ permission: "granted" });
  assert.equal(await requestBrowserNotificationPermission(), "granted");
  cleanup2();

  // 3. Permission already denied
  const cleanup3 = mockBrowserGlobals({ permission: "denied" });
  assert.equal(await requestBrowserNotificationPermission(), "denied");
  cleanup3();

  // 4. Default permission requesting user action
  let requestCalled = false;
  const cleanup4 = mockBrowserGlobals({ permission: "default" });
  globalThis.Notification.requestPermission = () => {
    requestCalled = true;
    return Promise.resolve("granted");
  };

  const res = await requestBrowserNotificationPermission();
  assert.ok(requestCalled);
  assert.equal(res, "granted");
  cleanup4();
});

test("scheduleStudyReminder checks permissions, push subscription status, preferences, and delay offset", async () => {
  const originalLocalStorage = globalThis.localStorage;
  globalThis.localStorage = createMockLocalStorage();
  const fixedNow = new Date("2026-06-15T09:00:00Z").getTime();

  try {
    const session = {
      id: "sess_101",
      date: "2026-06-15",
      startTime: "10:00", // Scheduled for 10:00 AM UTC
      reminder: 15,        // 15 minute reminder -> 09:45 AM UTC (delay 45 mins)
      Topic: "Derivatives",
      Subject: "Calculus",
    };

    // 1. Returns null if permission is NOT granted
    const cleanup1 = mockBrowserGlobals({ permission: "default" });
    assert.equal(await scheduleStudyReminder(session, null, fixedNow), null);
    cleanup1();

    // 2. Returns null if active Web Push subscription exists (preventing duplicate notifications)
    const cleanup2 = mockBrowserGlobals({
      permission: "granted",
      pushSubscription: { endpoint: "https://push.example.com/sub" },
    });
    assert.equal(await scheduleStudyReminder(session, null, fixedNow), null, "Must suppress in-tab reminder when Web Push is active");
    cleanup2();

    // 3. Inactive Push subscription -> proceeds with local in-tab reminder
    const cleanup3 = mockBrowserGlobals({ permission: "granted", pushSubscription: null });

    // Returns null if studyReminders preference is disabled
    const disabledPrefs = normalizeNotificationPreferences({ studyReminders: false });
    assert.equal(await scheduleStudyReminder(session, disabledPrefs, fixedNow), null);

    // Returns null if reminder time has already passed
    const pastSession = { ...session, date: "2026-06-14" };
    assert.equal(await scheduleStudyReminder(pastSession, null, fixedNow), null);

    // Schedules timer when session is in future and permission granted
    const timer = await scheduleStudyReminder(session, null, fixedNow);
    assert.ok(timer !== null, "Timer handle must be returned for valid future session");
    clearTimeout(timer);

    // 4. Scheduling second timer for same session ID cancels previous timer
    const firstTimer = await scheduleStudyReminder(session, null, fixedNow);
    const secondTimer = await scheduleStudyReminder(session, null, fixedNow);
    assert.ok(secondTimer !== null);
    assert.notStrictEqual(firstTimer, secondTimer, "Re-scheduling must generate a new timer");
    clearTimeout(secondTimer);
    cleanup3();
  } finally {
    globalThis.localStorage = originalLocalStorage;
  }
});

test("scheduleSessionRemindersFromSessions processes batch sessions cleanly", async () => {
  const originalLocalStorage = globalThis.localStorage;
  globalThis.localStorage = createMockLocalStorage();
  const fixedNow = new Date("2026-06-15T09:00:00Z").getTime();

  const cleanup = mockBrowserGlobals({ permission: "granted", pushSubscription: null });

  try {
    const sessions = [
      { id: "batch_1", date: "2026-06-15", startTime: "10:00", reminder: 15 },
      { id: "batch_2", date: "2026-06-15", startTime: "11:00", reminder: 15 },
      { id: "batch_3", date: "2026-06-14", startTime: "10:00", reminder: 15 }, // Past session -> skipped
    ];

    const activeTimers = await scheduleSessionRemindersFromSessions(sessions, null, fixedNow);
    assert.equal(activeTimers.length, 2, "Should return timer handles for 2 valid future sessions");
    activeTimers.forEach((t) => clearTimeout(t));
  } finally {
    cleanup();
    globalThis.localStorage = originalLocalStorage;
  }
});

test("markAllNotificationsRead and dismissNotification update stored state", () => {
  const originalLocalStorage = globalThis.localStorage;
  globalThis.localStorage = createMockLocalStorage();
  const cleanup = mockBrowserGlobals({ permission: "granted" });

  try {
    writeNotification({ id: "n1", title: "First", read: false });
    writeNotification({ id: "n2", title: "Second", read: false });

    const markedRead = markAllNotificationsRead();
    assert.equal(markedRead.every((n) => n.read === true), true);

    const afterDismiss = dismissNotification("n1");
    assert.equal(afterDismiss.length, 1);
    assert.equal(afterDismiss[0].id, "n2");
  } finally {
    cleanup();
    globalThis.localStorage = originalLocalStorage;
  }
});

test("scheduleGroupSessionReminders skips when group_reminders_enabled is false, or rsvp is declined, or date is invalid", () => {
  const originalLocalStorage = globalThis.localStorage;
  globalThis.localStorage = createMockLocalStorage();
  const fixedNow = new Date("2026-06-15T09:00:00Z").getTime();

  try {
    const disabledPrefs = normalizeNotificationPreferences({ group_reminders_enabled: false });
    const groupSessions = [
      { id: "g1", scheduled_start: "2026-06-15T09:30:00Z", title: "Physics Lab", group_name: "Quantum" },
      { id: "g2", scheduled_start: "2026-06-15T09:30:00Z", user_rsvp: "declined" },
      { id: "g3", scheduled_start: "invalid-date" },
    ];

    // 1. Returns [] when group_reminders_enabled is false
    const timersDisabled = scheduleGroupSessionReminders(groupSessions, disabledPrefs, fixedNow);
    assert.deepEqual(timersDisabled, []);

    // 2. Returns [] when user_rsvp is declined or scheduled_start is invalid
    const activePrefs = normalizeNotificationPreferences({ group_reminders_enabled: true });
    const invalidSessions = [
      { id: "g2", scheduled_start: "2026-06-15T09:30:00Z", user_rsvp: "declined" },
      { id: "g3", scheduled_start: "invalid-date" },
    ];
    const timersInvalid = scheduleGroupSessionReminders(invalidSessions, activePrefs, fixedNow);
    assert.deepEqual(timersInvalid, []);
    assert.deepEqual(getStoredNotifications(), []);
  } finally {
    globalThis.localStorage = originalLocalStorage;
  }
});

test("scheduleGroupSessionReminders fires immediate notification within 2-minute tolerance window and deduplicates", () => {
  const originalLocalStorage = globalThis.localStorage;
  globalThis.localStorage = createMockLocalStorage();
  const cleanup = mockBrowserGlobals({ permission: "granted" });

  // Fixed time: 10:00:30 UTC
  // Session starts at 10:30:00 UTC -> 30m offset fire time is 10:00:00 UTC (timeDiff = -30s -> within [-120000, 0] tolerance)
  const fixedNow = new Date("2026-06-15T10:00:30Z").getTime();
  const groupSessions = [
    { id: "g_tol_1", scheduled_start: "2026-06-15T10:30:00Z", title: "Math Group", group_name: "Calculus Crew" },
  ];

  try {
    const activePrefs = normalizeNotificationPreferences({ group_reminders_enabled: true });

    // First call -> fires 30m offset notification immediately
    const timers1 = scheduleGroupSessionReminders(groupSessions, activePrefs, fixedNow);
    timers1.forEach((t) => clearTimeout(t));

    const stored = getStoredNotifications();
    assert.equal(stored.length, 1);
    assert.ok(stored[0].body.includes("Starts in 30 minutes"));
    assert.ok(stored[0].body.includes("Math Group"));

    // Check localStorage deduplication map contains fired tag key
    const rawFired = globalThis.localStorage.getItem("hyper-tutor-fired-group-reminders");
    assert.ok(rawFired);
    const firedMap = JSON.parse(rawFired);
    assert.ok(firedMap["g_tol_1-30"]);

    // Second call with same parameters -> skips because tag key is recorded in firedMap
    const timers2 = scheduleGroupSessionReminders(groupSessions, activePrefs, fixedNow);
    timers2.forEach((t) => clearTimeout(t));
    assert.equal(getStoredNotifications().length, 1, "Must not duplicate notification for already fired offset");
  } finally {
    cleanup();
    globalThis.localStorage = originalLocalStorage;
  }
});

test("scheduleGroupSessionReminders schedules future timers for active offsets and respects individual toggles", () => {
  const originalLocalStorage = globalThis.localStorage;
  globalThis.localStorage = createMockLocalStorage();
  const cleanup = mockBrowserGlobals({ permission: "granted" });

  // Fixed time: 09:00:00 UTC
  // Session starts at 10:00:00 UTC -> 30m offset is 09:30:00 (in 30 mins), 15m is 09:45:00 (in 45 mins), 0m is 10:00:00 (in 60 mins)
  const fixedNow = new Date("2026-06-15T09:00:00Z").getTime();
  const groupSessions = [
    { id: "g_fut_1", scheduled_start: "2026-06-15T10:00:00Z", title: "Chemistry Prep", group_name: "OrgChem" },
  ];

  try {
    // 1. All offsets enabled -> returns 3 active timer handles (30m, 15m, 0m)
    const allPrefs = normalizeNotificationPreferences({
      group_reminders_enabled: true,
      group_reminder_30m: true,
      group_reminder_15m: true,
      group_reminder_0m: true,
    });

    const timers = scheduleGroupSessionReminders(groupSessions, allPrefs, fixedNow);
    assert.equal(timers.length, 3, "Must schedule 3 timers for 30m, 15m, and 0m offsets");
    timers.forEach((t) => clearTimeout(t));

    // 2. 15m offset disabled -> returns 2 active timer handles (30m, 0m)
    const partialPrefs = normalizeNotificationPreferences({
      group_reminders_enabled: true,
      group_reminder_30m: true,
      group_reminder_15m: false,
      group_reminder_0m: true,
    });

    const partialTimers = scheduleGroupSessionReminders(groupSessions, partialPrefs, fixedNow);
    assert.equal(partialTimers.length, 2, "Must schedule 2 timers when 15m offset is disabled");
    partialTimers.forEach((t) => clearTimeout(t));
  } finally {
    cleanup();
    globalThis.localStorage = originalLocalStorage;
  }
});

test("scheduleStudyReminder suppresses time_block activity types", async () => {
  const originalLocalStorage = globalThis.localStorage;
  globalThis.localStorage = createMockLocalStorage();
  const fixedNow = new Date("2026-06-15T09:00:00Z").getTime();
  const cleanup = mockBrowserGlobals({ permission: "granted", pushSubscription: null });

  try {
    const timeBlockType = {
      id: "tb_1",
      type: "time_block",
      date: "2026-06-15",
      startTime: "10:00",
      reminder: 15,
    };
    assert.equal(await scheduleStudyReminder(timeBlockType, null, fixedNow), null, "type='time_block' must return null");

    const timeBlockActivityType = {
      id: "tb_2",
      activityType: "time_block",
      date: "2026-06-15",
      startTime: "10:00",
      reminder: 15,
    };
    assert.equal(await scheduleStudyReminder(timeBlockActivityType, null, fixedNow), null, "activityType='time_block' must return null");
  } finally {
    cleanup();
    globalThis.localStorage = originalLocalStorage;
  }
});

test("scheduleStudyReminder handles deadline activity types and respects deadlineReminders preference", async () => {
  const originalLocalStorage = globalThis.localStorage;
  globalThis.localStorage = createMockLocalStorage();
  const fixedNow = new Date("2026-06-15T08:00:00Z").getTime();

  let _showNotificationCalled = null;
  const cleanup = mockBrowserGlobals({ permission: "granted", pushSubscription: null });

  // Mock Service Worker showNotification
  navigator.serviceWorker.ready = Promise.resolve({
    pushManager: { getSubscription: () => Promise.resolve(null) },
    showNotification: (title, options) => {
      _showNotificationCalled = { title, options };
    },
  });

  try {
    const deadlineSession = {
      id: "dl_100",
      type: "deadline",
      due_date: "2026-06-15",
      title: "Submit Final Term Paper",
      subject: "History",
      reminder: 30, // 30m before 09:00 default = 08:30 (fixedNow is 08:00, delay 30m)
    };

    // 1. Returns null if deadlineReminders is false
    const disabledPrefs = normalizeNotificationPreferences({ deadlineReminders: false });
    assert.equal(await scheduleStudyReminder(deadlineSession, disabledPrefs, fixedNow), null);

    // 2. Returns active timer if deadlineReminders is true
    const enabledPrefs = normalizeNotificationPreferences({ deadlineReminders: true });
    const timer = await scheduleStudyReminder(deadlineSession, enabledPrefs, fixedNow);
    assert.ok(timer !== null);
    clearTimeout(timer);
  } finally {
    cleanup();
    globalThis.localStorage = originalLocalStorage;
  }
});

test("scheduleStudyReminder isolates recurring session timers across distinct dates", async () => {
  const originalLocalStorage = globalThis.localStorage;
  globalThis.localStorage = createMockLocalStorage();
  const fixedNow = new Date("2026-06-15T08:00:00Z").getTime();
  const cleanup = mockBrowserGlobals({ permission: "granted", pushSubscription: null });

  try {
    const recurringDay1 = {
      id: "rec_sess_1",
      activityId: "rec_act_1",
      isRecurring: true,
      date: "2026-06-15",
      startTime: "10:00",
      reminder: 15,
    };

    const recurringDay2 = {
      id: "rec_sess_1",
      activityId: "rec_act_1",
      isRecurring: true,
      date: "2026-06-16",
      startTime: "10:00",
      reminder: 15,
    };

    const timer1 = await scheduleStudyReminder(recurringDay1, null, fixedNow);
    const timer2 = await scheduleStudyReminder(recurringDay2, null, fixedNow);

    assert.ok(timer1 !== null);
    assert.ok(timer2 !== null);
    assert.notStrictEqual(timer1, timer2, "Recurring instances on different dates must generate distinct timer handles");

    clearTimeout(timer1);
    clearTimeout(timer2);
  } finally {
    cleanup();
    globalThis.localStorage = originalLocalStorage;
  }
});

test("scheduleStudyReminder formats 0-minute reminder body as 'starts now' and invokes ServiceWorker showNotification", async () => {
  const originalLocalStorage = globalThis.localStorage;
  globalThis.localStorage = createMockLocalStorage();

  // Schedule for 100ms in future using scheduled_start
  const startTimeMs = Date.now() + 100;
  const startDateISO = new Date(startTimeMs).toISOString();

  let showNotificationPayload = null;
  const cleanup = mockBrowserGlobals({ permission: "granted", pushSubscription: null });

  navigator.serviceWorker.ready = Promise.resolve({
    pushManager: { getSubscription: () => Promise.resolve(null) },
    showNotification: (title, options) => {
      showNotificationPayload = { title, options };
    },
  });

  try {
    const session = {
      id: "sess_immediate",
      scheduled_start: startDateISO,
      reminder: 0,
      Subject: "Calculus",
      Topic: "Derivatives",
    };

    const timer = await scheduleStudyReminder(session, null, Date.now());
    assert.ok(timer !== null);

    // Wait for timer to execute
    await new Promise((resolve) => setTimeout(resolve, 160));

    // Verify stored notification
    const stored = getStoredNotifications();
    assert.equal(stored.length, 1);
    assert.equal(stored[0].title, "Study session starting soon");
    assert.equal(stored[0].body, "Calculus - Derivatives starts now");

    // Verify ServiceWorker showNotification payload
    assert.ok(showNotificationPayload !== null);
    assert.equal(showNotificationPayload.title, "Study session starting soon");
    assert.equal(showNotificationPayload.options.body, "Calculus - Derivatives starts now");
    assert.equal(showNotificationPayload.options.data.url, "/Study/sess_immediate");
  } finally {
    cleanup();
    globalThis.localStorage = originalLocalStorage;
  }
});

test("getNotificationPreferences and persistNotificationPreferences handle custom state and corrupted key recovery", () => {
  const originalLocalStorage = globalThis.localStorage;

  const PREF_KEY = "hyper-tutor-notification-preferences";
  globalThis.localStorage = createMockLocalStorage();

  try {
    // 1. Default preferences
    const defaults = getNotificationPreferences();
    assert.equal(defaults.browserPush, true);
    assert.equal(defaults.quietHours.enabled, true);

    // 2. Persist custom preferences
    persistNotificationPreferences({ browserPush: false, studyReminders: false });
    const updated = getNotificationPreferences();
    assert.equal(updated.browserPush, false);
    assert.equal(updated.studyReminders, false);
    assert.equal(updated.inApp, true, "Unspecified keys must keep defaults");

    // 3. Corrupted key recovery
    globalThis.localStorage.setItem(PREF_KEY, "invalid json string");
    const recovered = getNotificationPreferences();
    assert.equal(recovered.browserPush, true, "Corrupted key must fall back to normalized defaults");
    assert.equal(globalThis.localStorage.getItem(PREF_KEY), null, "Corrupted key must be cleared");
  } finally {
    globalThis.localStorage = originalLocalStorage;
  }
});
