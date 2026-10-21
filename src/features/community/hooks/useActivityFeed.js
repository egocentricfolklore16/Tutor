import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchActivityFeed,
  toggleActivityCheer,
  subscribeToActivityEvents,
} from "../services/feedService";

export function useActivityFeed({ filter = "all", limit = 20, currentUserId = null } = {}) {
  const [items, setItems] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const filterRef = useRef(filter);
  filterRef.current = filter;

  const loadInitialFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchActivityFeed({ filter, limit, currentUserId });
      setItems(res.items);
      setNextCursor(res.nextCursor);
      setHasMore(res.hasMore);
    } catch (err) {
      setError(err?.message || "Failed to load activity feed");
    } finally {
      setLoading(false);
    }
  }, [filter, limit, currentUserId]);

  useEffect(() => {
    loadInitialFeed();
  }, [loadInitialFeed]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetchActivityFeed({
        filter: filterRef.current,
        cursor: nextCursor,
        limit,
        currentUserId,
      });
      setItems((prev) => {
        const existingIds = new Set(prev.map((i) => i.id));
        const newItems = res.items.filter((i) => !existingIds.has(i.id));
        return [...prev, ...newItems];
      });
      setNextCursor(res.nextCursor);
      setHasMore(res.hasMore);
    } catch (err) {
      console.error("Error loading more feed items:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Realtime live update listener
  useEffect(() => {
    const unsubscribe = subscribeToActivityEvents(async (newEvent) => {
      if (!newEvent?.actor_profile && newEvent?.actor_id) {
        try {
          const { items: fetchedItems } = await fetchActivityFeed({ filter: "all", limit: 1 });
          const enriched = fetchedItems?.find((i) => i.id === newEvent.id) || newEvent;
          setItems((prev) => {
            if (prev.some((item) => item.id === enriched.id)) return prev;
            return [enriched, ...prev];
          });
          return;
        } catch {
          // Fallback if enrichment lookup fails
        }
      }

      setItems((prev) => {
        if (prev.some((item) => item.id === newEvent.id)) return prev;
        return [newEvent, ...prev];
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const toggleCheer = useCallback(
    async (activityId) => {
      if (!activityId || !currentUserId) return;

      // Optimistic state update
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== activityId) return item;
          const wasCheered = Boolean(item.is_cheered);
          const currentCount = Number(item.cheer_count || 0);
          return {
            ...item,
            is_cheered: !wasCheered,
            cheer_count: wasCheered ? Math.max(0, currentCount - 1) : currentCount + 1,
          };
        })
      );

      try {
        const res = await toggleActivityCheer(activityId, currentUserId);
        setItems((prev) =>
          prev.map((item) => {
            if (item.id !== activityId) return item;
            return {
              ...item,
              is_cheered: res.cheered,
            };
          })
        );
      } catch (err) {
        console.error("Error toggling activity cheer:", err);
        // Rollback optimistic update
        setItems((prev) =>
          prev.map((item) => {
            if (item.id !== activityId) return item;
            const wasCheered = Boolean(item.is_cheered);
            const currentCount = Number(item.cheer_count || 0);
            return {
              ...item,
              is_cheered: !wasCheered,
              cheer_count: wasCheered ? Math.max(0, currentCount - 1) : currentCount + 1,
            };
          })
        );
      }
    },
    [currentUserId]
  );

  return {
    items,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    toggleCheer,
    refetch: loadInitialFeed,
  };
}
