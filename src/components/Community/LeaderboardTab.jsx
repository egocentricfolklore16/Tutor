import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Trophy,
  Zap,
  Clock,
  Flame,
  Crown,
  RefreshCw,
  Loader2,
  AlertCircle,
  Users,
  Globe,
  Shield,
  Search,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";
import useLeaderboard from "../../hooks/useLeaderboard";
import Avatar from "../common/Avatar";

export default function LeaderboardTab({ user, userGroups = [] }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialPeriod = searchParams.get("period") || "weekly";

  const [scope, setScope] = useState("global"); // 'global' | 'friends' | 'group'
  const [period, setPeriod] = useState(initialPeriod); // 'weekly' | 'monthly' | 'all_time'
  const [metric, setMetric] = useState("xp"); // 'xp' | 'hours' | 'streak'
  const [selectedGroupId, setSelectedGroupId] = useState(userGroups[0]?.id || null);
  const [searchQuery, setSearchQuery] = useState("");

  // Sync state period change to URL search params
  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("period", newPeriod);
      return next;
    });
  };

  const { entries, me, loading, error, refetch } = useLeaderboard({
    scope,
    period,
    metric,
    groupId: selectedGroupId,
    limit: 100,
  });

  // Filter entries client-side by search query
  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const q = searchQuery.toLowerCase().trim();
    return entries.filter(
      (item) =>
        (item.full_name && item.full_name.toLowerCase().includes(q)) ||
        (item.username && item.username.toLowerCase().includes(q))
    );
  }, [entries, searchQuery]);

  // Formatters
  const formatValue = (val, met) => {
    const num = Number(val) || 0;
    if (met === "xp") {
      if (num >= 10000) return `${(num / 1000).toFixed(1)}k XP`;
      return `${num.toLocaleString()} XP`;
    }
    if (met === "hours") {
      const totalMins = Math.round(num * 60);
      const h = Math.floor(totalMins / 60);
      const m = totalMins % 60;
      if (h > 0 && m > 0) return `${h}h ${m}m`;
      if (h > 0) return `${h}h`;
      return `${m}m`;
    }
    if (met === "streak") {
      return `${num} days`;
    }
    return `${num.toLocaleString()}`;
  };

  // Weekly reset countdown calculator
  const getWeeklyResetCountdown = () => {
    const now = new Date();
    const day = now.getUTCDay();
    const daysUntilMon = ((8 - day) % 7) || 7;
    const nextMon = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + daysUntilMon,
        0,
        0,
        0
      )
    );
    const diffMs = Math.max(0, nextMon.getTime() - now.getTime());
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const d = Math.floor(hours / 24);
    const h = hours % 24;
    return `${d}d ${h}h`;
  };

  const top1 = filteredEntries[0] || null;
  const top2 = filteredEntries[1] || null;
  const top3 = filteredEntries[2] || null;
  const listEntries = filteredEntries.slice(3);

  const isMeInList = filteredEntries.some((e) => e.is_me);

  return (
    <div className="space-y-6 pb-20 sm:pb-8">
      {/* Header Controls Banner */}
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#14171c]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-2xl bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900 dark:bg-amber-950 dark:text-amber-300 mb-1">
              <Trophy className="h-4 w-4" /> Study Leaderboard
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              Compete & Track Growth
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {period === "weekly" && (
              <span className="rounded-2xl border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-300">
                Resets in {getWeeklyResetCountdown()}
              </span>
            )}

            <button
              type="button"
              onClick={refetch}
              className="rounded-2xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              title="Refresh Leaderboard"
              aria-label="Refresh Leaderboard"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Search Field */}
        <div className="relative">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search learners by name or @username..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-[#18211f] dark:text-white"
          />
        </div>

        {/* Control Bars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          {/* 1. Scope Tabs */}
          <div className="flex gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-[#18211f]" role="tablist" aria-label="Leaderboard scope">
            {[
              { id: "global", label: "Global", icon: Globe },
              { id: "friends", label: "Friends", icon: Users },
              { id: "group", label: "Group", icon: Shield },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={scope === s.id}
                  onClick={() => setScope(s.id)}
                  className={`flex flex-1 min-h-[36px] items-center justify-center gap-1 rounded-xl py-1.5 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                    scope === s.id
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>

          {/* Group Picker if Scope is Group */}
          {scope === "group" && userGroups.length > 0 && (
            <select
              value={selectedGroupId || ""}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white py-1.5 px-3 text-xs font-bold text-slate-900 outline-none dark:border-slate-700 dark:bg-[#14171c] dark:text-white col-span-1 md:col-span-3"
            >
              {userGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.subject})
                </option>
              ))}
            </select>
          )}

          {/* 2. Period Chips */}
          <div className="flex gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-[#18211f]" role="tablist" aria-label="Leaderboard period">
            {[
              { id: "weekly", label: "Weekly" },
              { id: "monthly", label: "Monthly" },
              { id: "all_time", label: "All Time" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={period === p.id}
                onClick={() => handlePeriodChange(p.id)}
                className={`flex-1 min-h-[36px] rounded-xl py-1.5 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                  period === p.id
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* 3. Metric Chips */}
          <div className="flex gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-[#18211f]" role="tablist" aria-label="Leaderboard metric">
            {[
              { id: "xp", label: "XP", icon: Zap },
              { id: "hours", label: "Hours", icon: Clock },
              { id: "streak", label: "Streak", icon: Flame },
            ].map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="tab"
                  aria-selected={metric === m.id}
                  onClick={() => setMetric(m.id)}
                  className={`flex flex-1 min-h-[36px] items-center justify-center gap-1 rounded-xl py-1.5 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                    metric === m.id
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Board View */}
      {loading ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-[#14171c]">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Loading rankings...</p>
        </div>
      ) : error ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center dark:border-rose-900/40 dark:bg-rose-950/20">
          <AlertCircle className="h-8 w-8 text-rose-600" />
          <p className="mt-2 text-xs font-bold text-rose-800 dark:text-rose-200">{error}</p>
          <button
            type="button"
            onClick={refetch}
            className="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition"
          >
            Try Again
          </button>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-[#14171c]">
          <Trophy className="h-10 w-10 text-slate-300 dark:text-slate-700" />
          <p className="mt-3 text-base font-bold text-slate-800 dark:text-slate-200">
            {searchQuery ? "No learners found matching search" : "No activity recorded yet for this period"}
          </p>
          <p className="mt-1 text-xs text-slate-500">Complete a study session to get on the board!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top 3 Larger Podium */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 items-end">
            {/* Rank 2 - Silver */}
            {top2 && (
              <div
                onClick={() => navigate(`/community/u/${top2.user_id}`)}
                role="button"
                tabIndex={0}
                aria-label={`Rank 2, ${top2.full_name || top2.username}, ${formatValue(top2.value, metric)}`}
                className="order-2 sm:order-1 flex flex-col items-center justify-center rounded-3xl border border-sky-200 bg-gradient-to-b from-sky-50 to-white p-5 text-center shadow-sm dark:border-sky-900/40 dark:from-sky-950/20 dark:to-[#14171c] cursor-pointer hover:scale-102 transition group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-200 text-xs font-black text-sky-950 dark:bg-sky-900 dark:text-sky-100">
                  2
                </span>
                <Avatar
                  src={top2.user_img}
                  name={top2.full_name}
                  username={top2.username}
                  size="lg"
                  level={top2.level}
                  className="mt-3 ring-4 ring-sky-300 group-hover:scale-105 transition-transform"
                />
                <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white truncate max-w-[140px]">
                  {top2.full_name || top2.username || "Learner"}
                </p>
                <p className="text-xs text-sky-700 dark:text-sky-300 font-extrabold mt-1">
                  {formatValue(top2.value, metric)}
                </p>
              </div>
            )}

            {/* Rank 1 - Gold */}
            {top1 && (
              <div
                onClick={() => navigate(`/community/u/${top1.user_id}`)}
                role="button"
                tabIndex={0}
                aria-label={`Rank 1, ${top1.full_name || top1.username}, ${formatValue(top1.value, metric)}`}
                className="order-1 sm:order-2 flex flex-col items-center justify-center rounded-3xl border border-amber-300 bg-gradient-to-b from-amber-50 to-white p-6 text-center shadow-md dark:border-amber-500/40 dark:from-amber-950/30 dark:to-[#14171c] cursor-pointer hover:scale-102 transition group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                <div className="flex items-center gap-1">
                  <Crown className="h-5 w-5 text-amber-500 drop-shadow-xs" />
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-300 text-xs font-black text-amber-950 dark:bg-amber-500/40 dark:text-amber-200">
                    1
                  </span>
                </div>
                <Avatar
                  src={top1.user_img}
                  name={top1.full_name}
                  username={top1.username}
                  size="xl"
                  level={top1.level}
                  className="mt-3 ring-4 ring-amber-400 group-hover:scale-105 transition-transform"
                />
                <p className="mt-2 text-base font-black text-slate-900 dark:text-white truncate max-w-[160px]">
                  {top1.full_name || top1.username || "Learner"}
                </p>
                <p className="text-sm font-extrabold text-amber-600 dark:text-amber-300 mt-1">
                  {formatValue(top1.value, metric)}
                </p>
              </div>
            )}

            {/* Rank 3 - Bronze */}
            {top3 && (
              <div
                onClick={() => navigate(`/community/u/${top3.user_id}`)}
                role="button"
                tabIndex={0}
                aria-label={`Rank 3, ${top3.full_name || top3.username}, ${formatValue(top3.value, metric)}`}
                className="order-3 flex flex-col items-center justify-center rounded-3xl border border-rose-200 bg-gradient-to-b from-rose-50 to-white p-5 text-center shadow-sm dark:border-rose-900/40 dark:from-rose-950/20 dark:to-[#14171c] cursor-pointer hover:scale-102 transition group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-rose-200 text-xs font-black text-rose-950 dark:bg-rose-900 dark:text-rose-100">
                  3
                </span>
                <Avatar
                  src={top3.user_img}
                  name={top3.full_name}
                  username={top3.username}
                  size="lg"
                  level={top3.level}
                  className="mt-3 ring-4 ring-rose-300 group-hover:scale-105 transition-transform"
                />
                <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white truncate max-w-[140px]">
                  {top3.full_name || top3.username || "Learner"}
                </p>
                <p className="text-xs text-rose-700 dark:text-rose-300 font-extrabold mt-1">
                  {formatValue(top3.value, metric)}
                </p>
              </div>
            )}
          </div>

          {/* List Entries (Rank 4+) */}
          {listEntries.length > 0 && (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#14171c]" role="list">
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {listEntries.map((item, idx) => {
                  const rankNum = item.rank || idx + 4;
                  const isSelf = user && (item.user_id === user.id || item.is_me);

                  return (
                    <div
                      key={item.user_id || idx}
                      onClick={() => navigate(`/community/u/${item.user_id}`)}
                      role="listitem"
                      tabIndex={0}
                      aria-label={`Rank ${rankNum}, ${item.full_name || item.username}, ${formatValue(item.value, metric)}`}
                      className={`flex items-center justify-between p-4 cursor-pointer transition min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                        isSelf
                          ? "bg-emerald-50/80 dark:bg-emerald-950/30 font-bold"
                          : "hover:bg-slate-50 dark:hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <span className="w-6 text-center text-xs font-black text-slate-400">
                          #{rankNum}
                        </span>

                        <RankChangeIndicator change={item.rank_change} />

                        <Avatar
                          src={item.user_img}
                          name={item.full_name}
                          username={item.username}
                          size="md"
                          level={item.level}
                        />

                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                            {item.full_name || item.username || "Learner"}
                            {isSelf && (
                              <span className="ml-2 rounded-2xl bg-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200">
                                YOU
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-500">
                            @{item.username || "user"} · Level {item.level || 1}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400">
                          {formatValue(item.value, metric)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sticky "Your Rank" bar at bottom if outside visible list */}
          {!isMeInList && me && (
            <div className="sticky bottom-4 z-20 rounded-3xl border border-emerald-300 bg-emerald-50/95 p-4 shadow-xl backdrop-blur-md dark:border-emerald-800 dark:bg-emerald-950/90">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-emerald-200 px-2.5 py-1 text-xs font-black text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100">
                    #{me.rank}
                  </span>

                  <Avatar
                    src={me.user_img}
                    name={me.full_name}
                    username={me.username}
                    size="sm"
                    level={me.level}
                  />

                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      {me.full_name || me.username || "You"}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Keep studying to climb higher!</p>
                  </div>
                </div>

                <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                  {formatValue(me.value, metric)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RankChangeIndicator({ change }) {
  if (change > 0) {
    return (
      <span className="flex items-center text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0" title={`Up ${change} positions`}>
        <ArrowUp className="h-3 w-3" />
      </span>
    );
  }
  if (change < 0) {
    return (
      <span className="flex items-center text-[10px] font-bold text-rose-600 dark:text-rose-400 shrink-0" title={`Down ${Math.abs(change)} positions`}>
        <ArrowDown className="h-3 w-3" />
      </span>
    );
  }
  return (
    <span className="flex items-center text-[10px] text-slate-400 shrink-0" title="No rank change">
      <Minus className="h-3 w-3" />
    </span>
  );
}
