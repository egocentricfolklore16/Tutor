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
  return <section className="mt-6" aria-labelledby="quick-shortcuts-title"><p id="quick-shortcuts-title" className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Quick Shortcuts</p><div className="flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-4 md:overflow-visible">{shortcuts.map(({ title, description, tag, path, icon: Icon, accent }, index) => <button key={title} type="button" onClick={() => navigate(path)} className={`group min-w-[190px] flex-1 rounded-lg border p-4 text-left shadow-sm transition duration-300 hover:rotate-0 hover:-translate-y-0.5 hover:shadow-md ${index % 2 === 0 ? "rotate-1" : "-rotate-1"} ${accent}`}><div className="flex items-start justify-between gap-3"><Icon className="h-5 w-5" /><span className="rounded-full bg-white/70 px-2 py-1 text-[10px] font-bold tracking-wide">{tag}</span></div><p className="mt-5 text-sm font-bold text-gray-900">{title}</p><p className="mt-1 text-xs text-gray-600">{description}</p><ArrowRight className="mt-3 h-4 w-4 opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100" /></button>)}</div></section>;
}

export default QuickShortcuts;