import React from "react";
import { Globe, Lock, Users } from "lucide-react";
import Avatar from "../../../../components/common/Avatar";

export default function GroupCard({ group, onOpenGroup, onRequestJoin, onCancelRequest }) {
  if (!group) return null;

  const isMember = group.my_status === "member";
  const isPending = group.my_status === "pending";
  const isCooldown = group.my_status === "declined_cooldown";

  return (
    <div className="relative overflow-hidden flex flex-col justify-between rounded-2xl border border-teal-500/20 bg-teal-600 p-4 text-white shadow-surface hover:shadow-surface-hover transition dark:border-white/5 dark:bg-[#18211f] dark:bg-gradient-to-br dark:from-teal-500/10 dark:via-transparent dark:to-transparent dark:hover:border-teal-500/30">
      <div className="absolute -right-5 -top-8 text-white/20 dark:text-teal-400/20 pointer-events-none">
        <Users size={120} />
      </div>

      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4 text-white/90 dark:text-teal-400" />
            <span className="inline-flex items-center gap-1 rounded-2xl bg-white/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white dark:bg-teal-950 dark:text-teal-300">
              {group.subject}
            </span>
          </div>
          {group.privacy === "public" ? (
            <Globe className="h-4 w-4 text-white/80 dark:text-slate-400" />
          ) : (
            <Lock className="h-4 w-4 text-amber-300 dark:text-amber-500" title="Private: owner approves members" />
          )}
        </div>
        <h3 className="mt-2 text-base font-bold text-white dark:text-white">{group.name}</h3>
        <p className="mt-1 text-xs text-teal-100 dark:text-gray-400 line-clamp-2 leading-relaxed">
          {group.description || "No description provided."}
        </p>

        <div className="mt-3 flex items-center gap-2">
          <Avatar src={group.owner_avatar} name={group.owner_name} username={group.owner_username} size="xs" />
          <span className="text-[11px] text-teal-100 dark:text-gray-400 font-medium truncate">
            Owner: {group.owner_name || group.owner_username || "Unknown"}
          </span>
        </div>
      </div>

      <div className="relative mt-4 flex items-center justify-between pt-3 border-t border-white/20 dark:border-slate-800">
        <span className="text-xs font-bold text-white/90 dark:text-gray-400">
          {group.member_count} {group.member_count === 1 ? "member" : "members"}
        </span>

        {isMember ? (
          <button
            type="button"
            onClick={() => onOpenGroup?.(group.id)}
            className="rounded-2xl bg-white px-3 py-1 text-xs font-bold text-teal-950 hover:bg-teal-50 dark:bg-teal-600 dark:text-white dark:hover:bg-teal-700 transition"
          >
            Open Group
          </button>
        ) : isPending ? (
          <button
            type="button"
            onClick={() => onCancelRequest?.(group.my_request_id)}
            className="rounded-2xl bg-amber-300 px-3 py-1 text-xs font-bold text-amber-950 hover:bg-amber-400 dark:bg-amber-900/60 dark:text-amber-300 transition"
          >
            Request Pending (Cancel)
          </button>
        ) : isCooldown ? (
          <span className="rounded-2xl bg-white/20 px-3 py-1 text-xs font-bold text-white/80 dark:bg-slate-800 dark:text-slate-400">
            Try again in {group.cooldown_days_left}d
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onRequestJoin?.(group)}
            className="rounded-2xl bg-white px-3.5 py-1 text-xs font-bold text-teal-950 hover:bg-teal-50 dark:bg-teal-600 dark:text-white dark:hover:bg-teal-700 transition"
          >
            {group.privacy === "public" ? "Join Group" : "Request to Join"}
          </button>
        )}
      </div>
    </div>
  );
}
