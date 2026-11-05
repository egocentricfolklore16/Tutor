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
  const lastActive = previous?.lastActiveDate || previous?.last_active_date || previous?.lastCompletedDate || previous?.last_completed_date;
  const currentStreakVal = previous?.currentStreak ?? previous?.current_streak ?? 0;
  const longestStreakVal = previous?.longestStreak ?? previous?.longest_streak ?? 0;
  const tokens = previous?.freezeTokensAvailable ?? previous?.freezeTokens ?? previous?.freeze_tokens_available ?? previous?.freeze_tokens ?? 0;

  if (!lastActive) {
    return { currentStreak: 1, longestStreak: Math.max(longestStreakVal, 1), lastActiveDate: activityDate, freezeTokensAvailable: tokens };
  }

  const previousDate = new Date(`${lastActive}T00:00:00Z`);
  const currentDate = new Date(`${activityDate}T00:00:00Z`);
  const daysSinceActivity = Math.round((currentDate - previousDate) / 86400000);
  if (daysSinceActivity <= 0) return { ...previous, noOp: true };

  const canUseFreeze = freezeEnabled && daysSinceActivity === 2 && currentStreakVal > 0 && tokens > 0;
  const currentStreak = daysSinceActivity === 1 || canUseFreeze ? currentStreakVal + 1 : 1;
  const freezeTokensAvailable = canUseFreeze ? tokens - 1 : tokens;
  return { currentStreak, longestStreak: Math.max(longestStreakVal, currentStreak), lastActiveDate: activityDate, freezeTokensAvailable };
}

export function getDisplayStreak(streak, today, timeZone = "UTC", cutoffHour = 3) {
  const lastActive = streak?.last_active_date || streak?.last_completed_date || streak?.lastActiveDate || streak?.lastCompletedDate;
  if (!lastActive) return 0;
  const activityDate = getActivityDate(today, timeZone, cutoffHour);
  const lastDate = new Date(`${lastActive}T00:00:00Z`);
  const currentDate = new Date(`${activityDate}T00:00:00Z`);
  const daysSinceActivity = Math.round((currentDate - lastDate) / 86400000);
  const freezeTokens = streak?.freeze_tokens_available ?? streak?.freeze_tokens ?? streak?.freezeTokens ?? streak?.freezeTokensAvailable ?? 0;
  if (daysSinceActivity > 2) return 0;
  if (daysSinceActivity === 2 && freezeTokens <= 0) return 0;
  return streak?.current_streak ?? streak?.currentStreak ?? 0;
}
