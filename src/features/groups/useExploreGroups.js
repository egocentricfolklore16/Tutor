import { useState, useEffect, useCallback } from "react";
import { fetchExploreGroups } from "./groupsApi";

export function useExploreGroups({ search = "", subject = "all", privacy = "all" } = {}) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchExploreGroups({ search, subject, privacy });
      setGroups(data);
    } catch (err) {
      console.error("Error fetching explore groups:", err);
      setError(err.message || "Failed to load groups.");
    } finally {
      setLoading(false);
    }
  }, [search, subject, privacy]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  return { groups, loading, error, refetch: loadGroups, setGroups };
}
