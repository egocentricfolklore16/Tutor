import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, BookOpen, Calendar, TrendingUp, MoreHorizontal, Users, HelpCircle, Settings, X } from "lucide-react";
import ResponsiveSheet from "./ResponsiveSheet";

/**
 * BottomNavBar renders a compact bottom tab bar for viewports <768px with primary routes
 * and a "More" drawer sheet for secondary items.
 */
export function BottomNavBar() {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const primaryItems = [
    { name: "Dashboard", path: "/Dashboard", icon: LayoutDashboard },
    { name: "Study", path: "/Study", icon: BookOpen },
    { name: "Planner", path: "/Planner", icon: Calendar },
    { name: "Progress", path: "/Progress", icon: TrendingUp },
  ];

  const secondaryItems = [
    { name: "Library", path: "/Library", icon: BookOpen },
    { name: "Community", path: "/Community", icon: Users },
    { name: "FAQ", path: "/FAQ", icon: HelpCircle },
    { name: "Settings", path: "/Settings", icon: Settings },
  ];

  const isCurrentActive = (path) => {
    if (path === "/Dashboard" && (location.pathname === "/" || location.pathname === "/Dashboard")) return true;
    return location.pathname.startsWith(path);
  };

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-[95] flex h-16 items-center justify-around border-t border-slate-200 bg-white/95 px-2 backdrop-blur-md md:hidden dark:border-slate-800 dark:bg-[#14171c]/95"
        aria-label="Mobile navigation"
      >
        {primaryItems.map((item) => {
          const Icon = item.icon;
          const active = isCurrentActive(item.path);
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors ${
                active
                  ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "scale-110" : ""}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={`flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors ${
            moreOpen ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-slate-500 dark:text-slate-400"
          }`}
          aria-label="Open more menu"
        >
          <MoreHorizontal className="h-5 w-5" />
          <span>More</span>
        </button>
      </nav>

      <ResponsiveSheet isOpen={moreOpen} onClose={() => setMoreOpen(false)} title="Navigation Menu">
        <div className="grid grid-cols-2 gap-3 p-1">
          {secondaryItems.map((item) => {
            const Icon = item.icon;
            const active = isCurrentActive(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setMoreOpen(false)}
                className={`flex items-center gap-3 rounded-2xl p-4 transition ${
                  active
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 font-semibold"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-800/50 dark:text-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </ResponsiveSheet>
    </>
  );
}

export default BottomNavBar;
