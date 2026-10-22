import React, { useEffect, useMemo, useState } from "react";
import { BookOpen, RefreshCw, AlertCircle, PieChart as PieIcon } from "lucide-react";
import supabase from "../../lib/supabase";

const PALETTE = [
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#06b6d4", // Cyan
  "#f97316", // Orange
  "#8b5cf6", // Purple
  "#ec4899", // Pink
];

export default function TimeBySubjectCard() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error: fetchErr } = await supabase
        .from("Study")
        .select("Subject, Duration")
        .eq("user_id", user.id);

      if (fetchErr) throw fetchErr;
      setSessions(data || []);
    } catch (err) {
      console.error("Subject time fetch error:", err);
      setError("Failed to load subject breakdown.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const { subjectList, totalPlannedHours } = useMemo(() => {
    const totals = sessions.reduce((acc, session) => {
      const subject = session.Subject || "General Study";
      const duration = Number.parseFloat(session.Duration) || 0;
      acc[subject] = (acc[subject] || 0) + duration;
      return acc;
    }, {});

    const total = Object.values(totals).reduce((sum, h) => sum + h, 0);

    const list = Object.entries(totals)
      .map(([name, hours], index) => ({
        name,
        hours: Number(hours.toFixed(1)),
        percentage: total > 0 ? Math.round((hours / total) * 100) : 0,
        color: PALETTE[index % PALETTE.length],
      }))
      .sort((a, b) => b.hours - a.hours);

    return { subjectList: list, totalPlannedHours: total };
  }, [sessions]);

  return (
    <section
      className="relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800/80 dark:bg-[#18211f]"
      aria-labelledby="time-by-subject-heading"
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700 dark:bg-cyan-950/80 dark:text-cyan-300">
            <PieIcon className="h-4 w-4" />
          </span>
          <div>
            <h2 id="time-by-subject-heading" className="text-lg font-extrabold text-slate-900 dark:text-white">
              Time by Subject
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Real scheduled time distribution</p>
          </div>
        </div>

        {error && (
          <button
            type="button"
            onClick={fetchSessions}
            className="inline-flex min-h-[36px] items-center gap-1 rounded-xl bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="mt-5 my-auto">
        {loading ? (
          <div className="flex h-48 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-900/40" aria-busy="true">
            <RefreshCw className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : error ? (
          <div className="flex h-48 flex-col items-center justify-center rounded-2xl bg-rose-50/50 p-4 text-center dark:bg-rose-950/20">
            <AlertCircle className="h-6 w-6 text-rose-500" />
            <p className="mt-2 text-xs font-bold text-rose-800 dark:text-rose-300">{error}</p>
          </div>
        ) : subjectList.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center dark:border-slate-800 dark:bg-slate-900/30">
            <BookOpen className="h-8 w-8 text-slate-400" />
            <p className="mt-2 text-xs font-bold text-slate-700 dark:text-slate-300">No subjects scheduled yet</p>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Create study sessions in Planner to see your subject breakdown.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {subjectList.slice(0, 5).map((subject) => (
              <div key={subject.name} className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span className="truncate">{subject.name}</span>
                  <span className="shrink-0 font-extrabold text-slate-500 dark:text-slate-400">
                    {subject.hours}h ({subject.percentage}%)
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${subject.percentage}%`, backgroundColor: subject.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {subjectList.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-100 text-center dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Total planned: <strong className="text-slate-900 dark:text-white">{totalPlannedHours.toFixed(1)} hrs</strong> across {subjectList.length} subject{subjectList.length === 1 ? "" : "s"}
          </p>
        </div>
      )}
    </section>
  );
}
