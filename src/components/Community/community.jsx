import React, { useState, useEffect, useCallback } from "react";
import {
  Trophy,
  Users,
  UserPlus,
  Search,
  MessageSquare,
  Flame,
  Zap,
  Plus,
  Check,
  X,
  Trash2,
  Globe,
  Lock,
  RefreshCw,
  Heart,
  Shield,
  BookOpen,
  Award,
  Clock,
  Sparkles,
  AlertCircle,
  Loader2,
  UserCheck,
  UserX,
  Send,
} from "lucide-react";
import supabase from "../../lib/supabase";
import { useProfile } from "../../app/ProfileContext";
import PageContainer from "../common/PageContainer";

function GemIcon({ className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6.5 3h11L21 9l-9 12L3 9l3.5-6Z" fill="currentColor" />
      <path
        d="M6.5 3 12 9l5.5-6M3 9h18M9.5 9 12 21l2.5-12"
        stroke="white"
        strokeOpacity="0.45"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Community() {
  const { user, profile } = useProfile();
  const [activeTab, setActiveTab] = useState("leaderboard"); // 'leaderboard' | 'friends' | 'groups' | 'feed'

  // Tab 1: Leaderboard State
  const [leaderboardScope, setLeaderboardScope] = useState("global"); // 'global' | 'weekly' | 'friends'
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState(null);

  // Tab 2: Friends State
  const [friendships, setFriendships] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendsError, setFriendsError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [actionFriendId, setActionFriendId] = useState(null);

  // Tab 3: Groups State
  const [allGroups, setAllGroups] = useState([]);
  const [myGroups, setMyGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState(null);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [newGroupSubject, setNewGroupSubject] = useState("");
  const [newGroupIsPublic, setNewGroupIsPublic] = useState(true);
  const [createGroupSubmitting, setCreateGroupSubmitting] = useState(false);
  const [createGroupError, setCreateGroupError] = useState(null);
  const [selectedGroupIdForLeaderboard, setSelectedGroupIdForLeaderboard] = useState(null);
  const [groupLeaderboardData, setGroupLeaderboardData] = useState([]);
  const [groupLeaderboardLoading, setGroupLeaderboardLoading] = useState(false);
  const [groupLeaderboardError, setGroupLeaderboardError] = useState(null);
  const [groupActionLoadingId, setGroupActionLoadingId] = useState(null);

  // Tab 4: Activity Feed State
  const [feedItems, setFeedItems] = useState([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState(null);
  const [reactingFeedId, setReactingFeedId] = useState(null);

  const currentUserId = user?.id || profile?.user_id;

  // Fetch Leaderboard Data
  const fetchLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true);
    setLeaderboardError(null);
    try {
      if (leaderboardScope === "global") {
        const { data, error } = await supabase
          .from("leaderboard_global")
          .select("*")
          .limit(50);
        if (error) throw error;
        setLeaderboardData(data || []);
      } else if (leaderboardScope === "weekly") {
        const { data, error } = await supabase
          .from("leaderboard_weekly")
          .select("*")
          .limit(50);
        if (error) throw error;
        setLeaderboardData(data || []);
      } else if (leaderboardScope === "friends") {
        if (!currentUserId) {
          setLeaderboardData([]);
          setLeaderboardLoading(false);
          return;
        }
        const { data, error } = await supabase.rpc("get_friends_leaderboard", {
          p_user_id: currentUserId,
        });
        if (error) throw error;
        setLeaderboardData(data || []);
      }
    } catch (err) {
      console.error("Leaderboard fetch error:", err);
      setLeaderboardError(err.message || "Failed to load leaderboard.");
    } finally {
      setLeaderboardLoading(false);
    }
  }, [leaderboardScope, currentUserId]);

  // Fetch Friends Data
  const fetchFriends = useCallback(async () => {
    if (!currentUserId) return;
    setFriendsLoading(true);
    setFriendsError(null);
    try {
      const { data, error } = await supabase
        .from("friendships")
        .select(
          "*, requester:profiles!requester_id(*), addressee:profiles!addressee_id(*)"
        )
        .or(`requester_id.eq.${currentUserId},addressee_id.eq.${currentUserId}`);
      if (error) throw error;
      setFriendships(data || []);
    } catch (err) {
      console.error("Friends fetch error:", err);
      setFriendsError(err.message || "Failed to load friends list.");
    } finally {
      setFriendsLoading(false);
    }
  }, [currentUserId]);

  // Search Profiles for Friend Requests
  const handleSearchProfiles = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    setSearchError(null);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, user_id, full_name, user_img")
        .ilike("username", `%${searchQuery.trim()}%`);
      if (error) throw error;

      // Filter out self
      const filtered = (data || []).filter(
        (p) => p.id !== currentUserId && p.user_id !== currentUserId
      );
      setSearchResults(filtered);
    } catch (err) {
      console.error("Profile search error:", err);
      setSearchError(err.message || "Search failed. Please try again.");
    } finally {
      setSearchLoading(false);
    }
  };

  // Send Friend Request
  const sendFriendRequest = async (targetUserId) => {
    if (!currentUserId || !targetUserId) return;
    setActionFriendId(targetUserId);
    try {
      const { error } = await supabase
        .from("friendships")
        .insert({ requester_id: currentUserId, addressee_id: targetUserId });
      if (error) throw error;
      await fetchFriends();
      setSearchResults((prev) => prev.filter((item) => (item.id || item.user_id) !== targetUserId));
    } catch (err) {
      console.error("Send friend request error:", err);
      alert(err.message || "Could not send friend request.");
    } finally {
      setActionFriendId(null);
    }
  };

  // Accept/Decline Friend Request
  const respondFriendRequest = async (friendshipId, status) => {
    setActionFriendId(friendshipId);
    try {
      const { error } = await supabase
        .from("friendships")
        .update({ status, responded_at: new Date() })
        .eq("id", friendshipId);
      if (error) throw error;
      await fetchFriends();
    } catch (err) {
      console.error("Respond friend request error:", err);
      alert(err.message || "Failed to respond to request.");
    } finally {
      setActionFriendId(null);
    }
  };

  // Remove Friend
  const removeFriend = async (friendshipId) => {
    if (!window.confirm("Are you sure you want to remove this connection?")) return;
    setActionFriendId(friendshipId);
    try {
      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("id", friendshipId);
      if (error) throw error;
      await fetchFriends();
    } catch (err) {
      console.error("Remove friend error:", err);
      alert(err.message || "Failed to remove friend.");
    } finally {
      setActionFriendId(null);
    }
  };

  // Fetch Groups Data
  const fetchGroups = useCallback(async () => {
    setGroupsLoading(true);
    setGroupsError(null);
    try {
      const [{ data: pubData, error: pubErr }, { data: myData, error: myErr }] =
        await Promise.all([
          supabase.from("study_groups").select("*"),
          currentUserId
            ? supabase
                .from("study_group_members")
                .select("*, group:study_groups(*)")
                .eq("user_id", currentUserId)
            : Promise.resolve({ data: [], error: null }),
        ]);

      if (pubErr) throw pubErr;
      if (myErr) throw myErr;

      setAllGroups(pubData || []);
      setMyGroups(myData || []);
    } catch (err) {
      console.error("Groups fetch error:", err);
      setGroupsError(err.message || "Failed to load study groups.");
    } finally {
      setGroupsLoading(false);
    }
  }, [currentUserId]);

  // Create Group
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setCreateGroupSubmitting(true);
    setCreateGroupError(null);
    try {
      const { data: createdGroup, error } = await supabase
        .from("study_groups")
        .insert({
          name: newGroupName.trim(),
          description: newGroupDescription.trim(),
          subject: newGroupSubject.trim(),
          is_public: newGroupIsPublic,
          created_by: currentUserId,
        })
        .select()
        .single();

      if (error) throw error;

      // Automatically add creator as member if group created
      if (createdGroup?.id && currentUserId) {
        await supabase
          .from("study_group_members")
          .insert({ group_id: createdGroup.id, user_id: currentUserId });
      }

      setNewGroupName("");
      setNewGroupDescription("");
      setNewGroupSubject("");
      setNewGroupIsPublic(true);
      setShowCreateGroupModal(false);
      await fetchGroups();
    } catch (err) {
      console.error("Create group error:", err);
      setCreateGroupError(err.message || "Could not create study group.");
    } finally {
      setCreateGroupSubmitting(false);
    }
  };

  // Join Public Group
  const handleJoinGroup = async (groupId) => {
    if (!currentUserId || !groupId) return;
    setGroupActionLoadingId(groupId);
    try {
      const { error } = await supabase
        .from("study_group_members")
        .insert({ group_id: groupId, user_id: currentUserId });
      if (error) throw error;
      await fetchGroups();
    } catch (err) {
      console.error("Join group error:", err);
      alert(err.message || "Could not join group.");
    } finally {
      setGroupActionLoadingId(null);
    }
  };

  // Request Join Private Group
  const handleRequestGroup = async (groupId) => {
    if (!currentUserId || !groupId) return;
    setGroupActionLoadingId(groupId);
    try {
      const { error } = await supabase
        .from("study_group_join_requests")
        .insert({ group_id: groupId, user_id: currentUserId });
      if (error) throw error;
      alert("Join request sent to group admins.");
      await fetchGroups();
    } catch (err) {
      console.error("Request group error:", err);
      alert(err.message || "Could not request join.");
    } finally {
      setGroupActionLoadingId(null);
    }
  };

  // Fetch Group Leaderboard
  const fetchGroupLeaderboard = async (groupId) => {
    setSelectedGroupIdForLeaderboard(groupId);
    setGroupLeaderboardLoading(true);
    setGroupLeaderboardError(null);
    try {
      const { data, error } = await supabase.rpc("get_group_leaderboard", {
        p_group_id: groupId,
      });
      if (error) throw error;
      setGroupLeaderboardData(data || []);
    } catch (err) {
      console.error("Group leaderboard error:", err);
      setGroupLeaderboardError(err.message || "Failed to load group leaderboard.");
    } finally {
      setGroupLeaderboardLoading(false);
    }
  };

  // Fetch Activity Feed Data
  const fetchActivityFeed = useCallback(async () => {
    setFeedLoading(true);
    setFeedError(null);
    try {
      const { data, error } = await supabase
        .from("activity_feed")
        .select("*, user:profiles(*), reactions:activity_feed_reactions(*)")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      setFeedItems(data || []);
    } catch (err) {
      console.error("Activity feed fetch error:", err);
      setFeedError(err.message || "Failed to load activity feed.");
    } finally {
      setFeedLoading(false);
    }
  }, []);

  // React to Activity Feed
  const handleToggleReaction = async (item) => {
    if (!currentUserId) return;
    setReactingFeedId(item.id);
    const reactions = item.reactions || [];
    const hasReacted = Boolean(
      item.user_reacted ||
        reactions.some((r) => r.user_id === currentUserId)
    );
    try {
      if (hasReacted) {
        const { error } = await supabase
          .from("activity_feed_reactions")
          .delete()
          .match({ activity_id: item.id, user_id: currentUserId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("activity_feed_reactions")
          .insert({ activity_id: item.id, user_id: currentUserId });
        if (error) throw error;
      }
      await fetchActivityFeed();
    } catch (err) {
      console.error("Reaction toggle error:", err);
    } finally {
      setReactingFeedId(null);
    }
  };

  // Tab trigger effects
  useEffect(() => {
    if (activeTab === "leaderboard") fetchLeaderboard();
    else if (activeTab === "friends") fetchFriends();
    else if (activeTab === "groups") fetchGroups();
    else if (activeTab === "feed") fetchActivityFeed();
  }, [activeTab, fetchLeaderboard, fetchFriends, fetchGroups, fetchActivityFeed]);

  return (
    <PageContainer maxWidth="max-w-7xl">
      <div className="space-y-6">
        {/* Header Header Banner */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 sm:text-3xl dark:text-white">
              Community Hub
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Connect with study partners, join groups, compete on leaderboards, and celebrate achievements.
            </p>
          </div>
        </div>

        {/* 4 Main Tabs Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          <div className="flex space-x-1 overflow-x-auto py-1">
            <button
              type="button"
              onClick={() => setActiveTab("leaderboard")}
              className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition ${
                activeTab === "leaderboard"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/60"
              }`}
            >
              <Trophy className="h-4 w-4" />
              <span>Leaderboard</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("friends")}
              className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition ${
                activeTab === "friends"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/60"
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Friends</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("groups")}
              className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition ${
                activeTab === "groups"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/60"
              }`}
            >
              <Globe className="h-4 w-4" />
              <span>Groups</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("feed")}
              className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition ${
                activeTab === "feed"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/60"
              }`}
            >
              <Sparkles className="h-4 w-4" />
              <span>Activity Feed</span>
            </button>
          </div>
        </div>

        {/* TAB 1: LEADERBOARD */}
        {activeTab === "leaderboard" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#18211f]">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  Rankings
                </h2>
              </div>

              {/* Leaderboard Segmented Control */}
              <div className="inline-flex rounded-2xl bg-slate-100 p-1 dark:bg-slate-800/80">
                <button
                  type="button"
                  onClick={() => setLeaderboardScope("global")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    leaderboardScope === "global"
                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  Global
                </button>
                <button
                  type="button"
                  onClick={() => setLeaderboardScope("weekly")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    leaderboardScope === "weekly"
                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  Weekly
                </button>
                <button
                  type="button"
                  onClick={() => setLeaderboardScope("friends")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    leaderboardScope === "friends"
                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  Friends
                </button>
              </div>
            </div>

            {/* Leaderboard Content */}
            {leaderboardLoading ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-[#18211f]">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">
                  Loading rankings...
                </p>
              </div>
            ) : leaderboardError ? (
              <div className="flex min-h-[250px] flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center dark:border-rose-900/50 dark:bg-rose-950/20">
                <AlertCircle className="h-8 w-8 text-rose-600 dark:text-rose-400" />
                <p className="mt-2 text-sm font-bold text-rose-900 dark:text-rose-200">
                  {leaderboardError}
                </p>
                <button
                  type="button"
                  onClick={fetchLeaderboard}
                  className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-rose-700"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Try Again
                </button>
              </div>
            ) : leaderboardData.length === 0 ? (
              <div className="flex min-h-[250px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-[#18211f]">
                <Trophy className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                <p className="mt-3 text-base font-extrabold text-slate-800 dark:text-slate-200">
                  No Leaderboard Records Found
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {leaderboardScope === "friends"
                    ? "Add friends to see how you rank against each other!"
                    : "Complete study sessions to start earning XP and rank up."}
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#18211f]">
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {leaderboardData.map((entry, idx) => {
                    const rank = entry.rank || idx + 1;
                    const isSelf =
                      entry.user_id === currentUserId ||
                      entry.id === currentUserId;

                    return (
                      <div
                        key={entry.user_id || entry.id || idx}
                        className={`flex items-center justify-between p-4 transition ${
                          isSelf
                            ? "bg-emerald-50/70 dark:bg-emerald-950/30"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Rank Badge */}
                          <span
                            className={`flex h-8 w-8 items-center justify-center rounded-2xl text-xs font-black ${
                              rank === 1
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                                : rank === 2
                                ? "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                                : rank === 3
                                ? "bg-amber-800/15 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400"
                                : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                            }`}
                          >
                            {rank}
                          </span>

                          {/* Avatar */}
                          <div className="h-10 w-10 overflow-hidden rounded-2xl bg-emerald-100 dark:bg-emerald-900/50">
                            {entry.avatar_url || entry.user_img ? (
                              <img
                                src={entry.avatar_url || entry.user_img}
                                alt={entry.display_name || entry.username}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center font-bold text-emerald-800 dark:text-emerald-200">
                                {(
                                  entry.display_name ||
                                  entry.username ||
                                  "U"
                                )
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>
                            )}
                          </div>

                          {/* Details */}
                          <div>
                            <p className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                              {entry.display_name || entry.username || "Learner"}
                              {isSelf && (
                                <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] font-extrabold uppercase text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100">
                                  You
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              @{entry.username || "learner"}
                              {entry.level ? ` · Lvl ${entry.level}` : ""}
                            </p>
                          </div>
                        </div>

                        {/* XP Badge */}
                        <div className="flex items-center gap-1.5 rounded-2xl bg-amber-100 px-3 py-1.5 text-xs font-extrabold text-amber-900 dark:bg-amber-500/15 dark:text-amber-300">
                          <Zap className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                          <span>
                            {entry.weekly_xp !== undefined
                              ? entry.weekly_xp
                              : entry.xp || entry.xp_points || 0}{" "}
                            XP
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: FRIENDS */}
        {activeTab === "friends" && (
          <div className="space-y-6">
            {/* Friend Search Bar */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#18211f]">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Find & Add Friends
              </h2>
              <form
                onSubmit={handleSearchProfiles}
                className="mt-3 flex items-center gap-2"
              >
                <div className="relative min-w-0 flex-1">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by username..."
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm font-medium outline-none transition focus:border-emerald-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800/80 dark:text-white dark:focus:border-emerald-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={searchLoading}
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {searchLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  <span>Search</span>
                </button>
              </form>

              {/* Search Results */}
              {searchError && (
                <p className="mt-2 text-xs font-bold text-rose-600 dark:text-rose-400">
                  {searchError}
                </p>
              )}
              {searchResults.length > 0 && (
                <div className="mt-4 space-y-2 rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Search Results ({searchResults.length})
                  </p>
                  <div className="divide-y divide-slate-200 dark:divide-slate-800">
                    {searchResults.map((person) => {
                      const personId = person.user_id || person.id;
                      const isPending = actionFriendId === personId;

                      return (
                        <div
                          key={personId}
                          className="flex items-center justify-between py-2.5"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 overflow-hidden rounded-2xl bg-emerald-200 dark:bg-emerald-900">
                              {person.avatar_url || person.user_img ? (
                                <img
                                  src={person.avatar_url || person.user_img}
                                  alt={person.username}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center font-bold text-emerald-900 dark:text-emerald-100">
                                  {(person.username || "U").charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900 dark:text-white">
                                {person.display_name || person.full_name || person.username}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                @{person.username}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => sendFriendRequest(personId)}
                            disabled={isPending}
                            className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <UserPlus className="h-3.5 w-3.5" />
                            )}
                            <span>Add Friend</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Friendships List */}
            {friendsLoading ? (
              <div className="flex min-h-[250px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-[#18211f]">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">
                  Loading friends...
                </p>
              </div>
            ) : friendsError ? (
              <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center dark:border-rose-900/50 dark:bg-rose-950/20">
                <AlertCircle className="h-8 w-8 text-rose-600 dark:text-rose-400" />
                <p className="mt-2 text-sm font-bold text-rose-900 dark:text-rose-200">
                  {friendsError}
                </p>
                <button
                  type="button"
                  onClick={fetchFriends}
                  className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-rose-700"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Try Again
                </button>
              </div>
            ) : friendships.length === 0 ? (
              <div className="flex min-h-[250px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-[#18211f]">
                <Users className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                <p className="mt-3 text-base font-extrabold text-slate-800 dark:text-slate-200">
                  No Friends Added Yet
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Use the search bar above to find classmates and connect!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Pending Incoming Requests */}
                {(() => {
                  const pending = friendships.filter(
                    (f) =>
                      f.status === "pending" &&
                      f.addressee_id === currentUserId
                  );
                  if (!pending.length) return null;

                  return (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                        Pending Friend Requests ({pending.length})
                      </h3>
                      <div className="mt-3 space-y-2">
                        {pending.map((f) => {
                          const requester = f.requester || {};
                          return (
                            <div
                              key={f.id}
                              className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm dark:bg-slate-800"
                            >
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 overflow-hidden rounded-2xl bg-amber-100 dark:bg-amber-900/50">
                                  {requester.avatar_url || requester.user_img ? (
                                    <img
                                      src={requester.avatar_url || requester.user_img}
                                      alt={requester.username}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center font-bold text-amber-800 dark:text-amber-200">
                                      {(requester.username || "U")
                                        .charAt(0)
                                        .toUpperCase()}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                                    {requester.display_name ||
                                      requester.full_name ||
                                      requester.username}
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    @{requester.username}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    respondFriendRequest(f.id, "accepted")
                                  }
                                  disabled={actionFriendId === f.id}
                                  className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                                >
                                  <UserCheck className="h-3.5 w-3.5" /> Accept
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    respondFriendRequest(f.id, "declined")
                                  }
                                  disabled={actionFriendId === f.id}
                                  className="inline-flex items-center gap-1 rounded-xl bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 disabled:opacity-50"
                                >
                                  <UserX className="h-3.5 w-3.5" /> Decline
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Accepted Friends */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#18211f]">
                  <div className="border-b border-slate-100 p-4 dark:border-slate-800">
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      Your Connections
                    </h3>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {friendships
                      .filter((f) => f.status === "accepted" || f.status === "active")
                      .map((f) => {
                        const friendProfile =
                          f.requester_id === currentUserId
                            ? f.addressee
                            : f.requester;
                        const p = friendProfile || {};

                        return (
                          <div
                            key={f.id}
                            className="flex items-center justify-between p-4 transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 overflow-hidden rounded-2xl bg-emerald-100 dark:bg-emerald-900/50">
                                {p.avatar_url || p.user_img ? (
                                  <img
                                    src={p.avatar_url || p.user_img}
                                    alt={p.username}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center font-bold text-emerald-800 dark:text-emerald-200">
                                    {(p.username || "U").charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">
                                  {p.display_name || p.full_name || p.username || "Friend"}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  @{p.username || "learner"}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeFriend(f.id)}
                              disabled={actionFriendId === f.id}
                              title="Remove connection"
                              className="rounded-xl p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 disabled:opacity-50"
                            >
                              {actionFriendId === f.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: GROUPS */}
        {activeTab === "groups" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Study Groups
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateGroupModal(true)}
                className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4" /> Create Group
              </button>
            </div>

            {/* Groups Content */}
            {groupsLoading ? (
              <div className="flex min-h-[250px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-[#18211f]">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">
                  Loading study groups...
                </p>
              </div>
            ) : groupsError ? (
              <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center dark:border-rose-900/50 dark:bg-rose-950/20">
                <AlertCircle className="h-8 w-8 text-rose-600 dark:text-rose-400" />
                <p className="mt-2 text-sm font-bold text-rose-900 dark:text-rose-200">
                  {groupsError}
                </p>
                <button
                  type="button"
                  onClick={fetchGroups}
                  className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-rose-700"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Try Again
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* My Groups */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#18211f]">
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    My Groups ({myGroups.length})
                  </h3>
                  {myGroups.length === 0 ? (
                    <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                      You haven't joined any study groups yet. Browse available groups or create your own!
                    </p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {myGroups.map((item) => {
                        const grp = item.group || item;
                        return (
                          <div
                            key={grp.id || item.id}
                            className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/50"
                          >
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="font-extrabold text-slate-900 dark:text-white">
                                  {grp.name}
                                </span>
                                {grp.is_public ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                    <Globe className="h-3 w-3" /> Public
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                    <Lock className="h-3 w-3" /> Private
                                  </span>
                                )}
                              </div>
                              {grp.subject && (
                                <p className="mt-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                  {grp.subject}
                                </p>
                              )}
                              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                                {grp.description || "No description provided."}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => fetchGroupLeaderboard(grp.id)}
                              className="inline-flex items-center gap-1.5 self-start rounded-xl bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                            >
                              <Trophy className="h-3.5 w-3.5 text-amber-500" /> Group Leaderboard
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Explore Groups */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#18211f]">
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Explore All Groups ({allGroups.length})
                  </h3>
                  {allGroups.length === 0 ? (
                    <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                      No groups available at the moment.
                    </p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {allGroups.map((grp) => {
                        const isMember = myGroups.some(
                          (m) => (m.group_id || m.group?.id) === grp.id
                        );
                        const isLoading = groupActionLoadingId === grp.id;

                        return (
                          <div
                            key={grp.id}
                            className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/50"
                          >
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="font-extrabold text-slate-900 dark:text-white">
                                  {grp.name}
                                </span>
                                {grp.is_public ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                    <Globe className="h-3 w-3" /> Public
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                    <Lock className="h-3 w-3" /> Private
                                  </span>
                                )}
                              </div>
                              {grp.subject && (
                                <p className="mt-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                  {grp.subject}
                                </p>
                              )}
                              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                                {grp.description || "No description provided."}
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              {isMember ? (
                                <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                  <Check className="h-3.5 w-3.5" /> Member
                                </span>
                              ) : grp.is_public ? (
                                <button
                                  type="button"
                                  onClick={() => handleJoinGroup(grp.id)}
                                  disabled={isLoading}
                                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                                >
                                  {isLoading ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <UserPlus className="h-3.5 w-3.5" />
                                  )}
                                  <span>Join Group</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleRequestGroup(grp.id)}
                                  disabled={isLoading}
                                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50"
                                >
                                  {isLoading ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Send className="h-3.5 w-3.5" />
                                  )}
                                  <span>Request to Join</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Modal: Group Leaderboard */}
            {selectedGroupIdForLeaderboard && (
              <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
                <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#18211f]">
                  <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
                      <Trophy className="h-5 w-5 text-amber-500" /> Group Leaderboard
                    </h3>
                    <button
                      type="button"
                      onClick={() => setSelectedGroupIdForLeaderboard(null)}
                      className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="mt-4 max-h-[60vh] overflow-y-auto">
                    {groupLeaderboardLoading ? (
                      <div className="flex py-10 justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                      </div>
                    ) : groupLeaderboardError ? (
                      <p className="py-6 text-center text-xs font-bold text-rose-600">
                        {groupLeaderboardError}
                      </p>
                    ) : groupLeaderboardData.length === 0 ? (
                      <p className="py-6 text-center text-xs text-slate-500">
                        No member activity recorded in this group yet.
                      </p>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {groupLeaderboardData.map((row, idx) => (
                          <div
                            key={row.user_id || idx}
                            className="flex items-center justify-between py-3"
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-black text-xs text-slate-400">
                                #{idx + 1}
                              </span>
                              <div>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">
                                  {row.display_name || row.username || "Member"}
                                </p>
                              </div>
                            </div>
                            <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400">
                              {row.xp || row.xp_points || 0} XP
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Modal: Create Group */}
            {showCreateGroupModal && (
              <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
                <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#18211f]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">
                      Create Study Group
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowCreateGroupModal(false)}
                      className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <form onSubmit={handleCreateGroup} className="mt-4 space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Group Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder="e.g., Organic Chemistry Squad"
                        className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm outline-none transition focus:border-emerald-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Subject
                      </label>
                      <input
                        type="text"
                        value={newGroupSubject}
                        onChange={(e) => setNewGroupSubject(e.target.value)}
                        placeholder="e.g., Chemistry, Calculus, History"
                        className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm outline-none transition focus:border-emerald-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Description
                      </label>
                      <textarea
                        rows={3}
                        value={newGroupDescription}
                        onChange={(e) => setNewGroupDescription(e.target.value)}
                        placeholder="What is this group about?"
                        className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm outline-none transition focus:border-emerald-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="is_public_check"
                        checked={newGroupIsPublic}
                        onChange={(e) => setNewGroupIsPublic(e.target.checked)}
                        className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <label
                        htmlFor="is_public_check"
                        className="text-xs font-bold text-slate-700 dark:text-slate-300"
                      >
                        Public Group (Anyone can join)
                      </label>
                    </div>

                    {createGroupError && (
                      <p className="text-xs font-bold text-rose-600">
                        {createGroupError}
                      </p>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowCreateGroupModal(false)}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={createGroupSubmitting}
                        className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {createGroupSubmitting && (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        )}
                        <span>Create Group</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ACTIVITY FEED */}
        {activeTab === "feed" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Community Activity
              </h2>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                System-Generated Milestones
              </span>
            </div>

            {feedLoading ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-[#18211f]">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">
                  Loading activity feed...
                </p>
              </div>
            ) : feedError ? (
              <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center dark:border-rose-900/50 dark:bg-rose-950/20">
                <AlertCircle className="h-8 w-8 text-rose-600 dark:text-rose-400" />
                <p className="mt-2 text-sm font-bold text-rose-900 dark:text-rose-200">
                  {feedError}
                </p>
                <button
                  type="button"
                  onClick={fetchActivityFeed}
                  className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-rose-700"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Try Again
                </button>
              </div>
            ) : feedItems.length === 0 ? (
              <div className="flex min-h-[250px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-[#18211f]">
                <Sparkles className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                <p className="mt-3 text-base font-extrabold text-slate-800 dark:text-slate-200">
                  No Recent Activity
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Study milestones and streak achievements will appear here automatically!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {feedItems.map((item) => {
                  const author = item.user || {};
                  const reactions = item.reactions || [];
                  const userReacted =
                    item.user_reacted ||
                    reactions.some((r) => r.user_id === currentUserId);
                  const isReacting = reactingFeedId === item.id;

                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#18211f]"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 overflow-hidden rounded-2xl bg-emerald-100 dark:bg-emerald-900/50">
                            {author.avatar_url || author.user_img ? (
                              <img
                                src={author.avatar_url || author.user_img}
                                alt={author.username}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center font-bold text-emerald-800 dark:text-emerald-200">
                                {(author.username || "U").charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                              {author.display_name ||
                                author.full_name ||
                                author.username ||
                                "Learner"}
                            </p>
                            <p className="text-xs text-slate-400">
                              {new Date(
                                item.created_at || Date.now()
                              ).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>

                        {/* Milestone Badge */}
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          <Award className="h-3.5 w-3.5" /> Milestone
                        </span>
                      </div>

                      <p className="mt-3 text-sm font-medium text-slate-800 dark:text-slate-200">
                        {item.title || item.content || item.description || "Completed a study session!"}
                      </p>

                      {/* Reaction Action */}
                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => handleToggleReaction(item)}
                          disabled={isReacting}
                          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                            userReacted
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                          }`}
                        >
                          {isReacting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Heart
                              className={`h-4 w-4 ${
                                userReacted ? "fill-rose-600 text-rose-600" : ""
                              }`}
                            />
                          )}
                          <span>
                            {item.reaction_count || reactions.length || 0}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
