import { useState, useEffect, useCallback } from "react";
import { fetchMyGroups } from "./groupsApi";

export function useMyGroups(userId) {
  const [myGroups, setMyGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadMyGroups = useCallback(async () => {
    if (!userId) {
      setMyGroups([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMyGroups(userId);
      setMyGroups(data);
    } catch (err) {
      console.error("Error fetching my groups:", err);
      setError(err.message || "Failed to load my groups.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadMyGroups();
  }, [loadMyGroups]);

  return { myGroups, loading, error, refetch: loadMyGroups, setMyGroups };
}
