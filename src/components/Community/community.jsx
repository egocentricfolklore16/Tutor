import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation, useParams, Routes, Route } from "react-router-dom";
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
  HelpCircle,
  Award,
  Clock,
} from "lucide-react";
import supabase from "../../lib/supabase";
import { useProfile } from "../../app/ProfileContext";
import { getCollaborationInfo } from "../../lib/collaboration";
import PageContainer from "../common/PageContainer";

import ChatInbox from "./ChatInbox";
import ChatThread from "./ChatThread";
import GroupStudySessions from "./GroupStudySessions";
import SessionRoom from "./SessionRoom";

import ChooseUsernameCard from "./ChooseUsernameCard";
import UserProfilePage from "./UserProfilePage";
import StudyRoomsLobby from "./StudyRoomsLobby";
import VirtualStudyRoom from "./VirtualStudyRoom";
import HelpForum from "./HelpForum";
import ForumPostDetail from "./ForumPostDetail";
import PeerTutors from "./PeerTutors";
import LeaderboardTab from "./LeaderboardTab";
import AchievementsPage from "./AchievementsPage";

const Community = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const { profile } = useProfile();
  const collaborationInfo = getCollaborationInfo(profile?.collaboration_interest);

  const [activeTab, setActiveTab] = useState("groups"); // 'groups' | 'rooms' | 'help' | 'tutors' | 'leaderboard' | 'friends' | 'chat' | 'feed'
  const [openSessionId, setOpenSessionId] = useState(null);
  const [user, setUser] = useState(null);

  // Sync tab with URL path
  const pathLower = location.pathname.toLowerCase();

  useEffect(() => {
    if (pathLower.includes("/rooms")) setActiveTab("rooms");
    else if (pathLower.includes("/help")) setActiveTab("help");
    else if (pathLower.includes("/tutors")) setActiveTab("tutors");
    else if (pathLower.includes("/leaderboard")) setActiveTab("leaderboard");
    else if (pathLower.includes("/chat")) setActiveTab("chat");
    else if (pathLower.includes("/friends")) setActiveTab("friends");
    else if (pathLower.includes("/feed")) setActiveTab("feed");
    else if (pathLower.includes("/groups")) setActiveTab("groups");
  }, [pathLower]);

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

  const activeConversationId = params["*"]?.startsWith("chat/") ? params["*"].split("chat/")[1] : null;

  // ==========================================
  // GROUPS STATE & LOGIC
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
      const { data: convData } = await supabase
        .from("conversations")
        .select("id")
        .eq("study_group_id", group.id)
        .maybeSingle();

      if (convData) {
        setSelectedGroupConversationId(convData.id);
      }

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

      const { data: gLeaderboard } = await supabase.rpc("get_group_leaderboard", {
        p_group_id: group.id,
      });
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
        .insert({ group_id: groupId, user_id: user.id, role: "member" });
      if (error) throw error;
      fetchGroupsData();
    } catch (err) {
      console.error("Error joining group:", err);
    }
  };

  // ==========================================
  // FRIENDS LOGIC
  // ==========================================
  const [friendships, setFriendships] = useState([]);
  const [friendProfiles, setFriendProfiles] = useState({});
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const fetchFriendsData = useCallback(async () => {
    if (!user) return;
    setFriendsLoading(true);
    try {
      const { data: rawRows, error } = await supabase
        .from("friendships")
        .select("*")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      if (error) throw error;
      const rows = rawRows || [];
      setFriendships(rows);

      const otherUserIds = Array.from(
        new Set(rows.map((r) => (r.requester_id === user.id ? r.addressee_id : r.requester_id)))
      );

      if (otherUserIds.length > 0) {
        const { data: profs } = await supabase
          .from("community_profiles")
          .select("*")
          .in("user_id", otherUserIds);

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
    } finally {
      setFriendsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === "friends") fetchFriendsData();
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
      const { error } = await supabase.from("friendships").insert({
        requester_id: user.id,
        addressee_id: addresseeId,
        status: "pending",
      });
      if (error && !error.message?.includes("duplicate")) throw error;
      fetchFriendsData();
      if (searchQuery) handleSearchUsers();
    } catch (err) {
      console.error("Error sending friend request:", err);
    }
  };

  const updateFriendshipStatus = async (friendshipId, status) => {
    try {
      await supabase
        .from("friendships")
        .update({ status, responded_at: new Date().toISOString() })
        .eq("id", friendshipId);
      fetchFriendsData();
    } catch (err) {
      console.error("Error updating friendship:", err);
    }
  };

  const removeFriendship = async (friendshipId) => {
    try {
      await supabase.from("friendships").delete().eq("id", friendshipId);
      fetchFriendsData();
    } catch (err) {
      console.error("Error removing friendship:", err);
    }
  };

  const acceptedFriends = friendships.filter((f) => f.status === "accepted");
  const pendingIncoming = friendships.filter((f) => f.status === "pending" && f.addressee_id === user?.id);
  const pendingSent = friendships.filter((f) => f.status === "pending" && f.requester_id === user?.id);

  const userSubjects = Array.isArray(profile?.subjects) ? profile.subjects : [];

  return (
    <Routes>
      <Route path="u/:userId" element={<UserProfilePage />} />
      <Route path="rooms/:roomId" element={<VirtualStudyRoom />} />
      <Route path="help/:postId" element={<ForumPostDetail />} />
      <Route path="achievements" element={<AchievementsPage />} />
      <Route
        path="*"
        element={
          <PageContainer maxWidth="max-w-7xl">
            {/* One-time Choose Username Prompt Card */}
            <ChooseUsernameCard />

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
                    Connect with study partners, join virtual rooms, ask help questions, and compete on leaderboards.
                  </p>
                </div>

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

              {/* Navigation Sub-Tabs Segmented Bar */}
              <div className="mt-8 flex w-full gap-1.5 overflow-x-auto no-scrollbar rounded-2xl bg-slate-200/80 p-1.5 dark:bg-[#18211f] dark:border dark:border-slate-800">
                {[
                  { id: "groups", label: "Groups", icon: Shield, path: "/community/groups" },
                  { id: "rooms", label: "Rooms", icon: Clock, path: "/community/rooms" },
                  { id: "help", label: "Help Forum", icon: HelpCircle, path: "/community/help" },
                  { id: "tutors", label: "Tutors", icon: BookOpen, path: "/community/tutors" },
                  { id: "leaderboard", label: "Leaderboard", icon: Trophy, path: "/community/leaderboard" },
                  { id: "friends", label: "Friends", icon: Users, path: "/community/friends" },
                  { id: "chat", label: "Chat", icon: MessageSquare, path: "/community/chat" },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(tab.id);
                        navigate(tab.path);
                      }}
                      className={`flex min-h-[44px] flex-1 min-w-[110px] items-center justify-center gap-2 rounded-2xl px-3.5 py-2 text-xs font-bold transition duration-200 ${
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

            {/* Sub-tab Content Render */}
            <div className="mt-6">
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
                                    ) : (
                                      <button type="button" onClick={() => handleJoinPublicGroup(grp.id)} className="rounded-2xl bg-emerald-600 px-3.5 py-1 text-xs font-bold text-white hover:bg-emerald-700">Join Group</button>
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

                  {selectedGroup && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm" onClick={() => setSelectedGroup(null)}>
                      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#14171c]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="rounded-2xl bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">{selectedGroup.subject}</span>
                            <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{selectedGroup.name}</h2>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{selectedGroup.description}</p>
                          </div>
                          <button type="button" onClick={() => setSelectedGroup(null)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
                        </div>

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
                            {selectedGroupConversationId && (
                              <button
                                type="button"
                                onClick={() => {
                                  navigate(`/community/chat/${selectedGroupConversationId}`);
                                  setSelectedGroup(null);
                                }}
                                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm"
                              >
                                <MessageSquare className="h-4 w-4" /> Open Group Chat
                              </button>
                            )}

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

              {activeTab === "rooms" && <StudyRoomsLobby user={user} userSubjects={userSubjects} />}

              {activeTab === "help" && <HelpForum user={user} userSubjects={userSubjects} />}

              {activeTab === "tutors" && <PeerTutors user={user} userSubjects={userSubjects} />}

              {activeTab === "leaderboard" && <LeaderboardTab user={user} userGroups={myGroups.map((m) => m.group).filter(Boolean)} />}

              {/* FRIENDS TAB */}
              {activeTab === "friends" && (
                <div className="space-y-6">
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

                    {searchResults.length > 0 && (
                      <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                        <p className="text-xs font-bold text-slate-500 mb-2">Search Results</p>
                        {searchResults.map((p) => {
                          const existing = friendships.find(
                            (f) => f.requester_id === p.user_id || f.addressee_id === p.user_id
                          );
                          const isAccepted = existing?.status === "accepted";
                          const isPendingSent = existing?.status === "pending" && existing?.requester_id === user?.id;

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
                                <span className="rounded-2xl bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Friends</span>
                              ) : isPendingSent ? (
                                <button type="button" onClick={() => removeFriendship(existing.id)} className="rounded-2xl bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">Request sent</button>
                              ) : (
                                <button type="button" onClick={() => sendFriendRequest(p.user_id)} className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700">Add friend</button>
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
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {pendingIncoming.length > 0 && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 dark:border-amber-900/40 dark:bg-amber-950/20">
                          <p className="text-sm font-bold text-amber-900 dark:text-amber-200 mb-3">Pending Requests ({pendingIncoming.length})</p>
                          <div className="space-y-3">
                            {pendingIncoming.map((req) => {
                              const prof = friendProfiles[req.requester_id];
                              return (
                                <div key={req.id} className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm dark:bg-[#14171c]">
                                  <div className="flex items-center gap-3">
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{prof?.full_name || prof?.username}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button type="button" onClick={() => updateFriendshipStatus(req.id, "accepted")} className="rounded-2xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white">Accept</button>
                                    <button type="button" onClick={() => updateFriendshipStatus(req.id, "declined")} className="rounded-2xl bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700">Decline</button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#14171c]">
                        <p className="text-base font-bold text-slate-900 dark:text-white mb-4">My Friends ({acceptedFriends.length})</p>
                        {acceptedFriends.length === 0 ? (
                          <p className="text-xs text-slate-500 py-4 text-center">No friends added yet.</p>
                        ) : (
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {acceptedFriends.map((f) => {
                              const otherId = f.requester_id === user?.id ? f.addressee_id : f.requester_id;
                              const prof = friendProfiles[otherId];

                              return (
                                <div key={f.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-[#18211f]">
                                  <div className="flex items-center gap-3">
                                    {prof?.user_img ? (
                                      <img src={prof.user_img} alt={prof.username} className="h-10 w-10 rounded-full object-cover" />
                                    ) : (
                                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-200 text-xs font-bold text-emerald-900">
                                        {(prof?.full_name || prof?.username || "U").charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                    <div>
                                      <p className="text-sm font-bold text-slate-900 dark:text-white">{prof?.full_name || prof?.username}</p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        const { data: convId } = await supabase.rpc("get_or_create_direct_conversation", { p_other_user_id: otherId });
                                        if (convId) navigate(`/community/chat/${convId}`);
                                      }}
                                      className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                                    >
                                      Message
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* CHAT TAB */}
              {activeTab === "chat" && (
                <div className="w-full h-[calc(100dvh-5rem)] overflow-hidden">
                  <div className="hidden md:flex h-full w-full bg-white dark:bg-[#14171c] overflow-hidden">
                    <div className="w-80 shrink-0 border-r border-slate-200 dark:border-slate-800 h-full overflow-y-auto">
                      <ChatInbox
                        currentUserId={user?.id}
                        onSelectConversation={(convId) => navigate(`/Community/chat/${convId}`)}
                        onFindFriends={() => setActiveTab("friends")}
                      />
                    </div>
                    <div className="flex-1 h-full overflow-hidden">
                      {activeConversationId ? (
                        <ChatThread
                          conversationId={activeConversationId}
                          currentUserId={user?.id}
                          onBack={() => navigate("/Community/chat")}
                        />
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center p-8 text-center bg-slate-50/50 dark:bg-[#18211f]/30">
                          <MessageSquare className="h-12 w-12 text-slate-300 dark:text-slate-700" />
                          <h3 className="mt-3 text-base font-bold text-slate-800 dark:text-slate-200">
                            Select a conversation
                          </h3>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="block md:hidden h-full w-full">
                    {activeConversationId ? (
                      <div className="fixed inset-0 z-[110] bg-white dark:bg-[#14171c] h-[100dvh] w-screen">
                        <ChatThread
                          conversationId={activeConversationId}
                          currentUserId={user?.id}
                          onBack={() => navigate("/Community/chat")}
                        />
                      </div>
                    ) : (
                      <div className="h-full overflow-y-auto">
                        <ChatInbox
                          currentUserId={user?.id}
                          onSelectConversation={(convId) => navigate(`/Community/chat/${convId}`)}
                          onFindFriends={() => setActiveTab("friends")}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {openSessionId && (
              <SessionRoom
                sessionId={openSessionId}
                groupConversationId={selectedGroupConversationId}
                currentUserId={user?.id}
                onClose={() => setOpenSessionId(null)}
              />
            )}
          </PageContainer>
        }
      />
    </Routes>
  );
};

export default Community;
