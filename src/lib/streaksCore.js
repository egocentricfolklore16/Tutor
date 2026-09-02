export function getActivityDate(now = new Date(), timeZone = "UTC", cutoffHour = 3) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now).reduce((values, part) => ({ ...values, [part.type]: part.value }), {});
  const localDate = `${parts.year}-${parts.month}-${parts.day}`;
  if (Number(parts.hour) >= cutoffHour) return localDate;
  const previous = new Date(`${localDate}T00:00:00Z`);
  previous.setUTCDate(previous.getUTCDate() - 1);
  return previous.toISOString().slice(0, 10);
}

export function calculateStreakUpdate(previous, activityDate, freezeEnabled = true) {
  if (!previous?.lastActiveDate) {
    return { currentStreak: 1, longestStreak: Math.max(previous?.longestStreak || 0, 1), lastActiveDate: activityDate, freezeTokensAvailable: previous?.freezeTokensAvailable || 0 };
  }

  const previousDate = new Date(`${previous.lastActiveDate}T00:00:00Z`);
  const currentDate = new Date(`${activityDate}T00:00:00Z`);
  const daysSinceActivity = Math.round((currentDate - previousDate) / 86400000);
  if (daysSinceActivity === 0) return { ...previous, noOp: true };

  const canUseFreeze = freezeEnabled && daysSinceActivity === 2 && (previous.freezeTokensAvailable || 0) > 0;
  const currentStreak = daysSinceActivity === 1 || canUseFreeze ? previous.currentStreak + 1 : 1;
  const freezeTokensAvailable = canUseFreeze ? previous.freezeTokensAvailable - 1 : previous.freezeTokensAvailable || 0;
  return { currentStreak, longestStreak: Math.max(previous.longestStreak || 0, currentStreak), lastActiveDate: activityDate, freezeTokensAvailable };
}

export function getDisplayStreak(streak, today, timeZone = "UTC", cutoffHour = 3) {
  if (!streak?.last_active_date) return 0;
  const activityDate = getActivityDate(today, timeZone, cutoffHour);
  const lastDate = new Date(`${streak.last_active_date}T00:00:00Z`);
  const currentDate = new Date(`${activityDate}T00:00:00Z`);
  const daysSinceActivity = Math.round((currentDate - lastDate) / 86400000);
  return daysSinceActivity > 1 ? 0 : streak.current_streak || 0;
}
