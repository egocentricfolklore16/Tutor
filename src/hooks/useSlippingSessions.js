import { useState, useEffect, useMemo } from 'react';
import useCombinedSessions from './useCombinedSessions';
import { isSlipping, getSessionStartDate } from '../lib/plannerUtils';

/**
 * Custom hook to manage slipping sessions derived from the dashboard's combined session data source.
 * Re-evaluates every 60 seconds with a timer and on tab regain focus.
 * Returns { slipping, loading, error, refetch }, sorted by most overdue first.
 */
export function useSlippingSessions() {
  const { sessions, loading, error, refreshSessions } = useCombinedSessions();
  const [now, setNow] = useState(() => new Date());

  // Timer to update `now` every 60 seconds so sessions move dynamically while watching
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60000);

    const handleFocus = () => {
      setNow(new Date());
      refreshSessions?.();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setNow(new Date());
        refreshSessions?.();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshSessions]);

  // Filter slipping sessions using isSlipping and sort by most overdue first (earliest scheduled start time)
  // Memoized with pre-parsed start times to avoid O(N log N) date parsing during sort comparisons
  const slipping = useMemo(() => {
    if (!sessions || sessions.length === 0) return [];

    return sessions
      .filter((session) => isSlipping(session, now))
      .map((session) => ({
        session,
        startTime: getSessionStartDate(session)?.getTime() || 0,
      }))
      .sort((a, b) => a.startTime - b.startTime)
      .map((item) => item.session);
  }, [sessions, now]);

  return {
    slipping,
    loading,
    error,
    refetch: refreshSessions,
  };
}

export default useSlippingSessions;
