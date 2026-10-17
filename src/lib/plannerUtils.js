const LOCAL_STORAGE_KEY = 'hyper_tutor_planner_defaults';

/**
 * Returns the next rounded 30-minute time string (e.g. 14:15 -> "14:30")
 */
export function getNextHalfHour(fromDate = new Date()) {
  const date = new Date(fromDate);
  const minutes = date.getMinutes();
  const remainder = minutes % 30;
  date.setMinutes(minutes + (30 - remainder), 0, 0);

  const hours = String(date.getHours()).padStart(2, '0');
  const mins = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${mins}`;
}

/**
 * Formats "14:30" to "2:30 PM"
 */
export function formatTimeSlot(timeStr) {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return timeStr;

  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  const displayMins = String(minutes).padStart(2, '0');
  return `${displayHours}:${displayMins} ${period}`;
}

/**
 * Calculates end time string from startTime ("14:00") and durationMinutes (45)
 */
/**
 * Calculates minutes difference between two time strings ("09:00" and "10:30")
 */
export function calculateMinutesBetween(startTimeStr, endTimeStr) {
  if (!startTimeStr || !endTimeStr) return 60;
  const [sh, sm] = startTimeStr.split(':').map(Number);
  const [eh, em] = endTimeStr.split(':').map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 60;
  let startMins = sh * 60 + sm;
  let endMins = eh * 60 + em;
  if (endMins < startMins) endMins += 24 * 60;
  return Math.max(0, endMins - startMins);
}

export function calculateEndTimeString(startTimeStr, durationMinutes) {
  if (!startTimeStr) return '';
  const [hours, minutes] = startTimeStr.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return '';

  const totalMinutes = hours * 60 + minutes + Number(durationMinutes || 0);
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMins = totalMinutes % 60;

  const period = endHours >= 12 ? 'PM' : 'AM';
  const displayHours = endHours % 12 === 0 ? 12 : endHours % 12;
  const displayMins = String(endMins).padStart(2, '0');
  return `${displayHours}:${displayMins} ${period}`;
}

/**
 * Reads form defaults from localStorage or returns fallback defaults
 */
export function getPlannerDefaults(preferredTime = null) {
  let defaultStartTime = getNextHalfHour();
  if (preferredTime) {
    const normalized = String(preferredTime).trim().toLowerCase();
    if (normalized === 'morning') {
      defaultStartTime = '09:00';
    } else if (normalized === 'afternoon') {
      defaultStartTime = '14:00';
    } else if (normalized === 'evening') {
      defaultStartTime = '19:00';
    }
  }

  const fallback = {
    date: new Date().toISOString().slice(0, 10),
    startTime: defaultStartTime,
    duration: 45,
    reminder: 15,
    subject: '',
    priority: 'normal',
    color: '#3B82F6',
  };

  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          ...fallback,
          startTime: parsed.startTime ?? fallback.startTime,
          duration: parsed.duration ?? fallback.duration,
          reminder: parsed.reminder ?? fallback.reminder,
          subject: parsed.subject ?? fallback.subject,
          priority: parsed.priority ?? fallback.priority,
          color: parsed.color ?? fallback.color,
        };
      }
    }
  } catch (e) {
    console.warn('Failed to parse planner defaults from localStorage:', e);
  }

  return fallback;
}

/**
 * Saves form preferences to localStorage
 */
export function savePlannerDefaults(settings) {
  try {
    const existing = getPlannerDefaults();
    const updated = {
      ...existing,
      duration: settings.duration,
      reminder: settings.reminder,
      subject: settings.subject,
      priority: settings.priority,
      color: settings.color,
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save planner defaults to localStorage:', e);
  }
}

/**
 * Gets user system timezone
 */
export function getUserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Computes recurrence summary string and preview dates
 */
export function generateRecurrencePreview({
  startDate,
  frequency,
  interval = 1,
  daysOfWeek = [],
  endsMode = 'never',
  endsOn = null,
  maxOccurrences = null,
}) {
  if (frequency === 'none') {
    return { summary: 'Does not repeat', previewDates: [] };
  }

  const start = new Date(startDate || Date.now());
  const dates = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  let summary = '';
  if (frequency === 'daily') {
    summary = interval === 1 ? 'Repeats daily' : `Repeats every ${interval} days`;
  } else if (frequency === 'weekdays') {
    summary = 'Repeats every weekday (Mon-Fri)';
  } else if (frequency === 'weekly') {
    const activeDays = (daysOfWeek && daysOfWeek.length > 0 ? daysOfWeek : [start.getDay()])
      .sort((a, b) => a - b)
      .map((d) => dayNames[d])
      .join(', ');
    summary = interval === 1 ? `Repeats every ${activeDays}` : `Repeats every ${interval} weeks on ${activeDays}`;
  } else if (frequency === 'custom') {
    const activeDays = (daysOfWeek && daysOfWeek.length > 0 ? daysOfWeek : [start.getDay()])
      .sort((a, b) => a - b)
      .map((d) => dayNames[d])
      .join(', ');
    summary = `Custom repeat on ${activeDays}`;
  }

  if (endsMode === 'on_date' && endsOn) {
    summary += ` until ${new Date(endsOn).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  } else if (endsMode === 'after_count' && maxOccurrences) {
    summary += ` (${maxOccurrences} sessions)`;
  }

  // Calculate up to 3 upcoming dates
  let curr = new Date(start);
  let count = 0;
  const maxSearchDays = 365;
  let searchedDays = 0;

  const targetDays = daysOfWeek && daysOfWeek.length > 0 ? daysOfWeek : [start.getDay()];
  const endLimitDate = endsMode === 'on_date' && endsOn ? new Date(endsOn) : null;

  while (dates.length < 3 && searchedDays < maxSearchDays) {
    const dow = curr.getDay();
    let match = false;

    if (frequency === 'daily') {
      if (searchedDays % interval === 0) match = true;
    } else if (frequency === 'weekdays') {
      if (dow >= 1 && dow <= 5) match = true;
    } else if (frequency === 'weekly' || frequency === 'custom') {
      if (targetDays.includes(dow)) match = true;
    }

    if (match) {
      if (endLimitDate && curr > endLimitDate) break;
      count++;
      if (endsMode === 'after_count' && maxOccurrences && count > maxOccurrences) break;

      dates.push(new Date(curr));
    }

    curr.setDate(curr.getDate() + 1);
    searchedDays++;
  }

  return {
    summary,
    previewDates: dates.map((d) =>
      d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    ),
  };
}

/**
 * Suggests nearest free slot given a start_at and duration_minutes by shifting forward in 30min increments
 */
export function suggestNextFreeSlot(startAtDate, durationMinutes, conflicts = []) {
  if (!conflicts || conflicts.length === 0) {
    return { suggestedStart: startAtDate, suggestedStartStr: startAtDate.toTimeString().slice(0, 5) };
  }

  let candidate = new Date(startAtDate);
  const maxAttempts = 24; // Check up to 12 hours out
  let attempts = 0;

  while (attempts < maxAttempts) {
    const candStart = candidate.getTime();
    const candEnd = candStart + durationMinutes * 60000;

    const hasConflict = conflicts.some((c) => {
      const cStart = new Date(c.start_at).getTime();
      const cEnd = new Date(c.end_at).getTime();
      return candStart < cEnd && candEnd > cStart;
    });

    if (!hasConflict) {
      const hours = String(candidate.getHours()).padStart(2, '0');
      const mins = String(candidate.getMinutes()).padStart(2, '0');
      return {
        suggestedStart: candidate,
        suggestedStartStr: `${hours}:${mins}`,
      };
    }

    // Shift candidate by 30 minutes
    candidate = new Date(candidate.getTime() + 30 * 60000);
    attempts++;
  }

  return { suggestedStart: startAtDate, suggestedStartStr: startAtDate.toTimeString().slice(0, 5) };
}

/**
 * Returns the Date instance representing the session's scheduled start time in local timezone.
 */
export function getSessionStartDate(session) {
  if (!session) return null;

  if (session.date instanceof Date && !isNaN(session.date.getTime())) {
    return session.date;
  }

  const dateStr = session.Date || (typeof session.date === 'string' ? session.date : null);
  const timeStr = session.Start || session.startTime || session.start_time || '00:00';

  if (dateStr && typeof dateStr === 'string' && dateStr.includes('-')) {
    const dateParts = dateStr.slice(0, 10).split('-').map(Number);
    if (dateParts.length === 3 && !dateParts.some(isNaN)) {
      const [year, month, day] = dateParts;
      const timeParts = String(timeStr).split(':').map(Number);
      const hours = !isNaN(timeParts[0]) ? timeParts[0] : 0;
      const minutes = !isNaN(timeParts[1]) ? timeParts[1] : 0;
      return new Date(year, month - 1, day, hours, minutes, 0, 0);
    }
  }

  if (session.scheduled_start) {
    const d = new Date(session.scheduled_start);
    if (!isNaN(d.getTime())) return d;
  }

  if (session.date) {
    const d = new Date(session.date);
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

/**
 * Checks if a planned session is "slipping".
 * A session is "slipping" when ALL are true:
 * 1. Its scheduled start (date + time, in the USER'S LOCAL timezone) is more than 60 minutes before now
 * 2. It has not been started, is not in progress, and is not completed
 * 3. It has not been deleted
 */
export function isSlipping(session, now = new Date()) {
  if (!session) return false;
  if (session.deleted || session.is_deleted) return false;

  if (session.completed === true || session.completed === 1) return false;

  const statusStr = String(session.session_status || session.status || '').toLowerCase().trim();
  if (
    statusStr === 'completed' ||
    statusStr === 'in_progress' ||
    statusStr === 'paused' ||
    statusStr === 'started' ||
    statusStr === 'active_session'
  ) {
    return false;
  }

  const startDate = getSessionStartDate(session);
  if (!startDate || isNaN(startDate.getTime())) return false;

  const diffMs = now.getTime() - startDate.getTime();
  // More than 60 minutes overdue (> 3,600,000 ms)
  return diffMs > 60 * 60 * 1000;
}

/**
 * Computes overdue duration object and display string ("Xh Ym overdue" or "Ym overdue").
 */
export function getOverdueDuration(session, now = new Date()) {
  const startDate = getSessionStartDate(session);
  if (!startDate || isNaN(startDate.getTime())) {
    return { hours: 0, minutes: 0, totalMinutes: 0, display: '0m overdue' };
  }

  const diffMs = Math.max(0, now.getTime() - startDate.getTime());
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  let display = '';
  if (hours > 0 && minutes > 0) {
    display = `${hours}h ${minutes}m overdue`;
  } else if (hours > 0) {
    display = `${hours}h overdue`;
  } else {
    display = `${minutes}m overdue`;
  }

  return { hours, minutes, totalMinutes, display };
}
