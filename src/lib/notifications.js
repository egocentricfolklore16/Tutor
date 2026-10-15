export const defaultNotificationPreferences = {
  browserPush: true,
  inApp: true,
  studyReminders: true,
  deadlineReminders: true,
  progressMilestones: true,
  aiSuggestions: true,
  community: true,
  systemAlerts: true,
  digest: "normal",
  autoPrompt: true,
  group_reminders_enabled: true,
  group_reminder_30m: true,
  group_reminder_15m: true,
  group_reminder_0m: true,
  quietHours: {
    enabled: true,
    start: "22:00",
    end: "08:00",
  },
};

const reminderTimers = new Map();
const FIRED_REMINDERS_KEY = "hyper-tutor-fired-group-reminders";

function getFiredGroupReminders() {
  try {
    const raw = localStorage.getItem(FIRED_REMINDERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setFiredGroupReminder(tagKey, expiresAt) {
  try {
    const fired = getFiredGroupReminders();
    fired[tagKey] = expiresAt;

    // Prune expired tags
    const now = Date.now();
    const clean = {};
    for (const [k, exp] of Object.entries(fired)) {
      if (exp > now) clean[k] = exp;
    }
    clean[tagKey] = expiresAt;
    localStorage.setItem(FIRED_REMINDERS_KEY, JSON.stringify(clean));
  } catch {
    // ignore
  }
}

export function resolveSessionDateTime(session) {
  if (!session) return null;

  if (session.type === "deadline" || session.due_date || session.deadline) {
    const rawDueDate = session.due_date || session.deadline || session.date;
    if (!rawDueDate) return null;
    const baseDate = new Date(`${rawDueDate}T09:00:00`);
    return Number.isNaN(baseDate.getTime()) ? null : baseDate;
  }

  const rawDate = session.Date ?? session.date ?? session.scheduled_start;
  let baseDate;

  if (rawDate instanceof Date) {
    baseDate = new Date(rawDate);
  } else if (typeof rawDate === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      const [year, month, day] = rawDate.split("-").map(Number);
      baseDate = new Date(year, month - 1, day);
    } else {
      baseDate = new Date(rawDate);
    }
  } else if (rawDate) {
    baseDate = new Date(rawDate);
  }

  if (Number.isNaN(baseDate?.getTime?.())) {
    return null;
  }

  const timeValue = session.Start ?? session.startTime ?? session.start_time ?? "09:00";
  const [hours = 0, minutes = 0] = String(timeValue).split(":").map(Number);
  const scheduledAt = new Date(baseDate);
  if (!session.scheduled_start) {
    scheduledAt.setHours(Number.isFinite(hours) ? hours : 0, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  }

  return scheduledAt;
}

export function normalizeNotificationPreferences(value) {
  const incoming = value && typeof value === "object" ? value : {};
  return {
    ...defaultNotificationPreferences,
    ...incoming,
    quietHours: {
      ...defaultNotificationPreferences.quietHours,
      ...(incoming.quietHours || {}),
    },
  };
}

export function isQuietHoursActive(quietHours = defaultNotificationPreferences.quietHours, date = new Date()) {
  if (!quietHours?.enabled) return false;

  const now = date instanceof Date ? date : new Date(date);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const parseTime = (time) => {
    if (!time || typeof time !== "string") return 0;
    const [hours, minutes] = time.split(":").map(Number);
    return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
  };

  const startMinutes = parseTime(quietHours.start);
  const endMinutes = parseTime(quietHours.end);

  if (startMinutes === endMinutes) return false;

  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

export const NOTIFICATION_STORAGE_KEY = "hyper-tutor-notifications-v1";

export function getStoredNotifications() {
  try {
    const raw = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.error(`Invalid notifications shape in localStorage key '${NOTIFICATION_STORAGE_KEY}'. Clearing key.`);
      localStorage.removeItem(NOTIFICATION_STORAGE_KEY);
      return [];
    }
    return parsed;
  } catch (error) {
    console.error(`Error parsing JSON from localStorage key '${NOTIFICATION_STORAGE_KEY}':`, error);
    try {
      localStorage.removeItem(NOTIFICATION_STORAGE_KEY);
    } catch {
      // ignore
    }
    return [];
  }
}

export function saveStoredNotifications(notifications) {
  localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(notifications));

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hyper-tutor-notifications-updated", {
      detail: notifications,
    }));
  }
}

export function writeNotification(notification) {
  const notifications = getStoredNotifications();
  const nextNotification = {
    id: notification.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: notification.title || "Hyper Tutor",
    body: notification.body || "",
    type: notification.type || "general",
    context: notification.context || "system",
    read: Boolean(notification.read),
    createdAt: notification.createdAt || new Date().toISOString(),
  };

  const nextNotifications = [nextNotification, ...notifications].slice(0, 25);
  saveStoredNotifications(nextNotifications);
  return nextNotification;
}

export function recordNotification(notification, preferences = null, date = new Date()) {
  const mergedPreferences = normalizeNotificationPreferences(preferences || getNotificationPreferences());
  const quietHoursActive = isQuietHoursActive(mergedPreferences.quietHours, date);
  const notificationRecord = writeNotification(notification);

  if (quietHoursActive) {
    const muted = { ...notificationRecord, muted: true };
    saveStoredNotifications(getStoredNotifications().map((item) => item.id === muted.id ? muted : item));
    return muted;
  }

  return notificationRecord;
}

export async function hasActivePushSubscription() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return Boolean(subscription);
  } catch {
    return false;
  }
}

export async function scheduleStudyReminder(session, preferences = null, now = Date.now()) {
  if (!session || !session.id) return null;

  // Do not fire study session starting notifications for time blocks
  if (session.type === "time_block" || session.activityType === "time_block") {
    return null;
  }

  // In-tab fallback ONLY when permission is granted BUT there is NO active push subscription
  if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") {
    return null;
  }

  const pushActive = await hasActivePushSubscription();
  if (pushActive) {
    // Web Push is handling reminders; disable local in-tab fallback timer to avoid duplicate notifications
    return null;
  }

  const mergedPreferences = normalizeNotificationPreferences(preferences || getNotificationPreferences());

  if (session.type === "deadline" || session.activityType === "deadline") {
    if (!mergedPreferences.deadlineReminders) return null;
  } else {
    if (!mergedPreferences.studyReminders) return null;
  }

  const scheduledAt = resolveSessionDateTime(session);
  if (!scheduledAt) return null;

  const reminderMins = Number(session.reminder ?? session.reminder_minutes ?? 15);
  const reminderTime = new Date(scheduledAt.getTime() - reminderMins * 60 * 1000);
  const currentTime = now instanceof Date ? now.getTime() : (typeof now === "number" ? now : Date.now());
  const delayMs = reminderTime.getTime() - currentTime;

  if (delayMs <= 0) return null;

  const timerKey = session.isRecurring ? `${session.activityId || session.id}-${scheduledAt.toISOString().slice(0, 10)}-${reminderMins}` : session.id;

  if (reminderTimers.has(timerKey)) {
    clearTimeout(reminderTimers.get(timerKey));
  }

  const timer = setTimeout(async () => {
    const isDl = session.type === "deadline" || session.activityType === "deadline";
    const title = isDl ? "Upcoming deadline reminder" : "Study session starting soon";
    const sessionTopic = session.Topic || session.title || session.purpose || "Session";
    const sessionSubject = session.Subject || session.subject || (isDl ? "Deadline" : "Study");
    const body = reminderMins === 0
      ? `${sessionSubject} - ${sessionTopic} starts now`
      : `${sessionSubject} - ${sessionTopic} in ${reminderMins} minutes`;
    const dateStr = scheduledAt.toISOString().slice(0, 10);
    const tagStr = `${session.type || "session"}-${session.id}-${dateStr}`;

    recordNotification({
      title,
      body,
      type: isDl ? "deadlineReminders" : "studyReminders",
      context: "study",
    }, mergedPreferences);

    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      reg.showNotification(title, {
        body,
        icon: "/icons/icon-192.png",
        badge: "/icons/badge-72.png",
        tag: tagStr,
        data: { url: isDl ? "/Planner" : `/Study/${session.id}` },
      });
    }

    reminderTimers.delete(timerKey);
  }, delayMs);

  reminderTimers.set(timerKey, timer);
  return timer;
}

export function scheduleGroupSessionReminders(groupSessions, preferences = null, now = Date.now()) {
  const prefs = normalizeNotificationPreferences(preferences || getNotificationPreferences());
  if (!prefs.group_reminders_enabled) return [];

  const currentTime = now instanceof Date ? now.getTime() : (typeof now === "number" ? now : Date.now());
  const firedMap = getFiredGroupReminders();
  const scheduledTimers = [];

  const offsets = [
    { key: "group_reminder_30m", offsetMins: 30, text: (t, g) => `Starts in 30 minutes: ${t} · ${g}` },
    { key: "group_reminder_15m", offsetMins: 15, text: (t, g) => `Starts in 15 minutes: ${t} · ${g}` },
    { key: "group_reminder_0m", offsetMins: 0, text: (t, g) => `Starting now: ${t} · ${g}` },
  ];

  (groupSessions || []).forEach((sess) => {
    if (!sess || sess.user_rsvp === "declined") return;

    const startMs = new Date(sess.scheduled_start).getTime();
    if (isNaN(startMs)) return;

    const durationMins = sess.duration_minutes || 60;
    const expiresAt = startMs + durationMins * 60 * 1000;

    offsets.forEach(({ key, offsetMins, text }) => {
      if (!prefs[key]) return;

      const tagKey = `${sess.id}-${offsetMins}`;
      if (firedMap[tagKey]) return; // Already fired

      const fireTimeMs = startMs - offsetMins * 60 * 1000;
      const timeDiff = fireTimeMs - currentTime;

      // Tolerance window: if fire time is past by less than 2 minutes, fire immediately
      if (timeDiff <= 0 && timeDiff >= -120000) {
        // Fire now
        const bodyText = text(sess.title || "Study Session", sess.group_name || "Group");
        recordNotification({
          title: "Group Study Session",
          body: bodyText,
          type: "community",
          context: "community",
        }, prefs);

        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          new Notification("Group Study Session", {
            body: bodyText,
            tag: tagKey,
          });
        }

        setFiredGroupReminder(tagKey, expiresAt);
      } else if (timeDiff > 0) {
        // Set in-tab timer
        if (reminderTimers.has(tagKey)) {
          clearTimeout(reminderTimers.get(tagKey));
        }

        const timer = setTimeout(() => {
          const bodyText = text(sess.title || "Study Session", sess.group_name || "Group");
          recordNotification({
            title: "Group Study Session",
            body: bodyText,
            type: "community",
            context: "community",
          }, prefs);

          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            new Notification("Group Study Session", {
              body: bodyText,
              tag: tagKey,
            });
          }

          setFiredGroupReminder(tagKey, expiresAt);
          reminderTimers.delete(tagKey);
        }, timeDiff);

        reminderTimers.set(tagKey, timer);
        scheduledTimers.push(timer);
      }
    });
  });

  return scheduledTimers;
}

export async function scheduleSessionRemindersFromSessions(sessions, preferences = null, now = Date.now()) {
  const mergedPreferences = normalizeNotificationPreferences(preferences || getNotificationPreferences());
  if (!Array.isArray(sessions)) return [];

  const results = await Promise.all(
    sessions.map((session) => scheduleStudyReminder(session, mergedPreferences, now))
  );
  return results.filter(Boolean);
}

export function markAllNotificationsRead() {
  const notifications = getStoredNotifications().map((item) => ({ ...item, read: true }));
  saveStoredNotifications(notifications);
  return notifications;
}

export function dismissNotification(notificationId) {
  const notifications = getStoredNotifications().filter((item) => item.id !== notificationId);
  saveStoredNotifications(notifications);
  return notifications;
}

export async function requestBrowserNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";

  return Notification.requestPermission();
}

export function persistNotificationPreferences(preferences) {
  const next = normalizeNotificationPreferences(preferences);
  localStorage.setItem("hyper-tutor-notification-preferences", JSON.stringify(next));
  return next;
}

export function getNotificationPreferences() {
  const KEY = "hyper-tutor-notification-preferences";
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return normalizeNotificationPreferences(defaultNotificationPreferences);
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      console.error(`Invalid notification preferences shape in localStorage key '${KEY}'. Clearing key.`);
      localStorage.removeItem(KEY);
      return normalizeNotificationPreferences(defaultNotificationPreferences);
    }
    return normalizeNotificationPreferences(parsed);
  } catch (error) {
    console.error(`Error parsing JSON from localStorage key '${KEY}':`, error);
    try {
      localStorage.removeItem(KEY);
    } catch {
      // ignore
    }
    return normalizeNotificationPreferences(defaultNotificationPreferences);
  }
}
