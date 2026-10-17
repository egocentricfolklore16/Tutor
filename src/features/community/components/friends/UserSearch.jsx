import React from "react";
import { Search, Loader2, UserPlus, Check } from "lucide-react";
import Avatar from "../../../../components/common/Avatar";

export default function UserSearch({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  searchResults = [],
  searchLoading = false,
  friendships = [],
  currentUserId,
  onSendRequest,
  onCancelRequest,
}) {
  return (
    <form onSubmit={onSearchSubmit} className="rounded-2xl bg-white p-4 shadow-surface dark:bg-[#14171c]">
      <p className="text-sm font-bold text-slate-900 dark:text-white mb-2">Find People</p>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by username or full name..."
            className="w-full rounded-2xl bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none shadow-inset-field focus:shadow-focus dark:bg-[#18211f] dark:text-white"
          />
        </div>
        <button
          type="submit"
          disabled={searchLoading}
          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-button-primary hover:bg-emerald-700 disabled:opacity-50"
        >
          {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          <span>Search</span>
        </button>
      </div>

      {searchResults.length > 0 && (
        <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
          <p className="text-xs font-bold text-slate-500 mb-2">Search Results</p>
          {searchResults.map((p) => {
            const existing = friendships.find(
              (f) => f.requester_id === p.user_id || f.addressee_id === p.user_id
            );
            const isAccepted = existing?.status === "accepted";
            const isPendingSent = existing?.status === "pending" && existing?.requester_id === currentUserId;

            return (
              <div key={p.user_id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3">
                  <Avatar src={p.user_img} name={p.full_name} username={p.username} size="sm" level={p.level} />
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{p.full_name || p.username}</p>
                    <p className="text-xs text-slate-500">@{p.username} · Lvl {p.level || 1}</p>
                  </div>
                </div>

                {isAccepted ? (
                  <span className="inline-flex items-center gap-1 rounded-2xl bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    <Check className="h-3 w-3" /> Friends
                  </span>
                ) : isPendingSent ? (
                  <button
                    type="button"
                    onClick={() => onCancelRequest?.(existing.id)}
                    className="rounded-2xl bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 hover:bg-amber-200"
                  >
                    Request Sent (Cancel)
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSendRequest?.(p.user_id)}
                    className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-button-primary hover:bg-emerald-700"
                  >
                    <UserPlus className="h-3.5 w-3.5" /> Add Friend
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </form>
  );
}
