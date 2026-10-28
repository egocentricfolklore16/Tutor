import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  BookOpen,
  Calendar,
  TrendingUp,
  Layers3,
  Users,
  HelpCircle,
  Settings as SettingsIcon,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Plus,
  Rocket,
} from "lucide-react";
import supabase from "../../lib/supabase";
import { useProfile } from "../../app/ProfileContext";
import FeedbackDialog from "../common/FeedbackDialog";
import { Button, SectionLabel, Lumo, Tooltip } from "../common/UIKit";
import { useInAppNotifications } from "../../hooks/useInAppNotifications";

function Sidebar({ isOpen, toggleSidebar, user }) {
  const { profile } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useInAppNotifications();

  const getActiveFromPath = (pathname) => {
    const lower = pathname.toLowerCase();
    if (lower.startsWith("/study")) return "Study";
    if (lower.startsWith("/planner")) return "Planner";
    if (lower.startsWith("/progress")) return "Progress";
    if (lower.startsWith("/library")) return "Library";
    if (lower.startsWith("/community")) return "Community";
    if (lower.startsWith("/faq")) return "FAQ";
    if (lower.startsWith("/settings")) return "Settings";
    return "Dashboard";
  };

  const activeItem = getActiveFromPath(location.pathname);
  const [username, setUsername] = useState(() => {
    if (user)
      return (
        user.user_metadata?.full_name ||
        user.user_metadata?.userName ||
        user.email?.split("@")[0] ||
        "Learner"
      );
    return "Learner";
  });
  const [isLoading, setIsLoading] = useState(!user);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const menuItems = [
    { name: "Dashboard", path: "/Dashboard", icon: LayoutDashboard },
    { name: "Study", path: "/Study", icon: BookOpen },
    { name: "Planner", path: "/Planner", icon: Calendar },
    { name: "Progress", path: "/Progress", icon: TrendingUp },
    { name: "Library", path: "/Library", icon: Layers3 },
    { name: "Community", path: "/Community", icon: Users, badge: unreadCount },
    { name: "FAQ", path: "/FAQ", icon: HelpCircle },
    { name: "Settings", path: "/Settings", icon: SettingsIcon },
  ];

  const isProUser =
    profile?.subscription_tier === "pro" || profile?.subscription_tier === "elite";

  const confirmLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        await supabase.auth.signOut({ scope: "local" });
      }
    } catch {
      await supabase.auth.signOut({ scope: "local" });
    }
  };

  const handleLogout = () => setFeedbackOpen(true);

  useEffect(() => {
    if (user) {
      setIsLoading(false);
      return;
    }

    const fetchUsername = async () => {
      setIsLoading(true);
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();

        if (!currentUser) {
          setUsername("Learner");
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", currentUser.id)
          .maybeSingle();

        if (error) {
          setUsername(currentUser.email || "Learner");
        } else {
          setUsername(
            data?.full_name ||
              currentUser.user_metadata?.full_name ||
              currentUser.email ||
              "Learner"
          );
        }
      } catch {
        setUsername("Learner");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsername();
  }, [user]);

  return (
    <>
      <aside
        className={`${
          isOpen ? "w-64" : "w-20"
        } z-[1000] min-h-screen fixed left-0 top-0 h-full flex flex-col border-r border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#141923] transition-all duration-200 ease-out`}
      >
        {/* Emerald Logo Tile & Brand Header */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-slate-100 dark:border-white/5">
          <Link
            to="/Dashboard"
            className="flex items-center gap-3 no-underline text-slate-900 dark:text-white"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-emerald-600 text-white font-black text-xl shadow-button-primary shrink-0">
              H
            </div>
            {isOpen && (
              <span className="font-extrabold text-base tracking-tight truncate text-slate-900 dark:text-white">
                Hyper Tutor
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            {isOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        </div>

        {/* Primary Action Button */}
        <div className="p-3">
          <Button
            variant="cta"
            size="md"
            leftIcon={<Plus className="w-5 h-5" />}
            onClick={() => navigate("/Study", { state: { openCreateSession: true } })}
            className="w-full text-sm font-extrabold"
          >
            {isOpen ? "New Study Session" : ""}
          </Button>
        </div>

        {/* Menu Section Label */}
        {isOpen && (
          <div className="px-5 pt-2 pb-1">
            <SectionLabel>MENU</SectionLabel>
          </div>
        )}

        {/* Primary Nav */}
        <nav className="flex-1 px-3 py-2 space-y-1.5 overflow-y-auto no-scrollbar">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.name;

            const navLink = (
              <Link
                key={item.name}
                to={item.path}
                className={`relative flex items-center gap-3.5 px-3.5 py-3 rounded-2xl text-sm font-bold transition-all min-h-[44px] no-underline ${
                  isActive
                    ? "bg-orange-50/80 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400 font-extrabold"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                {/* 3px Active Indicator */}
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-orange-500" />
                )}

                <Icon
                  className={`w-5 h-5 shrink-0 ${
                    isActive ? "text-orange-500" : "text-slate-400 dark:text-slate-500"
                  }`}
                />
                {isOpen && <span className="truncate">{item.name}</span>}

                {/* Unread badge for Community */}
                {item.badge > 0 && (
                  <span className="ml-auto px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-orange-500 text-white tabular-nums">
                    {item.badge}
                  </span>
                )}
              </Link>
            );

            return isOpen ? (
              navLink
            ) : (
              <Tooltip key={item.name} text={item.name}>
                {navLink}
              </Tooltip>
            );
          })}
        </nav>

        {/* Upgrade Card for Free Users */}
        {isOpen && !isProUser && (
          <div className="mx-3 mb-3 p-4 rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-surface flex flex-col gap-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold tracking-wider uppercase bg-white/20 px-2 py-0.5 rounded-full text-white">
                GO PRO
              </span>
              <Lumo pose="greeting" size="sm" />
            </div>
            <p className="text-xs font-semibold text-emerald-100 mt-1 leading-relaxed">
              Unlock unlimited AI practice, mock exams & priority answers.
            </p>
            <Button
              variant="cta"
              size="sm"
              leftIcon={<Rocket className="w-3.5 h-3.5" />}
              className="mt-2 text-xs font-extrabold"
              onClick={() => navigate("/Shop")}
            >
              Upgrade now
            </Button>
          </div>
        )}

        {/* Footer / User Row Menu */}
        <div className="p-3 border-t border-slate-100 dark:border-white/5 relative">
          <button
            type="button"
            onClick={() => setUserMenuOpen((prev) => !prev)}
            className="flex items-center gap-3 w-full p-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition text-left"
          >
            <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold flex items-center justify-center shrink-0 overflow-hidden border border-emerald-200 dark:border-emerald-800">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={username}
                  className="w-full h-full object-cover"
                />
              ) : (
                username.charAt(0).toUpperCase()
              )}
            </div>
            {isOpen && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  {isLoading ? "Loading..." : username}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {isProUser ? "Pro Scholar" : "Free Scholar"}
                </p>
              </div>
            )}
          </button>

          {/* User Popover Menu */}
          {userMenuOpen && (
            <div className="absolute bottom-16 left-3 right-3 z-[1100] rounded-2xl bg-white dark:bg-[#1f242d] border border-slate-200/80 dark:border-white/10 p-2 shadow-overlay text-xs font-bold space-y-1">
              <button
                type="button"
                onClick={() => {
                  setUserMenuOpen(false);
                  navigate("/Settings");
                }}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
              >
                Settings & Profile
              </button>
              <button
                type="button"
                onClick={() => {
                  setUserMenuOpen(false);
                  setFeedbackOpen(true);
                }}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
              >
                Help & Feedback
              </button>
              <button
                type="button"
                onClick={() => {
                  setUserMenuOpen(false);
                  handleLogout();
                }}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </aside>

      <FeedbackDialog
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        onLogout={confirmLogout}
      />
    </>
  );
}

export default Sidebar;
