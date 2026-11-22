import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchUserFriendships,
  searchUsers as searchUsersApi,
  sendFriendRequest as sendRequestApi,
  updateFriendshipStatus as updateStatusApi,
  removeFriendship as removeFriendshipApi,
} from "../services/friendsService";
import { useRealtimeTables } from "../../../lib/realtime/index.js";

export function useFriends(currentUserId) {
  const [friendships, setFriendships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const realtimeRefreshTimerRef = useRef(null);

  const loadFriendships = useCallback(async () => {
    if (!currentUserId) {
      setFriendships([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUserFriendships(currentUserId);
      setFriendships(data);
    } catch (err) {
      setError(err?.message || "Failed to load friends");
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    loadFriendships();
  }, [loadFriendships]);

  const refreshFriendshipsSoon = useCallback(() => {
    clearTimeout(realtimeRefreshTimerRef.current);
    realtimeRefreshTimerRef.current = setTimeout(loadFriendships, 300);
  }, [loadFriendships]);

  useRealtimeTables({
    subscriptions: currentUserId
      ? [
          { table: "friendships", filter: `requester_id=eq.${currentUserId}` },
          { table: "friendships", filter: `addressee_id=eq.${currentUserId}` },
        ]
      : [],
    enabled: Boolean(currentUserId),
    onChange: refreshFriendshipsSoon,
    onReconnect: loadFriendships,
    onRecover: loadFriendships,
  });

  useEffect(
    () => () => clearTimeout(realtimeRefreshTimerRef.current),
    []
  );

  const search = useCallback(
    async (query) => {
      setSearchQuery(query);
      if (!query || query.trim().length < 2 || !currentUserId) {
        setSearchResults([]);
        return;
      }
      setSearchLoading(true);
      try {
        const results = await searchUsersApi(query, currentUserId);
        setSearchResults(results);
      } catch (err) {
        console.error("Error searching users:", err);
      } finally {
        setSearchLoading(false);
      }
    },
    [currentUserId]
  );

  const sendFriendRequest = async (targetUserId) => {
    if (!currentUserId) return;
    try {
      await sendRequestApi(currentUserId, targetUserId);
      await loadFriendships();
    } catch (err) {
      console.error("Error sending friend request:", err);
      throw err;
    }
  };

  const updateStatus = async (friendshipId, status) => {
    try {
      await updateStatusApi(friendshipId, status);
      await loadFriendships();
    } catch (err) {
      console.error("Error updating friendship status:", err);
      throw err;
    }
  };

  const removeFriendship = async (friendshipId) => {
    try {
      await removeFriendshipApi(friendshipId);
      await loadFriendships();
    } catch (err) {
      console.error("Error removing friendship:", err);
      throw err;
    }
  };

  return {
    friendships,
    loading,
    error,
    searchQuery,
    searchResults,
    searchLoading,
    search,
    sendFriendRequest,
    updateStatus,
    removeFriendship,
    refetch: loadFriendships,
  };
}
