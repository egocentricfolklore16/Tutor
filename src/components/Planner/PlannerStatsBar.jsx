import { CalendarCheck2, Flame, GraduationCap } from "lucide-react";
import { useEffect, useState } from "react";
import supabase from "../../lib/supabase";

const cards = [
  { key: "tasks", label: "THIS WEEK", subtext: "tasks done", icon: CalendarCheck2, color: "blue", background: "bg-blue-50", iconColor: "text-blue-600" },
  { key: "pomodoros", label: "THIS WEEK", subtext: "pomodoros", icon: Flame, color: "pink", background: "bg-pink-50", iconColor: "text-pink-600" },
  { key: "exams", label: "THIS WEEK", subtext: "exams", icon: GraduationCap, color: "purple", background: "bg-purple-50", iconColor: "text-purple-600" },
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
    <section className="mb-6 grid grid-cols-3 gap-2 sm:gap-4" aria-label="This week planner statistics">
      {cards.map(({ key, label, subtext, icon: Icon, background, iconColor }) => (
        <div key={key} className={`relative min-h-32 min-w-0 rounded-2xl ${background} p-3 sm:p-5`}>
          <div className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white sm:right-4 sm:top-4 sm:h-9 sm:w-9 ${iconColor}`}><Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></div>
          <p className={`text-xs font-bold uppercase tracking-[0.18em] ${iconColor}`}>{label}</p>
          <p className="mt-8 truncate text-2xl font-bold leading-none text-slate-950 sm:mt-5 sm:text-3xl">{values[key]}</p>
          <p className="mt-2 truncate text-[11px] font-medium text-slate-600 sm:text-sm">{subtext}</p>
        </div>
      ))}
    </section>
  );
}

export default PlannerStatsBar;
