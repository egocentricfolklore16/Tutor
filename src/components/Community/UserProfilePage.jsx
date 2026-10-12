import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Shield,
  Zap,
  Award,
  MessageSquare,
  UserPlus,
  Star,
  BookOpen,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Send,
  Check,
  X,
  Clock,
} from "lucide-react";
import supabase from "../../lib/supabase";
import Avatar from "../common/Avatar";
import PageContainer from "../common/PageContainer";

export default function UserProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [currentUserId, setCurrentUserId] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [tutorProfile, setTutorProfile] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [friendshipStatus, setFriendshipStatus] = useState(null); // null | 'none' | 'pending' | 'accepted'

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  // Tutor request modal state
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [reqSubject, setReqSubject] = useState("");
  const [reqTopic, setReqTopic] = useState("");
  const [reqMessage, setReqMessage] = useState("");
  const [requestSending, setRequestSending] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!userId) return;
      setLoading(true);
      setErrorMsg(null);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (isMounted) setCurrentUserId(user?.id || null);

        // 1. Fetch public profile
        let profileObj = null;
        const { data: pubData, error: pubErr } = await supabase.rpc("get_public_profile", {
          p_user_id: userId,
        });

        if (!pubErr && pubData) {
          profileObj = pubData;
        } else {
          // Fallback to community_profiles
          const { data: cpData, error: cpErr } = await supabase
            .from("community_profiles")
            .select("*")
            .eq("user_id", userId)
            .maybeSingle();

          if (cpErr) throw cpErr;
          profileObj = cpData;
        }

        if (!profileObj) {
          throw new Error("User profile not found.");
        }

        if (isMounted) setUserProfile(profileObj);

        // 2. Fetch tutor profile
        const { data: tutorData } = await supabase
          .from("peer_tutor_profiles")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        if (isMounted) setTutorProfile(tutorData || null);

        // 3. Fetch achievements
        const { data: achData } = await supabase.rpc("get_achievements", {
          p_user_id: userId,
        });

        if (isMounted) setAchievements(achData || []);

        // 4. Check friendship status if logged in and not self
        if (user && user.id !== userId) {
          const { data: fsRows } = await supabase
            .from("friendships")
            .select("*")
            .or(`and(requester_id.eq.${user.id},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${user.id})`);

          if (fsRows && fsRows.length > 0) {
            const fs = fsRows[0];
            if (fs.status === "accepted") setFriendshipStatus("accepted");
            else setFriendshipStatus("pending");
          } else {
            setFriendshipStatus("none");
          }
        }
      } catch (err) {
        console.error("Error loading user profile:", err);
        if (isMounted) setErrorMsg(err.message || "Failed to load user profile.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const handleStartChat = async () => {
    if (!currentUserId || !userId) return;
    try {
      const { data: convId, error } = await supabase.rpc(
        "get_or_create_direct_conversation",
        { p_other_user_id: userId }
      );
      if (error) throw error;
      navigate(`/community/chat/${convId}`);
    } catch (err) {
      console.error("Error starting conversation:", err);
    }
  };

  const handleSendFriendRequest = async () => {
    if (!currentUserId || !userId) return;
    try {
      const { error } = await supabase.from("friendships").insert({
        requester_id: currentUserId,
        addressee_id: userId,
        status: "pending",
      });
      if (error && !error.message?.includes("duplicate")) throw error;
      setFriendshipStatus("pending");
    } catch (err) {
      console.error("Error sending friend request:", err);
    }
  };

  const handleSendTutorRequest = async (e) => {
    e.preventDefault();
    if (!currentUserId || !userId || !reqSubject || !reqTopic) return;
    setRequestSending(true);

    try {
      const { error } = await supabase.rpc("request_tutor", {
        p_tutor_id: userId,
        p_subject: reqSubject,
        p_topic: reqTopic,
        p_message: reqMessage,
      });

      if (error) throw error;

      setRequestSuccess(true);
      setTimeout(() => {
        setShowRequestModal(false);
        setRequestSuccess(false);
        setReqSubject("");
        setReqTopic("");
        setReqMessage("");
      }, 1500);
    } catch (err) {
      console.error("Error requesting tutor:", err);
    } finally {
      setRequestSending(false);
    }
  };

  if (loading) {
    return (
      <PageContainer maxWidth="max-w-4xl">
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-[#14171c]">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="mt-3 text-sm text-slate-500">Loading user profile...</p>
        </div>
      </PageContainer>
    );
  }

  if (errorMsg || !userProfile) {
    return (
      <PageContainer maxWidth="max-w-4xl">
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center dark:border-rose-900/40 dark:bg-rose-950/20">
          <AlertCircle className="h-10 w-10 text-rose-600" />
          <p className="mt-3 text-base font-bold text-rose-900 dark:text-rose-200">{errorMsg || "User profile not found."}</p>
          <button
            type="button"
            onClick={() => navigate("/community")}
            className="mt-4 rounded-2xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700"
          >
            Back to Community
          </button>
        </div>
      </PageContainer>
    );
  }

  const isSelf = currentUserId === userId;
  const earnedBadges = achievements.filter((a) => a.earned);

  return (
    <PageContainer maxWidth="max-w-4xl">
      {/* Top Bar / Back button */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1.5 rounded-2xl bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Main Profile Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#14171c] sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar
              src={userProfile.user_img}
              name={userProfile.full_name}
              username={userProfile.username}
              size="xl"
              level={userProfile.level || 1}
            />

            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
                {userProfile.full_name || "Learner"}
              </h1>
              {userProfile.username && (
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  @{userProfile.username}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <Zap className="h-4 w-4 fill-current" />
                  {userProfile.xp_points || 0} XP
                </span>
                <span>·</span>
                <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400">
                  <Shield className="h-4 w-4" />
                  Level {userProfile.level || 1}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons for other users */}
          {!isSelf && currentUserId && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleStartChat}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Message</span>
              </button>

              {friendshipStatus === "none" && (
                <button
                  type="button"
                  onClick={handleSendFriendRequest}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Add Friend</span>
                </button>
              )}

              {friendshipStatus === "pending" && (
                <span className="rounded-2xl bg-amber-100 px-3.5 py-2 text-xs font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  Request Pending
                </span>
              )}

              {friendshipStatus === "accepted" && (
                <span className="rounded-2xl bg-emerald-100 px-3.5 py-2 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Friends
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Badges / Achievements Row */}
      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#14171c]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Earned Badges ({earnedBadges.length})
            </h2>
          </div>

          <button
            type="button"
            onClick={() => navigate("/community/achievements")}
            className="text-xs font-bold text-emerald-600 hover:underline dark:text-emerald-400"
          >
            See all
          </button>
        </div>

        {earnedBadges.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            No achievement badges unlocked yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {earnedBadges.slice(0, 4).map((badge) => (
              <div
                key={badge.id}
                className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-[#18211f]"
              >
                <span className="text-2xl">{badge.icon || "🏆"}</span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                    {badge.title}
                  </p>
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                    +{badge.xp_reward || 0} XP
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Peer Tutor Card if available */}
      {tutorProfile && (
        <div className="mt-6 rounded-3xl border border-emerald-300/60 bg-emerald-50/30 p-6 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-1 rounded-2xl bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white mb-2">
                <BookOpen className="h-3.5 w-3.5" /> Peer Tutor
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                {tutorProfile.headline || "Available for Peer Tutoring"}
              </h2>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 max-w-xl">
                {tutorProfile.about || "Offers help in academic subjects to study peers."}
              </p>

              {/* Subjects offered chips */}
              {Array.isArray(tutorProfile.subjects_offered) && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {tutorProfile.subjects_offered.map((s) => (
                    <span
                      key={s}
                      className="rounded-xl bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}

              {/* Tutor stats */}
              <div className="mt-4 flex items-center gap-4 text-xs font-bold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1 text-amber-500">
                  <Star className="h-4 w-4 fill-current" />
                  {tutorProfile.rating_avg ? tutorProfile.rating_avg.toFixed(1) : "5.0"} (
                  {tutorProfile.rating_count || 0})
                </span>
                <span>·</span>
                <span>{tutorProfile.sessions_helped || 0} sessions helped</span>
              </div>
            </div>

            {!isSelf && tutorProfile.is_available && (
              <button
                type="button"
                onClick={() => {
                  setReqSubject(tutorProfile.subjects_offered?.[0] || "");
                  setShowRequestModal(true);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-xs font-bold text-white hover:bg-emerald-700 shrink-0"
              >
                <Send className="h-4 w-4" />
                <span>Request Help</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tutor Request Sheet / Modal */}
      {showRequestModal && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs"
          onClick={() => setShowRequestModal(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#14171c]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Request Help from {userProfile.full_name}
              </h3>
              <button
                type="button"
                onClick={() => setShowRequestModal(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {requestSuccess ? (
              <div className="py-6 text-center">
                <Check className="mx-auto h-10 w-10 text-emerald-600" />
                <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                  Request sent!
                </p>
                <p className="text-xs text-slate-500">
                  You'll get a notification when they respond.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendTutorRequest} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Subject
                  </label>
                  <select
                    value={reqSubject}
                    onChange={(e) => setReqSubject(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-[#18211f] dark:text-white"
                    required
                  >
                    {(tutorProfile?.subjects_offered || ["General Study"]).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Topic / Concept
                  </label>
                  <input
                    type="text"
                    value={reqTopic}
                    onChange={(e) => setReqTopic(e.target.value)}
                    placeholder="e.g. Integration by parts"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-[#18211f] dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Short Message
                  </label>
                  <textarea
                    value={reqMessage}
                    onChange={(e) => setReqMessage(e.target.value)}
                    placeholder="Describe what you need help understanding..."
                    rows={3}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-[#18211f] dark:text-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRequestModal(false)}
                    className="rounded-2xl bg-slate-200 px-4 py-2 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={requestSending}
                    className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {requestSending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    <span>Send Request</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </PageContainer>
  );
}
