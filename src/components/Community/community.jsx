import React, { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "react-router-dom";
import {
  Users,
  Trophy,
  Zap,
  Search,
  UserPlus,
  UserCheck,
  UserX,
  Plus,
  Heart,
  Globe,
  Lock,
  Loader2,
  AlertCircle,
  Check,
  X,
  Flame,
  Shield,
  BookOpen,
  Sparkles,
  ChevronRight,
  MessageSquare,
  Calendar,
} from "lucide-react";
import supabase from "../../lib/supabase";
import { useProfile } from "../../app/ProfileContext";
import { getCollaborationInfo } from "../../lib/collaboration";
import { useInAppNotifications } from "../../hooks/useInAppNotifications";
import PageContainer from "../common/PageContainer";
import ChatInbox from "./ChatInbox";
import ChatThread from "./ChatThread";
import GroupStudySessions from "./GroupStudySessions";
import SessionRoom from "./SessionRoom";

function GemIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6.5 3h11L21 9l-9 12L3 9l3.5-6Z" fill="currentColor" />
      <path d="M6.5 3 12 9l5.5-6M3 9h18M9.5 9 12 21l2.5-12" stroke="white" strokeOpacity="0.45" strokeWidth="0.6" strokeLinejoin="round" />
    </svg>
  );
}

const Community = () => {
  const { profile } = useProfile();
  const collaborationInfo = getCollaborationInfo(profile?.collaboration_interest);
  const { conversationId } = useParams();
  const location = useLocation();
  const { setActiveConversationId: setGlobalActiveConversationId } = useInAppNotifications();

  const [activeTab, setActiveTab] = useState("leaderboard"); // 'leaderboard' | 'friends' | 'groups' | 'chat' | 'feed'
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [openSessionId, setOpenSessionId] = useState(null);
  const [user, setUser] = useState(null);

  // Sync route / location parameters for direct conversation navigation
  useEffect(() => {
    if (conversationId) {
      setActiveConversationId(conversationId);
      setActiveTab("chat");
    } else if (location.state?.openConversationId) {
      setActiveConversationId(location.state.openConversationId);
      setActiveTab("chat");
    }
  }, [conversationId, location.state]);

  // Sync active chat thread into global notification context to suppress notifications/toasts for open thread
  useEffect(() => {
    if (activeTab === "chat" && activeConversationId) {
      setGlobalActiveConversationId(activeConversationId);
    } else {
      setGlobalActiveConversationId(null);
    }
  }, [activeTab, activeConversationId, setGlobalActiveConversationId]);

  // Get signed in user
  useEffect(() => {
    const fetchAuthUser = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      setUser(authUser);
    };
    fetchAuthUser();
  }, []);

  // ==========================================
  // TAB 1: LEADERBOARD STATE & LOGIC
  // ==========================================
  const [leaderboardType, setLeaderboardType] = useState("global"); // 'global' | 'weekly' | 'friends'
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState(null);

  const fetchLeaderboard = useCallback(async () => {
    if (!user) return;
    setLeaderboardLoading(true);
    setLeaderboardError(null);
    try {
      if (leaderboardType === "global") {
        const { data, error } = await supabase
          .from("leaderboard_global")
          .select("*")
          .limit(50);
        if (error) throw error;
        setLeaderboardData(data || []);
      } else if (leaderboardType === "weekly") {
        const { data, error } = await supabase
          .from("leaderboard_weekly")
          .select("*")
          .limit(50);
        if (error) throw error;
        setLeaderboardData(data || []);
      } else if (leaderboardType === "friends") {
        const { data, error } = await supabase.rpc("get_friends_leaderboard", {
          p_user_id: user.id,
        });
        if (error) throw error;
        setLeaderboardData(data || []);
      }
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
      setLeaderboardError(err.message || "Failed to load leaderboard data.");
    } finally {
      setLeaderboardLoading(false);
    }
  }, [user, leaderboardType]);

  useEffect(() => {
    if (activeTab === "leaderboard") {
      fetchLeaderboard();
    }
  }, [activeTab, fetchLeaderboard]);

  // ==========================================
  // TAB 2: FRIENDS STATE & LOGIC
  // ==========================================
  const [friendships, setFriendships] = useState([]);
  const [friendProfiles, setFriendProfiles] = useState({});
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendsError, setFriendsError] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const fetchFriendsData = useCallback(async () => {
    if (!user) return;
    setFriendsLoading(true);
    setFriendsError(null);
    try {
      const { data: rawRows, error } = await supabase
        .from("friendships")
        .select("*")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      if (error) throw error;
      const rows = rawRows || [];
      setFriendships(rows);

      // Collect other party user_ids
      const otherUserIds = Array.from(
        new Set(
          rows.map((r) =>
            r.requester_id === user.id ? r.addressee_id : r.requester_id
          )
        )
      );

      if (otherUserIds.length > 0) {
        const { data: profs, error: profError } = await supabase
          .from("community_profiles")
          .select("*")
          .in("user_id", otherUserIds);

        if (profError) throw profError;

        const map = {};
        (profs || []).forEach((p) => {
          map[p.user_id] = p;
        });
        setFriendProfiles(map);
      } else {
        setFriendProfiles({});
      }
    } catch (err) {
      console.error("Error fetching friends:", err);
      setFriendsError(err.message || "Failed to load friends.");
    } finally {
      setFriendsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === "friends") {
      fetchFriendsData();
    }
  }, [activeTab, fetchFriendsData]);

  const handleSearchUsers = async (e) => {
    e?.preventDefault();
    const query = searchQuery.trim();
    if (!query || !user) return;
    setSearchLoading(true);
    try {
      const { data, error } = await supabase
        .from("community_profiles")
        .select("*")
        .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
        .limit(20);

      if (error) throw error;
      // Filter out self
      setSearchResults((data || []).filter((p) => p.user_id !== user.id));
    } catch (err) {
      console.error("Error searching users:", err);
    } finally {
      setSearchLoading(false);
    }
  };

  const sendFriendRequest = async (addresseeId) => {
    if (!user) return;
    try {
      // Check if a previous declined row exists and delete it first
      const existing = friendships.find(
        (f) =>
          (f.requester_id === user.id && f.addressee_id === addresseeId) ||
          (f.requester_id === addresseeId && f.addressee_id === user.id)
      );

      if (existing && (existing.status === "declined" || existing.status === "rejected")) {
        await supabase.from("friendships").delete().eq("id", existing.id);
      }

      const { error } = await supabase.from("friendships").insert({
        requester_id: user.id,
        addressee_id: addresseeId,
        status: "pending",
      });

      if (error) throw error;
      fetchFriendsData();
      if (searchQuery) handleSearchUsers();
    } catch (err) {
      console.error("Error sending friend request:", err);
    }
  };

  const updateFriendshipStatus = async (friendshipId, status) => {
    try {
      const { error } = await supabase
        .from("friendships")
        .update({ status, responded_at: new Date().toISOString() })
        .eq("id", friendshipId);
      if (error) throw error;
      fetchFriendsData();
    } catch (err) {
      console.error("Error updating friendship:", err);
    }
  };

  const removeFriendship = async (friendshipId) => {
    try {
      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("id", friendshipId);
      if (error) throw error;
      fetchFriendsData();
      if (searchQuery) handleSearchUsers();
    } catch (err) {
      console.error("Error removing friendship:", err);
    }
  };

  const handleStartDirectChat = async (friendUserId) => {
    if (!user || !friendUserId) return;
    try {
      const { data: convId, error } = await supabase.rpc(
        "get_or_create_direct_conversation",
        { p_other_user_id: friendUserId }
      );
      if (error) throw error;

      setActiveConversationId(convId);
      setActiveTab("chat");
    } catch (err) {
      console.error("Error starting direct conversation:", err);
    }
  };

  // ==========================================
  // TAB 3: GROUPS STATE & LOGIC
  // ==========================================
  const [publicGroups, setPublicGroups] = useState([]);
  const [myGroups, setMyGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState(null);

  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedGroupConversationId, setSelectedGroupConversationId] = useState(null);
  const [selectedGroupSubTab, setSelectedGroupSubTab] = useState("overview"); // 'overview' | 'sessions'
  const [groupMembers, setGroupMembers] = useState([]);
  const [groupLeaderboard, setGroupLeaderboard] = useState([]);
  const [groupDetailLoading, setGroupDetailLoading] = useState(false);

  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [newGroupSubject, setNewGroupSubject] = useState("");
  const [newGroupIsPublic, setNewGroupIsPublic] = useState(true);
  const [createGroupLoading, setCreateGroupLoading] = useState(false);

  const fetchGroupsData = useCallback(async () => {
    if (!user) return;
    setGroupsLoading(true);
    setGroupsError(null);
    try {
      const [{ data: pubData, error: pubErr }, { data: myData, error: myErr }] =
        await Promise.all([
          supabase.from("study_groups").select("*").eq("is_public", true),
          supabase
            .from("study_group_members")
            .select("*, group:study_groups(*)")
            .eq("user_id", user.id),
        ]);

      if (pubErr) throw pubErr;
      if (myErr) throw myErr;

      setPublicGroups(pubData || []);
      setMyGroups(myData || []);
    } catch (err) {
      console.error("Error fetching groups:", err);
      setGroupsError(err.message || "Failed to load study groups.");
    } finally {
      setGroupsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === "groups") {
      fetchGroupsData();
    }
  }, [activeTab, fetchGroupsData]);

  const openGroupDetail = async (group) => {
    setSelectedGroup(group);
    setSelectedGroupSubTab("overview");
    setGroupDetailLoading(true);
    try {
      // Fetch group conversation
      const { data: convData } = await supabase
        .from("conversations")
        .select("id")
        .eq("study_group_id", group.id)
        .maybeSingle();

      if (convData) {
        setSelectedGroupConversationId(convData.id);
      }

      // Fetch members
      const { data: memberRows, error: memErr } = await supabase
        .from("study_group_members")
        .select("*")
        .eq("group_id", group.id);

      if (memErr) throw memErr;

      const userIds = (memberRows || []).map((m) => m.user_id);
      let memProfilesMap = {};
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from("community_profiles")
          .select("*")
          .in("user_id", userIds);
        (profs || []).forEach((p) => {
          memProfilesMap[p.user_id] = p;
        });
      }

      setGroupMembers(
        (memberRows || []).map((m) => ({
          ...m,
          profile: memProfilesMap[m.user_id] || null,
        }))
      );

      // Fetch group leaderboard RPC
      const { data: gLeaderboard, error: gErr } = await supabase.rpc(
        "get_group_leaderboard",
        { p_group_id: group.id }
      );
      if (gErr) console.error("Group leaderboard RPC error:", gErr);
      setGroupLeaderboard(gLeaderboard || []);
    } catch (err) {
      console.error("Error opening group detail:", err);
    } finally {
      setGroupDetailLoading(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!user || !newGroupName.trim() || !newGroupSubject.trim()) return;
    setCreateGroupLoading(true);
    try {
      const { error } = await supabase.from("study_groups").insert({
        name: newGroupName.trim(),
        description: newGroupDescription.trim(),
        subject: newGroupSubject.trim(),
        is_public: newGroupIsPublic,
        created_by: user.id,
      });

      if (error) throw error;

      setShowCreateGroup(false);
      setNewGroupName("");
      setNewGroupDescription("");
      setNewGroupSubject("");
      setNewGroupIsPublic(true);
      fetchGroupsData();
    } catch (err) {
      console.error("Error creating group:", err);
    } finally {
      setCreateGroupLoading(false);
    }
  };

  const handleJoinPublicGroup = async (groupId) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("study_group_members")
        .insert({ group_id: groupId, user_id: user.id });
      if (error) throw error;
      fetchGroupsData();
    } catch (err) {
      console.error("Error joining group:", err);
    }
  };

  const handleRequestPrivateGroup = async (groupId) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("study_group_join_requests")
        .insert({ group_id: groupId, user_id: user.id });
      if (error) throw error;
      fetchGroupsData();
    } catch (err) {
      console.error("Error requesting join group:", err);
    }
  };

  // ==========================================
  // TAB 4: ACTIVITY FEED STATE & LOGIC
  // ==========================================
  const [activityFeed, setActivityFeed] = useState([]);
  const [feedProfiles, setFeedProfiles] = useState({});
  const [feedReactions, setFeedReactions] = useState([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState(null);

  const fetchActivityFeed = useCallback(async () => {
    if (!user) return;
    setFeedLoading(true);
    setFeedError(null);
    try {
      const { data: rawFeed, error: feedErr } = await supabase
        .from("activity_feed")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);

      if (feedErr) throw feedErr;
      const items = rawFeed || [];
      setActivityFeed(items);

      const distinctUserIds = Array.from(new Set(items.map((i) => i.user_id)));
      const activityIds = items.map((i) => i.id);

      const [profsRes, rxnsRes] = await Promise.all([
        distinctUserIds.length > 0
          ? supabase.from("community_profiles").select("*").in("user_id", distinctUserIds)
          : { data: [] },
        activityIds.length > 0
          ? supabase.from("activity_feed_reactions").select("*").in("activity_id", activityIds)
          : { data: [] },
      ]);

      if (profsRes.error) throw profsRes.error;
      if (rxnsRes.error) throw rxnsRes.error;

      const pMap = {};
      (profsRes.data || []).forEach((p) => {
        pMap[p.user_id] = p;
      });
      setFeedProfiles(pMap);
      setFeedReactions(rxnsRes.data || []);
    } catch (err) {
      console.error("Error fetching activity feed:", err);
      setFeedError(err.message || "Failed to load activity feed.");
    } finally {
      setFeedLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === "feed") {
      fetchActivityFeed();
    }
  }, [activeTab, fetchActivityFeed]);

  const toggleReaction = async (activityId) => {
    if (!user) return;
    const existing = feedReactions.find(
      (r) => r.activity_id === activityId && r.user_id === user.id
    );

    try {
      if (existing) {
        const { error } = await supabase
          .from("activity_feed_reactions")
          .delete()
          .eq("activity_id", activityId)
          .eq("user_id", user.id);
        if (error) throw error;
        setFeedReactions((prev) =>
          prev.filter(
            (r) => !(r.activity_id === activityId && r.user_id === user.id)
          )
        );
      } else {
        const { error } = await supabase
          .from("activity_feed_reactions")
          .insert({ activity_id: activityId, user_id: user.id });
        if (error) throw error;
        setFeedReactions((prev) => [
          ...prev,
          { activity_id: activityId, user_id: user.id, created_at: new Date().toISOString() },
        ]);
      }
    } catch (err) {
      console.error("Error toggling reaction:", err);
    }
  };

  // Helper getters for Friends categorization
  const acceptedFriends = friendships.filter((f) => f.status === "accepted");
  const pendingIncoming = friendships.filter(
    (f) => f.status === "pending" && f.addressee_id === user?.id
  );
  const pendingSent = friendships.filter(
    (f) => f.status === "pending" && f.requester_id === user?.id
  );

  return (
    <PageContainer maxWidth="max-w-7xl">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#14171c] sm:p-8">
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-2xl bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Community Hub</span>
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Learn Together, Grow Faster
            </h1>
            <p className="mt-2 text-base text-slate-600 dark:text-slate-300 max-w-2xl">
              Connect with study partners, compete on leaderboards, join study groups, and celebrate learning achievements with peers.
            </p>
          </div>

          {/* Collaboration Preference Badge */}
          {collaborationInfo && (
            <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-xs dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200 shadow-sm max-w-xs">
              <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold text-emerald-900 dark:text-emerald-100 block">
                  {collaborationInfo.badge}
                </span>
                <span className="text-slate-600 dark:text-slate-300 mt-0.5 block">
                  {collaborationInfo.description}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Tab Navigation Segmented Bar */}
        <div className="mt-8 flex w-full gap-1.5 overflow-x-auto no-scrollbar rounded-2xl bg-slate-200/80 p-1.5 dark:bg-[#18211f] dark:border dark:border-slate-800">
          {[
            { id: "leaderboard", label: "Leaderboard", icon: Trophy },
            { id: "friends", label: "Friends", icon: Users },
            { id: "groups", label: "Study Groups", icon: Shield },
            { id: "chat", label: "Chat & Inbox", icon: MessageSquare },
            { id: "feed", label: "Activity Feed", icon: Zap },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex min-h-[44px] flex-1 min-w-[120px] items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition duration-200 ${
                  isActive
                    ? "bg-white text-slate-900 shadow-sm dark:bg-[#14171c] dark:text-white"
                    : "text-slate-600 hover:bg-white/50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-emerald-600 dark:text-emerald-400" : ""}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Pane */}
      <div className="mt-6">
        {/* ========================================== */}
        {/* TAB 1: LEADERBOARD                         */}
        {/* ========================================== */}
        {activeTab === "leaderboard" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#14171c]">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Rankings & XP</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">See who is leading the study charts</p>
              </div>

              {/* Sub-segmented control */}
              <div className="flex gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-[#18211f]">
                {[
                  { id: "global", label: "Global" },
                  { id: "weekly", label: "Weekly" },
                  { id: "friends", label: "Friends" },
                ].map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setLeaderboardType(type.id)}
                    className={`rounded-xl px-4 py-1.5 text-xs font-bold transition ${
                      leaderboardType === type.id
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {leaderboardLoading ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-[#14171c]">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Loading leaderboard...</p>
              </div>
            ) : leaderboardError ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center dark:border-rose-900/40 dark:bg-rose-950/20">
                <AlertCircle className="h-8 w-8 text-rose-600" />
                <p className="mt-2 text-sm font-bold text-rose-800 dark:text-rose-200">{leaderboardError}</p>
                <button type="button" onClick={fetchLeaderboard} className="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700">Retry</button>
              </div>
            ) : leaderboardData.length === 0 ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-[#14171c]">
                <Trophy className="h-10 w-10 text-slate-300 dark:text-slate-700" />
                <p className="mt-3 text-base font-bold text-slate-800 dark:text-slate-200">No Leaderboard Entries</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Start studying to climb the ranks!</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Top 3 Podium Cards */}
                {leaderboardData.length >= 1 && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {/* Rank 2 */}
                    {leaderboardData[1] && (
                      <div className="order-2 sm:order-1 flex flex-col items-center justify-center rounded-2xl border border-sky-200 bg-gradient-to-b from-sky-50 to-white p-5 text-center shadow-sm dark:border-sky-900/40 dark:from-sky-950/20 dark:to-[#14171c]">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-200 text-xs font-black text-sky-900 dark:bg-sky-900/50 dark:text-sky-200">2</span>
                        {leaderboardData[1].user_img ? (
                          <img src={leaderboardData[1].user_img} alt={leaderboardData[1].full_name || "User"} className="mt-3 h-14 w-14 rounded-full object-cover ring-4 ring-sky-300" />
                        ) : (
                          <div className="mt-3 flex h-14 w-14 items-center justify-center rounded-full bg-sky-200 text-lg font-bold text-sky-900 ring-4 ring-sky-300 dark:bg-sky-900 dark:text-sky-100">
                            {(leaderboardData[1].full_name || leaderboardData[1].username || "U").charAt(0).toUpperCase()}
                          </div>
                        )}
                        <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white truncate max-w-[140px]">
                          {leaderboardData[1].full_name || leaderboardData[1].username}
                        </p>
                        <p className="text-xs text-sky-700 dark:text-sky-300 font-semibold mt-1">
                          {leaderboardData[1].weekly_xp ?? leaderboardData[1].xp_points ?? 0} XP
                        </p>
                      </div>
                    )}

                    {/* Rank 1 */}
                    {leaderboardData[0] && (
                      <div className="order-1 sm:order-2 flex flex-col items-center justify-center rounded-2xl border border-amber-300 bg-gradient-to-b from-amber-50 to-white p-6 text-center shadow-md dark:border-amber-500/40 dark:from-amber-950/30 dark:to-[#14171c]">
                        <div className="flex items-center gap-1">
                          <Trophy className="h-5 w-5 text-amber-500" />
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-300 text-xs font-black text-amber-950 dark:bg-amber-500/40 dark:text-amber-200">1</span>
                        </div>
                        {leaderboardData[0].user_img ? (
                          <img src={leaderboardData[0].user_img} alt={leaderboardData[0].full_name || "User"} className="mt-3 h-16 w-16 rounded-full object-cover ring-4 ring-amber-400" />
                        ) : (
                          <div className="mt-3 flex h-16 w-16 items-center justify-center rounded-full bg-amber-200 text-xl font-bold text-amber-950 ring-4 ring-amber-400 dark:bg-amber-900 dark:text-amber-100">
                            {(leaderboardData[0].full_name || leaderboardData[0].username || "U").charAt(0).toUpperCase()}
                          </div>
                        )}
                        <p className="mt-2 text-base font-extrabold text-slate-900 dark:text-white truncate max-w-[160px]">
                          {leaderboardData[0].full_name || leaderboardData[0].username}
                        </p>
                        <p className="text-sm font-bold text-amber-600 dark:text-amber-300 mt-1">
                          {leaderboardData[0].weekly_xp ?? leaderboardData[0].xp_points ?? 0} XP
                        </p>
                      </div>
                    )}

                    {/* Rank 3 */}
                    {leaderboardData[2] && (
                      <div className="order-3 flex flex-col items-center justify-center rounded-2xl border border-rose-200 bg-gradient-to-b from-rose-50 to-white p-5 text-center shadow-sm dark:border-rose-900/40 dark:from-rose-950/20 dark:to-[#14171c]">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-rose-200 text-xs font-black text-rose-900 dark:bg-rose-900/50 dark:text-rose-200">3</span>
                        {leaderboardData[2].user_img ? (
                          <img src={leaderboardData[2].user_img} alt={leaderboardData[2].full_name || "User"} className="mt-3 h-14 w-14 rounded-full object-cover ring-4 ring-rose-300" />
                        ) : (
                          <div className="mt-3 flex h-14 w-14 items-center justify-center rounded-full bg-rose-200 text-lg font-bold text-rose-900 ring-4 ring-rose-300 dark:bg-rose-900 dark:text-rose-100">
                            {(leaderboardData[2].full_name || leaderboardData[2].username || "U").charAt(0).toUpperCase()}
                          </div>
                        )}
                        <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white truncate max-w-[140px]">
                          {leaderboardData[2].full_name || leaderboardData[2].username}
                        </p>
                        <p className="text-xs text-rose-700 dark:text-rose-300 font-semibold mt-1">
                          {leaderboardData[2].weekly_xp ?? leaderboardData[2].xp_points ?? 0} XP
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Remaining List View */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#14171c]">
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {leaderboardData.map((item, idx) => {
                      const isSelf = user && item.user_id === user.id;
                      const displayRank = item.rank || idx + 1;
                      const points = item.weekly_xp ?? item.xp_points ?? 0;

                      return (
                        <div
                          key={item.user_id || idx}
                          className={`flex items-center justify-between p-4 transition ${
                            isSelf
                              ? "bg-emerald-50/80 dark:bg-emerald-950/30"
                              : "hover:bg-slate-50 dark:hover:bg-white/5"
                          }`}
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <span className="w-6 text-center text-xs font-black text-slate-400 dark:text-slate-500">
                              {displayRank}
                            </span>

                            {item.user_img ? (
                              <img src={item.user_img} alt={item.full_name || "User"} className="h-10 w-10 rounded-full object-cover shrink-0" />
                            ) : (
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-200 text-sm font-bold text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100">
                                {(item.full_name || item.username || "U").charAt(0).toUpperCase()}
                              </div>
                            )}

                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                                {item.full_name || item.username || "Learner"}
                                {isSelf && (
                                  <span className="ml-2 rounded-2xl bg-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200">
                                    YOU
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                @{item.username || "user"} {item.level ? `· Lvl ${item.level}` : ""}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 text-amber-600 dark:text-amber-400 font-bold text-sm">
                            <Zap className="h-4 w-4 fill-current" />
                            <span>{points} XP</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 2: FRIENDS                             */}
        {/* ========================================== */}
        {activeTab === "friends" && (
          <div className="space-y-6">
            {/* Search User Form */}
            <form onSubmit={handleSearchUsers} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#14171c]">
              <p className="text-sm font-bold text-slate-900 dark:text-white mb-2">Find People</p>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by username or full name..."
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-[#18211f] dark:text-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={searchLoading}
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                >
                  {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  <span>Search</span>
                </button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                  <p className="text-xs font-bold text-slate-500 mb-2">Search Results</p>
                  {searchResults.map((p) => {
                    const existingFriendship = friendships.find(
                      (f) => f.requester_id === p.user_id || f.addressee_id === p.user_id
                    );

                    const isAccepted = existingFriendship?.status === "accepted";
                    const isPendingSent =
                      existingFriendship?.status === "pending" &&
                      existingFriendship?.requester_id === user?.id;
                    const isPendingReceived =
                      existingFriendship?.status === "pending" &&
                      existingFriendship?.addressee_id === user?.id;

                    return (
                      <div key={p.user_id} className="flex items-center justify-between py-2.5">
                        <div className="flex items-center gap-3">
                          {p.user_img ? (
                            <img src={p.user_img} alt={p.username} className="h-9 w-9 rounded-full object-cover" />
                          ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-800 text-xs dark:bg-emerald-950 dark:text-emerald-200">
                              {(p.full_name || p.username || "U").charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{p.full_name || p.username}</p>
                            <p className="text-xs text-slate-500">@{p.username} · Lvl {p.level || 1}</p>
                          </div>
                        </div>

                        {isAccepted ? (
                          <span className="rounded-2xl bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            Friends
                          </span>
                        ) : isPendingSent ? (
                          <button
                            type="button"
                            onClick={() => removeFriendship(existingFriendship.id)}
                            className="inline-flex items-center gap-1 rounded-2xl bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-300"
                            title="Cancel friend request"
                          >
                            <span>Request sent</span>
                            <X className="h-3 w-3 ml-1" />
                          </button>
                        ) : isPendingReceived ? (
                          <button
                            type="button"
                            onClick={() => updateFriendshipStatus(existingFriendship.id, "accepted")}
                            className="inline-flex items-center gap-1 rounded-2xl bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700"
                          >
                            <Check className="h-3 w-3" /> Accept
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => sendFriendRequest(p.user_id)}
                            className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm"
                          >
                            <UserPlus className="h-3.5 w-3.5" /> Add friend
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </form>

            {friendsLoading ? (
              <div className="flex min-h-[250px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-[#14171c]">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Loading friends list...</p>
              </div>
            ) : friendsError ? (
              <div className="flex min-h-[250px] flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center dark:border-rose-900/40 dark:bg-rose-950/20">
                <AlertCircle className="h-8 w-8 text-rose-600" />
                <p className="mt-2 text-sm font-bold text-rose-800 dark:text-rose-200">{friendsError}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Incoming Requests Section */}
                {pendingIncoming.length > 0 && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 dark:border-amber-900/40 dark:bg-amber-950/20">
                    <p className="text-sm font-bold text-amber-900 dark:text-amber-200 mb-3">
                      Pending Requests ({pendingIncoming.length})
                    </p>
                    <div className="space-y-3">
                      {pendingIncoming.map((req) => {
                        const prof = friendProfiles[req.requester_id];
                        return (
                          <div key={req.id} className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm dark:bg-[#14171c]">
                            <div className="flex items-center gap-3 min-w-0">
                              {prof?.user_img ? (
                                <img src={prof.user_img} alt={prof.username} className="h-10 w-10 rounded-full object-cover" />
                              ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-200 text-xs font-bold text-amber-900 dark:bg-amber-900 dark:text-amber-100">
                                  {(prof?.full_name || prof?.username || "U").charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                                  {prof?.full_name || prof?.username || "Learner"}
                                </p>
                                <p className="text-xs text-slate-500">@{prof?.username || "user"}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => updateFriendshipStatus(req.id, "accepted")}
                                className="inline-flex items-center gap-1 rounded-2xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                              >
                                <Check className="h-3.5 w-3.5" /> Accept
                              </button>
                              <button
                                type="button"
                                onClick={() => updateFriendshipStatus(req.id, "declined")}
                                className="inline-flex items-center gap-1 rounded-2xl bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300"
                              >
                                <X className="h-3.5 w-3.5" /> Decline
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Friends List Section */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#14171c]">
                  <p className="text-base font-bold text-slate-900 dark:text-white mb-4">
                    My Friends ({acceptedFriends.length})
                  </p>

                  {acceptedFriends.length === 0 ? (
                    <div className="py-8 text-center">
                      <Users className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-700" />
                      <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-400">No friends added yet</p>
                      <p className="text-xs text-slate-500 dark:text-slate-500">Use the search box above to connect with fellow learners.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {acceptedFriends.map((f) => {
                        const otherId = f.requester_id === user?.id ? f.addressee_id : f.requester_id;
                        const prof = friendProfiles[otherId];

                        return (
                          <div key={f.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-[#18211f]">
                            <div className="flex items-center gap-3 min-w-0">
                              {prof?.user_img ? (
                                <img src={prof.user_img} alt={prof.username} className="h-10 w-10 rounded-full object-cover shrink-0" />
                              ) : (
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-200 text-xs font-bold text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100">
                                  {(prof?.full_name || prof?.username || "U").charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                                  {prof?.full_name || prof?.username || "Learner"}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                  <span>@{prof?.username || "user"}</span>
                                  <span className="flex items-center gap-0.5 text-amber-600 font-bold"><Zap className="h-3 w-3" />{prof?.xp_points || 0}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleStartDirectChat(otherId)}
                                className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm"
                                title="Message friend"
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Message</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => removeFriendship(f.id)}
                                title="Unfriend"
                                className="rounded-xl p-2 text-slate-400 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950/40"
                              >
                                <UserX className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Sent Requests Section */}
                {pendingSent.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#14171c]">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                      Sent Requests ({pendingSent.length})
                    </p>
                    <div className="space-y-2">
                      {pendingSent.map((req) => {
                        const prof = friendProfiles[req.addressee_id];
                        return (
                          <div key={req.id} className="flex items-center justify-between py-2 text-xs">
                            <span className="font-bold text-slate-900 dark:text-white">@{prof?.username || "user"}</span>
                            <button
                              type="button"
                              onClick={() => removeFriendship(req.id)}
                              className="text-rose-600 hover:underline font-semibold"
                            >
                              Cancel Request
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 3: GROUPS                              */}
        {/* ========================================== */}
        {activeTab === "groups" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#14171c]">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Study Groups</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Join or create study rooms with classmates</p>
              </div>

              <button
                type="button"
                onClick={() => setShowCreateGroup(true)}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4" /> Create Group
              </button>
            </div>

            {/* Create Group Form Card */}
            {showCreateGroup && (
              <form onSubmit={handleCreateGroup} className="rounded-2xl border border-emerald-300 bg-emerald-50/50 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-base font-bold text-emerald-950 dark:text-emerald-200">Create New Study Group</p>
                  <button type="button" onClick={() => setShowCreateGroup(false)} className="rounded-full p-1 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Group Name</label>
                    <input required value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="e.g. Calculus Champions" className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-[#14171c] dark:text-white" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Subject</label>
                    <input required value={newGroupSubject} onChange={(e) => setNewGroupSubject(e.target.value)} placeholder="e.g. Mathematics" className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-[#14171c] dark:text-white" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                    <textarea value={newGroupDescription} onChange={(e) => setNewGroupDescription(e.target.value)} placeholder="What will this group work on?" rows={2} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-[#14171c] dark:text-white" />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input type="checkbox" id="publicGroupToggle" checked={newGroupIsPublic} onChange={(e) => setNewGroupIsPublic(e.target.checked)} className="h-4 w-4 rounded accent-emerald-600" />
                    <label htmlFor="publicGroupToggle" className="text-xs font-bold text-slate-700 dark:text-slate-300">Public Group (anyone can join)</label>
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button type="button" onClick={() => setShowCreateGroup(false)} className="rounded-xl bg-slate-200 px-4 py-2 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">Cancel</button>
                    <button type="submit" disabled={createGroupLoading} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                      {createGroupLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      <span>Save Group</span>
                    </button>
                  </div>
                </div>
              </form>
            )}

            {groupsLoading ? (
              <div className="flex min-h-[250px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-[#14171c]">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Loading study groups...</p>
              </div>
            ) : groupsError ? (
              <div className="flex min-h-[250px] flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center dark:border-rose-900/40 dark:bg-rose-950/20">
                <AlertCircle className="h-8 w-8 text-rose-600" />
                <p className="mt-2 text-sm font-bold text-rose-800 dark:text-rose-200">{groupsError}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* My Groups Section */}
                {myGroups.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#14171c]">
                    <p className="text-base font-bold text-slate-900 dark:text-white mb-4">My Groups</p>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {myGroups.map((mem) => {
                        const grp = mem.group;
                        if (!grp) return null;
                        return (
                          <div
                            key={grp.id}
                            onClick={() => openGroupDetail(grp)}
                            className="cursor-pointer rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-emerald-400 dark:border-slate-800 dark:bg-[#18211f] dark:hover:border-emerald-600"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <span className="inline-flex items-center gap-1 rounded-2xl bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                  {grp.subject}
                                </span>
                                <h3 className="mt-2 text-base font-bold text-slate-900 dark:text-white">{grp.name}</h3>
                              </div>
                              {grp.is_public ? <Globe className="h-4 w-4 text-slate-400" /> : <Lock className="h-4 w-4 text-slate-400" />}
                            </div>
                            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{grp.description || "No description provided."}</p>
                            <div className="mt-3 flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              <span>View Details & Sessions</span>
                              <ChevronRight className="h-4 w-4" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Explore Public Groups Section */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#14171c]">
                  <p className="text-base font-bold text-slate-900 dark:text-white mb-4">Explore Public Groups</p>

                  {publicGroups.length === 0 ? (
                    <div className="py-8 text-center">
                      <Shield className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-700" />
                      <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-400">No public study groups yet</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {publicGroups.map((grp) => {
                        const isMember = myGroups.some((m) => m.group_id === grp.id);

                        return (
                          <div
                            key={grp.id}
                            className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-[#18211f]"
                          >
                            <div>
                              <div className="flex items-start justify-between">
                                <span className="inline-flex items-center gap-1 rounded-2xl bg-cyan-100 px-2.5 py-0.5 text-[10px] font-bold text-cyan-900 dark:bg-cyan-950 dark:text-cyan-200">
                                  {grp.subject}
                                </span>
                                <Globe className="h-4 w-4 text-slate-400" />
                              </div>
                              <h3 className="mt-2 text-base font-bold text-slate-900 dark:text-white">{grp.name}</h3>
                              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{grp.description || "No description."}</p>
                            </div>

                            <div className="mt-4 flex items-center justify-between border-t border-slate-200/60 pt-3 dark:border-slate-800">
                              <button type="button" onClick={() => openGroupDetail(grp)} className="text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">Details</button>
                              {isMember ? (
                                <span className="rounded-2xl bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Joined</span>
                              ) : grp.is_public ? (
                                <button type="button" onClick={() => handleJoinPublicGroup(grp.id)} className="rounded-2xl bg-emerald-600 px-3.5 py-1 text-xs font-bold text-white hover:bg-emerald-700">Join Group</button>
                              ) : (
                                <button type="button" onClick={() => handleRequestPrivateGroup(grp.id)} className="rounded-2xl bg-slate-800 px-3.5 py-1 text-xs font-bold text-white hover:bg-slate-900">Request Access</button>
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

            {/* Selected Group Modal/Drawer */}
            {selectedGroup && (
              <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm" onClick={() => setSelectedGroup(null)}>
                <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#14171c]" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="rounded-2xl bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">{selectedGroup.subject}</span>
                      <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{selectedGroup.name}</h2>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{selectedGroup.description}</p>
                    </div>
                    <button type="button" onClick={() => setSelectedGroup(null)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
                  </div>

                  {/* Sub-tab bar inside Group Details */}
                  <div className="mt-5 flex border-b border-slate-100 dark:border-slate-800 gap-4">
                    <button
                      type="button"
                      onClick={() => setSelectedGroupSubTab("overview")}
                      className={`pb-2.5 text-xs font-bold border-b-2 transition ${
                        selectedGroupSubTab === "overview"
                          ? "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"
                          : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400"
                      }`}
                    >
                      Overview & Members
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedGroupSubTab("sessions")}
                      className={`pb-2.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
                        selectedGroupSubTab === "sessions"
                          ? "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"
                          : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400"
                      }`}
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      Study Sessions
                    </button>
                  </div>

                  {groupDetailLoading ? (
                    <div className="flex min-h-[200px] items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                    </div>
                  ) : selectedGroupSubTab === "overview" ? (
                    <div className="mt-6 space-y-6">
                      {/* Group Direct Chat button */}
                      {selectedGroupConversationId && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveConversationId(selectedGroupConversationId);
                            setSelectedGroup(null);
                            setActiveTab("chat");
                          }}
                          className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm"
                        >
                          <MessageSquare className="h-4 w-4" /> Open Group Chat
                        </button>
                      )}

                      {/* Members List */}
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Group Members ({groupMembers.length})</h3>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {groupMembers.map((m) => (
                            <div key={m.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-[#18211f]">
                              {m.profile?.user_img ? (
                                <img src={m.profile.user_img} alt={m.profile.username} className="h-8 w-8 rounded-full object-cover" />
                              ) : (
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-200 text-xs font-bold text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100">
                                  {(m.profile?.full_name || m.profile?.username || "U").charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="truncate text-xs font-bold text-slate-900 dark:text-white">{m.profile?.full_name || m.profile?.username || "Member"}</p>
                                <p className="text-[10px] text-slate-500">@{m.profile?.username || "user"}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Group Leaderboard */}
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Group Rankings</h3>
                        {groupLeaderboard.length === 0 ? (
                          <p className="text-xs text-slate-500">No member activity recorded yet.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {groupLeaderboard.map((item, idx) => (
                              <div key={item.user_id || idx} className="flex items-center justify-between rounded-xl border border-slate-100 p-2.5 dark:border-slate-800">
                                <div className="flex items-center gap-3">
                                  <span className="w-5 text-center text-xs font-bold text-slate-400">#{idx + 1}</span>
                                  <p className="text-xs font-bold text-slate-900 dark:text-white">{item.full_name || item.username}</p>
                                </div>
                                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{item.xp_points || 0} XP</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6">
                      <GroupStudySessions
                        groupId={selectedGroup.id}
                        groupConversationId={selectedGroupConversationId}
                        currentUserId={user?.id}
                        onJoinSession={(sessionId) => {
                          setOpenSessionId(sessionId);
                          setSelectedGroup(null);
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Live Session Room Overlay */}
        {openSessionId && (
          <SessionRoom
            sessionId={openSessionId}
            groupConversationId={selectedGroupConversationId}
            currentUserId={user?.id}
            onClose={() => setOpenSessionId(null)}
          />
        )}

        {/* ========================================== */}
        {/* TAB 4: CHAT & INBOX                       */}
        {/* ========================================== */}
        {activeTab === "chat" && (
          <div>
            {activeConversationId ? (
              <ChatThread
                conversationId={activeConversationId}
                currentUserId={user?.id}
                onBack={() => setActiveConversationId(null)}
              />
            ) : (
              <ChatInbox
                currentUserId={user?.id}
                onSelectConversation={(convId) => setActiveConversationId(convId)}
              />
            )}
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 5: ACTIVITY FEED                       */}
        {/* ========================================== */}
        {activeTab === "feed" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#14171c]">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Community Activity Feed</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Real-time system updates on study milestones and achievements</p>
            </div>

            {feedLoading ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-[#14171c]">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Loading activity feed...</p>
              </div>
            ) : feedError ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center dark:border-rose-900/40 dark:bg-rose-950/20">
                <AlertCircle className="h-8 w-8 text-rose-600" />
                <p className="mt-2 text-sm font-bold text-rose-800 dark:text-rose-200">{feedError}</p>
              </div>
            ) : activityFeed.length === 0 ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-[#14171c]">
                <Zap className="h-10 w-10 text-slate-300 dark:text-slate-700" />
                <p className="mt-3 text-base font-bold text-slate-800 dark:text-slate-200">No Activity Yet</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Activity updates appear here automatically as learners hit milestones!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activityFeed.map((item) => {
                  const prof = feedProfiles[item.user_id];
                  const rxnsForItem = feedReactions.filter((r) => r.activity_id === item.id);
                  const hasUserReacted = user && rxnsForItem.some((r) => r.user_id === user.id);

                  return (
                    <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#14171c]">
                      <div className="flex items-start gap-3.5">
                        {prof?.user_img ? (
                          <img src={prof.user_img} alt={prof.username} className="h-10 w-10 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-200 text-sm font-bold text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100">
                            {(prof?.full_name || prof?.username || "U").charAt(0).toUpperCase()}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                              {prof?.full_name || prof?.username || "Learner"}
                              <span className="ml-1 text-xs font-normal text-slate-500 dark:text-slate-400">@{prof?.username || "user"}</span>
                            </p>
                            <span className="text-[11px] font-semibold text-slate-400">
                              {new Date(item.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                            </span>
                          </div>

                          <p className="mt-2 text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                            {item.activity_text || item.description || "Completed a study milestone!"}
                          </p>

                          <div className="mt-4 flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => toggleReaction(item.id)}
                              className={`inline-flex items-center gap-1.5 rounded-2xl px-3 py-1.5 text-xs font-bold transition ${
                                hasUserReacted
                                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                              }`}
                            >
                              <Heart className={`h-3.5 w-3.5 ${hasUserReacted ? "fill-current text-rose-600" : ""}`} />
                              <span>{rxnsForItem.length}</span>
                            </button>
                          </div>
                        </div>
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
};

export default Community;
