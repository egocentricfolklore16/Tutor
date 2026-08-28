import { Bell, LogOut, Moon, Settings, Sun, UserRound, X } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "../../app/ProfileContext";
import supabase from "../../lib/supabase";

function DashboardHeader() {
  const { profile, darkMode, toggleDarkMode } = useProfile();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const navigate = useNavigate();
  const name = profile?.full_name || profile?.username || "Learner";

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return <>
    <header className="sticky top-0 z-[100] flex h-16 items-center justify-between border-b border-black bg-white px-4 shadow-sm dark:border-slate-700 dark:bg-[#18211f] md:px-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
      <div className="flex items-center gap-2">
        <button type="button" title="Notifications" onClick={() => setNotificationsOpen(true)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-white dark:hover:bg-white/10"><Bell className="h-5 w-5" /></button>
        <button type="button" title={darkMode ? "Switch to light mode" : "Switch to dark mode"} onClick={() => toggleDarkMode(!darkMode)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-white dark:hover:bg-white/10">{darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}</button>
        <div className="relative">
          <button type="button" title="Profile menu" onClick={() => setMenuOpen((open) => !open)} className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-emerald-500 bg-emerald-100 text-emerald-800"><>{profile?.avatar_url ? <img src={profile.avatar_url} alt={`${name} profile`} className="h-full w-full object-cover" /> : <UserRound className="h-5 w-5" />}</></button>
          {menuOpen && <div className="absolute right-0 top-11 w-44 rounded-lg border border-slate-200 bg-white p-2 text-sm shadow-lg dark:border-slate-700 dark:bg-[#18211f] dark:text-white"><p className="truncate px-3 py-2 font-semibold">{name}</p><button type="button" onClick={() => navigate("/Settings")} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-white/10"><Settings className="h-4 w-4" /> Settings</button><button type="button" onClick={logout} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"><LogOut className="h-4 w-4" /> Logout</button></div>}
        </div>
      </div>
    </header>
    {notificationsOpen && <div className="fixed inset-0 z-[110] bg-black/20" onClick={() => setNotificationsOpen(false)}><aside className="absolute right-0 top-0 h-full w-full max-w-sm bg-white p-6 shadow-2xl dark:bg-[#18211f] dark:text-white" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><h2 className="text-xl font-bold">Notifications</h2><button type="button" title="Close notifications" onClick={() => setNotificationsOpen(false)} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-white/10"><X className="h-5 w-5" /></button></div><div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">You are all caught up. Keep your study momentum going.</div><div className="mt-4 rounded-lg border border-slate-200 p-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">Your next study session will appear here when it is ready.</div></aside></div>}
  </>;
}

export default DashboardHeader;