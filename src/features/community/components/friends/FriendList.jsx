import React from "react";
import { MessageSquare, UserX } from "lucide-react";
import Avatar from "../../../../components/common/Avatar";

export default function FriendList({ friends = [], currentUserId, onMessage, onRemoveFriend }) {
  if (friends.length === 0) {
    return (
      <div className="py-6 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
        No friends added yet. Search for classmates above!
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {friends.map((f) => {
        const otherId = f.requester_id === currentUserId ? f.addressee_id : f.requester_id;
        const prof = f.friend_profile;

        return (
          <div
            key={f.id}
            className="flex items-center justify-between rounded-2xl bg-slate-50/60 p-3.5 dark:bg-[#18211f] shadow-surface"
          >
            <div className="flex items-center gap-3">
              <Avatar
                src={prof?.user_img}
                name={prof?.full_name}
                username={prof?.username}
                size="sm"
                level={prof?.level}
              />
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {prof?.full_name || prof?.username || "Learner"}
                </p>
                <p className="text-xs text-slate-500">
                  @{prof?.username || "user"} · Level {prof?.level || 1}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onMessage?.(otherId)}
                className="inline-flex min-h-[44px] items-center gap-1 rounded-2xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-button-primary hover:bg-emerald-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <MessageSquare className="h-4 w-4" /> Message
              </button>
              {onRemoveFriend && (
                <button
                  type="button"
                  onClick={() => onRemoveFriend(f.id)}
                  title="Remove friend"
                  aria-label="Remove friend"
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                >
                  <UserX className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
