import React, { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { useActivityFeed } from "../../hooks/useActivityFeed";
import { FeedFilters } from "./FeedFilters";
import { ActivityItem } from "./ActivityItem";
import { SkeletonList } from "../shared/SkeletonList";
import { ErrorState } from "../shared/ErrorState";
import { EmptyState } from "../shared/EmptyState";

export function ActivityFeed({ onUserClick, currentUserId }) {
  const [activeFilter, setActiveFilter] = useState("all");

  const { items, loading, loadingMore, hasMore, error, loadMore, toggleCheer, refetch } = useActivityFeed({
    filter: activeFilter,
    limit: 15,
    currentUserId,
  });

  return (
    <div className="space-y-6">
      {/* Feed Filters */}
      <FeedFilters activeFilter={activeFilter} onSelectFilter={setActiveFilter} />

      {/* Main Feed Items */}
      {loading ? (
        <SkeletonList count={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No recent activity in your feed"
          description="Complete a study session or follow friends to see milestones appear here live!"
        />
      ) : (
        <div className="space-y-3" role="list">
          {items.map((item) => (
            <div key={item.id} role="listitem">
              <ActivityItem
                item={item}
                onUserClick={onUserClick}
                onCheer={(activityId) => toggleCheer(activityId)}
              />
            </div>
          ))}

          {/* Load More Button */}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-slate-100 px-6 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-[#18211f] dark:text-slate-300 dark:hover:bg-slate-800 transition disabled:opacity-50"
              >
                {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                <span>{loadingMore ? "Loading more..." : "Load Older Activity"}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
