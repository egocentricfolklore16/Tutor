import { ArrowRight, BookOpen, CalendarDays, MessageCircle, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

const shortcuts = [
  { title: "Tutor chat", description: "Ask about a tricky idea", tag: "CHAT", path: "/Study", icon: MessageCircle, accent: "accent-card-chat" },
  { title: "Plan a session", description: "Make time for your goals", tag: "PLAN", path: "/Planner", icon: CalendarDays, accent: "accent-card-plan" },
  { title: "Open library", description: "Return to saved resources", tag: "READ", path: "/Library", icon: BookOpen, accent: "accent-card-read" },
  { title: "Review progress", description: "See your learning trend", tag: "TRACK", path: "/Progress", icon: Sparkles, accent: "accent-card-track" },
];

function QuickShortcuts() {
  const navigate = useNavigate();
  return <section className="mt-6" aria-labelledby="quick-shortcuts-title"><p id="quick-shortcuts-title" className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Quick Shortcuts</p><div className="grid grid-cols-2 gap-3">{shortcuts.map(({ title, description, tag, path, icon: Icon, accent }, index) => <button key={title} type="button" onClick={() => navigate(path)} className={`group flex min-h-[148px] min-w-0 flex-col rounded-lg border p-3 text-left shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md sm:p-4 ${index % 2 === 0 ? "rotate-1" : "-rotate-1"} ${accent}`}><div className="flex items-start justify-between gap-2"><Icon className="h-5 w-5 shrink-0" /><span className="shrink-0 rounded-full bg-white/70 px-2 py-1 text-[9px] font-bold tracking-wide">{tag}</span></div><p className="mt-5 truncate text-sm font-bold text-gray-900">{title}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-600">{description}</p><ArrowRight className="mt-auto h-4 w-4 opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100" /></button>)}</div></section>;
}

export default QuickShortcuts;