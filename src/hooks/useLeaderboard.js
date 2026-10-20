import { useState, useEffect, useCallback, useRef } from "react";
import supabase from "../lib/supabase.js";

// In-memory cache for stale-while-revalidate strategy
const leaderboardCache = new Map();

/**
 * Custom hook to fetch and subscribe to leaderboard data from Supabase RPC get_leaderboard.
 *
 * @param {Object} options
 * @param {'global' | 'friends' | 'group'} [options.scope='global']
 * @param {'weekly' | 'monthly' | 'all_time'} [options.period='weekly']
 * @param {'xp' | 'hours' | 'streak'} [options.metric='xp']
 * @param {string|null} [options.groupId=null]
 * @param {number} [options.limit=50]
 */
export function useLeaderboard({
  scope = "global",
  period = "weekly",
  metric = "xp",
  groupId = null,
  limit = 50,
} = {}) {
  const cacheKey = `${scope}:${period}:${metric}:${groupId || "none"}:${limit}`;

  const cachedData = leaderboardCache.get(cacheKey);

  const [leaderboardData, setLeaderboardData] = useState(cachedData?.data || null);
  const [loading, setLoading] = useState(!cachedData);
  const [error, setError] = useState(null);
  const [isRefetching, setIsRefetching] = useState(false);

  const debounceTimerRef = useRef(null);
  const activeKeyRef = useRef(cacheKey);

  activeKeyRef.current = cacheKey;

  const fetchLeaderboard = useCallback(
    async (isBackground = false) => {
      if (!isBackground && !leaderboardCache.has(cacheKey)) {
        setLoading(true);
      } else {
        setIsRefetching(true);
      }

      setError(null);

      try {
        const { data, error: rpcError } = await supabase.rpc("get_leaderboard", {
          p_scope: scope,
          p_period: period,
          p_metric: metric,
          p_group_id: scope === "group" ? groupId : null,
          p_limit: limit,
        });

        if (rpcError) throw rpcError;

        const formatted = {
          entries: data?.entries || [],
          me: data?.me || null,
        };

        leaderboardCache.set(cacheKey, {
          data: formatted,
          timestamp: Date.now(),
        });

        if (activeKeyRef.current === cacheKey) {
          setLeaderboardData(formatted);
        }
      } catch (err) {
        console.error("useLeaderboard fetch error:", err);
        if (activeKeyRef.current === cacheKey) {
          setError(err.message || "Failed to load leaderboard.");
        }
      } finally {
        if (activeKeyRef.current === cacheKey) {
          setLoading(false);
          setIsRefetching(false);
        }
      }
    },
    [scope, period, metric, groupId, limit, cacheKey]
  );

  useEffect(() => {
    // If cache available, use it immediately
    const existing = leaderboardCache.get(cacheKey);
    if (existing) {
      setLeaderboardData(existing.data);
      setLoading(false);
      // Fetch in background to update stale cache
      fetchLeaderboard(true);
    } else {
      fetchLeaderboard(false);
    }
  }, [cacheKey, fetchLeaderboard]);

  // BOLT OPTIMIZATION: Hold fresh fetchLeaderboard reference in a ref so Realtime subscription
  // timer callbacks can trigger refetches without tearing down and re-subscribing the WebSocket
  // channel every time filter options (e.g. switching between Weekly/All-time) change.
  const fetchLeaderboardRef = useRef(fetchLeaderboard);
  fetchLeaderboardRef.current = fetchLeaderboard;

  // Realtime subscription setup
  useEffect(() => {
    let channel = null;
    let isMounted = true;

    const triggerDebouncedRefetch = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        if (isMounted) {
          fetchLeaderboardRef.current(true);
        }
      }, 1500); // 1.5s debounce
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted || !session?.user) return;

      const channelId = `leaderboard_realtime_${crypto.randomUUID()}`;
      channel = supabase.channel(channelId);

      channel
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "profiles" },
          triggerDebouncedRefetch
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "users_streaks" },
          triggerDebouncedRefetch
        )
        .subscribe();
    });

    return () => {
      isMounted = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  return {
    entries: leaderboardData?.entries || [],
    me: leaderboardData?.me || null,
    loading,
    error,
    isRefetching,
    refetch: () => fetchLeaderboard(false),
  };
}

export default useLeaderboard;
