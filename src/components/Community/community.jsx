import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation, useParams, Routes, Route } from "react-router-dom";
import {
  Users,
  Trophy,
  Search,
  Plus,
  Globe,
  Lock,
  Loader2,
  Shield,
  BookOpen,
  Sparkles,
  ChevronRight,
  MessageSquare,
  HelpCircle,
  Clock,
  Maximize2,
  Minimize2,
  CheckCircle,
} from "lucide-react";
import supabase from "../../lib/supabase";
import { useProfile } from "../../app/ProfileContext";
import { getCollaborationInfo } from "../../lib/collaboration";
import { getUserSubjectsList } from "../../lib/userSubjects.js";
import PageContainer from "../common/PageContainer";

import ChatInbox from "./ChatInbox";
import ChatThread from "./ChatThread";
import SessionRoom from "./SessionRoom";
import RequestJoinModal from "./RequestJoinModal";

import ChooseUsernameCard from "./ChooseUsernameCard";
import UserProfilePage from "./UserProfilePage";
import StudyRoomsLobby from "./StudyRoomsLobby";
import VirtualStudyRoom from "./VirtualStudyRoom";
import HelpForum from "./HelpForum";
import ForumPostDetail from "./ForumPostDetail";
import PeerTutors from "./PeerTutors";
import AchievementsPage from "./AchievementsPage";
import { LeaderboardTab } from "../../features/community";

import { useFriends } from "../../features/community/hooks/useFriends";
import { useGroups } from "../../features/community/hooks/useGroups";
import {
  createGroup,
  updateGroupDetails,
  deleteGroup,
} from "../../features/community/services/groupsService";
import FriendList from "../../features/community/components/friends/FriendList";
import PendingRequests from "../../features/community/components/friends/PendingRequests";
import UserSearch from "../../features/community/components/friends/UserSearch";
import GroupCard from "../../features/community/components/groups/GroupCard";
import CreateGroupModal from "../../features/community/components/groups/CreateGroupModal";
import GroupDetail from "../../features/community/components/groups/GroupDetail";
import { ActivityFeed } from "../../features/community/components/feed/ActivityFeed";

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

  useEffect(() => {
    if (pathLower.includes("/chat")) setActiveTab("chat");
    else if (pathLower.includes("/rooms")) setActiveTab("rooms");
    else if (pathLower.includes("/help")) setActiveTab("help");
    else if (pathLower.includes("/tutors")) setActiveTab("tutors");
    else if (pathLower.includes("/leaderboard")) setActiveTab("leaderboard");
    else if (pathLower.includes("/friends")) setActiveTab("friends");
    else if (pathLower.includes("/feed")) setActiveTab("feed");
    else if (pathLower.includes("/groups")) setActiveTab("groups");
  }, [pathLower]);

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
  const [selectedPrivacy, setSelectedPrivacy] = useState("all");
  const [selectedGroupId, setSelectedGroupId] = useState(null);

  const {
    exploreGroups,
    exploreLoading,
    refetchExplore,
    myGroups,
    refetchMyGroups,
    myGroupInvites,
    refetchMyGroupInvites,
    groupOverview,
    overviewLoading,
    refetchOverview,
    groupActions,
  } = useGroups(user?.id, {
    search: groupSearch,
    subject: "all",
    privacy: selectedPrivacy,
    selectedGroupId,
  });

  // Create Group State
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [createGroupLoading, setCreateGroupLoading] = useState(false);

  // Request Join Modal State
  const [requestTargetGroup, setRequestTargetGroup] = useState(null);

  // Toast Notification
  const [toastMsg, setToastMsg] = useState(null);
  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleCreateGroup = async ({ name, description, subject, privacy }) => {
    if (!user) return;
    setCreateGroupLoading(true);
    try {
      await createGroup({
        userId: user.id,
        name,
        description,
        subject,
        privacy,
      });

      setShowCreateGroup(false);
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
      } catch {
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
    } catch {
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
    } catch {
      showToast("Failed to process request.");
    }
  };

  const handleSaveSettings = async ({ name, description, privacy }) => {
    if (!selectedGroupId || !name.trim()) return;

    try {
      await updateGroupDetails(selectedGroupId, { name, description, privacy });

      showToast("Group settings saved.");
      refetchOverview();
      refetchExplore();
      refetchMyGroups();
    } catch (err) {
      console.error("Error updating group settings:", err);
      showToast("Failed to save settings.");
    }
  };

  const handleDeleteGroup = async (confirmName) => {
    if (!selectedGroupId || confirmName !== groupOverview?.group?.name) return;
    try {
      await deleteGroup(selectedGroupId);
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
  // FRIENDS LOGIC VIA USEFRIENDS HOOK
  // ==========================================
  const {
    friendships,
    loading: friendsLoading,
    searchQuery,
    searchResults,
    searchLoading,
    search: searchFriends,
    sendFriendRequest,
    updateStatus: updateFriendshipStatus,
    removeFriendship,
  } = useFriends(user?.id);

  const acceptedFriends = friendships.filter((f) => f.status === "accepted");
  const pendingIncoming = friendships.filter((f) => f.status === "pending" && f.addressee_id === user?.id);

  const userSubjects = useMemo(() => getUserSubjectsList(profile), [profile]);

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
            <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-emerald-600 p-6 text-white shadow-surface hover:shadow-surface-hover transition dark:border-white/5 dark:bg-[#18211f] dark:bg-gradient-to-br dark:from-emerald-500/10 dark:via-transparent dark:to-transparent dark:hover:border-emerald-500/30 sm:p-8">
              <div className="absolute -right-5 -top-8 text-white/20 dark:text-emerald-400/20 pointer-events-none">
                <Users size={160} />
              </div>
              <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-white/90 dark:text-emerald-400" />
                    <p className="text-xs font-bold uppercase tracking-wide text-white/90 dark:text-emerald-400">
                      Community Hub
                    </p>
                  </div>
                  <h1 className="mt-3 text-3xl font-black tracking-tight text-white dark:text-white sm:text-4xl">
                    Learn Together, Grow Faster
                  </h1>
                  <p className="mt-2 text-base text-emerald-100 dark:text-gray-400 max-w-2xl leading-relaxed">
                    Connect with study partners, join virtual rooms, ask help questions, and compete on leaderboards.
                  </p>
                </div>

                {collaborationInfo && (
                  <div className="flex shrink-0 items-center gap-3 rounded-2xl bg-white/10 border border-white/20 p-4 text-xs dark:bg-emerald-950/40 dark:border-emerald-500/20 text-white dark:text-emerald-200 shadow-surface max-w-xs backdrop-blur-xs">
                    <Sparkles className="h-5 w-5 text-white dark:text-emerald-400 shrink-0" />
                    <div>
                      <span className="font-bold text-white dark:text-emerald-100 block">
                        {collaborationInfo.badge}
                      </span>
                      <span className="text-emerald-100 dark:text-gray-300 mt-0.5 block">
                        {collaborationInfo.description}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation Sub-Tabs Segmented Bar */}
              <div className="relative mt-8 flex w-full gap-1.5 overflow-x-auto no-scrollbar rounded-2xl bg-white/10 p-1.5 dark:bg-[#18211f]/80 border border-white/10 dark:border-white/5 backdrop-blur-xs">
                {[
                  { id: "feed", label: "Activity Feed", icon: Sparkles, path: "/community/feed" },
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
                          : "text-white/80 hover:bg-white/20 hover:text-white dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
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
              {/* ACTIVITY FEED TAB */}
              {activeTab === "feed" && (
                <ActivityFeed
                  currentUserId={user?.id}
                  onUserClick={(userId) => navigate(`/community/u/${userId}`)}
                />
              )}

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
                  <CreateGroupModal
                    isOpen={showCreateGroup}
                    onClose={() => setShowCreateGroup(false)}
                    onCreateGroup={handleCreateGroup}
                    loading={createGroupLoading}
                    userSubjects={userSubjects}
                  />

                  {/* Group Invitations Section */}
                  {myGroupInvites?.length > 0 && (
                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 shadow-surface dark:border-amber-500/30">
                      <p className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                        <Users className="h-4 w-4 text-amber-500" /> Pending Group Invitations ({myGroupInvites.length})
                      </p>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {myGroupInvites.map((inv) => (
                          <div
                            key={inv.id}
                            className="flex items-center justify-between rounded-xl bg-white p-3 shadow-surface dark:bg-[#18211f]"
                          >
                            <div className="min-w-0 pr-2">
                              <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                                {inv.group?.name || "Study Group"}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                Invited by @{inv.inviter?.username || "classmate"}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={async () => {
                                  await groupActions.respondToInvite(inv.id, "accepted");
                                  showToast("Joined study group!");
                                  refetchMyGroupInvites();
                                  refetchMyGroups();
                                  refetchExplore();
                                }}
                                className="rounded-xl bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700 shadow-button-primary transition"
                              >
                                Accept
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  await groupActions.respondToInvite(inv.id, "declined");
                                  showToast("Invitation declined.");
                                  refetchMyGroupInvites();
                                }}
                                className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 transition"
                              >
                                Decline
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
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
                              onClick={() => setSelectedGroupId(grp.id)}
                              className="relative overflow-hidden cursor-pointer rounded-2xl border border-teal-500/20 bg-teal-600 p-4 text-white shadow-surface hover:shadow-surface-hover transition dark:border-white/5 dark:bg-[#18211f] dark:bg-gradient-to-br dark:from-teal-500/10 dark:via-transparent dark:to-transparent dark:hover:border-teal-500/30"
                            >
                              <div className="absolute -right-5 -top-8 text-white/20 dark:text-teal-400/20 pointer-events-none">
                                <Users size={120} />
                              </div>
                              <div className="relative">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <Users className="h-4 w-4 text-white/90 dark:text-teal-400" />
                                    <span className="inline-flex items-center gap-1 rounded-2xl bg-white/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white dark:bg-teal-950 dark:text-teal-300">
                                      {grp.subject}
                                    </span>
                                  </div>
                                  {grp.privacy === "public" ? <Globe className="h-4 w-4 text-white/80 dark:text-slate-400" /> : <Lock className="h-4 w-4 text-amber-300 dark:text-amber-500" />}
                                </div>
                                <h3 className="mt-2 text-base font-bold text-white dark:text-white">{grp.name}</h3>
                                <p className="mt-1 text-xs text-teal-100 dark:text-gray-400 line-clamp-2 leading-relaxed">{grp.description || "No description provided."}</p>
                                <div className="mt-4 flex items-center justify-between text-xs font-bold text-white dark:text-teal-400">
                                  <span>{grp.member_count || 1} members</span>
                                  <span className="inline-flex items-center gap-1 hover:underline">
                                    Open Group <ChevronRight className="h-4 w-4" />
                                  </span>
                                </div>
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
                        {exploreGroups.map((grp) => (
                          <GroupCard
                            key={grp.id}
                            group={grp}
                            onOpenGroup={(grpId) => setSelectedGroupId(grpId)}
                            onRequestJoin={handleJoinOrRequest}
                            onCancelRequest={(reqId) => groupActions.cancelRequest(reqId).then(() => refetchExplore())}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Group Detail Modal */}
                  {selectedGroupId && (
                    <GroupDetail
                      acceptedFriends={acceptedFriends}
                      groupId={selectedGroupId}
                      groupOverview={groupOverview}
                      overviewLoading={overviewLoading}
                      currentUserId={user?.id}
                      onClose={() => setSelectedGroupId(null)}
                      onOpenChat={(convId) => {
                        navigate(`/community/chat/${convId}`);
                        setSelectedGroupId(null);
                      }}
                      onJoinSession={(sessionId) => {
                        setOpenSessionId(sessionId);
                        setSelectedGroupId(null);
                      }}
                      onRequestJoinClick={(grp) => {
                        setSelectedGroupId(null);
                        setRequestTargetGroup(grp);
                      }}
                      onDecideRequest={handleDecideRequest}
                      onSaveSettings={handleSaveSettings}
                      onDeleteGroup={handleDeleteGroup}
                      groupActions={groupActions}
                      refetchOverview={refetchOverview}
                    />
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
                  <UserSearch
                    searchQuery={searchQuery}
                    onSearchChange={searchFriends}
                    onSearchSubmit={(e) => {
                      e.preventDefault();
                      searchFriends(searchQuery);
                    }}
                    searchResults={searchResults}
                    searchLoading={searchLoading}
                    friendships={friendships}
                    currentUserId={user?.id}
                    onSendRequest={sendFriendRequest}
                    onCancelRequest={removeFriendship}
                    onAcceptRequest={(reqId) => updateFriendshipStatus(reqId, "accepted")}
                    onDeclineRequest={(reqId) => updateFriendshipStatus(reqId, "declined")}
                  />

                  {friendsLoading ? (
                    <div className="flex min-h-[250px] flex-col items-center justify-center rounded-2xl bg-white p-8 shadow-surface dark:bg-[#14171c]">
                      <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <PendingRequests
                        requests={pendingIncoming}
                        onAccept={(reqId) => updateFriendshipStatus(reqId, "accepted")}
                        onDecline={(reqId) => updateFriendshipStatus(reqId, "declined")}
                      />

                      <div className="rounded-2xl bg-white p-5 shadow-surface dark:bg-[#14171c]">
                        <p className="text-base font-bold text-slate-900 dark:text-white mb-4">
                          My Friends ({acceptedFriends.length})
                        </p>
                        <FriendList
                          friends={acceptedFriends}
                          currentUserId={user?.id}
                          onRemoveFriend={removeFriendship}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* CHAT TAB */}
              {activeTab === "chat" && (() => {
                const chatContent = (
                  <div
                    className={
                      isMaximized
                        ? "fixed inset-0 z-[3000] bg-white dark:bg-[#14171c] h-[100dvh] w-screen flex flex-col p-2 sm:p-4 pb-safe pt-safe overflow-hidden"
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
                );

                if (isMaximized) {
                  return createPortal(chatContent, document.body);
                }

                return chatContent;
              })()}
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
