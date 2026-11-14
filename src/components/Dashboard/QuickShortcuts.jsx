import { ArrowRight, BookOpen, CalendarDays, MessageCircle, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

const shortcuts = [
  { title: "Tutor chat", description: "Ask about a tricky idea", tag: "CHAT", path: "/courses", icon: MessageCircle, accent: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
  { title: "Plan a session", description: "Make time for your goals", tag: "PLAN", path: "/Planner", icon: CalendarDays, accent: "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300" },
  { title: "Open library", description: "Return to saved resources", tag: "READ", path: "/Library", icon: BookOpen, accent: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" },
  { title: "Review progress", description: "See your learning trend", tag: "TRACK", path: "/Progress", icon: Sparkles, accent: "bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300" },
];

function QuickShortcuts() {
  const navigate = useNavigate();

  return (
    <section className="mt-6" aria-labelledby="quick-shortcuts-title">
      <p id="quick-shortcuts-title" className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        Quick shortcuts
      </p>
      <div className="grid grid-cols-2 gap-3">
        {shortcuts.map(({ title, description, tag, path, icon: Icon, accent }) => (
          <button
            key={title}
            type="button"
            onClick={() => navigate(path)}
            className="group flex min-h-[140px] min-w-0 flex-col rounded-2xl bg-slate-50 p-3 text-left transition hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:bg-slate-900 dark:hover:bg-slate-800 sm:p-4 motion-reduce:transition-none"
          >
            <div className="flex items-start justify-between gap-2">
              <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {tag}
              </span>
            </div>
            <p className="mt-4 truncate text-sm font-bold text-slate-900 dark:text-slate-100">{title}</p>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600 dark:text-slate-300">{description}</p>
            <span className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
              Open
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

export default QuickShortcuts;