import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  User,
  Settings,
  HelpCircle,
  Layers3,
  Calendar,
  TrendingUp,
} from "lucide-react";
import ResponsiveSheet from "./ResponsiveSheet";
import { Lumo } from "./UIKit";

/**
 * BottomNavBar renders a mobile floating pill nav with 5 slots:
 * Home, Study, Lumo/AI Center Highlighted Action, Community, Profile/More.
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
    { name: "Progress", path: "/Progress", icon: TrendingUp },
    { name: "Library", path: "/Library", icon: Layers3 },
    { name: "FAQ", path: "/FAQ", icon: HelpCircle },
    { name: "Settings", path: "/Settings", icon: Settings },
  ];

  const handleAiTutorClick = () => {
    window.dispatchEvent(new CustomEvent("hyper-tutor-open-ai-chat"));
  };

  return (
    <>
      <div className="fixed bottom-3 left-0 right-0 z-[95] flex justify-center px-4 md:hidden pointer-events-none pb-[env(safe-area-inset-bottom)]">
        <nav
          className="pointer-events-auto flex items-center justify-between w-full max-w-sm px-3 py-2 bg-white/90 dark:bg-[#141923]/90 backdrop-blur-xl rounded-full border border-slate-200/80 dark:border-white/10 shadow-overlay"
          aria-label="Mobile floating navigation"
        >
          {/* Home */}
          <Link
            to="/Dashboard"
            className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-2 rounded-full transition-colors ${
              isCurrentActive("/Dashboard")
                ? "text-orange-500 font-extrabold"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 font-bold">Home</span>
          </Link>

          {/* Study */}
          <Link
            to="/Study"
            className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-2 rounded-full transition-colors ${
              isCurrentActive("/Study")
                ? "text-orange-500 font-extrabold"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 font-bold">Study</span>
          </Link>

          {/* Lumo AI Center Slot */}
          <button
            type="button"
            onClick={handleAiTutorClick}
            aria-label="Open AI Tutor with Lumo"
            className="flex items-center justify-center w-12 h-12 -mt-5 rounded-full bg-emerald-600 text-white shadow-button-primary active:scale-95 transition-transform"
          >
            <Lumo pose="greeting" size="sm" />
          </button>

          {/* Community */}
          <Link
            to="/Community"
            className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-2 rounded-full transition-colors ${
              isCurrentActive("/Community")
                ? "text-orange-500 font-extrabold"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 font-bold">Community</span>
          </Link>

          {/* Profile / More */}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-2 rounded-full transition-colors ${
              moreOpen ? "text-orange-500 font-extrabold" : "text-slate-500 dark:text-slate-400"
            }`}
            aria-label="Open profile menu"
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 font-bold">More</span>
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
                    ? "bg-orange-50 border-orange-200 text-orange-600 dark:bg-orange-950/60 dark:border-orange-800 dark:text-orange-300 font-bold"
                    : "bg-slate-50 border-slate-200/80 text-slate-700 dark:bg-[#141923] dark:border-slate-800 dark:text-slate-200"
                }`}
              >
                <Icon className="w-5 h-5 text-orange-500" />
                <span className="text-sm font-bold">{item.name}</span>
              </button>
            );
          })}
        </div>
      </ResponsiveSheet>
    </>
  );
}

export default BottomNavBar;
