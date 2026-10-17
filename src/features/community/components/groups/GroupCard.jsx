import React from "react";
import { Globe, Lock } from "lucide-react";
import Avatar from "../../../../components/common/Avatar";

export default function GroupCard({ group, onOpenGroup, onRequestJoin, onCancelRequest }) {
  if (!group) return null;

  const isMember = group.my_status === "member";
  const isPending = group.my_status === "pending";
  const isCooldown = group.my_status === "declined_cooldown";

  return (
    <div className="flex flex-col justify-between rounded-2xl bg-slate-50/70 p-4 shadow-surface hover:shadow-surface-hover transition dark:bg-[#18211f]">
      <div>
        <div className="flex items-start justify-between">
          <span className="inline-flex items-center gap-1 rounded-2xl bg-cyan-100 px-2.5 py-0.5 text-[10px] font-bold text-cyan-900 dark:bg-cyan-950 dark:text-cyan-200">
            {group.subject}
          </span>
          {group.privacy === "public" ? (
            <Globe className="h-4 w-4 text-slate-400" />
          ) : (
            <Lock className="h-4 w-4 text-amber-500" title="Private: owner approves members" />
          )}
        </div>
        <h3 className="mt-2 text-base font-bold text-slate-900 dark:text-white">{group.name}</h3>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
          {group.description || "No description provided."}
        </p>

        <div className="mt-3 flex items-center gap-2">
          <Avatar src={group.owner_avatar} name={group.owner_name} username={group.owner_username} size="xs" />
          <span className="text-[11px] text-slate-500 font-medium truncate">
            Owner: {group.owner_name || group.owner_username || "Unknown"}
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-200/50 dark:border-slate-800">
        <span className="text-xs font-bold text-slate-500">
          {group.member_count} {group.member_count === 1 ? "member" : "members"}
        </span>

        {isMember ? (
          <button
            type="button"
            onClick={() => onOpenGroup?.(group.id)}
            className="rounded-2xl bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 hover:bg-emerald-200 transition"
          >
            Open Group
          </button>
        ) : isPending ? (
          <button
            type="button"
            onClick={() => onCancelRequest?.(group.my_request_id)}
            className="rounded-2xl bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 hover:bg-amber-200 transition"
          >
            Request Pending (Cancel)
          </button>
        ) : isCooldown ? (
          <span className="rounded-2xl bg-slate-200 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            Try again in {group.cooldown_days_left}d
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onRequestJoin?.(group)}
            className="rounded-2xl bg-emerald-600 px-3.5 py-1 text-xs font-bold text-white shadow-button-primary hover:bg-emerald-700 transition"
          >
            {group.privacy === "public" ? "Join Group" : "Request to Join"}
          </button>
        )}
      </div>
    </div>
  );
}
