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

  return <section className="rounded-lg border border-gray-200 bg-white p-2 shadow-sm" aria-label="Study statistics"><div className="grid grid-cols-1 md:grid-cols-3">{items.map(({ value, label }, index) => <div key={label} className={`relative flex min-h-20 items-center justify-center px-4 py-4 text-center md:py-5 ${index > 0 ? "border-t border-gray-200 md:border-l-0 md:border-t-0" : ""}`}><div className="hidden md:block absolute left-0 top-1/2 h-8 w-px -translate-y-1/2 bg-stone-300" /><div><p className="text-2xl font-bold text-gray-900">{value}</p><p className="text-sm text-gray-500">{label}</p></div></div>)}</div></section>;
}

export default DashboardStatsBar;