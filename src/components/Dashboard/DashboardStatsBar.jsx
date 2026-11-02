import { useEffect, useState } from "react";
import supabase from "../../lib/supabase";

function DashboardStatsBar() {
  const [stats, setStats] = useState({ sessions: 0, hours: 0, gaps: 0 });

  useEffect(() => {
    const loadStats = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: sessions }, { data: profile }] = await Promise.all([
        supabase.from("Study").select("Duration").eq("user_id", user.id).neq("session_status", "completed"),
        supabase.from("profiles").select("knowledge_gaps").eq("user_id", user.id).maybeSingle(),
      ]);
      setStats({
        sessions: sessions?.length || 0,
        hours: (sessions || []).reduce((total, session) => total + (Number.parseFloat(session.Duration) || 0), 0),
        gaps: Array.isArray(profile?.knowledge_gaps) ? profile.knowledge_gaps.length : 0,
      });
    };
    loadStats();
  }, []);

  const items = [
    { value: stats.sessions, label: "sessions" },
    { value: `${stats.hours.toFixed(1)}h`, label: "planned" },
    { value: stats.gaps, label: "gaps" },
  ];

  return (
    <section
      className="mt-5 rounded-2xl bg-white p-2 shadow-sm dark:bg-slate-900"
      aria-label="Study statistics"
    >
      <div className="grid grid-cols-3 gap-2">
        {items.map(({ value, label }, index) => (
          <div
            key={label}
            className={`flex min-h-20 min-w-0 flex-col items-center justify-center rounded-xl bg-slate-50 px-3 py-3 text-center dark:bg-slate-800/80 ${
              index > 0 ? "border-l border-slate-200/0" : ""
            }`}
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
    </section>
  );
}

export default DashboardStatsBar;
