import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  BookOpen,
  Calendar,
  Layers3,
  Users,
  Settings as SettingsIcon,
  HelpCircle,
  LogOut,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";
import supabase from "../../lib/supabase";
import { useProfile } from "../../app/ProfileContext";
import FeedbackDialog from "../common/FeedbackDialog";
import { Button, Badge } from "../common/UIKit";

function Sidebar({ isOpen, toggleSidebar, user }) {
  const { profile } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveFromPath = (pathname) => {
    const lower = pathname.toLowerCase();
    if (lower.startsWith("/study")) return "Study";
    if (lower.startsWith("/planner")) return "Planner";
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

  const menuItems = [
    { name: "Dashboard", path: "/Dashboard", icon: LayoutDashboard },
    { name: "Study", path: "/Study", icon: BookOpen },
    { name: "Planner", path: "/Planner", icon: Calendar },
    { name: "Library", path: "/Library", icon: Layers3 },
    { name: "Community", path: "/Community", icon: Users },
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
        } z-[1000] min-h-screen fixed left-0 top-0 h-full flex flex-col border-r border-slate-200/80 dark:border-violet-900/30 bg-white dark:bg-[#120F24] transition-all duration-200 ease-out`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-slate-100 dark:border-violet-950/50">
          <Link
            to="/Dashboard"
            className="flex items-center gap-3 no-underline text-slate-900 dark:text-white"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-violet-600 text-white font-black text-lg shadow-md shadow-violet-500/25 shrink-0">
              H
            </div>
            {isOpen && (
              <span className="font-bold text-base tracking-tight truncate bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-300">
                Hyper Tutor
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-violet-950/50 dark:hover:text-violet-300 transition-colors"
          >
            {isOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        </div>

        {/* Primary Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto no-scrollbar">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.name;

            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all min-h-[44px] no-underline ${
                  isActive
                    ? "bg-violet-50 text-violet-600 dark:bg-violet-950/80 dark:text-violet-300 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-violet-950/40 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 ${
                    isActive ? "text-violet-600 dark:text-violet-400" : "text-slate-400 dark:text-slate-500"
                  }`}
                />
                {isOpen && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Upgrade Card for Free Users */}
        {isOpen && !isProUser && (
          <div className="mx-3 mb-4 p-4 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white shadow-lg shadow-violet-500/15 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Badge variant="amber" size="sm" icon={Sparkles}>
                PRO
              </Badge>
            </div>
            <p className="text-xs font-medium text-violet-100 mt-1">
              Unlock unlimited AI tutoring, practice sets, & deep analytics.
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-2 text-xs font-bold"
              onClick={() => navigate("/Shop")}
            >
              Upgrade to Pro
            </Button>
          </div>
        )}

        {/* Footer / User Profile */}
        <div className="p-3 border-t border-slate-100 dark:border-violet-950/50 flex flex-col gap-2">
          <div className="flex items-center gap-3 px-2 py-1.5">
            <div className="w-9 h-9 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 font-bold flex items-center justify-center shrink-0 overflow-hidden border border-violet-200 dark:border-violet-800">
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
                  {isProUser ? "Pro Member" : "Free Student"}
                </p>
              </div>
            )}
          </div>

          <Button
            variant="soft"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => navigate("/Study", { state: { openCreateSession: true } })}
            className="w-full text-xs font-bold"
          >
            {isOpen ? "New Session" : ""}
          </Button>

          <div className="flex items-center gap-1 mt-1">
            <button
              type="button"
              onClick={() => setFeedbackOpen(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-violet-950/40 transition-colors flex-1 flex items-center justify-center"
              title="Help & Feedback"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex-1 flex items-center justify-center"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
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
