import React, { useState, useMemo } from "react";
import { UserX, Search, Users, Trophy, Sparkles, ShieldCheck } from "lucide-react";
import Avatar from "../../../../components/common/Avatar";

export default function FriendList({ friends = [], currentUserId: _currentUserId, onRemoveFriend }) {
  const [filterQuery, setFilterQuery] = useState("");

  const filteredFriends = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((f) => {
      const prof = f.friend_profile;
      const name = (prof?.full_name || "").toLowerCase();
      const uname = (prof?.username || "").toLowerCase();
      return name.includes(q) || uname.includes(q);
    });
  }, [friends, filterQuery]);

  // Aggregate community metrics for social summary card
  const totalFriends = friends.length;
  const avgLevel = totalFriends > 0
    ? Math.round(friends.reduce((acc, f) => acc + (f.friend_profile?.level || 1), 0) / totalFriends)
    : 0;

  return (
    <div className="space-y-4">
      {/* Social Connection Summary Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-4 dark:border-emerald-500/30 dark:bg-emerald-950/20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-button-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">Your Social Circle</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Study partners elevate your progress and accountability
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-1.5 rounded-xl bg-white/80 px-3 py-1.5 shadow-surface dark:bg-[#18211f]">
              <Sparkles className="h-4 w-4 text-emerald-500" />
              <span>{totalFriends} Friends</span>
            </div>
            {totalFriends > 0 && (
              <div className="flex items-center gap-1.5 rounded-xl bg-white/80 px-3 py-1.5 shadow-surface dark:bg-[#18211f]">
                <Trophy className="h-4 w-4 text-amber-500" />
                <span>Avg Lvl {avgLevel}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Local Filter Bar */}
      {totalFriends > 0 && (
        <div className="relative">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter friends list by name or handle..."
            className="w-full min-h-[44px] rounded-2xl bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none shadow-inset-field focus:shadow-focus dark:bg-[#18211f] dark:text-white"
          />
        </div>
      )}

      {totalFriends === 0 ? (
        <div className="py-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6">
          <Users className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-700 mb-2" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No friends connected yet</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Use the search box above to discover classmates or classmates in your study groups to study together!
          </p>
        </div>
      ) : filteredFriends.length === 0 ? (
        <div className="py-6 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
          No friends matching &quot;{filterQuery}&quot;
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filteredFriends.map((f) => {
            const prof = f.friend_profile;

            return (
              <div
                key={f.id}
                className="flex items-center justify-between rounded-2xl bg-slate-50/60 p-3.5 dark:bg-[#18211f] shadow-surface hover:shadow-surface-hover transition-all"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <Avatar
                    src={prof?.user_img}
                    name={prof?.full_name}
                    username={prof?.username}
                    size="sm"
                    level={prof?.level}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                      {prof?.full_name || prof?.username || "Learner"}
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      @{prof?.username || "user"} · Lvl {prof?.level || 1}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="inline-flex min-h-[44px] items-center gap-1 rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" /> Study Partner
                  </span>
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
      )}
    </div>
  );
}
