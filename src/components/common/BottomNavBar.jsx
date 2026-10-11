import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, BookOpen, Calendar, TrendingUp, MoreHorizontal, Users, HelpCircle, Settings, Bell, X } from "lucide-react";
import ResponsiveSheet from "./ResponsiveSheet";
import { useInAppNotifications } from "../../hooks/useInAppNotifications";

/**
 * BottomNavBar renders a compact bottom tab bar for viewports <768px with primary routes
 * and a "More" drawer sheet for secondary items.
 */
export function BottomNavBar() {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const { unreadCount } = useInAppNotifications();

  const primaryItems = [
    { name: "Dashboard", path: "/Dashboard", icon: LayoutDashboard },
    { name: "Study", path: "/Study", icon: BookOpen },
    { name: "Planner", path: "/Planner", icon: Calendar },
    { name: "Progress", path: "/Progress", icon: TrendingUp },
  ];

  const secondaryItems = [
    { name: "Library", path: "/Library", icon: BookOpen },
    { name: "Community", path: "/Community", icon: Users, badge: unreadCount },
    { name: "Notifications", path: "/notifications", icon: Bell, badge: unreadCount },
    { name: "FAQ", path: "/FAQ", icon: HelpCircle },
    { name: "Settings", path: "/Settings", icon: Settings },
  ];

  const isCurrentActive = (path) => {
    if (path === "/Dashboard" && (location.pathname === "/" || location.pathname === "/Dashboard")) return true;
    return location.pathname.toLowerCase().startsWith(path.toLowerCase());
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
          className={`relative flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors ${
            moreOpen ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-slate-500 dark:text-slate-400"
          }`}
          aria-label="Open more menu"
        >
          <div className="relative">
            <MoreHorizontal className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-1.5 -top-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-rose-500 ring-2 ring-white dark:ring-[#14171c]" />
            )}
          </div>
          <span>More</span>
        </button>
      </nav>

      <ResponsiveSheet isOpen={moreOpen} onClose={() => setMoreOpen(false)} title="Navigation Menu">
        <div className="grid grid-cols-2 gap-3 p-1">
          {secondaryItems.map((item) => {
            const Icon = item.icon;
            const active = isCurrentActive(item.path);
            const badgeCount = item.badge || 0;

            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setMoreOpen(false)}
                className={`relative flex items-center justify-between gap-3 rounded-2xl p-4 transition ${
                  active
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 font-semibold"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-800/50 dark:text-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5" />
                  <span className="text-sm">{item.name}</span>
                </div>
                {badgeCount > 0 && (
                  <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </ResponsiveSheet>
    </>
  );
}

export default BottomNavBar;
