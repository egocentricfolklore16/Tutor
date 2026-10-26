import React, { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Trophy,
  RefreshCw,
  Loader2,
  AlertCircle,
  Search,
  Flag,
} from "lucide-react";
import { useLeaderboard } from "../../hooks/useLeaderboard";
import ScopeTabs from "./ScopeTabs";
import PeriodTabs from "./PeriodTabs";
import MetricTabs from "./MetricTabs";
import LeaderboardPodium from "./LeaderboardPodium";
import LeaderboardTable from "./LeaderboardTable";
import YourRankCard from "./YourRankCard";
import { getWeeklyResetCountdown } from "../../utils/rankUtils";
import { ReportDialog } from "../shared/ReportDialog";

export default function LeaderboardTab({ user, userGroups = [] }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialPeriod = searchParams.get("period") || "weekly";

  const [scope, setScope] = useState("global"); // 'global' | 'friends' | 'group'
  const [period, setPeriod] = useState(initialPeriod); // 'weekly' | 'monthly' | 'all_time'
  const [metric, setMetric] = useState("xp"); // 'xp' | 'hours' | 'streak'
  const [selectedGroupId, setSelectedGroupId] = useState(userGroups[0]?.id || null);
  const [searchQuery, setSearchQuery] = useState("");

  // Report dialog state
  const [reportTarget, setReportTarget] = useState(null);

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

  const top1 = filteredEntries[0] || null;
  const top2 = filteredEntries[1] || null;
  const top3 = filteredEntries[2] || null;
  const listEntries = filteredEntries.slice(3);

  const isMeInList = filteredEntries.some((e) => e.is_me);

  const handleUserClick = (userId) => {
    if (userId) navigate(`/community/u/${userId}`);
  };

  return (
    <div className="space-y-6 pb-20 sm:pb-8">
      {/* Header Controls Banner */}
      <div className="flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-surface dark:bg-[#14171c]">
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
              <span className="rounded-2xl bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900 dark:bg-amber-950/80 dark:text-amber-300">
                Resets in {getWeeklyResetCountdown()}
              </span>
            )}

            <button
              type="button"
              onClick={refetch}
              className="rounded-2xl p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition focus-visible:outline-none focus-visible:shadow-focus"
              title="Refresh Leaderboard"
              aria-label="Refresh Leaderboard"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Search Field */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search learners by name or @username..."
            className="w-full rounded-2xl bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-semibold text-slate-900 outline-none shadow-inset-field focus:shadow-focus dark:bg-[#18211f] dark:text-white"
          />
        </div>

        {/* Control Bars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <ScopeTabs scope={scope} onChange={setScope} />

          {/* Group Picker if Scope is Group */}
          {scope === "group" && userGroups.length > 0 && (
            <select
              value={selectedGroupId || ""}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="rounded-2xl bg-slate-50 py-2 px-3 text-xs font-bold text-slate-900 outline-none shadow-inset-field dark:bg-[#18211f] dark:text-white col-span-1 md:col-span-3 min-h-[44px]"
            >
              {userGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.subject})
                </option>
              ))}
            </select>
          )}

          <PeriodTabs period={period} onChange={handlePeriodChange} />
          <MetricTabs metric={metric} onChange={setMetric} />
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
            {searchQuery
              ? "No learners found matching search"
              : scope === "group" && userGroups.length === 0
              ? "You haven't joined any study groups yet"
              : "No activity recorded yet for this period"}
          </p>
          <p className="mt-1 text-xs text-slate-500 max-w-sm leading-relaxed">
            {scope === "group" && userGroups.length === 0
              ? "Explore public study groups or create one with your classmates to view group leaderboards!"
              : "Complete a 15-minute study session to claim your place on the board and start climbing!"}
          </p>
          {scope === "group" && userGroups.length === 0 && (
            <button
              type="button"
              onClick={() => navigate("/community/groups")}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-button-primary hover:bg-emerald-700 transition"
            >
              Explore Study Groups
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top 3 Larger Podium */}
          <LeaderboardPodium
            top1={top1}
            top2={top2}
            top3={top3}
            metric={metric}
            onUserClick={handleUserClick}
          />

          {/* List Entries (Rank 4+) */}
          {listEntries.length > 0 && (
            <LeaderboardTable
              entries={listEntries}
              currentUser={user}
              metric={metric}
              onUserClick={handleUserClick}
              onReportUser={(item) => setReportTarget(item)}
            />
          )}

          {/* Sticky "Your Rank" bar at bottom if outside visible list */}
          {!isMeInList && me && (
            <YourRankCard me={me} metric={metric} />
          )}
        </div>
      )}

      {/* Report Dialog */}
      {reportTarget && user && (
        <ReportDialog
          isOpen={Boolean(reportTarget)}
          onClose={() => setReportTarget(null)}
          reporterId={user.id}
          targetType="user"
          targetId={reportTarget.user_id}
          targetName={reportTarget.full_name || reportTarget.username}
        />
      )}
    </div>
  );
}
