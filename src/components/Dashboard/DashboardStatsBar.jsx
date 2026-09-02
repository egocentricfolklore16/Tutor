import { useEffect, useState } from "react";
import supabase from "../../lib/supabase";

function DashboardStatsBar() {
  const [stats, setStats] = useState({ sessions: 0, hours: 0, gaps: 0 });

  useEffect(() => {
    const loadStats = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: sessions }, { data: profile }] = await Promise.all([
        supabase.from("Study").select("Duration").eq("user_id", user.id),
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
    { value: stats.sessions, label: "study sessions" },
    { value: `${stats.hours.toFixed(1)}h`, label: "planned study time" },
    { value: stats.gaps, label: "concepts to revisit" },
  ];

  return <section className="rounded-2xl bg-white p-2 shadow-sm" aria-label="Study statistics"><div className="grid grid-cols-3">{items.map(({ value, label }, index) => <div key={label} className={`relative flex min-h-20 min-w-0 items-center justify-center px-1 py-3 text-center md:py-5 ${index > 0 ? "border-l border-gray-100" : ""}`}><div className="min-w-0"><p className="truncate text-xl font-bold text-gray-900 sm:text-2xl">{value}</p><p className="truncate text-[10px] leading-4 text-gray-500 sm:text-sm">{label}</p></div></div>)}</div></section>;
}

export default DashboardStatsBar;