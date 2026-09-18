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
  quietHours: {
    enabled: true,
    start: "22:00",
    end: "08:00",
  },
};

const reminderTimers = new Map();

export function resolveSessionDateTime(session) {
  if (!session) return null;

  const rawDate = session.Date ?? session.date;
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

  const timeValue = session.Start ?? session.startTime ?? "09:00";
  const [hours = 0, minutes = 0] = String(timeValue).split(":").map(Number);
  const scheduledAt = new Date(baseDate);
  scheduledAt.setHours(Number.isFinite(hours) ? hours : 0, Number.isFinite(minutes) ? minutes : 0, 0, 0);

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

export function isQuietHoursActive(quietHours = defaultNotificationPreferences.quietHours) {
  if (!quietHours?.enabled) return false;

  const now = new Date();
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
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (error) {
    console.warn("Could not read notifications from local storage:", error);
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

export function recordNotification(notification, preferences = null) {
  const mergedPreferences = normalizeNotificationPreferences(preferences || JSON.parse(localStorage.getItem("hyper-tutor-notification-preferences") || "null"));
  const quietHoursActive = isQuietHoursActive(mergedPreferences.quietHours);
  const notificationRecord = writeNotification(notification);

  if (quietHoursActive) {
    const muted = { ...notificationRecord, muted: true };
    saveStoredNotifications(getStoredNotifications().map((item) => item.id === muted.id ? muted : item));
    return notificationRecord;
  }

  return notificationRecord;
}

export async function hasActivePushSubscription() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return Boolean(subscription);
  } catch (e) {
    return false;
  }
}

export async function scheduleStudyReminder(session, preferences = null) {
  if (!session || !session.id) return null;

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
  if (!mergedPreferences.studyReminders) return null;

  const scheduledAt = resolveSessionDateTime(session);
  if (!scheduledAt) return null;

  const reminderMins = Number(session.reminder ?? session.reminder_minutes ?? 15);
  const reminderTime = new Date(scheduledAt.getTime() - reminderMins * 60 * 1000);
  const delayMs = reminderTime.getTime() - Date.now();

  if (delayMs <= 0) return null;

  if (reminderTimers.has(session.id)) {
    clearTimeout(reminderTimers.get(session.id));
  }

  const timer = setTimeout(async () => {
    const title = "Study session starting soon";
    const sessionTopic = session.Topic || session.title || "Session";
    const sessionSubject = session.Subject || session.subject || "Study";
    const body = reminderMins === 0 ? `${sessionSubject} - ${sessionTopic} starts now` : `${sessionSubject} - ${sessionTopic} starts in ${reminderMins} minutes`;
    const dateStr = scheduledAt.toISOString().slice(0, 10);
    const tagStr = `session-${session.id}-${dateStr}`;

    recordNotification({
      title,
      body,
      type: "studyReminders",
      context: "study",
    }, mergedPreferences);

    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      reg.showNotification(title, {
        body,
        icon: "/icons/icon-192.png",
        badge: "/icons/badge-72.png",
        tag: tagStr,
        data: { url: `/Study/${session.id}` },
      });
    }

    reminderTimers.delete(session.id);
  }, delayMs);

  reminderTimers.set(session.id, timer);
  return timer;
}

export function scheduleSessionRemindersFromSessions(sessions, preferences = null) {
  const mergedPreferences = normalizeNotificationPreferences(preferences || getNotificationPreferences());
  if (!Array.isArray(sessions)) return [];

  return sessions
    .map((session) => scheduleStudyReminder(session, mergedPreferences))
    .filter(Boolean);
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
  try {
    const raw = localStorage.getItem("hyper-tutor-notification-preferences");
    return normalizeNotificationPreferences(raw ? JSON.parse(raw) : defaultNotificationPreferences);
  } catch (error) {
    return normalizeNotificationPreferences(defaultNotificationPreferences);
  }
}
