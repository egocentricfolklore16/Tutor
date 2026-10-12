import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Trophy,
  Crown,
  Flame,
  ArrowUp,
  ArrowDown,
  Minus,
  RefreshCw,
  AlertCircle,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import useLeaderboard from "../../hooks/useLeaderboard";
import Avatar from "../common/Avatar";
import { formatXpDisplay } from "../../lib/leaderboardUtils";

export { formatXpDisplay };

export default function Leaderboard() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState("weekly"); // 'weekly' | 'all_time'

  const { entries, me, loading, error, refetch } = useLeaderboard({
    scope: "global",
    period,
    metric: "xp",
    limit: 5,
  });

  const top1 = entries[0] || null;
  const top2 = entries[1] || null;
  const top3 = entries[2] || null;
  const remainingRows = entries.slice(3, 5);

  const isMeInTopList = entries.some((e) => e.is_me);
  const showPinnedMeRow = !isMeInTopList && me;

  const handleRowClick = (userId) => {
    if (userId) {
      navigate(`/community/u/${userId}`);
    }
  };

  const handleViewFullLeaderboard = () => {
    navigate(`/community/leaderboard?period=${period}`);
  };

  return (
    <section
      className="relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm lg:p-6"
      aria-labelledby="leaderboard-title"
    >
      {/* Background glow effects */}
      <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-emerald-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-16 h-48 w-48 rounded-full bg-amber-400/10 blur-3xl" />

      {/* Header Bar */}
      <div>
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-emerald-400">
              <Trophy className="h-4 w-4" />
              <span className="text-xs font-black uppercase tracking-[0.2em]">Leaderboard</span>
            </div>
            <h2 id="leaderboard-title" className="text-xl font-extrabold tracking-tight sm:text-2xl">
              Climb the board
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">A little momentum goes a long way.</p>
          </div>

          <button
            type="button"
            onClick={handleViewFullLeaderboard}
            className="inline-flex items-center gap-1 rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 backdrop-blur-sm transition hover:bg-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            aria-label="View full leaderboard"
          >
            <span>Full Board</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Sliding Pill Segmented Toggle: Weekly vs All-Time */}
        <div className="relative mt-5 flex rounded-2xl bg-slate-900/90 p-1 border border-white/10">
          <div
            className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl bg-emerald-500/20 border border-emerald-400/40 transition-all duration-300 ease-out ${
              period === "all_time" ? "translate-x-[100%]" : "translate-x-0"
            }`}
          />
          <button
            type="button"
            onClick={() => setPeriod("weekly")}
            className={`relative z-10 flex-1 py-1.5 text-center text-xs font-bold transition duration-200 ${
              period === "weekly" ? "text-emerald-300" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Weekly
          </button>
          <button
            type="button"
            onClick={() => setPeriod("all_time")}
            className={`relative z-10 flex-1 py-1.5 text-center text-xs font-bold transition duration-200 ${
              period === "all_time" ? "text-emerald-300" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative my-4 min-h-[260px] flex-1 flex flex-col justify-center">
        {loading ? (
          <LeaderboardSkeleton />
        ) : error ? (
          <div className="flex flex-col items-center justify-center text-center p-6 rounded-2xl bg-white/5 border border-rose-500/30">
            <AlertCircle className="h-7 w-7 text-rose-400 mb-2" />
            <p className="text-xs text-rose-200 font-semibold mb-3">{error}</p>
            <button
              type="button"
              onClick={refetch}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-white/20 transition"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry</span>
            </button>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-6 rounded-2xl bg-white/[0.03] border border-white/5">
            <Trophy className="h-10 w-10 text-slate-600 mb-2" />
            <p className="text-sm font-bold text-slate-200">No entries yet</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">Complete a study session to get on the board!</p>
            <button
              type="button"
              onClick={() => navigate("/study")}
              className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition"
            >
              Start Studying
            </button>
          </div>
        ) : (
          <div className="space-y-4 animate-fadeIn motion-reduce:animate-none">
            {/* Top 3 Mini Podium */}
            <div className="grid grid-cols-3 items-end gap-2 border-b border-white/10 px-1 pb-4">
              {/* Rank 2 - Silver */}
              <PodiumItem
                item={top2}
                rank={2}
                podiumHeight="h-20"
                podiumColor="bg-sky-400/15 border-t-2 border-sky-400/50"
                ringColor="ring-sky-400"
                badgeColor="bg-sky-200 text-sky-950"
                onClick={() => handleRowClick(top2?.user_id)}
              />

              {/* Rank 1 - Gold */}
              <PodiumItem
                item={top1}
                rank={1}
                podiumHeight="h-28"
                podiumColor="bg-amber-400/20 border-t-2 border-amber-400"
                ringColor="ring-amber-400"
                badgeColor="bg-amber-300 text-amber-950"
                hasCrown
                onClick={() => handleRowClick(top1?.user_id)}
              />

              {/* Rank 3 - Bronze */}
              <PodiumItem
                item={top3}
                rank={3}
                podiumHeight="h-16"
                podiumColor="bg-rose-400/15 border-t-2 border-rose-400/50"
                ringColor="ring-rose-400"
                badgeColor="bg-rose-200 text-rose-950"
                onClick={() => handleRowClick(top3?.user_id)}
              />
            </div>

            {/* Ranks 4-5 Rows */}
            {remainingRows.length > 0 && (
              <div className="space-y-2">
                {remainingRows.map((item) => (
                  <LeaderboardRow
                    key={item.user_id}
                    item={item}
                    onClick={() => handleRowClick(item.user_id)}
                  />
                ))}
              </div>
            )}

            {/* Pinned "Your Rank" Row if outside top 5 */}
            {showPinnedMeRow && (
              <div className="pt-2 border-t border-dashed border-emerald-500/30">
                <LeaderboardRow
                  item={me}
                  isPinned
                  onClick={() => handleRowClick(me.user_id)}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Motivation Bar */}
      <div className="relative mt-2 flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold text-emerald-100">
            {me?.is_me ? `Level ${me.level || 1} Learner` : "Join the competition"}
          </span>
        </div>
        <span className="text-xs font-extrabold text-white">
          {me?.value ? `${formatXpDisplay(me.value)} XP` : "0 XP"}
        </span>
      </div>
    </section>
  );
}

function PodiumItem({
  item,
  rank,
  podiumHeight,
  podiumColor,
  ringColor,
  badgeColor,
  hasCrown = false,
  onClick,
}) {
  if (!item) {
    return (
      <div className="flex flex-col items-center justify-end opacity-30">
        <div className="h-10 w-10 rounded-full bg-slate-800" />
        <div className={`mt-2 w-full rounded-t-xl bg-slate-800/40 ${podiumHeight}`} />
      </div>
    );
  }

  const displayName = item.full_name || item.username || "Learner";

  return (
    <div
      onClick={onClick}
      className="group flex flex-col items-center justify-end gap-1.5 cursor-pointer transition transform hover:-translate-y-0.5 motion-reduce:transform-none"
      role="button"
      tabIndex={0}
      aria-label={`Rank ${rank}, ${displayName}, ${formatXpDisplay(item.value || item.xp_points)} XP`}
    >
      <div className="relative flex flex-col items-center">
        {hasCrown && (
          <Crown className="absolute -top-4 h-5 w-5 text-amber-300 drop-shadow-[0_2px_4px_rgba(251,191,36,0.6)] animate-bounce motion-reduce:animate-none" />
        )}
        <Avatar
          src={item.user_img}
          name={item.full_name}
          username={item.username}
          size="md"
          className={`ring-2 ${ringColor} shadow-lg transition-transform group-hover:scale-105`}
        />
        {item.is_me && (
          <span className="mt-1 rounded-full bg-emerald-400 px-1.5 py-0.2 text-[9px] font-black uppercase text-slate-950 shadow-xs">
            You
          </span>
        )}
      </div>

      <p className="max-w-full truncate text-center text-xs font-bold text-slate-200 group-hover:text-emerald-300 transition">
        {displayName}
      </p>

      <span className="text-[11px] font-extrabold text-amber-300/90">
        {formatXpDisplay(item.value ?? item.xp_points)}
      </span>

      <div
        className={`flex w-full items-end justify-center rounded-t-xl transition-colors ${podiumHeight} ${podiumColor}`}
      >
        <span
          className={`mb-1.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-black shadow-xs ${badgeColor}`}
        >
          {rank}
        </span>
      </div>
    </div>
  );
}

function LeaderboardRow({ item, isPinned = false, onClick }) {
  if (!item) return null;

  const displayName = item.full_name || item.username || "Learner";
  const xpVal = item.value ?? item.xp_points ?? 0;
  const isMe = Boolean(item.is_me);

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Rank ${item.rank}, ${displayName}, ${formatXpDisplay(xpVal)} XP`}
      className={`group flex items-center gap-3 min-h-[44px] rounded-xl border px-3 py-2 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
        isMe
          ? "border-emerald-400/60 bg-emerald-400/10 shadow-[0_0_12px_rgba(52,211,153,0.15)]"
          : isPinned
          ? "border-emerald-500/40 bg-slate-900/90"
          : "border-white/5 bg-white/[0.04] hover:border-white/15 hover:bg-white/[0.08]"
      }`}
    >
      <div className="flex w-6 items-center justify-center shrink-0">
        <span className="text-xs font-extrabold text-slate-400">#{item.rank}</span>
      </div>

      <RankChangeIndicator change={item.rank_change} />

      <Avatar
        src={item.user_img}
        name={item.full_name}
        username={item.username}
        size="sm"
        level={item.level}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-xs font-bold text-slate-100 group-hover:text-emerald-300 transition">
            {displayName}
          </p>
          {isMe && (
            <span className="shrink-0 rounded-md bg-emerald-400 px-1.5 py-0.5 text-[9px] font-black uppercase text-slate-950">
              You
            </span>
          )}
        </div>
        <p className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-400">
          <Flame className="h-3 w-3 text-orange-400 shrink-0" />
          <span>{item.streak || 0}d streak</span>
        </p>
      </div>

      <div className="text-right shrink-0">
        <p className="text-xs font-extrabold text-amber-300 transition-colors">
          {formatXpDisplay(xpVal)} XP
        </p>
      </div>
    </div>
  );
}

function RankChangeIndicator({ change }) {
  if (change > 0) {
    return (
      <span className="flex items-center text-[10px] font-bold text-emerald-400 shrink-0" title={`Up ${change} positions`}>
        <ArrowUp className="h-3 w-3" />
      </span>
    );
  }
  if (change < 0) {
    return (
      <span className="flex items-center text-[10px] font-bold text-rose-400 shrink-0" title={`Down ${Math.abs(change)} positions`}>
        <ArrowDown className="h-3 w-3" />
      </span>
    );
  }
  return (
    <span className="flex items-center text-[10px] text-slate-500 shrink-0" title="No rank change">
      <Minus className="h-3 w-3" />
    </span>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Podium Skeleton */}
      <div className="grid grid-cols-3 items-end gap-2 border-b border-white/10 pb-4">
        <div className="flex flex-col items-center gap-1.5">
          <div className="h-9 w-9 rounded-full bg-slate-800" />
          <div className="h-3 w-12 rounded bg-slate-800" />
          <div className="h-20 w-full rounded-t-xl bg-slate-800/50" />
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <div className="h-10 w-10 rounded-full bg-slate-800" />
          <div className="h-3 w-14 rounded bg-slate-800" />
          <div className="h-28 w-full rounded-t-xl bg-slate-800/50" />
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <div className="h-9 w-9 rounded-full bg-slate-800" />
          <div className="h-3 w-12 rounded bg-slate-800" />
          <div className="h-16 w-full rounded-t-xl bg-slate-800/50" />
        </div>
      </div>

      {/* Row Skeletons */}
      <div className="space-y-2">
        <div className="h-11 w-full rounded-xl bg-white/5" />
        <div className="h-11 w-full rounded-xl bg-white/5" />
      </div>
    </div>
  );
}
