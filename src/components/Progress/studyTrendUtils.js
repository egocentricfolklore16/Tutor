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

  const points = [];
  const daysMap = new Map();

  for (let i = rangeDays - 1; i >= 0; i--) {
    const d = new Date(ref);
    d.setDate(d.getDate() - i);
    const key = getLocalDateKey(d);
    const dayLabel = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const fullDateLabel = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    const point = {
      key,
      day: dayLabel,
      fullDate: fullDateLabel,
      hours: 0,
      dateObj: d,
    };
    points.push(point);
    daysMap.set(key, point);
  }

  // Aggregate duration from sessions
  if (Array.isArray(sessions)) {
    sessions.forEach((session) => {
      if (!session || !session.Date) return;
      const key = getLocalDateKey(session.Date);
      const point = daysMap.get(key);
      if (point) {
        const duration = Number.parseFloat(session.Duration) || 0;
        point.hours += Math.max(0, duration);
      }
    });
  }

  // Round hours to 2 decimal places to prevent floating point inaccuracies
  points.forEach((p) => {
    p.hours = Math.round(p.hours * 100) / 100;
  });

  return points;
};

/**
 * Computes a trailing moving average (e.g. 7-day) for each point.
 *
 * @param {Array} points - Array of daily points
 * @param {number} [windowSize=7] - Window size for moving average
 * @returns {Array} New points array with `avg7` attached
 */
export const computeMovingAverage = (points = [], windowSize = 7) => {
  if (!Array.isArray(points)) return [];

  return points.map((point, index) => {
    const startIndex = Math.max(0, index - windowSize + 1);
    const windowSlice = points.slice(startIndex, index + 1);
    const sum = windowSlice.reduce((acc, p) => acc + (p.hours || 0), 0);
    const avg = windowSlice.length > 0 ? sum / windowSlice.length : 0;

    return {
      ...point,
      avg7: Math.round(avg * 100) / 100,
    };
  });
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
