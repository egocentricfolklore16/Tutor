/**
 * Format metric value for display based on metric type ('xp' | 'hours' | 'streak')
 */
export function formatMetricValue(value, metric = "xp") {
  const num = Number(value) || 0;
  if (metric === "xp") {
    if (num >= 10000) return `${(num / 1000).toFixed(1)}k XP`;
    return `${num.toLocaleString()} XP`;
  }
  if (metric === "hours") {
    const totalMins = Math.round(num * 60);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  }
  if (metric === "streak") {
    return `${num} ${num === 1 ? "day" : "days"}`;
  }
  return `${num.toLocaleString()}`;
}

/**
 * Calculate countdown string for weekly reset (resets Monday 00:00 UTC)
 */
export function getWeeklyResetCountdown(nowInput = new Date()) {
  const now = nowInput instanceof Date && !Number.isNaN(nowInput.getTime()) ? nowInput : new Date();
  const day = now.getUTCDay();
  const daysUntilMon = ((8 - day) % 7) || 7;
  const nextMon = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + daysUntilMon,
      0,
      0,
      0
    )
  );
  const diffMs = Math.max(0, nextMon.getTime() - now.getTime());
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const d = Math.floor(hours / 24);
  const h = hours % 24;
  return `${d}d ${h}h`;
}
