import { Bell, BookOpen, Command, FileText, Flame, Layers3, LogOut, Menu, Moon, Search, Settings, Sun, Timer, UserRound, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "../../app/ProfileContext";
import NotificationCenter from "../Notifications/NotificationCenter";
import AISuggestions from "./AISuggestions";
import supabase from "../../lib/supabase";
import {
  dismissNotification,
  getStoredNotifications,
  markAllNotificationsRead,
} from "../../lib/notifications";

function DashboardHeader({ toggleSidebar }) {
  const { profile, darkMode, toggleDarkMode } = useProfile();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [aiSuggestionsOpen, setAiSuggestionsOpen] = useState(false);
  const [notifications, setNotifications] = useState(() => getStoredNotifications());
  const navigate = useNavigate();
  const name = profile?.full_name || profile?.username || "Learner";
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";

  useEffect(() => {
    const refreshNotifications = () => setNotifications(getStoredNotifications());
    refreshNotifications();

    const handleVisibility = () => {
      refreshNotifications();
    };

    const handleNotificationsUpdate = () => {
      refreshNotifications();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("storage", refreshNotifications);
    window.addEventListener("hyper-tutor-notifications-updated", handleNotificationsUpdate);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("storage", refreshNotifications);
      window.removeEventListener("hyper-tutor-notifications-updated", handleNotificationsUpdate);
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const unreadCount = notifications.filter((item) => !item.read).length;

  const handleDismiss = (id) => {
    setNotifications(dismissNotification(id));
  };

  const handleMarkAllRead = () => {
    setNotifications(markAllNotificationsRead());
  };

  const handleNotificationsClick = () => {
    setNotificationsOpen(true);
    setNotifications(getStoredNotifications());
  };

  const runSearch = async (event) => {
    event?.preventDefault?.();
    const query = searchTerm.trim();
    if (!query) return;
    setSearching(true);
    const pattern = `%${query}%`;
    const [{ data: notes }, { data: flashcards }, { data: resources }] = await Promise.all([
      supabase.from("notes").select("id,session_id,title,content").or(`title.ilike.${pattern},content.ilike.${pattern}`).limit(8),
      supabase.from("flashcards").select("id,session_id,question,answer").or(`question.ilike.${pattern},answer.ilike.${pattern}`).limit(8),
      supabase.from("resources").select("id,session_id,file_name,file_type").or(`file_name.ilike.${pattern},file_type.ilike.${pattern}`).limit(8),
    ]);
    setSearchResults([
      ...(notes || []).map((item) => ({ ...item, kind: "Note", label: item.title || "Untitled note", detail: item.content })),
      ...(flashcards || []).map((item) => ({ ...item, kind: "Flashcard", label: item.question, detail: item.answer })),
      ...(resources || []).map((item) => ({ ...item, kind: "Resource", label: item.file_name, detail: item.file_type })),
    ]);
    setSearching(false);
  };

  const openSearchResult = (result) => {
    setSearchOpen(false);
    if (result.kind === "Resource") navigate("/Library");
    else if (result.session_id) navigate(`/Study/${result.session_id}${result.kind === "Note" ? `/notes/${result.id}` : ""}`);
  };

  return <>
    <header className="sticky top-0 z-[100] flex min-h-16 flex-nowrap items-center justify-between gap-2 bg-white px-3 py-3 text-slate-700 sm:px-4 md:px-6">
      <div className="flex min-w-0 shrink items-center gap-2">
        <span className="flex shrink-0 items-center gap-1.5 sm:hidden"><button type="button" title="Open sidebar" onClick={toggleSidebar} className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-slate-700 transition hover:bg-emerald-100 hover:text-emerald-700"><Menu className="h-4 w-4" /></button><img src="/logo3.png" alt="Hyper Tutor" className="h-7 w-7 object-contain" /></span>
        <span className="hidden items-center gap-1.5 rounded-full bg-sky-200 px-3 py-1.5 text-xs font-bold text-sky-950 shadow-sm sm:inline-flex"><Sun className="h-3.5 w-3.5 text-sky-700" />{timeOfDay}</span>
        <span className="hidden items-center gap-1.5 rounded-full bg-orange-200 px-3 py-1.5 text-xs font-bold text-orange-950 shadow-sm sm:inline-flex"><Flame className="h-3.5 w-3.5 text-orange-600" />3 day streak</span>
        <p className="hidden truncate text-base font-bold text-slate-950 sm:block">{timeOfDay}, {name}!</p>
      </div>
      <div className="flex min-w-0 items-center gap-1.5 text-xs text-slate-900 sm:gap-2">
        <span className="hidden items-center gap-1.5 rounded-full bg-orange-200 px-3 py-1.5 font-bold text-orange-950 shadow-sm lg:inline-flex"><Flame className="h-3.5 w-3.5 text-orange-600" />3d</span>
        <span className="hidden items-center gap-1.5 rounded-full bg-cyan-200 px-3 py-1.5 font-bold text-cyan-950 shadow-sm sm:inline-flex"><Timer className="h-3.5 w-3.5 text-cyan-700" />0m</span>
        <span className="hidden h-7 min-w-7 items-center justify-center rounded-full bg-violet-200 px-2 font-black text-violet-950 shadow-sm sm:flex">4</span>
        <span className="hidden items-center gap-1.5 rounded-full bg-indigo-200 px-3 py-1.5 font-bold text-indigo-950 shadow-sm md:inline-flex"><Users className="h-3.5 w-3.5 text-indigo-700" />1</span>
        <span className="hidden rounded-full bg-rose-200 px-3 py-1.5 font-bold text-rose-950 shadow-sm sm:inline-flex">1</span>
        <div className="relative">
          <button type="button" title="Open AI suggestions" onClick={() => setAiSuggestionsOpen((open) => !open)} className="hidden rounded-full p-2 text-slate-700 transition hover:bg-emerald-100 hover:text-emerald-700 sm:inline-flex"><Menu className="h-4 w-4" /></button>
          {aiSuggestionsOpen && <div className="absolute right-0 top-12 z-[210] w-[min(88vw,22rem)]"><div className="mb-2 flex justify-end"><button type="button" title="Close AI suggestions" onClick={() => setAiSuggestionsOpen(false)} className="rounded-full bg-white p-1.5 text-slate-500 shadow-md hover:text-slate-900"><X className="h-4 w-4" /></button></div><AISuggestions /></div>}
        </div>
        <button type="button" title="Search the app" onClick={() => setSearchOpen(true)} className="inline-flex items-center rounded-full p-2 text-slate-700 transition hover:bg-sky-100 hover:text-sky-700 sm:gap-3 sm:bg-sky-100 sm:px-3 sm:py-2 sm:text-sky-900 sm:shadow-sm"><Search className="h-4 w-4 text-sky-700" /><span className="hidden text-xs font-semibold sm:inline">Search</span><span className="hidden items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-bold text-sky-800 sm:flex"><Command className="h-3 w-3" />K</span></button>
        <button type="button" title={darkMode ? "Switch to light mode" : "Switch to dark mode"} onClick={() => toggleDarkMode(!darkMode)} className="hidden rounded-full p-2 text-slate-700 transition hover:bg-violet-100 hover:text-violet-700 sm:inline-flex">{darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
        <button type="button" title="Notifications" onClick={handleNotificationsClick} className="relative rounded-full p-2 text-slate-700 transition hover:bg-rose-100 hover:text-rose-700">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">{Math.min(unreadCount, 9)}</span>}
        </button>
        <div className="relative">
          <button type="button" title="Profile menu" onClick={() => setMenuOpen((open) => !open)} className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-emerald-200 text-emerald-900 shadow-sm transition hover:bg-emerald-300"><>{profile?.avatar_url ? <img src={profile.avatar_url} alt={`${name} profile`} className="h-full w-full object-cover" /> : <UserRound className="h-4 w-4" />}</></button>
          {menuOpen && <div className="absolute right-0 top-11 w-44 rounded-lg border border-slate-200 bg-white p-2 text-sm shadow-lg dark:border-slate-700 dark:bg-[#18211f] dark:text-white"><p className="truncate px-3 py-2 font-semibold">{name}</p><button type="button" onClick={() => navigate("/Settings")} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-white/10"><Settings className="h-4 w-4" /> Settings</button><button type="button" onClick={logout} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"><LogOut className="h-4 w-4" /> Logout</button></div>}
        </div>
      </div>
    </header>
    {notificationsOpen && (
      <NotificationCenter
        notifications={notifications}
        onDismiss={handleDismiss}
        onMarkAllRead={handleMarkAllRead}
        onClose={() => setNotificationsOpen(false)}
      />
    )}
    {searchOpen && <div className="fixed inset-0 z-[200] flex items-start justify-center bg-slate-950/35 px-4 pt-20 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && setSearchOpen(false)}>
      <section className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <form onSubmit={runSearch} className="flex items-center gap-3 border-b border-slate-100 px-5 py-4"><Search className="h-5 w-5 text-slate-400" /><input autoFocus value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search notes, flashcards, and resources" className="min-w-0 flex-1 text-base outline-none" /><button type="button" onClick={() => setSearchOpen(false)} title="Close search" className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button></form>
        <div className="max-h-[60vh] overflow-y-auto p-3">{searching ? <p className="p-6 text-center text-sm text-slate-500">Searching...</p> : searchResults.length ? searchResults.map((result) => <button key={`${result.kind}-${result.id}`} type="button" onClick={() => openSearchResult(result)} className="flex w-full items-start gap-3 rounded-xl p-3 text-left transition hover:bg-slate-50"><span className="mt-0.5 rounded-lg bg-emerald-100 p-2 text-emerald-700">{result.kind === "Note" ? <FileText className="h-4 w-4" /> : result.kind === "Flashcard" ? <Layers3 className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}</span><span className="min-w-0"><strong className="block truncate text-sm text-slate-900">{result.label}</strong><span className="mt-1 block truncate text-xs text-slate-500">{result.kind} · {result.detail || ""}</span></span></button>) : <p className="p-6 text-center text-sm text-slate-500">Search your saved study content.</p>}</div>
      </section>
    </div>}
  </>;
}

export default DashboardHeader;