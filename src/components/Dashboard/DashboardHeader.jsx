import { Bell, Command, Flame, LogOut, Menu, Moon, Search, Settings, Sun, Timer, UserRound, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "../../app/ProfileContext";
import NotificationCenter from "../Notifications/NotificationCenter";
import supabase from "../../lib/supabase";
import {
  dismissNotification,
  getStoredNotifications,
  markAllNotificationsRead,
} from "../../lib/notifications";

function DashboardHeader() {
  const { profile, darkMode, toggleDarkMode } = useProfile();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
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

  return <>
    <header className="sticky top-0 z-[100] flex min-h-16 flex-wrap items-center justify-between gap-3 bg-white px-4 py-3 text-slate-700 md:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <span className="hidden items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-950 sm:inline-flex"><Sun className="h-3.5 w-3.5" />{timeOfDay}</span>
        <span className="hidden items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-950 sm:inline-flex"><Flame className="h-3.5 w-3.5" />3 day streak</span>
        <p className="truncate text-base font-bold text-slate-950 sm:hidden">{timeOfDay}, {name}!</p>
        <p className="hidden truncate text-base font-bold text-slate-950 sm:block">{timeOfDay}, {name}!</p>
      </div>
      <div className="flex min-w-0 items-center gap-1.5 text-xs text-slate-900 sm:gap-2">
        <span className="hidden items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 font-semibold text-orange-950 lg:inline-flex"><Flame className="h-3.5 w-3.5" />3d</span>
        <span className="hidden items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 font-semibold text-slate-900 sm:inline-flex"><Timer className="h-3.5 w-3.5" />0m</span>
        <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-violet-50 px-2 font-bold text-violet-950">4</span>
        <span className="hidden items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 font-semibold text-slate-900 md:inline-flex"><Users className="h-3.5 w-3.5" />1</span>
        <span className="hidden rounded-full bg-rose-50 px-3 py-1.5 font-semibold text-rose-950 sm:inline-flex">1</span>
        <button type="button" title="Open navigation" className="rounded-full p-2 text-slate-700 hover:bg-slate-100"><Menu className="h-4 w-4" /></button>
        <button type="button" title="Search" className="hidden rounded-full p-2 text-slate-700 hover:bg-slate-100 sm:inline-flex"><Search className="h-4 w-4" /></button>
        <button type="button" title="Keyboard shortcuts" className="hidden items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1.5 font-semibold text-slate-950 sm:inline-flex"><Command className="h-3.5 w-3.5" />K</button>
        <button type="button" title={darkMode ? "Switch to light mode" : "Switch to dark mode"} onClick={() => toggleDarkMode(!darkMode)} className="rounded-full p-2 text-slate-700 hover:bg-slate-100">{darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
        <button type="button" title="Notifications" onClick={handleNotificationsClick} className="relative rounded-full p-2 text-slate-700 hover:bg-slate-100">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">{Math.min(unreadCount, 9)}</span>}
        </button>
        <div className="relative">
          <button type="button" title="Profile menu" onClick={() => setMenuOpen((open) => !open)} className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-emerald-800"><>{profile?.avatar_url ? <img src={profile.avatar_url} alt={`${name} profile`} className="h-full w-full object-cover" /> : <UserRound className="h-4 w-4" />}</></button>
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
  </>;
}

export default DashboardHeader;