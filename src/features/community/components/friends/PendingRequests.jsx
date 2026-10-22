import React from "react";
import { UserCheck, UserX } from "lucide-react";
import Avatar from "../../../../components/common/Avatar";

export default function PendingRequests({ requests = [], onAccept, onDecline }) {
  if (requests.length === 0) return null;

  return (
    <div className="rounded-2xl bg-amber-50/60 p-5 shadow-surface dark:bg-amber-950/20">
      <p className="text-sm font-bold text-amber-900 dark:text-amber-200 mb-3">
        Pending Friend Requests ({requests.length})
      </p>
      <div className="space-y-3">
        {requests.map((req) => {
          const prof = req.friend_profile;

          return (
            <div
              key={req.id}
              className="flex items-center justify-between rounded-xl bg-white p-3 shadow-surface dark:bg-[#14171c]"
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
                    {prof?.full_name || prof?.username}
                  </p>
                  <p className="text-xs text-slate-500">@{prof?.username}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onAccept(req.id)}
                  className="inline-flex min-h-[44px] items-center gap-1 rounded-2xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-button-primary hover:bg-emerald-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  <UserCheck className="h-4 w-4" /> Accept
                </button>
                <button
                  type="button"
                  onClick={() => onDecline(req.id)}
                  className="inline-flex min-h-[44px] items-center gap-1 rounded-2xl bg-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
                >
                  <UserX className="h-4 w-4" /> Decline
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
