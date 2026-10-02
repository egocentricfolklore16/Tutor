import { Bell, BookOpen, Command, FileText, Flame, Layers3, Lock, LogOut, Menu, Moon, Search, Settings, Snowflake, Sun, Trophy, UserRound, Users, X, Zap, CheckCircle2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "../../app/ProfileContext";
import useStreak from "../../hooks/useStreak";
import NotificationCenter from "../Notifications/NotificationCenter";
import AISuggestions from "./AISuggestions";
import supabase from "../../lib/supabase";
import {
  dismissNotification,
  getStoredNotifications,
  markAllNotificationsRead,
} from "../../lib/notifications";
import { calculateXpLevel } from "../../lib/gamification";

function GemIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6.5 3h11L21 9l-9 12L3 9l3.5-6Z" fill="currentColor" />
      <path d="M6.5 3 12 9l5.5-6M3 9h18M9.5 9 12 21l2.5-12" stroke="white" strokeOpacity="0.45" strokeWidth="0.6" strokeLinejoin="round" />
    </svg>
  );
}

function DashboardHeader({ toggleSidebar }) {
  const { profile, darkMode, toggleDarkMode } = useProfile();
  const { currentStreak, longestStreak, freezeTokens, weekDays, todayCompleted } = useStreak();

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
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";

  // Friend streaks count from streak object if provided
  const activeFriendStreaks = profile?.active_friend_streaks ?? 0;

  const xpPoints = profile?.xp_points ?? 0;
  const xpInfo = calculateXpLevel(xpPoints);
  const xpLevel = xpInfo.level;
  const xpToNextLevel = xpInfo.xpToNextLevel;
  const xpProgressPercent = xpInfo.xpProgressPercent;

  const gemsCount = profile?.gems ?? 0;

  // Motivational message by streak state
  const getMotivationalText = () => {
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
    const handleSearchShortcut = (event) => {
      const target = event.target;
      const isTyping = target instanceof HTMLElement && (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      );

      if (!isTyping && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };

    document.addEventListener("keydown", handleSearchShortcut);
    return () => document.removeEventListener("keydown", handleSearchShortcut);
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
    } catch (err) {
      await supabase.auth.signOut({ scope: "local" });
    }
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

  const openStreakDropdown = () => {
    clearTimeout(streakCloseTimer.current);
    setStreakDropdownOpen(true);
  };

  const closeStreakDropdown = () => {
    streakCloseTimer.current = setTimeout(() => setStreakDropdownOpen(false), 150);
  };

  const toggleStreakDropdownMobile = () => {
    setStreakDropdownOpen((prev) => !prev);
  };

  const openXpDropdown = () => {
    clearTimeout(xpCloseTimer.current);
    setXpDropdownOpen(true);
  };

  const closeXpDropdown = () => {
    xpCloseTimer.current = setTimeout(() => setXpDropdownOpen(false), 150);
  };

  const openGemsDropdown = () => {
    clearTimeout(gemsCloseTimer.current);
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

  const isSocietyUnlocked = currentStreak >= 7;

  return <>
    <header className="sticky top-0 z-[100] flex min-h-16 flex-nowrap items-center justify-between gap-2 bg-white px-3 py-3 text-slate-700 sm:px-4 md:px-6 dark:bg-[#14171c] dark:text-slate-200">
      <div className="flex min-w-0 shrink items-center gap-2">
        <span className="flex shrink-0 items-center gap-1.5 sm:hidden">
          <button type="button" title="Open sidebar" onClick={toggleSidebar} className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-slate-700 transition hover:bg-emerald-100 hover:text-emerald-700 dark:text-slate-300 dark:hover:bg-emerald-950/40">
            <Menu className="h-4 w-4" />
          </button>
          <img src="/logo3.png" alt="Hyper Tutor" className="h-7 w-7 object-contain" />
        </span>

        <p className="hidden truncate text-base text-slate-950 sm:block dark:text-slate-100">{timeOfDay}, {name}!</p>
      </div>

      <div className="flex min-w-0 items-center gap-1.5 text-xs text-slate-900 sm:gap-2 dark:text-slate-100">
        <div className="relative">
          <button type="button" title="Open AI suggestions" onClick={() => setAiSuggestionsOpen((open) => !open)} className="hidden rounded-full p-2 text-slate-700 transition hover:bg-emerald-100 hover:text-emerald-700 sm:inline-flex dark:text-slate-300 dark:hover:bg-emerald-950/40">
            <Menu className="h-4 w-4" />
          </button>
          {aiSuggestionsOpen && <div className="motion-dialog absolute right-0 top-12 z-[210] w-[min(88vw,22rem)]"><div className="mb-2 flex justify-end"><button type="button" title="Close AI suggestions" onClick={() => setAiSuggestionsOpen(false)} className="rounded-full bg-white p-1.5 text-slate-500 shadow-md hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300"><X className="h-4 w-4" /></button></div><AISuggestions /></div>}
        </div>

        <button type="button" title="Search the app" onClick={() => setSearchOpen(true)} className="inline-flex items-center rounded-full p-2 text-slate-700 transition hover:bg-sky-100 hover:text-sky-700 sm:gap-3 sm:bg-sky-100 sm:px-3 sm:py-2 sm:text-sky-900 sm:shadow-sm dark:text-sky-300 dark:sm:bg-sky-950/40 dark:sm:text-sky-200">
          <Search className="h-4 w-4 text-sky-700 dark:text-sky-400" />
          <span className="hidden text-xs font-semibold sm:inline">Search</span>
          <span className="hidden items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-bold text-sky-800 sm:flex dark:bg-slate-800/80 dark:text-sky-300">
            <Command className="h-3 w-3" />K
          </span>
        </button>

        {/* Streak Button & Dropdown */}
        <div
          className="relative inline-block"
          onMouseEnter={openStreakDropdown}
          onMouseLeave={closeStreakDropdown}
        >
          <button
            type="button"
            onClick={toggleStreakDropdownMobile}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-2xl bg-orange-200 px-3 py-1.5 font-bold text-orange-950 shadow-sm transition hover:bg-orange-300 dark:bg-orange-500/15 dark:text-orange-300 dark:hover:bg-orange-500/25"
          >
            <Flame className="animate-streak-pop h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
            <span>{currentStreak}d</span>
          </button>

          {streakDropdownOpen && (
            <div className="motion-dialog absolute right-0 top-11 z-[210] w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-[#18211f]">
              <div className="relative overflow-hidden bg-amber-100 p-5 dark:bg-amber-500/10">
                <Flame className="absolute -right-3 -top-2 h-24 w-24 text-amber-300/60 dark:text-amber-500/15" />
                <div className="relative flex items-center justify-between">
                  <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-300">{currentStreak} day streak</p>
                  {freezeTokens > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300" title={`${freezeTokens} Streak Freeze Token(s) available`}>
                      <Snowflake className="h-3.5 w-3.5 text-blue-500" />
                      {freezeTokens}
                    </span>
                  )}
                </div>
                <p className="relative mt-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                  {getMotivationalText()}
                </p>

                {/* 7-day Weekday Row */}
                <div className="relative mt-4 flex items-center justify-between rounded-xl bg-white px-3 py-3 shadow-sm dark:bg-white/5">
                  {weekDays.map((day, index) => {
                    return (
                      <div key={`${day.label}-${index}`} className="flex flex-col items-center gap-1.5">
                        <span className={`text-[11px] font-bold ${day.isToday ? "text-orange-600 dark:text-orange-400" : "text-slate-400 dark:text-slate-500"}`}>
                          {day.label}
                        </span>

                        {day.state === "completed" && (
                          <div className="relative flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 ring-2 ring-orange-400 shadow-sm dark:bg-orange-500/20 dark:ring-orange-500/60">
                            <img src="/streak.svg" alt="Streak completed" className="animate-streak-pop h-5 w-5 object-contain" />
                          </div>
                        )}

                        {day.state === "frozen" && (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 ring-2 ring-blue-400 dark:bg-blue-900/40 dark:ring-blue-500/60" title="Streak frozen">
                            <Snowflake className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                          </div>
                        )}

                        {day.state === "today-pending" && (
                          <div className="animate-streak-pulse flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed border-orange-500 bg-transparent dark:border-orange-400" title="Study today to keep your streak">
                            <span className="h-2 w-2 rounded-full bg-orange-500 dark:bg-orange-400" />
                          </div>
                        )}

                        {day.state === "missed" && (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800/40" title="Missed day">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                          </div>
                        )}

                        {day.state === "future" && (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-slate-300 dark:border-slate-700" title="Upcoming day">
                            <span className="h-1 w-1 rounded-full bg-slate-200 dark:bg-slate-700" />
                          </div>
                        )}

                        <span className="sr-only">{`Day ${day.label}: ${day.state}`}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="relative mt-3 flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  <span>Longest Streak: <strong className="text-amber-700 dark:text-amber-300">{longestStreak} days</strong></span>
                  <span>Freezes: <strong className="text-blue-600 dark:text-blue-300">{freezeTokens}</strong></span>
                </div>
              </div>

              {/* Friend Streaks Card */}
              <div className="m-3 flex items-center gap-3 rounded-2xl bg-orange-500 p-4 shadow-sm dark:bg-orange-600/80">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <Users className="h-5 w-5 text-white" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white">Friend Streaks</p>
                  <p className="text-xs text-orange-50">{activeFriendStreaks} active Friend Streaks</p>
                </div>
                <button type="button" onClick={() => navigate("/Friends")} className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-orange-600 shadow-sm transition hover:bg-orange-50">
                  VIEW LIST
                </button>
              </div>

              {/* Streak Society Card */}
              <div className={`mx-3 mb-3 flex items-start gap-3 rounded-2xl p-4 transition ${isSocietyUnlocked ? "border border-amber-300 bg-amber-50/80 dark:border-amber-500/40 dark:bg-amber-950/30" : "border border-slate-200 dark:border-slate-700"}`}>
                <span className={`mt-0.5 rounded-full p-2 ${isSocietyUnlocked ? "bg-amber-200 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300" : "bg-slate-100 text-slate-400 dark:bg-white/10"}`}>
                  {isSocietyUnlocked ? <CheckCircle2 className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-bold ${isSocietyUnlocked ? "text-amber-900 dark:text-amber-200" : "text-slate-900 dark:text-white"}`}>Streak Society</p>
                    {isSocietyUnlocked && <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-900 dark:bg-amber-500/30 dark:text-amber-200">Unlocked</span>}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {isSocietyUnlocked ? "Congratulations! You are a member of the Streak Society with 2x bonus rewards." : "Reach a 7 day streak to join the Streak Society and earn exclusive rewards."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* XP Button & Dropdown */}
        <div
          className="relative hidden sm:block"
          onMouseEnter={openXpDropdown}
          onMouseLeave={closeXpDropdown}
        >
          <span className="inline-flex cursor-default items-center gap-1.5 rounded-2xl bg-amber-200 px-3 py-1.5 font-bold text-amber-950 shadow-sm dark:bg-amber-500/15 dark:text-amber-300">
            <Zap className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />{xpPoints} XP
          </span>
          {xpDropdownOpen && (
            <div className="motion-dialog absolute right-0 top-11 z-[210] w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-[#18211f]">
              <div className="relative overflow-hidden bg-amber-100 p-5 dark:bg-amber-500/10">
                <Zap className="absolute -right-3 -top-2 h-24 w-24 text-amber-300/60 dark:text-amber-500/15" />
                <p className="relative text-2xl font-extrabold text-amber-500 dark:text-amber-300">{xpPoints} XP</p>
                <p className="relative mt-1 max-w-[75%] text-sm text-slate-700 dark:text-slate-300">Level {xpLevel} · {xpToNextLevel} XP to next level</p>
                <div className="relative mt-4 rounded-xl bg-white px-3 py-3 shadow-sm dark:bg-white/5">
                  <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    <span>Level {xpLevel}</span>
                    <span>Level {xpLevel + 1}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                    <div className="h-full rounded-full bg-amber-400 dark:bg-amber-500/70" style={{ width: `${xpProgressPercent}%` }} />
                  </div>
                </div>
              </div>

              <div className="m-3 flex items-center gap-3 rounded-2xl bg-amber-500 p-4 shadow-sm dark:bg-amber-600/80">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <Trophy className="h-5 w-5 text-white" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white">Leaderboard</p>
                  <p className="text-xs text-amber-50">See how you rank this week</p>
                </div>
                <button type="button" onClick={() => navigate("/Leaderboard")} className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-amber-600 shadow-sm transition hover:bg-amber-50">VIEW</button>
              </div>

              <div className="mx-3 mb-3 flex items-start gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                <span className="mt-0.5 rounded-full bg-slate-100 p-2 text-slate-400 dark:bg-white/10"><Lock className="h-4 w-4" /></span>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Level {xpLevel + 1}</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Earn {xpToNextLevel} more XP to unlock Level {xpLevel + 1} and new practice sets.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Gems Button & Dropdown */}
        <div
          className="relative hidden md:block"
          onMouseEnter={openGemsDropdown}
          onMouseLeave={closeGemsDropdown}
        >
          <span className="inline-flex cursor-default items-center gap-1.5 rounded-2xl bg-cyan-200 px-3 py-1.5 font-bold text-cyan-950 shadow-sm dark:bg-cyan-500/15 dark:text-cyan-300">
            <GemIcon className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />{gemsCount}
          </span>
          {gemsDropdownOpen && (
            <div className="motion-dialog absolute right-0 top-11 z-[210] w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-[#18211f]">
              <div className="relative overflow-hidden bg-cyan-100 p-5 dark:bg-cyan-500/10">
                <GemIcon className="absolute -right-3 -top-2 h-24 w-24 text-cyan-300/60 dark:text-cyan-500/15" />
                <p className="relative text-2xl font-extrabold text-cyan-500 dark:text-cyan-300">{gemsCount} Gems</p>
                <p className="relative mt-1 max-w-[75%] text-sm text-slate-700 dark:text-slate-300">Earn gems by finishing lessons and challenges!</p>
              </div>

              <div className="m-3 flex items-center gap-3 rounded-2xl bg-cyan-500 p-4 shadow-sm dark:bg-cyan-600/80">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <GemIcon className="h-5 w-5 text-white" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white">Gem Shop</p>
                  <p className="text-xs text-cyan-50">Redeem gems for rewards</p>
                </div>
                <button type="button" onClick={() => navigate("/Shop")} className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-cyan-600 shadow-sm transition hover:bg-cyan-50">VISIT SHOP</button>
              </div>

              <div className="mx-3 mb-3 flex items-start gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                <span className="mt-0.5 rounded-full bg-slate-100 p-2 text-slate-400 dark:bg-white/10"><Lock className="h-4 w-4" /></span>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Gem Multiplier</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Reach a 30 day streak to unlock 2x Gem rewards.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dark Mode & Notifications */}
        <button
          type="button"
          title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          onClick={() => toggleDarkMode(!darkMode)}
          className="inline-flex rounded-full p-2 text-slate-700 transition hover:bg-violet-100 hover:text-violet-700 dark:text-slate-300 dark:hover:bg-violet-950/40"
        >
          {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <button type="button" title="Notifications" onClick={handleNotificationsClick} className="relative rounded-full p-2 text-slate-700 transition hover:bg-rose-100 hover:text-rose-700 dark:text-slate-300 dark:hover:bg-rose-950/40">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">{Math.min(unreadCount, 9)}</span>}
        </button>

        {/* Profile Avatar */}
        <div className="relative">
          <button type="button" title="Profile menu" onClick={() => setMenuOpen((open) => !open)} className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-emerald-200 text-emerald-900 shadow-sm transition hover:bg-emerald-300 dark:bg-emerald-800 dark:text-emerald-100">
            {profile?.avatar_url ? <img src={profile.avatar_url} alt={`${name} profile`} className="h-full w-full object-cover" /> : <UserRound className="h-5 w-5" />}
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-13 w-56 rounded-2xl border border-slate-200 bg-white p-2 text-sm shadow-xl dark:border-slate-700 dark:bg-[#18211f] dark:text-white z-[220]">
              <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-800">
                <p className="truncate font-bold text-slate-900 dark:text-white">{name}</p>
                <div className="mt-1 flex items-center gap-2 text-xs font-semibold text-slate-500 sm:hidden">
                  <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400"><Zap className="h-3 w-3" />{xpPoints} XP</span>
                  <span>·</span>
                  <span className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400"><GemIcon className="h-3 w-3" />{gemsCount} Gems</span>
                </div>
              </div>
              <button type="button" onClick={() => { toggleDarkMode(!darkMode); setMenuOpen(false); }} className="flex min-h-[44px] w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-white/10">
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />} {darkMode ? "Light Theme" : "Dark Theme"}
              </button>
              <button type="button" onClick={() => { navigate("/Settings"); setMenuOpen(false); }} className="flex min-h-[44px] w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-white/10">
                <Settings className="h-4 w-4" /> Settings
              </button>
              <button type="button" onClick={logout} className="flex min-h-[44px] w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </div>
          )}
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

    {searchOpen && (
      <div className="fixed inset-0 z-[200] flex items-start justify-center bg-slate-950/35 px-4 pt-20 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && setSearchOpen(false)}>
        <section className="motion-dialog w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
          <form onSubmit={runSearch} className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
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
  </>;
}

export default DashboardHeader;
