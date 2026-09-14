import { CalendarCheck2, Flame, GraduationCap } from "lucide-react";
import { useEffect, useState } from "react";
import supabase from "../../lib/supabase";

const cards = [
  { key: "tasks", subtext: "tasks done", icon: CalendarCheck2, accentBg: "bg-sky-400/15", accentText: "text-sky-300" },
  { key: "pomodoros", subtext: "pomodoros", icon: Flame, accentBg: "bg-pink-400/15", accentText: "text-pink-300" },
  { key: "exams", subtext: "exams", icon: GraduationCap, accentBg: "bg-violet-400/15", accentText: "text-violet-300" },
];

function getWeekRange() {
  const today = new Date();
  const day = today.getDay();
  const start = new Date(today);
  start.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

function PlannerStatsBar() {
  const [stats, setStats] = useState({ tasksDone: 0, tasksTotal: 0, pomodoros: 0, exams: 0 });

  useEffect(() => {
    const loadStats = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { start, end } = getWeekRange();
      const [{ data: sessions, error: sessionError }, { count: pomodoros, error: pomodoroError }] = await Promise.all([
        supabase.from("Study").select("Date,completed,activity_type").eq("user_id", user.id).gte("Date", start).lt("Date", end),
        supabase.from("study_pomodoros").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("completed_at", `${start}T00:00:00`).lt("completed_at", `${end}T00:00:00`),
      ]);

      if (sessionError || pomodoroError) {
        console.error("Planner stats fetch error:", sessionError || pomodoroError);
        return;
      }

      setStats({
        tasksDone: (sessions || []).filter((session) => session.completed).length,
        tasksTotal: sessions?.length || 0,
        pomodoros: pomodoros || 0,
        exams: (sessions || []).filter((session) => session.activity_type === "exam").length,
      });
    };
    loadStats();
  }, []);

  const values = {
    tasks: `${stats.tasksDone}/${stats.tasksTotal}`,
    pomodoros: stats.pomodoros,
    exams: stats.exams,
  };

  return (
    <section className="mb-6" aria-label="This week planner statistics">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">This week</p>
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {cards.map(({ key, subtext, icon: Icon, accentBg, accentText }) => (
          <div
            key={key}
            className="relative min-h-32 min-w-0 rounded-2xl border border-white/10 bg-white/[0.04] p-3 shadow-lg shadow-black/20 transition-colors hover:border-white/15 sm:p-5"
          >
            <div className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full sm:right-4 sm:top-4 sm:h-9 sm:w-9 ${accentBg} ${accentText}`}>
              <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
            <p className="mt-9 truncate text-3xl font-bold leading-none text-white sm:mt-6 sm:text-4xl">{values[key]}</p>
            <p className="mt-2 truncate text-[11px] font-medium text-slate-400 sm:text-sm">{subtext}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default PlannerStatsBar;
