import React, { useState, useMemo } from "react";
import { Users, Search, UserX, Award, Sparkles, BookOpen } from "lucide-react";
import Avatar from "../../../../components/common/Avatar";
import { computeFriendStats, filterFriendsList } from "../../utils/friendsUtils";

export default function FriendList({ friends = [], currentUserId, onRemoveFriend }) {
  const [filterQuery, setFilterQuery] = useState("");

  const stats = useMemo(() => computeFriendStats(friends, currentUserId), [friends, currentUserId]);
  const filteredFriends = useMemo(
    () => filterFriendsList(friends, currentUserId, filterQuery),
    [friends, currentUserId, filterQuery]
  );

  if (friends.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center rounded-2xl bg-slate-50/50 dark:bg-[#18211f]/30 border border-dashed border-slate-200 dark:border-slate-800 p-6">
        <Users className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-3" />
        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No friends added yet</p>
        <p className="text-xs text-slate-500 max-w-xs mt-1">
          Search for classmates and fellow learners above to connect and study together!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Social Connection Summary Banner */}
      <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50/80 dark:bg-[#18211f] border border-slate-100 dark:border-slate-800/80">
        <div className="flex flex-col sm:flex-row items-center gap-2 text-center sm:text-left">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 shrink-0">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Friends</p>
            <p className="text-sm font-black text-slate-900 dark:text-white">{stats.totalFriends}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 text-center sm:text-left">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 shrink-0">
            <Award className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Avg Level</p>
            <p className="text-sm font-black text-slate-900 dark:text-white">Lvl {stats.avgLevel}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 text-center sm:text-left">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-100 text-teal-700 dark:bg-teal-950/80 dark:text-teal-300 shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Learners</p>
            <p className="text-sm font-black text-slate-900 dark:text-white">{stats.activeCount}</p>
          </div>
        </div>
      </div>

      {/* Filter Friends Input */}
      {friends.length > 3 && (
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter friends by name or @username..."
            className="w-full rounded-2xl bg-slate-50 py-2 pl-9 pr-4 text-xs font-semibold text-slate-900 outline-none shadow-inset-field focus:shadow-focus dark:bg-[#18211f] dark:text-white min-h-[40px]"
          />
        </div>
      )}

      {/* Friends Grid List */}
      {filteredFriends.length === 0 ? (
        <div className="py-6 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
          No friends matching &quot;{filterQuery}&quot;
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filteredFriends.map((f) => {
            const prof = f.friend_profile;
            const displayName = prof?.full_name || prof?.username || "Learner";
            const username = prof?.username || "learner";
            const level = prof?.level || 1;

            return (
              <div
                key={f.id}
                className="flex items-center justify-between rounded-2xl bg-slate-50/60 p-3.5 dark:bg-[#18211f] shadow-surface border border-slate-100 dark:border-slate-800/50 hover:shadow-surface-hover transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar
                    src={prof?.user_img}
                    name={displayName}
                    username={username}
                    size="sm"
                    level={level}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                        {displayName}
                      </p>
                      <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 shrink-0">
                        Lvl {level}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      <span>@{username}</span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        <BookOpen className="h-3 w-3" /> Active Learner
                      </span>
                    </div>
                  </div>
                </div>

                {onRemoveFriend && (
                  <button
                    type="button"
                    onClick={() => onRemoveFriend(f.id)}
                    title={`Remove ${displayName} from friends`}
                    aria-label={`Remove ${displayName} from friends`}
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 shrink-0"
                  >
                    <UserX className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
