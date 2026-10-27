import React, { useState } from "react";
import { MoreVertical } from "lucide-react";
import Avatar from "../../../../components/common/Avatar";

export default function MemberList({
  members = [],
  currentUserId,
  myRole,
  selectedGroupId,
  onSetRole,
  onRemoveMember,
  onTransferOwnership,
}) {
  const [activeMenuId, setActiveMenuId] = useState(null);

  if (!members || members.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-slate-500">
        No group members found.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {members.map((m) => (
        <div
          key={m.id || m.user_id}
          className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 shadow-surface dark:bg-[#18211f]"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar
              src={m.profile?.user_img}
              name={m.profile?.full_name}
              username={m.profile?.username}
              size="sm"
            />
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                {m.profile?.full_name || m.profile?.username || "Member"}
              </p>
              <p className="text-[10px] text-slate-500">
                @{m.profile?.username || "user"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {m.role}
            </span>

            {myRole === "owner" && m.user_id !== currentUserId && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setActiveMenuId(activeMenuId === m.id ? null : m.id)
                  }
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label="Member options"
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </button>

                {activeMenuId === m.id && (
                  <div className="absolute right-0 top-full mt-1 z-30 w-32 rounded-xl bg-white p-1 shadow-overlay dark:bg-[#18211f]">
                    {m.role === "member" ? (
                      <button
                        type="button"
                        onClick={() => {
                          onSetRole?.(selectedGroupId, m.user_id, "admin");
                          setActiveMenuId(null);
                        }}
                        className="w-full text-left px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 rounded-lg"
                      >
                        Promote Admin
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          onSetRole?.(selectedGroupId, m.user_id, "member");
                          setActiveMenuId(null);
                        }}
                        className="w-full text-left px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 rounded-lg"
                      >
                        Demote Member
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        onTransferOwnership?.(selectedGroupId, m.user_id);
                        setActiveMenuId(null);
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-xs font-semibold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg"
                    >
                      Transfer Owner
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onRemoveMember?.(selectedGroupId, m.user_id, false);
                        setActiveMenuId(null);
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
