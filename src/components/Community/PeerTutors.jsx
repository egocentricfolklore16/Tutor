import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Users,
  Clock,
  Star,
  Zap,
  Send,
  UserPlus,
  Check,
  X,
  MessageSquare,
  Loader2,
  AlertCircle,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Smile,
  ChevronRight,
} from "lucide-react";
import supabase from "../../lib/supabase";
import Avatar from "../common/Avatar";

export default function PeerTutors({ user, userSubjects = [] }) {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("tutors"); // 'tutors' | 'partners' | 'requests' | 'become'

  // Sub-state: Find Tutor
  const [tutorSubject, setTutorSubject] = useState("Any");
  const [tutorMatches, setTutorMatches] = useState([]);
  const [tutorsLoading, setTutorsLoading] = useState(false);

  // Tutor Request Sheet Modal
  const [requestTarget, setRequestTarget] = useState(null); // tutor match obj
  const [reqSubject, setReqSubject] = useState("");
  const [reqTopic, setReqTopic] = useState("");
  const [reqMessage, setReqMessage] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);

  // Sub-state: Study Partners
  const [partnerSubject, setPartnerSubject] = useState("Any");
  const [partnerMatches, setPartnerMatches] = useState([]);
  const [partnersLoading, setPartnersLoading] = useState(false);
  const [sentFriendReqs, setSentFriendReqs] = useState(new Set());

  // Sub-state: My Requests
  const [myRequests, setMyRequests] = useState([]);
  const [requestProfilesMap, setRequestProfilesMap] = useState({});

  // Rating Sheet Modal for requester
  const [ratingTarget, setRatingTarget] = useState(null); // request obj
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingFeedback, setRatingFeedback] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);

  // Sub-state: Become a Tutor
  const [isAvailable, setIsAvailable] = useState(true);
  const [headline, setHeadline] = useState("");
  const [about, setAbout] = useState("");
  const [offeredSubjects, setOfferedSubjects] = useState(userSubjects);
  const [subjectInput, setSubjectInput] = useState("");
  const [savingTutorProfile, setSavingTutorProfile] = useState(false);

  // Fetch Tutor Matches
  const fetchTutorMatches = useCallback(async () => {
    setTutorsLoading(true);
    try {
      const subjParam = tutorSubject === "Any" ? null : tutorSubject;
      const { data, error } = await supabase.rpc("find_peer_matches", {
        p_mode: "tutor",
        p_subject: subjParam,
        p_limit: 20,
      });

      if (error) throw error;
      setTutorMatches(data || []);
    } catch (err) {
      console.error("Error fetching tutor matches:", err);
    } finally {
      setTutorsLoading(false);
    }
  }, [tutorSubject]);

  // Fetch Partner Matches
  const fetchPartnerMatches = useCallback(async () => {
    setPartnersLoading(true);
    try {
      const subjParam = partnerSubject === "Any" ? null : partnerSubject;
      const { data, error } = await supabase.rpc("find_peer_matches", {
        p_mode: "partner",
        p_subject: subjParam,
        p_limit: 20,
      });

      if (error) throw error;
      setPartnerMatches(data || []);
    } catch (err) {
      console.error("Error fetching partner matches:", err);
    } finally {
      setPartnersLoading(false);
    }
  }, [partnerSubject]);

  // Fetch My Requests & merge profiles client-side
  const fetchMyRequests = useCallback(async () => {
    if (!user) return;
    try {
      const { data: rows, error } = await supabase
        .from("match_requests")
        .select("*")
        .or(`requester_id.eq.${user.id},tutor_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const items = rows || [];
      setMyRequests(items);

      // Collect foreign user_ids
      const userIds = Array.from(
        new Set(items.flatMap((r) => [r.requester_id, r.tutor_id]))
      );

      if (userIds.length > 0) {
        const profsList = await Promise.all(
          userIds.map(async (uid) => {
            const { data, error } = await supabase.rpc("get_public_profile", {
              p_user_id: uid,
            });
            if (error) return null;
            return { user_id: uid, ...data };
          })
        );

        const map = {};
        profsList.forEach((p) => {
          if (p) map[p.user_id] = p;
        });
        setRequestProfilesMap(map);
      }
    } catch (err) {
      console.error("Error fetching match requests:", err);
    }
  }, [user]);

  // Load user's own peer tutor profile
  const fetchOwnTutorProfile = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("peer_tutor_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setIsAvailable(data.is_available ?? true);
        setHeadline(data.headline || "");
        setAbout(data.about || "");
        if (Array.isArray(data.subjects_offered)) {
          setOfferedSubjects(data.subjects_offered);
        }
      }
    } catch (err) {
      console.error("Error loading tutor profile:", err);
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === "tutors") fetchTutorMatches();
    else if (activeTab === "partners") fetchPartnerMatches();
    else if (activeTab === "requests") fetchMyRequests();
    else if (activeTab === "become") fetchOwnTutorProfile();
  }, [activeTab, fetchTutorMatches, fetchPartnerMatches, fetchMyRequests, fetchOwnTutorProfile]);

  // Actions: Request Tutor
  const handleSendTutorRequest = async (e) => {
    e.preventDefault();
    if (!requestTarget || !reqSubject || !reqTopic) return;

    setSendingRequest(true);
    try {
      const { error } = await supabase.rpc("request_tutor", {
        p_tutor_id: requestTarget.user_id,
        p_subject: reqSubject,
        p_topic: reqTopic,
        p_message: reqMessage,
      });

      if (error) throw error;

      setRequestTarget(null);
      setReqSubject("");
      setReqTopic("");
      setReqMessage("");
      fetchTutorMatches();
    } catch (err) {
      console.error("Error sending tutor request:", err);
      alert(err.message || "Failed to send request.");
    } finally {
      setSendingRequest(false);
    }
  };

  // Actions: Add Partner Friend (handled gracefully if friendships is missing in live DB)
  const handleAddPartnerFriend = async (partnerUserId) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("friendships").insert({
        requester_id: user.id,
        addressee_id: partnerUserId,
        status: "pending",
      });

      if (error) {
        if (error.code === "23505" || error.message?.includes("duplicate")) {
          setSentFriendReqs((prev) => new Set(prev).add(partnerUserId));
          return;
        }
        console.warn("Friendship notice:", error.message);
      }

      setSentFriendReqs((prev) => new Set(prev).add(partnerUserId));
    } catch (err) {
      console.error("Error adding partner friend:", err);
      setSentFriendReqs((prev) => new Set(prev).add(partnerUserId));
    }
  };

  // Actions: Respond to match request (Accept / Decline)
  const handleRespondRequest = async (requestId, accept) => {
    try {
      const { data, error } = await supabase.rpc("respond_match_request", {
        p_request_id: requestId,
        p_accept: accept,
      });

      if (error) throw error;
      fetchMyRequests();

      if (accept && data?.conversation_id) {
        navigate(`/community/chat/${data.conversation_id}`);
      }
    } catch (err) {
      console.error("Error responding to request:", err);
    }
  };

  // Actions: Cancel request
  const handleCancelRequest = async (requestId) => {
    try {
      const { error } = await supabase.rpc("cancel_match_request", {
        p_request_id: requestId,
      });

      if (error) throw error;
      fetchMyRequests();
    } catch (err) {
      console.error("Error canceling request:", err);
    }
  };

  // Actions: Complete match request and rate
  const handleCompleteAndRate = async (e) => {
    e.preventDefault();
    if (!ratingTarget) return;

    setSubmittingRating(true);
    try {
      const { error } = await supabase.rpc("complete_match_request", {
        p_request_id: ratingTarget.id,
        p_rating: ratingStars,
        p_feedback: ratingFeedback.trim(),
      });

      if (error) throw error;

      setRatingTarget(null);
      setRatingFeedback("");
      fetchMyRequests();
    } catch (err) {
      console.error("Error completing match request:", err);
    } finally {
      setSubmittingRating(false);
    }
  };

  // Actions: Save Tutor Profile
  const handleSaveTutorProfile = async (e) => {
    e.preventDefault();
    if (!user || !headline.trim()) return;

    setSavingTutorProfile(true);
    try {
      const payload = {
        user_id: user.id,
        is_available: isAvailable,
        headline: headline.trim(),
        about: about.trim(),
        subjects_offered: offeredSubjects,
      };

      const { error } = await supabase
        .from("peer_tutor_profiles")
        .upsert(payload, { onConflict: "user_id" });

      if (error) throw error;

      fetchOwnTutorProfile();
      alert("Tutor profile updated successfully!");
    } catch (err) {
      console.error("Error saving tutor profile:", err);
      alert(err.message || "Failed to update profile.");
    } finally {
      setSavingTutorProfile(false);
    }
  };

  // Offered Subjects Helper
  const handleAddSubjectChip = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = subjectInput.trim();
      if (val && offeredSubjects.length < 10 && !offeredSubjects.includes(val)) {
        setOfferedSubjects([...offeredSubjects, val]);
        setSubjectInput("");
      }
    }
  };

  const handleRemoveSubjectChip = (s) => {
    setOfferedSubjects(offeredSubjects.filter((x) => x !== s));
  };

  const askedMeRequests = myRequests.filter((r) => r.tutor_id === user?.id);
  const iAskedRequests = myRequests.filter((r) => r.requester_id === user?.id);

  return (
    <div className="space-y-6">
      {/* Header Segmented Bar */}
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#14171c]">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            Peer Tutoring & Study Partners
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Connect with subject experts or study partners matched for your learning goals
          </p>
        </div>

        {/* Sub-segmented bar */}
        <div className="flex gap-1 overflow-x-auto no-scrollbar rounded-2xl bg-slate-100 p-1 dark:bg-[#18211f]">
          {[
            { id: "tutors", label: "Find a Tutor", icon: BookOpen },
            { id: "partners", label: "Study Partners", icon: Users },
            { id: "requests", label: "My Requests", icon: Clock },
            { id: "become", label: "Become a Tutor", icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition shrink-0 ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SUB-VIEW 1: FIND A TUTOR */}
      {activeTab === "tutors" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Filter Subject:
              </span>
              <select
                value={tutorSubject}
                onChange={(e) => setTutorSubject(e.target.value)}
                className="rounded-2xl border border-slate-200 bg-white py-1.5 px-3 text-xs font-bold text-slate-900 outline-none dark:border-slate-700 dark:bg-[#14171c] dark:text-white"
              >
                <option value="Any">Any Subject</option>
                {userSubjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {tutorsLoading ? (
            <div className="flex min-h-[250px] flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-[#14171c]">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          ) : tutorMatches.length === 0 ? (
            <div className="flex min-h-[250px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-[#14171c]">
              <BookOpen className="h-10 w-10 text-slate-300 dark:text-slate-700" />
              <p className="mt-3 text-base font-bold text-slate-800 dark:text-slate-200">
                No tutors for this subject yet
              </p>
              <p className="mt-1 text-xs text-slate-500 max-w-xs">
                Be the first to share your knowledge - become a peer tutor!
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("become")}
                className="mt-4 rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
              >
                Become a Tutor
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {tutorMatches.map((m) => (
                <div
                  key={m.user_id}
                  className="relative overflow-hidden flex flex-col justify-between rounded-2xl border border-amber-500/20 bg-amber-600 p-4 text-white shadow-surface hover:shadow-surface-hover transition dark:border-white/5 dark:bg-[#18211f] dark:bg-gradient-to-br dark:from-amber-500/10 dark:via-transparent dark:to-transparent dark:hover:border-amber-500/30"
                >
                  <div className="absolute -right-5 -top-8 text-white/20 dark:text-amber-400/20 pointer-events-none">
                    <BookOpen size={120} />
                  </div>

                  <div className="relative">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={m.user_img}
                          name={m.full_name}
                          username={m.username}
                          size="lg"
                          level={m.level}
                          userId={m.user_id}
                        />
                        <div>
                          <h3 className="text-base font-bold text-white dark:text-white">
                            {m.full_name || m.username || "Tutor"}
                          </h3>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-200 dark:text-amber-400">
                            <Star className="h-3.5 w-3.5 fill-current" />
                            <span>
                              {m.rating_avg ? m.rating_avg.toFixed(1) : "5.0"} (
                              {m.rating_count || 0})
                            </span>
                          </div>
                        </div>
                      </div>

                      {m.match_percent && (
                        <span className="rounded-2xl bg-white/20 px-2.5 py-1 text-[11px] font-black text-white dark:bg-amber-950 dark:text-amber-300">
                          {m.match_percent}% Match
                        </span>
                      )}
                    </div>

                    <p className="mt-3 text-xs text-amber-100 dark:text-gray-400 line-clamp-2 leading-relaxed">
                      {m.headline || "Available for peer study sessions."}
                    </p>

                    {/* Subjects offered chips */}
                    {Array.isArray(m.subjects_offered) && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {m.subjects_offered.map((s) => (
                          <span
                            key={s}
                            className="rounded-lg bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white dark:bg-amber-950/60 dark:text-amber-300"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Match reasons */}
                    {Array.isArray(m.reasons) && m.reasons.length > 0 && (
                      <div className="mt-2.5 space-y-1">
                        {m.reasons.map((r, idx) => (
                          <span
                            key={idx}
                            className="inline-block rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/90 dark:bg-slate-800 dark:text-slate-400 mr-1"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="relative mt-4 flex items-center justify-between border-t border-white/20 pt-3 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => navigate(`/community/u/${m.user_id}`)}
                      className="text-xs font-bold text-white dark:text-amber-400 hover:underline transition"
                    >
                      View Profile
                    </button>

                    {m.open_request ? (
                      <span className="rounded-2xl bg-white/20 px-3 py-1 text-xs font-bold text-white dark:bg-amber-950 dark:text-amber-300">
                        Request Sent
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setRequestTarget(m);
                          setReqSubject(m.subjects_offered?.[0] || userSubjects[0] || "General");
                        }}
                        className="inline-flex items-center gap-1.5 rounded-2xl bg-white px-3.5 py-1.5 text-xs font-bold text-amber-950 hover:bg-amber-50 dark:bg-amber-600 dark:text-white dark:hover:bg-amber-700 transition"
                      >
                        <Send className="h-3.5 w-3.5" /> Request Help
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-VIEW 2: STUDY PARTNERS */}
      {activeTab === "partners" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Filter Subject:
              </span>
              <select
                value={partnerSubject}
                onChange={(e) => setPartnerSubject(e.target.value)}
                className="rounded-2xl border border-slate-200 bg-white py-1.5 px-3 text-xs font-bold text-slate-900 outline-none dark:border-slate-700 dark:bg-[#14171c] dark:text-white"
              >
                <option value="Any">Any Subject</option>
                {userSubjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {partnersLoading ? (
            <div className="flex min-h-[250px] flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-[#14171c]">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          ) : partnerMatches.length === 0 ? (
            <div className="flex min-h-[250px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-[#14171c]">
              <Users className="h-10 w-10 text-slate-300 dark:text-slate-700" />
              <p className="mt-3 text-base font-bold text-slate-800 dark:text-slate-200">
                No study partners found
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {partnerMatches.map((m) => {
                const isSent = sentFriendReqs.has(m.user_id);

                return (
                  <div
                    key={m.user_id}
                    className="relative overflow-hidden flex flex-col justify-between rounded-2xl border border-amber-500/20 bg-amber-600 p-4 text-white shadow-surface hover:shadow-surface-hover transition dark:border-white/5 dark:bg-[#18211f] dark:bg-gradient-to-br dark:from-amber-500/10 dark:via-transparent dark:to-transparent dark:hover:border-amber-500/30"
                  >
                    <div className="absolute -right-5 -top-8 text-white/20 dark:text-amber-400/20 pointer-events-none">
                      <Users size={120} />
                    </div>

                    <div className="relative">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={m.user_img}
                            name={m.full_name}
                            username={m.username}
                            size="lg"
                            level={m.level}
                            userId={m.user_id}
                          />
                          <div>
                            <h3 className="text-base font-bold text-white dark:text-white">
                              {m.full_name || m.username || "Partner"}
                            </h3>
                            <p className="text-xs text-amber-100 dark:text-gray-400">Level {m.level || 1}</p>
                          </div>
                        </div>

                        {m.match_percent && (
                          <span className="rounded-2xl bg-white/20 px-2.5 py-1 text-[11px] font-black text-white dark:bg-amber-950 dark:text-amber-300">
                            {m.match_percent}% Shared
                          </span>
                        )}
                      </div>

                      {/* Shared subjects */}
                      {Array.isArray(m.shared_subjects) && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {m.shared_subjects.map((s) => (
                            <span
                              key={s}
                              className="rounded-lg bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white dark:bg-slate-800 dark:text-slate-300"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="relative mt-4 flex items-center justify-between border-t border-white/20 pt-3 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => navigate(`/community/u/${m.user_id}`)}
                        className="text-xs font-bold text-white dark:text-amber-400 hover:underline transition"
                      >
                        View Profile
                      </button>

                      {isSent ? (
                        <span className="rounded-2xl bg-white/20 px-3 py-1 text-xs font-bold text-white dark:bg-amber-950 dark:text-amber-300">
                          Request Sent
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddPartnerFriend(m.user_id)}
                          className="inline-flex items-center gap-1.5 rounded-2xl bg-white px-3.5 py-1.5 text-xs font-bold text-amber-950 hover:bg-amber-50 dark:bg-amber-600 dark:text-white dark:hover:bg-amber-700 transition"
                        >
                          <UserPlus className="h-3.5 w-3.5" /> Add Friend
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-VIEW 3: MY REQUESTS */}
      {activeTab === "requests" && (
        <div className="space-y-6">
          {/* Asked Me (As Tutor) */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#14171c]">
            <h3 className="text-base font-black text-slate-900 dark:text-white mb-4">
              Asked Me ({askedMeRequests.length})
            </h3>

            {askedMeRequests.length === 0 ? (
              <p className="text-xs text-slate-500">No incoming help requests.</p>
            ) : (
              <div className="space-y-3">
                {askedMeRequests.map((req) => {
                  const requester = requestProfilesMap[req.requester_id];
                  const isPending = req.status === "pending";
                  const isAccepted = req.status === "accepted";

                  return (
                    <div
                      key={req.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#18211f]"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={requester?.user_img}
                          name={requester?.full_name}
                          username={requester?.username}
                          size="md"
                          userId={req.requester_id}
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            {requester?.full_name || requester?.username || "Learner"}
                          </p>
                          <p className="text-[11px] text-emerald-600 font-bold">
                            Subject: {req.subject} ({req.topic || "General"})
                          </p>
                          {req.message && (
                            <p className="text-xs text-slate-600 dark:text-slate-300 italic mt-0.5">
                              "{req.message}"
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isPending && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleRespondRequest(req.id, true)}
                              className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                            >
                              <Check className="h-3.5 w-3.5" /> Accept
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRespondRequest(req.id, false)}
                              className="inline-flex items-center gap-1 rounded-xl bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            >
                              <X className="h-3.5 w-3.5" /> Decline
                            </button>
                          </>
                        )}

                        {isAccepted && req.conversation_id && (
                          <button
                            type="button"
                            onClick={() => navigate(`/community/chat/${req.conversation_id}`)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                          >
                            <MessageSquare className="h-3.5 w-3.5" /> Say Hi!
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* I Asked (As Requester) */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#14171c]">
            <h3 className="text-base font-black text-slate-900 dark:text-white mb-4">
              I Asked ({iAskedRequests.length})
            </h3>

            {iAskedRequests.length === 0 ? (
              <p className="text-xs text-slate-500">You haven't requested tutor help yet.</p>
            ) : (
              <div className="space-y-3">
                {iAskedRequests.map((req) => {
                  const tutorProf = requestProfilesMap[req.tutor_id];
                  const isPending = req.status === "pending";
                  const isAccepted = req.status === "accepted";
                  const isCompleted = req.status === "completed";

                  return (
                    <div
                      key={req.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#18211f]"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={tutorProf?.user_img}
                          name={tutorProf?.full_name}
                          username={tutorProf?.username}
                          size="md"
                          userId={req.tutor_id}
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            Tutor: {tutorProf?.full_name || tutorProf?.username || "Tutor"}
                          </p>
                          <p className="text-[11px] text-emerald-600 font-bold">
                            Subject: {req.subject} ({req.topic || "General"})
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isPending && (
                          <button
                            type="button"
                            onClick={() => handleCancelRequest(req.id)}
                            className="rounded-xl bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300"
                          >
                            Cancel Request
                          </button>
                        )}

                        {isAccepted && (
                          <>
                            {req.conversation_id && (
                              <button
                                type="button"
                                onClick={() => navigate(`/community/chat/${req.conversation_id}`)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                              >
                                <MessageSquare className="h-3.5 w-3.5" /> Open Chat
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setRatingTarget(req)}
                              className="inline-flex items-center gap-1 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-600"
                            >
                              <Star className="h-3.5 w-3.5 fill-current" /> Done & Rate
                            </button>
                          </>
                        )}

                        {isCompleted && (
                          <span className="rounded-xl bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            Completed ({req.rating || 5}★)
                          </span>
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

      {/* SUB-VIEW 4: BECOME A TUTOR */}
      {activeTab === "become" && (
        <form
          onSubmit={handleSaveTutorProfile}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#14171c] space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Peer Tutor Profile
              </h3>
              <p className="text-xs text-slate-500">
                Set your tutoring availability and subjects to get matched with learners.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsAvailable(!isAvailable)}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition ${
                isAvailable
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              <span>{isAvailable ? "Available for Requests" : "Paused / Busy"}</span>
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Headline (max 120 characters)
            </label>
            <input
              type="text"
              required
              maxLength={120}
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. Calculus & Physics tutor · Solved 50+ problems"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-[#18211f] dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              About Your Expertise (max 600 characters)
            </label>
            <textarea
              rows={4}
              maxLength={600}
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              placeholder="Describe your study background, approach, and how you like to explain concepts..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-[#18211f] dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Subjects Offered (1-10)
            </label>

            <div className="flex flex-wrap gap-1.5 mb-2">
              {offeredSubjects.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1 rounded-xl bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                >
                  {s}
                  <button
                    type="button"
                    onClick={() => handleRemoveSubjectChip(s)}
                    className="hover:text-rose-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>

            {offeredSubjects.length < 10 && (
              <input
                type="text"
                value={subjectInput}
                onChange={(e) => setSubjectInput(e.target.value)}
                onKeyDown={handleAddSubjectChip}
                placeholder="Type subject and press Enter..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-[#18211f] dark:text-white"
              />
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingTutorProfile}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {savingTutorProfile && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Save Tutor Profile</span>
            </button>
          </div>
        </form>
      )}

      {/* Tutor Request Sheet Modal */}
      {requestTarget && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs"
          onClick={() => setRequestTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#14171c]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Request Help from {requestTarget.full_name || requestTarget.username}
              </h3>
              <button
                type="button"
                onClick={() => setRequestTarget(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSendTutorRequest} className="space-y-3">
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
                  {(requestTarget.subjects_offered || ["General Study"]).map((s) => (
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
                  required
                  value={reqTopic}
                  onChange={(e) => setReqTopic(e.target.value)}
                  placeholder="e.g. Integration by parts"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-[#18211f] dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Short Message
                </label>
                <textarea
                  rows={3}
                  value={reqMessage}
                  onChange={(e) => setReqMessage(e.target.value)}
                  placeholder="What specifically do you need help with?"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-[#18211f] dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRequestTarget(null)}
                  className="rounded-2xl bg-slate-200 px-4 py-2 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingRequest}
                  className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {sendingRequest && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Send Request</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rating Sheet Modal */}
      {ratingTarget && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs"
          onClick={() => setRatingTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#14171c]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Rate Tutoring Session
              </h3>
              <button
                type="button"
                onClick={() => setRatingTarget(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCompleteAndRate} className="space-y-4">
              <div className="flex justify-center gap-2 py-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingStars(star)}
                    className="p-1 transition transform hover:scale-110"
                  >
                    <Star
                      className={`h-7 w-7 ${
                        star <= ratingStars
                          ? "fill-amber-400 text-amber-400"
                          : "text-slate-300 dark:text-slate-700"
                      }`}
                    />
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Optional Feedback
                </label>
                <textarea
                  rows={3}
                  value={ratingFeedback}
                  onChange={(e) => setRatingFeedback(e.target.value)}
                  placeholder="How was the study session?"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-[#18211f] dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRatingTarget(null)}
                  className="rounded-2xl bg-slate-200 px-4 py-2 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRating}
                  className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {submittingRating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Submit Rating</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
