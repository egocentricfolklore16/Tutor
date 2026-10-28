import { Bell, BookOpen, Command, FileText, Flame, Layers3, Lock, LogOut, Menu, Moon, Search, Settings, Snowflake, Sun, Trophy, UserRound, Users, X, Zap, CheckCircle2, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "../../app/ProfileContext";
import { useGamification, useCelebrations, CelebrationLayer } from "../../features/gamification";
import XpToast from "../../features/gamification/components/XpToast";
import { useInAppNotifications } from "../../hooks/useInAppNotifications";
import NotificationCenter from "../Notifications/NotificationCenter";
import AISuggestions from "./AISuggestions";
import supabase from "../../lib/supabase";
import {
  getStoredNotifications,
} from "../../lib/notifications";

function GemIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6.5 3h11L21 9l-9 12L3 9l3.5-6Z" fill="currentColor" />
      <path d="M6.5 3 12 9l5.5-6M3 9h18M9.5 9 12 21l2.5-12" stroke="white" strokeOpacity="0.45" strokeWidth="0.6" strokeLinejoin="round" />
    </svg>
  );
}

function DashboardHeader({ title = "Dashboard", toggleSidebar }) {
  const { profile, darkMode, toggleDarkMode } = useProfile();
  const { streak, xp, gems, toast } = useGamification();
  const { currentStreak, longestStreak, freezeTokens, weekDays, todayCompleted, loading: streakLoading, error: streakError, refreshStreak } = streak;
  const { activeCelebration, dismissCelebration } = useCelebrations(xp?.level || 1);
  const { unreadCount: inAppUnreadCount } = useInAppNotifications();

  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [aiSuggestionsOpen, setAiSuggestionsOpen] = useState(false);

  const [streakDropdownOpen, setStreakDropdownOpen] = useState(false);
  const streakCloseTimer = useRef(null);

  const [xpDropdownOpen, setXpDropdownOpen] = useState(false);
  const xpCloseTimer = useRef(null);

  const [gemsDropdownOpen, setGemsDropdownOpen] = useState(false);
  const gemsCloseTimer = useRef(null);

  const [notifications, setNotifications] = useState(() => getStoredNotifications());
  const navigate = useNavigate();
  const name = profile?.full_name || profile?.username || "Learner";

  const activeFriendStreaks = profile?.active_friend_streaks ?? 0;

  const xpPoints = xp?.total ?? 0;
  const xpLevel = xp?.level ?? 1;
  const xpToNextLevel = xp?.xpToNextLevel ?? 50;
  const xpProgressPercent = xp?.xpProgressPercent ?? 0;

  const gemsCount = gems?.balance ?? 0;

  const getMotivationalText = () => {
    if (streakLoading) return "Loading streak...";
    if (streakError) return "Unable to load streak";
    if (todayCompleted) return "Streak safe for today!";
    if (currentStreak === 0) return "Start a new streak today!";
    return "Study today to keep it going!";
  };

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

  useEffect(() => {
    const handleKeyboardShortcuts = (event) => {
      const target = event.target;
      const isTyping = target instanceof HTMLElement && (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      );

      if (event.key === "Escape") {
        setStreakDropdownOpen(false);
        setXpDropdownOpen(false);
        setGemsDropdownOpen(false);
        setMenuOpen(false);
        setAiSuggestionsOpen(false);
        setSearchOpen(false);
        return;
      }

      if (!isTyping && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyboardShortcuts);
    return () => document.removeEventListener("keydown", handleKeyboardShortcuts);
  }, []);

  useEffect(() => {
    return () => {
      clearTimeout(streakCloseTimer.current);
      clearTimeout(xpCloseTimer.current);
      clearTimeout(gemsCloseTimer.current);
    };
  }, []);

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        await supabase.auth.signOut({ scope: "local" });
      }
    } catch (_err) {
      await supabase.auth.signOut({ scope: "local" });
    }
    navigate("/login");
  };

  const localUnreadCount = notifications.filter((item) => !item.read).length;
  const totalUnreadCount = inAppUnreadCount + localUnreadCount;

  const handleNotificationsClick = () => {
    if (window.innerWidth < 768) {
      navigate("/notifications");
    } else {
      setNotificationsOpen(true);
      setNotifications(getStoredNotifications());
    }
  };

  const openStreakDropdown = () => {
    clearTimeout(streakCloseTimer.current);
    setXpDropdownOpen(false);
    setGemsDropdownOpen(false);
    setStreakDropdownOpen(true);
  };

  const closeStreakDropdown = () => {
    streakCloseTimer.current = setTimeout(() => setStreakDropdownOpen(false), 150);
  };

  const toggleStreakDropdownMobile = () => {
    setXpDropdownOpen(false);
    setGemsDropdownOpen(false);
    setStreakDropdownOpen((prev) => !prev);
  };

  const openXpDropdown = () => {
    clearTimeout(xpCloseTimer.current);
    setStreakDropdownOpen(false);
    setGemsDropdownOpen(false);
    setXpDropdownOpen(true);
  };

  const closeXpDropdown = () => {
    xpCloseTimer.current = setTimeout(() => setXpDropdownOpen(false), 150);
  };

  const openGemsDropdown = () => {
    clearTimeout(gemsCloseTimer.current);
    setStreakDropdownOpen(false);
    setXpDropdownOpen(false);
    setGemsDropdownOpen(true);
  };

  const closeGemsDropdown = () => {
    gemsCloseTimer.current = setTimeout(() => setGemsDropdownOpen(false), 150);
  };

  const runSearch = async (event) => {
    event?.preventDefault?.();
    const query = searchTerm.trim();
    if (!query) return;
    setSearching(true);
    const pattern = `%${query}%`;
    const [{ data: notes }, { data: flashcards }, { data: resources }] = await Promise.all([
      supabase.from("session_notes").select("id,session_id,title,content").or(`title.ilike.${pattern},content.ilike.${pattern}`).limit(8),
      supabase.from("session_flashcards").select("id,session_id,question,answer").or(`question.ilike.${pattern},answer.ilike.${pattern}`).limit(8),
      supabase.from("session_resources").select("id,session_id,title,mime_type").or(`file_name.ilike.${pattern},file_type.ilike.${pattern}`).limit(8),
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

  const isSocietyUnlocked = (currentStreak ?? 0) >= 7;

  return <>
    <header className="sticky top-0 z-[100] flex min-h-16 flex-nowrap items-center justify-between gap-2 bg-white px-3 py-3 text-slate-700 sm:px-4 md:px-6 dark:bg-[#14171c] dark:text-slate-200 shadow-surface">
      <div className="flex min-w-0 shrink items-center gap-2">
        <span className="flex shrink-0 items-center gap-1.5 sm:hidden">
          {typeof toggleSidebar === "function" && (
            <button type="button" title="Open sidebar" onClick={toggleSidebar} className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-slate-700 transition hover:bg-emerald-100 hover:text-emerald-700 dark:text-slate-300 dark:hover:bg-emerald-950/40">
              <Menu className="h-4 w-4" />
            </button>
          )}
          <img src="/logo3.png" alt="Hyper Tutor" className="h-7 w-7 object-contain" />
        </span>

        {/* Page Title only (no greeting in top bar) */}
        <h1 className="text-lg font-bold text-slate-900 dark:text-white truncate">
          {title}
        </h1>
      </div>

      <div className="flex min-w-0 items-center gap-1.5 text-xs text-slate-900 sm:gap-2 dark:text-slate-100">
        <div className="relative">
          <button type="button" title="Open AI suggestions" onClick={() => setAiSuggestionsOpen((open) => !open)} className="hidden rounded-full p-2 text-slate-700 transition hover:bg-emerald-100 hover:text-emerald-700 sm:inline-flex dark:text-slate-300 dark:hover:bg-emerald-950/40">
            <Menu className="h-4 w-4" />
          </button>
          {aiSuggestionsOpen && <div className="motion-dialog absolute right-0 top-12 z-[210] w-[min(88vw,22rem)]"><div className="mb-2 flex justify-end"><button type="button" title="Close AI suggestions" onClick={() => setAiSuggestionsOpen(false)} className="rounded-full bg-white p-1.5 text-slate-500 shadow-overlay hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300"><X className="h-4 w-4" /></button></div><AISuggestions /></div>}
        </div>

        <button type="button" title="Search the app" onClick={() => setSearchOpen(true)} className="inline-flex items-center rounded-full p-2 text-slate-700 transition hover:bg-emerald-100 hover:text-emerald-700 sm:gap-3 sm:bg-emerald-100 sm:px-3 sm:py-2 sm:text-emerald-900 shadow-surface dark:text-emerald-300 dark:sm:bg-emerald-950/40 dark:sm:text-emerald-200">
          <Search className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
          <span className="hidden text-xs font-bold sm:inline">Search</span>
          <span className="hidden items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-bold text-emerald-800 sm:flex dark:bg-slate-800/80 dark:text-emerald-300">
            <Command className="h-3 w-3" />K
          </span>
        </button>

        {/* Streak Button & Dropdown (Amber) */}
        <div
          className="relative inline-block"
          onMouseEnter={openStreakDropdown}
          onMouseLeave={closeStreakDropdown}
        >
          <button
            type="button"
            onClick={toggleStreakDropdownMobile}
            aria-label={`Study streak: ${streakLoading ? "loading" : streakError ? "error" : `${currentStreak || 0} days`}`}
            aria-expanded={streakDropdownOpen}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-2xl bg-amber-100 px-3 py-1.5 font-bold text-amber-950 shadow-surface transition hover:bg-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-500/25 tabular-nums"
          >
            <Flame className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 fill-amber-500" />
            <span>{streakLoading ? "0d" : streakError ? "0d" : `${currentStreak || 0}d`}</span>
          </button>

          {streakDropdownOpen && (
            <div className="motion-dialog absolute right-0 top-11 z-[210] w-80 overflow-hidden rounded-2xl bg-white shadow-overlay dark:bg-[#18211f]">
              <div className="relative overflow-hidden bg-amber-100 p-5 dark:bg-amber-500/10">
                <Flame className="absolute -right-3 -top-2 h-24 w-24 text-amber-300/60 dark:text-amber-500/15" />
                <p className="relative text-2xl font-extrabold text-amber-600 dark:text-amber-300 tabular-nums">
                  {currentStreak || 0} Day Streak
                </p>
                <p className="relative mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {getMotivationalText()}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* XP Button & Dropdown (Amber) */}
        <div
          className="relative hidden sm:block"
          onMouseEnter={openXpDropdown}
          onMouseLeave={closeXpDropdown}
        >
          <button
            type="button"
            onClick={() => setXpDropdownOpen((prev) => !prev)}
            aria-label={`Level ${xpLevel}, ${xpPoints} XP`}
            aria-expanded={xpDropdownOpen}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-2xl bg-amber-100 px-3 py-1.5 font-bold text-amber-950 shadow-surface transition hover:bg-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-500/25 tabular-nums"
          >
            <Zap className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />{xpPoints} XP
          </button>
        </div>

        {/* Gems Button & Dropdown (Cyan) */}
        <div
          className="relative hidden md:block"
          onMouseEnter={openGemsDropdown}
          onMouseLeave={closeGemsDropdown}
        >
          <button
            type="button"
            onClick={() => setGemsDropdownOpen((prev) => !prev)}
            aria-label={`Gems balance: ${gemsCount}`}
            aria-expanded={gemsDropdownOpen}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-2xl bg-cyan-100 px-3 py-1.5 font-bold text-cyan-950 shadow-surface transition hover:bg-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-300 dark:hover:bg-cyan-500/25 tabular-nums"
          >
            <GemIcon className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />{gemsCount}
          </button>
        </div>

        {/* Dark Mode & Notifications */}
        <button
          type="button"
          title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          onClick={() => toggleDarkMode(!darkMode)}
          className="inline-flex rounded-full p-2 text-slate-700 transition hover:bg-emerald-100 hover:text-emerald-700 dark:text-slate-300 dark:hover:bg-emerald-950/40"
        >
          {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <button type="button" title="Notifications" onClick={handleNotificationsClick} className="relative rounded-full p-2 text-slate-700 transition hover:bg-emerald-100 hover:text-emerald-700 dark:text-slate-300 dark:hover:bg-emerald-950/40">
          <Bell className="h-4 w-4" />
          {totalUnreadCount > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white tabular-nums">{Math.min(totalUnreadCount, 9)}</span>}
        </button>

        {/* Profile Avatar */}
        <div className="relative">
          <button type="button" title="Profile menu" onClick={() => setMenuOpen((open) => !open)} className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-emerald-200 text-emerald-900 shadow-surface transition hover:bg-emerald-300 dark:bg-emerald-800 dark:text-emerald-100">
            {profile?.avatar_url ? <img src={profile.avatar_url} alt={`${name} profile`} className="h-full w-full object-cover" /> : <UserRound className="h-5 w-5" />}
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-13 w-56 rounded-2xl bg-white p-2 text-sm shadow-overlay dark:bg-[#18211f] dark:text-white z-[220]">
              <div className="px-3 py-2">
                <p className="truncate font-bold text-slate-900 dark:text-white">{name}</p>
              </div>
              <button type="button" onClick={() => { toggleDarkMode(!darkMode); setMenuOpen(false); }} className="flex min-h-[44px] w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left font-semibold hover:bg-slate-100 dark:hover:bg-white/10">
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />} {darkMode ? "Light Theme" : "Dark Theme"}
              </button>
              <button type="button" onClick={() => { navigate("/Settings"); setMenuOpen(false); }} className="flex min-h-[44px] w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left font-semibold hover:bg-slate-100 dark:hover:bg-white/10">
                <Settings className="h-4 w-4" /> Settings
              </button>
              <button type="button" onClick={logout} className="flex min-h-[44px] w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30">
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>

    {notificationsOpen && (
      <NotificationCenter
        onClose={() => setNotificationsOpen(false)}
      />
    )}

    <CelebrationLayer celebration={activeCelebration} onClose={dismissCelebration} />
    <XpToast toast={toast} />

    {searchOpen && (
      <div className="fixed inset-0 z-[200] flex items-start justify-center bg-slate-950/35 px-4 pt-20 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && setSearchOpen(false)}>
        <section className="motion-dialog w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-overlay dark:bg-slate-900">
          <form onSubmit={runSearch} className="flex items-center gap-3 px-5 py-4 bg-slate-50/50 dark:bg-slate-800/30">
            <Search className="h-5 w-5 text-slate-400" />
            <input autoFocus value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search notes, flashcards, and resources" className="min-w-0 flex-1 text-base outline-none dark:bg-slate-900 dark:text-slate-100" />
            <button type="button" onClick={() => setSearchOpen(false)} title="Close search" className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200">
              <X className="h-4 w-4" />
            </button>
          </form>
          <div className="max-h-[60vh] overflow-y-auto p-3">
            {searching ? (
              <p className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">Searching...</p>
            ) : searchResults.length ? (
              searchResults.map((result) => (
                <button key={`${result.kind}-${result.id}`} type="button" onClick={() => openSearchResult(result)} className="flex w-full items-start gap-3 rounded-xl p-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <span className="mt-0.5 rounded-lg bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                    {result.kind === "Note" ? <FileText className="h-4 w-4" /> : result.kind === "Flashcard" ? <Layers3 className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0">
                    <strong className="block truncate text-sm text-slate-900 dark:text-slate-100">{result.label}</strong>
                    <span className="mt-1 block truncate text-xs text-slate-500 dark:text-slate-400">{result.kind} · {result.detail || ""}</span>
                  </span>
                </button>
              ))
            ) : (
              <p className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">Search your saved study content.</p>
            )}
          </div>
        </section>
      </div>
    )}
  < />
}

export default DashboardHeader;
