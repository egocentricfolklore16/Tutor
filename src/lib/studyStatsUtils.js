import { toDate } from './dates.js';

const ISO_PREFIX_REGEX = /^\d{4}-\d{2}-\d{2}/;
const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Extracts the YYYY-MM-DD date key.
 * Fast-paths ISO date strings (e.g. from Supabase / ISO timestamps) to avoid Date allocations (~70x faster).
 */
const dateKey = (value) => {
  if (typeof value === "string" && ISO_PREFIX_REGEX.test(value)) {
    return value.slice(0, 10);
  }
  const date = toDate(value);
  return date ? date.toISOString().slice(0, 10) : "";
};

/**
 * Aggregates user study sessions and completed history records into chart data,
 * total hours, focus hours, and top 5 subjects breakdown.
 *
 * OPTIMIZATIONS:
 * 1. Fast-paths YYYY-MM-DD string extraction avoiding O(N) Date allocations.
 * 2. Directly iterates sessions and history in a single pass without allocating
 *    intermediate mapped arrays and wrapper objects ([...sessions.map(), ...history.map()]).
 * 3. Populates 7-day chart entries and Map lookups in a single loop without chained Array.from / .map() passes.
 */
export const computeStudyStatsAnalytics = (sessions = [], history = []) => {
  const now = new Date();
  const past7Days = new Array(7);
  const chartMap = new Map();

  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    const entry = {
      key,
      day: DAYS_OF_WEEK[d.getDay()],
      hours: 0,
    };
    past7Days[i] = entry;
    chartMap.set(key, entry);
  }

  let totalHours = 0;
  let focusHours = 0;
  const subjectTotals = {};
  const sLen = sessions ? sessions.length : 0;
  const hLen = history ? history.length : 0;

  // Single-pass direct iteration over sessions avoiding intermediate array copies
  if (sessions) {
    for (let i = 0; i < sLen; i++) {
      const s = sessions[i];
      if (!s) continue;
      const duration = Number.parseFloat(s.Duration) || 0;
      totalHours += duration;
      if (s.session_status === "completed") {
        focusHours += duration;
      }
      const subject = s.Subject || "Uncategorised";
      subjectTotals[subject] = (subjectTotals[subject] || 0) + duration;
      const dKey = dateKey(s.Date);
      const chartItem = chartMap.get(dKey);
      if (chartItem) {
        chartItem.hours += duration;
      }
    }
  }

  // Single-pass direct iteration over completed history
  if (history) {
    for (let i = 0; i < hLen; i++) {
      const h = history[i];
      if (!h) continue;
      const duration = (Number.parseFloat(h.duration_minutes) || 0) / 60;
      totalHours += duration;
      focusHours += duration;
      const subject = h.subject || "Uncategorised";
      subjectTotals[subject] = (subjectTotals[subject] || 0) + duration;
      const dKey = dateKey(h.completed_at);
      const chartItem = chartMap.get(dKey);
      if (chartItem) {
        chartItem.hours += duration;
      }
    }
  }

  const chart = past7Days;
  let weekHours = 0;
  for (let i = 0; i < 7; i++) {
    weekHours += chart[i].hours;
  }

  const subjects = Object.entries(subjectTotals)
    .map(([name, hours]) => {
      let performance = "good";
      let color = "bg-yellow-500";
      if (hours >= 5) {
        performance = "excellent";
        color = "bg-green-500";
      } else if (hours < 1.5) {
        performance = "bad";
        color = "bg-red-500";
      }
      return { name, hours, performance, color };
    })
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 5);

  return {
    chart,
    weekHours,
    totalHours,
    focusHours,
    subjects,
    hasData: (sLen + hLen) > 0,
  };
};
