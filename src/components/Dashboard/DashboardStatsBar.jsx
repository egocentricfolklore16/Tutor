import { useEffect, useState } from "react";
import supabase from "../../lib/supabase";

function DashboardStatsBar() {
  const [stats, setStats] = useState({ sessions: 0, hours: 0, gaps: 0 });
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    const loadStats = async () => {
      setLoading(true);
      setHasError(false);
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) {
          if (active) setStats({ sessions: 0, hours: 0, gaps: 0 });
          return;
        }
        const [sessionsResult, profileResult] = await Promise.all([
          supabase.from("Study").select("Duration").eq("user_id", user.id).neq("session_status", "completed"),
          supabase.from("profiles").select("knowledge_gaps").eq("user_id", user.id).maybeSingle(),
        ]);
        if (sessionsResult.error || profileResult.error) throw sessionsResult.error || profileResult.error;
        if (active) {
          const sessions = sessionsResult.data;
          setStats({
            sessions: sessions?.length || 0,
            hours: (sessions || []).reduce((total, session) => total + (Number.parseFloat(session.Duration) || 0), 0),
            gaps: Array.isArray(profileResult.data?.knowledge_gaps) ? profileResult.data.knowledge_gaps.length : 0,
          });
        }
      } catch {
        if (active) setHasError(true);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadStats();
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const items = [
    { value: stats.sessions, label: "sessions" },
    { value: `${stats.hours.toFixed(1)}h`, label: "planned" },
    { value: stats.gaps, label: "gaps" },
  ];

  return (
    <section
      className="mt-4 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/80"
      aria-label="Study statistics"
      aria-busy={loading}
    >
      {loading ? (
        <div className="grid grid-cols-3 gap-2" aria-label="Loading study statistics">
          {items.map(({ label }) => (
            <div key={label} className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/80">
              <span className="h-6 w-12 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
              <span className="h-3 w-16 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
            </div>
          ))}
        </div>
      ) : hasError ? (
        <div className="flex min-h-20 flex-col items-center justify-center gap-2 text-center" role="alert">
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">Study statistics could not be loaded.</p>
          <button
            type="button"
            onClick={() => setRefreshKey((key) => key + 1)}
            className="min-h-11 rounded-xl px-3 py-2 text-sm font-semibold text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:text-emerald-300"
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            {items.map(({ value, label }) => (
              <div
                key={label}
                className="flex min-h-20 min-w-0 flex-col items-center justify-center rounded-xl bg-slate-50 px-3 py-3 text-center dark:bg-slate-800/80"
              >
                <p className="truncate text-xl font-black tracking-tight text-slate-900 dark:text-slate-100 sm:text-2xl">
                  {value}
                </p>
                <p className="mt-1 truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  {label}
                </p>
              </div>
            ))}
          </div>
          {stats.sessions === 0 && stats.hours === 0 && stats.gaps === 0 && (
            <p className="mt-3 text-center text-sm leading-6 text-slate-600 dark:text-slate-300">
              Your study statistics will appear here as you learn.
            </p>
          )}
        </>
      )}
    </section>
  );
}

export default DashboardStatsBar;
