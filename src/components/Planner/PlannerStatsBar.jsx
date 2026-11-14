import { CalendarCheck2, Flame, GraduationCap } from "lucide-react";
import { useEffect, useState } from "react";
import supabase from "../../lib/supabase";

const cards = [
  {
    key: "tasks",
    label: "THIS WEEK",
    subtext: "tasks done",
    icon: CalendarCheck2,
    background: "bg-emerald-50 dark:bg-emerald-500/10",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    key: "pomodoros",
    label: "THIS WEEK",
    subtext: "pomodoros",
    icon: Flame,
    background: "bg-sky-50 dark:bg-sky-500/10",
    iconColor: "text-sky-600 dark:text-sky-400",
  },
  {
    key: "exams",
    label: "THIS WEEK",
    subtext: "exams & deadlines",
    icon: GraduationCap,
    background: "bg-amber-50 dark:bg-amber-500/10",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
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

      const [
        { data: sessions, error: sessionError },
        { count: pomodoros, error: pomodoroError },
        { data: deadlines, error: deadlineError },
      ] = await Promise.all([
        supabase.from("Study").select("Date,completed,activity_type").eq("user_id", user.id).neq("session_status", "completed").gte("Date", start).lt("Date", end),
        supabase.from("study_pomodoros").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("completed_at", `${start}T00:00:00`).lt("completed_at", `${end}T00:00:00`),
        supabase.from("deadlines").select("id,due_date").eq("user_id", user.id).gte("due_date", start).lt("due_date", end),
      ]);

      if (sessionError || pomodoroError || deadlineError) {
        console.error("Planner stats fetch error:", sessionError || pomodoroError || deadlineError);
        return;
      }

      setStats({
        tasksDone: (sessions || []).filter((session) => session.completed).length,
        tasksTotal: sessions?.length || 0,
        pomodoros: pomodoros || 0,
        exams: deadlines?.length || 0,
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
    <section className="grid grid-cols-3 gap-2 sm:gap-4" aria-label="This week planner statistics">
      {cards.map(({ key, label, subtext, icon: Icon, background, iconColor }) => (
        <div key={key} className={`relative min-h-32 min-w-0 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/80 sm:p-4`}>
          <div className={`absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 sm:right-4 sm:top-4 sm:h-10 sm:w-10 dark:bg-slate-800 ${iconColor}`}><Icon className="h-5 w-5" /></div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-8 truncate text-2xl font-bold leading-none text-slate-900 dark:text-slate-50 sm:mt-6 sm:text-3xl">{values[key]}</p>
          <p className="mt-2 truncate text-sm leading-6 text-slate-600 dark:text-slate-300">{subtext}</p>
        </div>
      ))}
    </section>
  );
}

export default PlannerStatsBar;
