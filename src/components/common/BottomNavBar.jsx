import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  Sparkles,
  Users,
  User,
  Settings,
  HelpCircle,
  Layers3,
  Calendar,
} from "lucide-react";
import ResponsiveSheet from "./ResponsiveSheet";

/**
 * BottomNavBar renders a modern floating pill bottom navigation for viewports <768px.
 * Features: Home, Study, centered AI Tutor button, Community, Profile/More.
 */
export function BottomNavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  const isCurrentActive = (path) => {
    if (path === "/Dashboard" && (location.pathname === "/" || location.pathname === "/Dashboard"))
      return true;
    return location.pathname.startsWith(path);
  };

  const pathLower = location.pathname.toLowerCase();
  const isThreadPage =
    pathLower.includes("/chat/") && pathLower.split("/chat/")[1]?.trim().length > 0;
  const isNotificationsPage = pathLower === "/notifications";

  if (isThreadPage || isNotificationsPage) {
    return null;
  }

  const secondaryItems = [
    { name: "Planner", path: "/Planner", icon: Calendar },
    { name: "Library", path: "/Library", icon: Layers3 },
    { name: "FAQ", path: "/FAQ", icon: HelpCircle },
    { name: "Settings", path: "/Settings", icon: Settings },
  ];

  const handleAiTutorClick = () => {
    window.dispatchEvent(new CustomEvent("hyper-tutor-open-ai-chat"));
  };

  return (
    <>
      <div className="fixed bottom-3 left-0 right-0 z-[95] flex justify-center px-4 md:hidden pointer-events-none">
        <nav
          className="pointer-events-auto flex items-center justify-between w-full max-w-sm px-3 py-2 bg-white/90 dark:bg-[#120F24]/90 backdrop-blur-xl rounded-full border border-slate-200/80 dark:border-violet-900/40 shadow-xl shadow-violet-500/10"
          aria-label="Mobile floating navigation"
        >
          {/* Home */}
          <Link
            to="/Dashboard"
            className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-2 rounded-full transition-colors ${
              isCurrentActive("/Dashboard")
                ? "text-violet-600 dark:text-violet-400 font-bold"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 font-medium">Home</span>
          </Link>

          {/* Study */}
          <Link
            to="/Study"
            className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-2 rounded-full transition-colors ${
              isCurrentActive("/Study")
                ? "text-violet-600 dark:text-violet-400 font-bold"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 font-medium">Study</span>
          </Link>

          {/* Highlighted AI Tutor Action */}
          <button
            type="button"
            onClick={handleAiTutorClick}
            aria-label="Open AI Tutor"
            className="flex items-center justify-center w-12 h-12 -mt-5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/40 active:scale-95 transition-transform"
          >
            <Sparkles className="w-6 h-6 animate-pulse" />
          </button>

          {/* Community */}
          <Link
            to="/Community"
            className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-2 rounded-full transition-colors ${
              isCurrentActive("/Community")
                ? "text-violet-600 dark:text-violet-400 font-bold"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 font-medium">Community</span>
          </Link>

          {/* Profile / More */}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-2 rounded-full transition-colors ${
              moreOpen ? "text-violet-600 dark:text-violet-400 font-bold" : "text-slate-500 dark:text-slate-400"
            }`}
            aria-label="Open profile menu"
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 font-medium">More</span>
          </button>
        </nav>
      </div>

      <ResponsiveSheet isOpen={moreOpen} onClose={() => setMoreOpen(false)} title="Menu">
        <div className="grid grid-cols-2 gap-3 p-2">
          {secondaryItems.map((item) => {
            const Icon = item.icon;
            const active = isCurrentActive(item.path);
            return (
              <button
                key={item.name}
                type="button"
                onClick={() => {
                  setMoreOpen(false);
                  navigate(item.path);
                }}
                className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition-all ${
                  active
                    ? "bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-950/60 dark:border-violet-800 dark:text-violet-300 font-bold"
                    : "bg-slate-50 border-slate-200/80 text-slate-700 dark:bg-[#181432] dark:border-violet-900/30 dark:text-slate-200"
                }`}
              >
                <Icon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                <span className="text-sm">{item.name}</span>
              </button>
            );
          })}
        </div>
      </ResponsiveSheet>
    </>
  );
}

export default BottomNavBar;
