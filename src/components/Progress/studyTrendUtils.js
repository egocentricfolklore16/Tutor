// Reusable Intl.DateTimeFormat instances to avoid repeated locale format allocations in loops
const shortDateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const fullDateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

/**
 * Formats a Date object or ISO date string into a local YYYY-MM-DD key.
 * @param {Date|string|number} value
 * @returns {string} YYYY-MM-DD or "" if invalid
 */
export const getLocalDateKey = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/**
 * Builds calendar daily points for the given range in the user's local timezone.
 * Zero-filled for days with no session hours.
 *
 * OPTIMIZATION:
 * 1. Pre-aggregates session durations into a Map keyed by YYYY-MM-DD in O(S) time
 *    to avoid repeated Map lookups and Date string formatting.
 * 2. Uses static Intl.DateTimeFormat instances instead of d.toLocaleDateString() (~20x faster).
 * 3. Uses a single Date cursor loop to populate daily points in pre-allocated array.
 *
 * @param {Array} sessions - Array of study session objects with Date and Duration
 * @param {number} rangeDays - Number of days in range (e.g. 7, 30, 90)
 * @param {Date} [referenceDate] - Reference end date (defaults to current local date)
 * @param {number} [offsetDays=0] - Offset in range periods (e.g., 0 for current period, 1 for previous period)
 * @returns {Array<{ key: string, day: string, fullDate: string, hours: number, dateObj: Date }>}
 */
export const buildDailyPoints = (sessions = [], rangeDays = 30, referenceDate = new Date(), offsetDays = 0) => {
  const ref = new Date(referenceDate);
  ref.setHours(0, 0, 0, 0);

  // Shift reference backwards if offsetDays > 0 (for previous period calculations)
  if (offsetDays > 0) {
    ref.setDate(ref.getDate() - rangeDays * offsetDays);
  }

  // Pre-aggregate duration from sessions into a Map keyed by YYYY-MM-DD
  const durationByDate = new Map();
  if (Array.isArray(sessions)) {
    for (let j = 0; j < sessions.length; j++) {
      const session = sessions[j];
      if (!session || !session.Date) continue;
      const key = getLocalDateKey(session.Date);
      if (!key) continue;
      const duration = Number.parseFloat(session.Duration) || 0;
      if (duration > 0) {
        durationByDate.set(key, (durationByDate.get(key) || 0) + duration);
      }
    }
  }

  const points = new Array(rangeDays);
  const cursor = new Date(ref);
  cursor.setDate(cursor.getDate() - (rangeDays - 1));

  for (let idx = 0; idx < rangeDays; idx++) {
    const key = getLocalDateKey(cursor);
    const dayLabel = shortDateFormatter.format(cursor);
    const fullDateLabel = fullDateFormatter.format(cursor);

    const rawHours = durationByDate.get(key) || 0;
    const hours = Math.round(rawHours * 100) / 100;

    points[idx] = {
      key,
      day: dayLabel,
      fullDate: fullDateLabel,
      hours,
      dateObj: new Date(cursor),
    };

    cursor.setDate(cursor.getDate() + 1);
  }

  return points;
};

/**
 * Computes a trailing moving average (e.g. 7-day) for each point.
 *
 * OPTIMIZATION: Uses a sliding window running sum in O(N) time instead of
 * slicing and reducing array segments O(N * windowSize).
 *
 * @param {Array} points - Array of daily points
 * @param {number} [windowSize=7] - Window size for moving average
 * @returns {Array} New points array with `avg7` attached
 */
export const computeMovingAverage = (points = [], windowSize = 7) => {
  if (!Array.isArray(points)) return [];

  const n = points.length;
  const result = new Array(n);
  let runningSum = 0;

  for (let i = 0; i < n; i++) {
    const point = points[i];
    const hrs = point ? point.hours || 0 : 0;
    runningSum += hrs;

    if (i >= windowSize) {
      const prevPoint = points[i - windowSize];
      runningSum -= prevPoint ? prevPoint.hours || 0 : 0;
    }

    const count = i < windowSize ? i + 1 : windowSize;
    const avg = count > 0 ? runningSum / count : 0;

    result[i] = {
      ...point,
      avg7: Math.round(avg * 100) / 100,
    };
  }

  return result;
};

/**
 * Computes trend statistics from points and optional previous period points.
 *
 * @param {Array} points - Current period daily points
 * @param {Array} [prevPoints=[]] - Previous period daily points of equal length
 * @returns {Object} Trend stats summary
 */
export const computeTrendStats = (points = [], prevPoints = []) => {
  const safePoints = Array.isArray(points) ? points : [];
  const safePrev = Array.isArray(prevPoints) ? prevPoints : [];

  const totalDays = safePoints.length;
  let totalHours = 0;
  let activeDays = 0;
  let peakHours = 0;
  let peakPoint = null;

  safePoints.forEach((p) => {
    const hrs = p.hours || 0;
    totalHours += hrs;
    if (hrs > 0) {
      activeDays += 1;
    }
    if (hrs >= peakHours && hrs > 0) {
      peakHours = hrs;
      peakPoint = p;
    }
  });

  totalHours = Math.round(totalHours * 100) / 100;
  peakHours = Math.round(peakHours * 100) / 100;

  const avgPerActiveDay = activeDays > 0 ? Math.round((totalHours / activeDays) * 10) / 10 : 0;

  // Compute previous period total
  const prevTotalHours = safePrev.reduce((acc, p) => acc + (p.hours || 0), 0);
  const diffHours = Math.round((totalHours - prevTotalHours) * 100) / 100;

  let deltaPercent = 0;
  if (prevTotalHours > 0) {
    deltaPercent = Math.round((diffHours / prevTotalHours) * 100);
  } else if (totalHours > 0) {
    deltaPercent = 100;
  }

  return {
    totalHours,
    activeDays,
    totalDays,
    avgPerActiveDay,
    peakHours,
    peakDate: peakPoint ? peakPoint.day : "",
    peakFullDate: peakPoint ? peakPoint.fullDate : "",
    peakKey: peakPoint ? peakPoint.key : null,
    prevTotalHours: Math.round(prevTotalHours * 100) / 100,
    diffHours,
    deltaPercent,
    isUp: diffHours > 0,
    isDown: diffHours < 0,
  };
};

/**
 * Computes Y-axis max domain and tick values ensuring a minimum height of 4h.
 *
 * @param {number} maxHours
 * @returns {{ niceMax: number, ticks: number[] }}
 */
export const formatYAxisTicks = (maxHours = 0) => {
  const minMax = 4;
  let niceMax = Math.max(minMax, Math.ceil(maxHours));

  // Round up niceMax to an even number or multiple of 4 if needed
  if (niceMax % 2 !== 0) {
    niceMax += 1;
  }

  const step = niceMax / 4;
  const ticks = [0, step, step * 2, step * 3, niceMax].map((t) => Math.round(t * 10) / 10);

  return { niceMax, ticks };
};
