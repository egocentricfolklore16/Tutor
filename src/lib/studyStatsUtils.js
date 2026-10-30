import { toDate } from './dates.js';

const dateKey = (value) => {
  const date = toDate(value);
  return date ? date.toISOString().slice(0, 10) : "";
};

export const computeStudyStatsAnalytics = (sessions = [], history = []) => {
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const now = new Date();
  const past7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (6 - i));
    return {
      key: dateKey(d),
      day: daysOfWeek[d.getDay()],
      hours: 0,
    };
  });

  const chartMap = new Map(past7Days.map((item) => [item.key, item]));
  let totalHours = 0;
  let focusHours = 0;
  const subjectTotals = {};

  // Combine Study and study_history sessions
  const allItems = [
    ...sessions.map((s) => ({
      date: s.Date,
      duration: Number.parseFloat(s.Duration) || 0,
      subject: s.Subject || "Uncategorised",
      isCompleted: s.session_status === "completed",
    })),
    ...history.map((h) => ({
      date: h.completed_at,
      duration: (Number.parseFloat(h.duration_minutes) || 0) / 60,
      subject: h.subject || "Uncategorised",
      isCompleted: true,
    })),
  ];

  for (const item of allItems) {
    const dKey = dateKey(item.date);
    const duration = item.duration;
    totalHours += duration;
    if (item.isCompleted) {
      focusHours += duration;
    }

    if (item.subject) {
      subjectTotals[item.subject] = (subjectTotals[item.subject] || 0) + duration;
    }

    if (dKey && chartMap.has(dKey)) {
      chartMap.get(dKey).hours += duration;
    }
  }

  const chart = Array.from(chartMap.values());
  const weekHours = chart.reduce((acc, curr) => acc + curr.hours, 0);

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
    hasData: allItems.length > 0,
  };
};
