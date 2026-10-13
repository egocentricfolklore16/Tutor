import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation, useParams, Routes, Route } from "react-router-dom";
import {
  Users,
  Trophy,
  Search,
  Plus,
  Globe,
  Lock,
  Loader2,
  AlertCircle,
  X,
  Shield,
  BookOpen,
  Sparkles,
  ChevronRight,
  MessageSquare,
  Calendar,
  HelpCircle,
  Clock,
  Maximize2,
  Minimize2,
  UserCheck,
  UserX,
  UserPlus,
  MoreVertical,
  Trash2,
  CheckCircle,
  Settings as SettingsIcon,
} from "lucide-react";
import supabase from "../../lib/supabase";
import { useProfile } from "../../app/ProfileContext";
import { getCollaborationInfo } from "../../lib/collaboration";
import PageContainer from "../common/PageContainer";
import Avatar from "../common/Avatar";

import ChatInbox from "./ChatInbox";
import ChatThread from "./ChatThread";
import GroupStudySessions from "./GroupStudySessions";
import SessionRoom from "./SessionRoom";
import RequestJoinModal from "./RequestJoinModal";

import ChooseUsernameCard from "./ChooseUsernameCard";
import UserProfilePage from "./UserProfilePage";
import StudyRoomsLobby from "./StudyRoomsLobby";
import VirtualStudyRoom from "./VirtualStudyRoom";
import HelpForum from "./HelpForum";
import ForumPostDetail from "./ForumPostDetail";
import PeerTutors from "./PeerTutors";
import LeaderboardTab from "./LeaderboardTab";
import AchievementsPage from "./AchievementsPage";

import { useExploreGroups } from "../../features/groups/useExploreGroups";
import { useMyGroups } from "../../features/groups/useMyGroups";
import { useGroupOverview } from "../../features/groups/useGroupOverview";
import { useGroupActions } from "../../features/groups/useGroupActions";

const Community = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const { profile } = useProfile();
  const collaborationInfo = getCollaborationInfo(profile?.collaboration_interest);

  const [activeTab, setActiveTab] = useState("groups");
  const [openSessionId, setOpenSessionId] = useState(null);
  const [user, setUser] = useState(null);

  // Maximize / Minimize state for chat
  const [isMaximized, setIsMaximized] = useState(() => {
    try {
      return sessionStorage.getItem("hyper_tutor_chat_maximized") === "true";
    } catch {
      return false;
    }
  });

  const maximizeBtnRef = useRef(null);

  const toggleMaximize = useCallback(() => {
    setIsMaximized((prev) => {
      const next = !prev;
      try {
        sessionStorage.setItem("hyper_tutor_chat_maximized", String(next));
      } catch {
        // Ignore errors
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!isMaximized) return;

    maximizeBtnRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsMaximized(false);
        try {
          sessionStorage.setItem("hyper_tutor_chat_maximized", "false");
        } catch {
          // Ignore
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMaximized]);

  const renderMaximizeButton = (additionalClass = "") => {
    const MaxIcon = isMaximized ? Minimize2 : Maximize2;
    const label = isMaximized ? "Minimize chat" : "Maximize chat";

    return (
      <button
        ref={maximizeBtnRef}
        type="button"
        onClick={toggleMaximize}
        aria-label={label}
        title={label}
        className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-emerald-600 focus-visible:shadow-focus outline-none dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-emerald-400 transition-colors ${additionalClass}`}
      >
        <MaxIcon className="h-5 w-5" />
      </button>
    );
  };

  const pathLower = location.pathname.toLowerCase();
  const isChatRoute = pathLower.includes("/chat");

  useEffect(() => {
    if (isChatRoute) {
      setActiveTab("chat");
    }
  }, [isChatRoute]);

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
  // GROUPS STATE & HOOKS
  // ==========================================
  const [groupSearch, setGroupSearch] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [selectedPrivacy, setSelectedPrivacy] = useState("all");

  const { groups: exploreGroups, loading: exploreLoading, error: exploreError, refetch: refetchExplore } = useExploreGroups({
    search: groupSearch,
    subject: selectedSubject,
    privacy: selectedPrivacy,
  });

  const { myGroups, loading: myGroupsLoading, refetch: refetchMyGroups } = useMyGroups(user?.id);

  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const { overview: groupOverview, loading: overviewLoading, refetch: refetchOverview } = useGroupOverview(selectedGroupId);

  const groupActions = useGroupActions();

  // Create Group State
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [newGroupSubject, setNewGroupSubject] = useState("");
  const [newGroupPrivacy, setNewGroupPrivacy] = useState("public"); // 'public' | 'private'
  const [createGroupLoading, setCreateGroupLoading] = useState(false);

  // Request Join Modal State
  const [requestTargetGroup, setRequestTargetGroup] = useState(null);

  // Toast Notification
  const [toastMsg, setToastMsg] = useState(null);
  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Group Modal Sub-tabs ('overview' | 'members' | 'sessions' | 'requests' | 'settings')
  const [modalSubTab, setModalSubTab] = useState("overview");

  // Member Management Menu state
  const [activeMemberMenuId, setActiveMemberMenuId] = useState(null);

  // Settings Edit Form State
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPrivacy, setEditPrivacy] = useState("public");
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

  useEffect(() => {
    if (groupOverview?.group) {
      setEditName(groupOverview.group.name || "");
      setEditDesc(groupOverview.group.description || "");
      setEditPrivacy(groupOverview.group.privacy || "public");
    }
  }, [groupOverview]);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!user || !newGroupName.trim() || !newGroupSubject.trim()) return;
    setCreateGroupLoading(true);
    try {
      const { data: newGrp, error } = await supabase
        .from("study_groups")
        .insert({
          name: newGroupName.trim(),
          description: newGroupDescription.trim(),
          subject: newGroupSubject.trim(),
          privacy: newGroupPrivacy,
          owner_id: user.id,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add owner to members table
      if (newGrp) {
        await supabase.from("study_group_members").insert({
          group_id: newGrp.id,
          user_id: user.id,
          role: "owner",
        });

        // Create group chat conversation
        await supabase.from("conversations").insert({
          type: "group",
          study_group_id: newGrp.id,
          created_by: user.id,
        });
      }

      setShowCreateGroup(false);
      setNewGroupName("");
      setNewGroupDescription("");
      setNewGroupSubject("");
      setNewGroupPrivacy("public");

      showToast("Group created successfully!");
      refetchExplore();
      refetchMyGroups();
    } catch (err) {
      console.error("Error creating group:", err);
      showToast(err.message || "Failed to create group.");
    } finally {
      setCreateGroupLoading(false);
    }
  };

  const handleJoinOrRequest = async (grp) => {
    if (grp.my_status === "member") {
      setSelectedGroupId(grp.id);
      setModalSubTab("overview");
      return;
    }

    if (grp.privacy === "public") {
      try {
        const res = await groupActions.requestJoin(grp.id);
        if (res?.success) {
          showToast("Joined group successfully!");
          refetchExplore();
          refetchMyGroups();
        }
      } catch (err) {
        showToast("Unable to join group.");
      }
    } else {
      setRequestTargetGroup(grp);
    }
  };

  const handleSendJoinRequest = async (msg) => {
    if (!requestTargetGroup) return;
    try {
      const res = await groupActions.requestJoin(requestTargetGroup.id, msg);
      if (res?.success) {
        showToast("Join request sent to group owner!");
        setRequestTargetGroup(null);
        refetchExplore();
      } else {
        showToast(res?.error === "max_pending_reached" ? "You have reached the maximum 10 pending requests." : "Failed to send request.");
      }
    } catch (err) {
      showToast("Error sending join request.");
    }
  };

  const handleDecideRequest = async (reqId, decision) => {
    try {
      await groupActions.decideRequest(reqId, decision);
      showToast(`Request ${decision}.`);
      refetchOverview();
      refetchExplore();
      refetchMyGroups();
    } catch (err) {
      showToast("Failed to process request.");
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!selectedGroupId || !editName.trim()) return;

    try {
      await supabase
        .from("study_groups")
        .update({
          name: editName.trim(),
          description: editDesc.trim(),
          privacy: editPrivacy,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedGroupId);

      showToast("Group settings saved.");
      refetchOverview();
      refetchExplore();
      refetchMyGroups();
    } catch (err) {
      console.error("Error updating group settings:", err);
      showToast("Failed to save settings.");
    }
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroupId || deleteConfirmName !== groupOverview?.group?.name) return;
    try {
      await supabase.from("study_groups").delete().eq("id", selectedGroupId);
      showToast("Group deleted.");
      setSelectedGroupId(null);
      refetchExplore();
      refetchMyGroups();
    } catch (err) {
      console.error("Error deleting group:", err);
      showToast("Failed to delete group.");
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
            {toastMsg && (
              <div className="fixed bottom-6 right-6 z-[250] flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-bold text-white shadow-overlay animate-fade-in dark:bg-white dark:text-slate-900">
                <CheckCircle className="h-4 w-4 text-emerald-400 dark:text-emerald-600" />
                <span>{toastMsg}</span>
              </div>
            )}

            <ChooseUsernameCard />

            {/* Header Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-white p-6 shadow-surface dark:bg-[#14171c] sm:p-8">
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
                  <div className="flex shrink-0 items-center gap-3 rounded-2xl bg-emerald-50/90 p-4 text-xs dark:bg-emerald-950/40 dark:text-emerald-200 shadow-surface max-w-xs">
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
              <div className="mt-8 flex w-full gap-1.5 overflow-x-auto no-scrollbar rounded-2xl bg-slate-200/80 p-1.5 dark:bg-[#18211f]">
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
                          ? "bg-white text-slate-900 shadow-surface dark:bg-[#14171c] dark:text-white"
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
              {/* GROUPS TAB */}
              {activeTab === "groups" && (
                <div className="space-y-6">
                  {/* Top CTA */}
                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow-surface dark:bg-[#14171c]">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">Study Groups</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Join or create study groups with classmates</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowCreateGroup(true)}
                      className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-button-primary hover:bg-emerald-700 transition"
                    >
                      <Plus className="h-4 w-4" /> Create Group
                    </button>
                  </div>

                  {/* Create Group Form Modal */}
                  {showCreateGroup && (
                    <form onSubmit={handleCreateGroup} className="rounded-2xl bg-emerald-50/80 p-5 dark:bg-emerald-950/20 shadow-surface space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-base font-bold text-emerald-950 dark:text-emerald-200">Create New Study Group</p>
                        <button type="button" onClick={() => setShowCreateGroup(false)} className="rounded-full p-1 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Group Name</label>
                          <input required value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="e.g. Calculus Champions" className="w-full rounded-xl bg-white px-3.5 py-2 text-sm text-slate-900 shadow-inset-field focus:shadow-focus dark:bg-[#14171c] dark:text-white" />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Subject</label>
                          <input required value={newGroupSubject} onChange={(e) => setNewGroupSubject(e.target.value)} placeholder="e.g. Mathematics" className="w-full rounded-xl bg-white px-3.5 py-2 text-sm text-slate-900 shadow-inset-field focus:shadow-focus dark:bg-[#14171c] dark:text-white" />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                          <textarea value={newGroupDescription} onChange={(e) => setNewGroupDescription(e.target.value)} placeholder="What will this group work on?" rows={2} className="w-full rounded-xl bg-white px-3.5 py-2 text-sm text-slate-900 shadow-inset-field focus:shadow-focus dark:bg-[#14171c] dark:text-white" />
                        </div>

                        <div className="flex items-center gap-4 pt-1">
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                            <input type="radio" name="privacy" value="public" checked={newGroupPrivacy === "public"} onChange={() => setNewGroupPrivacy("public")} className="accent-emerald-600" />
                            <span>Public (anyone can join)</span>
                          </label>
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                            <input type="radio" name="privacy" value="private" checked={newGroupPrivacy === "private"} onChange={() => setNewGroupPrivacy("private")} className="accent-emerald-600" />
                            <span>Private (requires owner approval)</span>
                          </label>
                        </div>

                        <div className="pt-2 flex justify-end gap-2">
                          <button type="button" onClick={() => setShowCreateGroup(false)} className="rounded-xl bg-slate-200 px-4 py-2 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">Cancel</button>
                          <button type="submit" disabled={createGroupLoading} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 shadow-button-primary">
                            {createGroupLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            <span>Save Group</span>
                          </button>
                        </div>
                      </div>
                    </form>
                  )}

                  {/* My Groups Section */}
                  {myGroups.length > 0 && (
                    <div className="rounded-2xl bg-white p-5 shadow-surface dark:bg-[#14171c]">
                      <p className="text-base font-bold text-slate-900 dark:text-white mb-4">My Groups ({myGroups.length})</p>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {myGroups.map((mem) => {
                          const grp = mem.group;
                          if (!grp) return null;
                          return (
                            <div
                              key={grp.id}
                              onClick={() => {
                                setSelectedGroupId(grp.id);
                                setModalSubTab("overview");
                              }}
                              className="cursor-pointer rounded-2xl bg-slate-50/70 p-4 shadow-surface hover:shadow-surface-hover transition dark:bg-[#18211f]"
                            >
                              <div className="flex items-start justify-between">
                                <span className="inline-flex items-center gap-1 rounded-2xl bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                  {grp.subject}
                                </span>
                                {grp.privacy === "public" ? <Globe className="h-4 w-4 text-slate-400" /> : <Lock className="h-4 w-4 text-amber-500" />}
                              </div>
                              <h3 className="mt-2 text-base font-bold text-slate-900 dark:text-white">{grp.name}</h3>
                              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{grp.description || "No description provided."}</p>
                              <div className="mt-3 flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                <span>{grp.member_count || 1} members</span>
                                <ChevronRight className="h-4 w-4" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Discover / Explore Section */}
                  <div className="rounded-2xl bg-white p-5 shadow-surface dark:bg-[#14171c]">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                      <p className="text-base font-bold text-slate-900 dark:text-white">Discover Groups</p>

                      {/* Filters */}
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                          <input
                            type="text"
                            value={groupSearch}
                            onChange={(e) => setGroupSearch(e.target.value)}
                            placeholder="Search groups..."
                            className="rounded-xl bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-900 shadow-inset-field focus:shadow-focus dark:bg-[#18211f] dark:text-white min-w-[140px]"
                          />
                        </div>

                        <select
                          value={selectedPrivacy}
                          onChange={(e) => setSelectedPrivacy(e.target.value)}
                          className="rounded-xl bg-slate-50 py-1.5 px-3 text-xs font-bold text-slate-700 shadow-inset-field dark:bg-[#18211f] dark:text-slate-200"
                        >
                          <option value="all">All Privacy</option>
                          <option value="public">Public</option>
                          <option value="private">Private</option>
                        </select>
                      </div>
                    </div>

                    {exploreLoading ? (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 py-4">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="h-36 rounded-2xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />
                        ))}
                      </div>
                    ) : exploreGroups.length === 0 ? (
                      <div className="py-8 text-center">
                        <Shield className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-700" />
                        <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-400">No matching study groups found</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {exploreGroups.map((grp) => {
                          const isMember = grp.my_status === "member";
                          const isPending = grp.my_status === "pending";
                          const isCooldown = grp.my_status === "declined_cooldown";

                          return (
                            <div
                              key={grp.id}
                              className="flex flex-col justify-between rounded-2xl bg-slate-50/70 p-4 shadow-surface hover:shadow-surface-hover transition dark:bg-[#18211f]"
                            >
                              <div>
                                <div className="flex items-start justify-between">
                                  <span className="inline-flex items-center gap-1 rounded-2xl bg-cyan-100 px-2.5 py-0.5 text-[10px] font-bold text-cyan-900 dark:bg-cyan-950 dark:text-cyan-200">
                                    {grp.subject}
                                  </span>
                                  {grp.privacy === "public" ? <Globe className="h-4 w-4 text-slate-400" /> : <Lock className="h-4 w-4 text-amber-500" title="Private: owner approves new members" />}
                                </div>
                                <h3 className="mt-2 text-base font-bold text-slate-900 dark:text-white">{grp.name}</h3>
                                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{grp.description || "No description provided."}</p>

                                <div className="mt-3 flex items-center gap-2">
                                  <Avatar src={grp.owner_avatar} name={grp.owner_name} username={grp.owner_username} size="xs" />
                                  <span className="text-[11px] text-slate-500 font-medium truncate">
                                    Owner: {grp.owner_name || grp.owner_username || "Unknown"}
                                  </span>
                                </div>
                              </div>

                              <div className="mt-4 flex items-center justify-between pt-3">
                                <span className="text-xs font-bold text-slate-500">
                                  {grp.member_count} {grp.member_count === 1 ? "member" : "members"}
                                </span>

                                {isMember ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedGroupId(grp.id);
                                      setModalSubTab("overview");
                                    }}
                                    className="rounded-2xl bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  >
                                    Open Group
                                  </button>
                                ) : isPending ? (
                                  <button
                                    type="button"
                                    onClick={() => groupActions.cancelRequest(grp.my_request_id).then(() => refetchExplore())}
                                    className="rounded-2xl bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 hover:bg-amber-200"
                                  >
                                    Request pending (Cancel)
                                  </button>
                                ) : isCooldown ? (
                                  <span className="rounded-2xl bg-slate-200 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                    Try again in {grp.cooldown_days_left}d
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleJoinOrRequest(grp)}
                                    className="rounded-2xl bg-emerald-600 px-3.5 py-1 text-xs font-bold text-white shadow-button-primary hover:bg-emerald-700"
                                  >
                                    {grp.privacy === "public" ? "Join Group" : "Request to join"}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Group Detail Modal */}
                  {selectedGroupId && (
                    <div
                      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs"
                      onClick={() => setSelectedGroupId(null)}
                    >
                      <div
                        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-overlay dark:bg-[#14171c]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {overviewLoading ? (
                          <div className="flex min-h-[250px] items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                          </div>
                        ) : groupOverview?.is_member === false ? (
                          /* TEASER VIEW FOR PRIVATE GROUP NON-MEMBERS */
                          <div className="space-y-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <span className="rounded-2xl bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                  {groupOverview.group.subject}
                                </span>
                                <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                                  {groupOverview.group.name}
                                  <Lock className="h-5 w-5 text-amber-500" />
                                </h2>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                  {groupOverview.group.description}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setSelectedGroupId(null)}
                                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                              >
                                <X className="h-5 w-5" />
                              </button>
                            </div>

                            <div className="rounded-2xl bg-slate-50 p-6 text-center shadow-surface dark:bg-[#18211f] space-y-3">
                              <Lock className="mx-auto h-8 w-8 text-amber-500" />
                              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                Private Group Content Protected
                              </p>
                              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                                Join to see member list, rankings, scheduled study sessions, and live chat!
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedGroupId(null);
                                  setRequestTargetGroup(groupOverview.group);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-button-primary hover:bg-emerald-700"
                              >
                                <Lock className="h-3.5 w-3.5" />
                                Request to Join
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* FULL VIEW FOR MEMBERS */
                          <div className="space-y-5">
                            <div className="flex items-start justify-between">
                              <div>
                                <span className="rounded-2xl bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                  {groupOverview?.group?.subject}
                                </span>
                                <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                                  {groupOverview?.group?.name}
                                </h2>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                  {groupOverview?.group?.description}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setSelectedGroupId(null)}
                                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                              >
                                <X className="h-5 w-5" />
                              </button>
                            </div>

                            {/* Sub-tabs */}
                            <div className="flex border-b border-slate-100 dark:border-slate-800 gap-4 overflow-x-auto no-scrollbar">
                              {[
                                { id: "overview", label: "Overview" },
                                { id: "members", label: `Members (${groupOverview?.members?.length || 0})` },
                                { id: "sessions", label: "Sessions" },
                                ...(groupOverview?.my_role === "owner" || groupOverview?.my_role === "admin"
                                  ? [
                                      {
                                        id: "requests",
                                        label: `Requests (${groupOverview?.pending_requests?.length || 0})`,
                                        badge: groupOverview?.pending_requests?.length,
                                      },
                                      { id: "settings", label: "Settings" },
                                    ]
                                  : []),
                              ].map((tab) => (
                                <button
                                  key={tab.id}
                                  type="button"
                                  onClick={() => setModalSubTab(tab.id)}
                                  className={`pb-2.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
                                    modalSubTab === tab.id
                                      ? "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"
                                      : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400"
                                  }`}
                                >
                                  <span>{tab.label}</span>
                                  {tab.badge > 0 && (
                                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold text-white">
                                      {tab.badge}
                                    </span>
                                  )}
                                </button>
                              ))}
                            </div>

                            {/* Overview Sub-tab */}
                            {modalSubTab === "overview" && (
                              <div className="space-y-5 pt-2">
                                {groupOverview?.conversation_id && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigate(`/community/chat/${groupOverview.conversation_id}`);
                                      setSelectedGroupId(null);
                                    }}
                                    className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-button-primary"
                                  >
                                    <MessageSquare className="h-4 w-4" /> Open Group Chat
                                  </button>
                                )}

                                <div>
                                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                                    Top Members ({groupOverview?.rankings?.length || 0})
                                  </h3>
                                  <div className="space-y-1.5">
                                    {(groupOverview?.rankings || []).map((item, idx) => (
                                      <div
                                        key={item.user_id || idx}
                                        className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 dark:bg-[#18211f] shadow-surface"
                                      >
                                        <div className="flex items-center gap-3">
                                          <span className="w-5 text-center text-xs font-bold text-slate-400">
                                            #{idx + 1}
                                          </span>
                                          <Avatar src={item.user_img} name={item.full_name} username={item.username} size="xs" />
                                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                                            {item.full_name || item.username}
                                          </p>
                                        </div>
                                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                                          {item.xp_points || 0} XP
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Members Sub-tab */}
                            {modalSubTab === "members" && (
                              <div className="space-y-3 pt-2">
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                  {(groupOverview?.members || []).map((m) => (
                                    <div
                                      key={m.id}
                                      className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 dark:bg-[#18211f] shadow-surface"
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <Avatar
                                          src={m.profile?.user_img}
                                          name={m.profile?.full_name}
                                          username={m.profile?.username}
                                          size="sm"
                                        />
                                        <div className="min-w-0">
                                          <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                                            {m.profile?.full_name || m.profile?.username || "Member"}
                                          </p>
                                          <p className="text-[10px] text-slate-500">@{m.profile?.username || "user"}</p>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1.5">
                                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                          {m.role}
                                        </span>

                                        {groupOverview?.my_role === "owner" && m.user_id !== user?.id && (
                                          <div className="relative">
                                            <button
                                              type="button"
                                              onClick={() => setActiveMemberMenuId(activeMemberMenuId === m.id ? null : m.id)}
                                              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                            >
                                              <MoreVertical className="h-3.5 w-3.5" />
                                            </button>

                                            {activeMemberMenuId === m.id && (
                                              <div className="absolute right-0 top-full mt-1 z-30 w-32 rounded-xl bg-white p-1 shadow-overlay dark:bg-[#18211f]">
                                                {m.role === "member" ? (
                                                  <button
                                                    type="button"
                                                    onClick={() => groupActions.setRole(selectedGroupId, m.user_id, "admin").then(() => refetchOverview())}
                                                    className="w-full text-left px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 rounded-lg"
                                                  >
                                                    Promote Admin
                                                  </button>
                                                ) : (
                                                  <button
                                                    type="button"
                                                    onClick={() => groupActions.setRole(selectedGroupId, m.user_id, "member").then(() => refetchOverview())}
                                                    className="w-full text-left px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 rounded-lg"
                                                  >
                                                    Demote Member
                                                  </button>
                                                )}
                                                <button
                                                  type="button"
                                                  onClick={() => groupActions.removeMember(selectedGroupId, m.user_id, false).then(() => refetchOverview())}
                                                  className="w-full text-left px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg"
                                                >
                                                  Remove
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Sessions Sub-tab */}
                            {modalSubTab === "sessions" && (
                              <div className="pt-2">
                                <GroupStudySessions
                                  groupId={selectedGroupId}
                                  groupConversationId={groupOverview?.conversation_id}
                                  currentUserId={user?.id}
                                  onJoinSession={(sessionId) => {
                                    setOpenSessionId(sessionId);
                                    setSelectedGroupId(null);
                                  }}
                                />
                              </div>
                            )}

                            {/* Requests Sub-tab */}
                            {modalSubTab === "requests" && (
                              <div className="space-y-3 pt-2">
                                {(groupOverview?.pending_requests || []).length === 0 ? (
                                  <p className="py-6 text-center text-xs text-slate-500">
                                    No pending join requests right now.
                                  </p>
                                ) : (
                                  (groupOverview?.pending_requests || []).map((req) => (
                                    <div
                                      key={req.id}
                                      className="flex flex-col gap-2 rounded-xl bg-slate-50 p-3 dark:bg-[#18211f] shadow-surface"
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                          <Avatar
                                            src={req.profile?.user_img}
                                            name={req.profile?.full_name}
                                            username={req.profile?.username}
                                            size="sm"
                                          />
                                          <div>
                                            <p className="text-xs font-bold text-slate-900 dark:text-white">
                                              {req.profile?.full_name || req.profile?.username}
                                            </p>
                                            <p className="text-[10px] text-slate-400">@{req.profile?.username}</p>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() => handleDecideRequest(req.id, "accepted")}
                                            className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-button-primary"
                                          >
                                            <UserCheck className="h-3.5 w-3.5" /> Accept
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDecideRequest(req.id, "declined")}
                                            className="inline-flex items-center gap-1 rounded-xl bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                          >
                                            <UserX className="h-3.5 w-3.5" /> Decline
                                          </button>
                                        </div>
                                      </div>

                                      {req.message && (
                                        <p className="rounded-lg bg-white p-2.5 text-xs text-slate-600 dark:bg-[#14171c] dark:text-slate-300 shadow-inset-field">
                                          "{req.message}"
                                        </p>
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            )}

                            {/* Settings Sub-tab */}
                            {modalSubTab === "settings" && groupOverview?.my_role === "owner" && (
                              <div className="space-y-5 pt-2">
                                <form onSubmit={handleSaveSettings} className="space-y-3">
                                  <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Group Name</label>
                                    <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full rounded-xl bg-slate-50 p-2.5 text-xs text-slate-900 shadow-inset-field focus:shadow-focus dark:bg-[#18211f] dark:text-white" required />
                                  </div>

                                  <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                                    <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={2} className="w-full rounded-xl bg-slate-50 p-2.5 text-xs text-slate-900 shadow-inset-field focus:shadow-focus dark:bg-[#18211f] dark:text-white" />
                                  </div>

                                  <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Privacy</label>
                                    <select value={editPrivacy} onChange={(e) => setEditPrivacy(e.target.value)} className="w-full rounded-xl bg-slate-50 p-2.5 text-xs text-slate-900 shadow-inset-field dark:bg-[#18211f] dark:text-white">
                                      <option value="public">Public (anyone can join)</option>
                                      <option value="private">Private (requires owner approval)</option>
                                    </select>
                                  </div>

                                  <div className="pt-2 flex justify-end">
                                    <button type="submit" className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-button-primary hover:bg-emerald-700">Save Group Settings</button>
                                  </div>
                                </form>

                                <div className="border-t border-rose-200/50 pt-4 space-y-3 dark:border-rose-900/40">
                                  <p className="text-xs font-bold text-rose-600">Danger Zone: Delete Group</p>
                                  <p className="text-[11px] text-slate-500">Type "<strong>{groupOverview.group.name}</strong>" below to delete this group and all member data.</p>
                                  <input value={deleteConfirmName} onChange={(e) => setDeleteConfirmName(e.target.value)} placeholder="Type group name to confirm..." className="w-full rounded-xl bg-rose-50/50 p-2.5 text-xs text-slate-900 shadow-inset-field dark:bg-rose-950/20 dark:text-white" />
                                  <button type="button" onClick={handleDeleteGroup} disabled={deleteConfirmName !== groupOverview.group.name} className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 py-2 text-xs font-bold text-white disabled:opacity-40 hover:bg-rose-700">
                                    <Trash2 className="h-3.5 w-3.5" /> Delete Study Group
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Request Join Sheet Modal */}
                  {requestTargetGroup && (
                    <RequestJoinModal
                      isOpen={Boolean(requestTargetGroup)}
                      onClose={() => setRequestTargetGroup(null)}
                      groupName={requestTargetGroup.name}
                      submitting={groupActions.submitting}
                      onSubmit={handleSendJoinRequest}
                    />
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
                  <form onSubmit={handleSearchUsers} className="rounded-2xl bg-white p-4 shadow-surface dark:bg-[#14171c]">
                    <p className="text-sm font-bold text-slate-900 dark:text-white mb-2">Find People</p>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search by username or full name..."
                          className="w-full rounded-2xl bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none shadow-inset-field focus:shadow-focus dark:bg-[#18211f] dark:text-white"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={searchLoading}
                        className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-button-primary hover:bg-emerald-700 disabled:opacity-50"
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
                                <Avatar src={p.user_img} name={p.full_name} username={p.username} size="sm" />
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
                                <button type="button" onClick={() => sendFriendRequest(p.user_id)} className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-button-primary hover:bg-emerald-700">Add friend</button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </form>

                  {friendsLoading ? (
                    <div className="flex min-h-[250px] flex-col items-center justify-center rounded-2xl bg-white p-8 shadow-surface dark:bg-[#14171c]">
                      <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {pendingIncoming.length > 0 && (
                        <div className="rounded-2xl bg-amber-50/60 p-5 shadow-surface dark:bg-amber-950/20">
                          <p className="text-sm font-bold text-amber-900 dark:text-amber-200 mb-3">Pending Requests ({pendingIncoming.length})</p>
                          <div className="space-y-3">
                            {pendingIncoming.map((req) => {
                              const prof = friendProfiles[req.requester_id];
                              return (
                                <div key={req.id} className="flex items-center justify-between rounded-xl bg-white p-3 shadow-surface dark:bg-[#14171c]">
                                  <div className="flex items-center gap-3">
                                    <Avatar src={prof?.user_img} name={prof?.full_name} username={prof?.username} size="sm" />
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{prof?.full_name || prof?.username}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button type="button" onClick={() => updateFriendshipStatus(req.id, "accepted")} className="rounded-2xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-button-primary">Accept</button>
                                    <button type="button" onClick={() => updateFriendshipStatus(req.id, "declined")} className="rounded-2xl bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">Decline</button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="rounded-2xl bg-white p-5 shadow-surface dark:bg-[#14171c]">
                        <p className="text-base font-bold text-slate-900 dark:text-white mb-4">My Friends ({acceptedFriends.length})</p>
                        {acceptedFriends.length === 0 ? (
                          <p className="text-xs text-slate-500 py-4 text-center">No friends added yet.</p>
                        ) : (
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {acceptedFriends.map((f) => {
                              const otherId = f.requester_id === user?.id ? f.addressee_id : f.requester_id;
                              const prof = friendProfiles[otherId];

                              return (
                                <div key={f.id} className="flex items-center justify-between rounded-2xl bg-slate-50/60 p-3.5 dark:bg-[#18211f] shadow-surface">
                                  <div className="flex items-center gap-3">
                                    <Avatar src={prof?.user_img} name={prof?.full_name} username={prof?.username} size="sm" />
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
                                      className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-button-primary hover:bg-emerald-700"
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
                <div
                  className={
                    isMaximized
                      ? "fixed inset-0 z-[120] bg-white dark:bg-[#14171c] h-[100dvh] w-screen flex flex-col p-2 sm:p-4 pb-safe pt-safe overflow-hidden"
                      : "w-full h-[calc(100dvh-16rem)] min-h-[500px] overflow-hidden rounded-2xl bg-white shadow-surface dark:bg-[#14171c] min-w-0 flex flex-col"
                  }
                >
                  <div className="hidden md:flex h-full w-full bg-white dark:bg-[#14171c] overflow-hidden min-w-0">
                    <div className="w-80 shrink-0 border-r border-slate-100 dark:border-slate-800 h-full overflow-hidden flex flex-col min-w-0">
                      <ChatInbox
                        currentUserId={user?.id}
                        onSelectConversation={(convId) => navigate(`/Community/chat/${convId}`)}
                        onFindFriends={() => setActiveTab("friends")}
                        headerAction={renderMaximizeButton()}
                      />
                    </div>
                    <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
                      {activeConversationId ? (
                        <ChatThread
                          conversationId={activeConversationId}
                          currentUserId={user?.id}
                          onBack={() => navigate("/Community/chat")}
                          headerAction={renderMaximizeButton()}
                        />
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center p-8 text-center bg-slate-50/50 dark:bg-[#18211f]/30 relative">
                          <div className="absolute top-4 right-4 z-10">
                            {renderMaximizeButton()}
                          </div>
                          <MessageSquare className="h-10 w-10 text-slate-300 dark:text-slate-700" />
                          <h3 className="mt-3 text-sm font-medium text-slate-800 dark:text-slate-200">
                            Select a conversation or start a new chat
                          </h3>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                            Choose a chat from the left panel or start a new chat with a friend.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="block md:hidden h-full w-full overflow-hidden min-w-0">
                    {activeConversationId ? (
                      <div className="h-full w-full min-w-0 flex flex-col overflow-hidden">
                        <ChatThread
                          conversationId={activeConversationId}
                          currentUserId={user?.id}
                          onBack={() => navigate("/Community/chat")}
                          headerAction={renderMaximizeButton()}
                        />
                      </div>
                    ) : (
                      <div className="h-full w-full min-w-0 flex flex-col overflow-hidden">
                        <ChatInbox
                          currentUserId={user?.id}
                          onSelectConversation={(convId) => navigate(`/Community/chat/${convId}`)}
                          onFindFriends={() => setActiveTab("friends")}
                          headerAction={renderMaximizeButton()}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Live Session Room Overlay */}
            {openSessionId && (
              <SessionRoom
                sessionId={openSessionId}
                groupConversationId={groupOverview?.conversation_id}
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
