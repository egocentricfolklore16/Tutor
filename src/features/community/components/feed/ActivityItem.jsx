import React, { useState } from "react";
import { Clock, Flame, Crown, Shield, Award, Heart } from "lucide-react";
import Avatar from "../../../../components/common/Avatar";

export function ActivityItem({ item, onUserClick }) {
  const [cheered, setCheered] = useState(false);
  const [cheerCount, setCheerCount] = useState(item.payload?.cheers || 0);

  const handleCheer = (e) => {
    e.stopPropagation();
    if (cheered) {
      setCheered(false);
      setCheerCount((prev) => Math.max(0, prev - 1));
    } else {
      setCheered(true);
      setCheerCount((prev) => prev + 1);
    }
  };

  const getEventBadge = () => {
    switch (item.type) {
      case "session_completed":
        return {
          icon: Clock,
          color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
          text: `Completed ${item.payload?.duration_minutes || 25}m study session`,
        };
      case "streak_milestone":
        return {
          icon: Flame,
          color: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
          text: `Reached a ${item.payload?.days || 7}-day study streak! 🔥`,
        };
      case "level_up":
        return {
          icon: Crown,
          color: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
          text: `Leveled up to Level ${item.payload?.level || 2}! 👑`,
        };
      case "group_joined":
        return {
          icon: Shield,
          color: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
          text: `Joined study group "${item.payload?.group_name || "Study Group"}"`,
        };
      case "achievement_unlocked":
      default:
        return {
          icon: Award,
          color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300",
          text: item.payload?.title || "Unlocked a study achievement!",
        };
    }
  };

  const badge = getEventBadge();
  const Icon = badge.icon;
  const actor = item.actor_profile || {};

  const timeAgo = (dateStr) => {
    if (!dateStr) return "recently";
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="flex items-start justify-between rounded-3xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#14171c] transition hover:border-slate-300 dark:hover:border-slate-700">
      <div className="flex items-start gap-3.5 min-w-0">
        <button
          type="button"
          onClick={() => onUserClick?.(actor.user_id)}
          className="shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-full"
        >
          <Avatar
            src={actor.user_img}
            name={actor.full_name}
            username={actor.username}
            size="md"
            level={actor.level}
          />
        </button>

        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onUserClick?.(actor.user_id)}
              className="text-xs font-bold text-slate-900 hover:underline dark:text-white truncate"
            >
              {actor.full_name || actor.username || "Learner"}
            </button>
            <span className="text-[10px] text-slate-400">· {timeAgo(item.created_at)}</span>
          </div>

          <div className={`inline-flex items-center gap-1.5 rounded-2xl px-2.5 py-1 text-xs font-bold ${badge.color}`}>
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span>{badge.text}</span>
          </div>

          {item.payload?.subject && (
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Subject: {item.payload.subject}
            </p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={handleCheer}
        className={`flex items-center gap-1 rounded-2xl border px-3 py-1.5 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
          cheered
            ? "border-rose-300 bg-rose-50 text-rose-600 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400"
            : "border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
        }`}
        aria-label="Cheer activity"
      >
        <Heart className={`h-3.5 w-3.5 ${cheered ? "fill-rose-500 text-rose-500" : ""}`} />
        <span>{cheerCount > 0 ? cheerCount : "Cheer"}</span>
      </button>
    </div>
  );
}
