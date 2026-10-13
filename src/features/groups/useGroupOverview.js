import { useState, useEffect, useCallback } from "react";
import { fetchGroupOverview } from "./groupsApi";

export function useGroupOverview(groupId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(groupId));
  const [error, setError] = useState(null);

  const loadOverview = useCallback(async () => {
    if (!groupId) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchGroupOverview(groupId);
      if (res && res.success) {
        setData(res);
      } else {
        setError(res?.error || "Failed to load group details.");
      }
    } catch (err) {
      console.error("Error fetching group overview:", err);
      setError(err.message || "Unable to load group details.");
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  return { overview: data, loading, error, refetch: loadOverview, setData };
}
