import React, { useState, useEffect, useId } from "react";
import {
  BellRing,
  CheckCheck,
  Trash2,
  X,
  UserPlus,
  MessageSquare,
  Users,
  Calendar,
  Check,
  Loader2,
  Award,
  HelpCircle,
  BookOpen,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useInAppNotifications } from "../../hooks/useInAppNotifications";
import { getNotificationDetails, groupNotificationsByDate } from "../../lib/inAppNotifications";
import { formatRelativeTime } from "../../lib/communityChat";
import supabase from "../../lib/supabase";

export { groupNotificationsByDate };

/**
 * Returns an icon component and color badge according to notification type
 */
function NotificationTypeBadge({ type }) {
  switch (type) {
    case "friend_request":
    case "friend_request_accepted":
      return (
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 shrink-0">
          <UserPlus className="h-3.5 w-3.5" />
        </span>
      );

    case "new_message":
      return (
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-950/80 dark:text-sky-300 shrink-0">
          <MessageSquare className="h-3.5 w-3.5" />
        </span>
      );

    case "group_study_session_scheduled":
    case "group_study_session_live":
    case "group_study_session_cancelled":
      return (
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 shrink-0">
          <Calendar className="h-3.5 w-3.5" />
        </span>
      );

    case "group_join_request":
    case "group_join_approved":
    case "group_member_joined":
      return (
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 shrink-0">
          <Users className="h-3.5 w-3.5" />
        </span>
      );

    default:
      return (
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 shrink-0">
          <BellRing className="h-3.5 w-3.5" />
        </span>
      );
  }
}

function NotificationCenter({ onClose, inlineMode = false }) {
  const titleId = useId();
  const navigate = useNavigate();
  const {
    notifications,
    actorProfiles,
    loading,
    error,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    refreshNotifications,
  } = useInAppNotifications();

  const [actionLoading, setActionLoading] = useState({});
  const [actionDone, setActionDone] = useState({});
  const [rsvpState, setRsvpState] = useState({});
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Escape key listener for modal drawer mode
  useEffect(() => {
    if (inlineMode) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [inlineMode, onClose]);

  // Friend request accept / decline
  const handleFriendRequestAction = async (notification, status) => {
    const friendshipId = notification.payload?.friendship_id;
    if (!friendshipId) return;

    setActionLoading((prev) => ({ ...prev, [notification.id]: true }));
    try {
      const { data: fsData, error: fsError } = await supabase
        .from("friendships")
        .update({ status, responded_at: new Date().toISOString() })
        .eq("id", friendshipId);

      if (fsError) throw fsError;

      await markAsRead(notification.id);
      setActionDone((prev) => ({
        ...prev,
        [notification.id]: status === "accepted" ? "Accepted" : "Declined",
      }));
    } catch (err) {
      console.error(`Failed to ${status} friend request:`, err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [notification.id]: false }));
    }
  };

  // Group join request approve / decline
  const handleGroupJoinRequestAction = async (notification, approved) => {
    const groupId = notification.payload?.group_id;
    const requesterId = notification.actor_id;
    const requestId = notification.payload?.request_id;

    if (!groupId || !requesterId) return;

    setActionLoading((prev) => ({ ...prev, [notification.id]: true }));
    try {
      if (approved) {
        const { error: memErr } = await supabase
          .from("study_group_members")
          .insert({ group_id: groupId, user_id: requesterId, role: "member" });
        if (memErr && !memErr.message?.includes("duplicate")) throw memErr;
      }

      if (requestId) {
        await supabase
          .from("study_group_join_requests")
          .update({ status: approved ? "approved" : "declined" })
          .eq("id", requestId);
      }

      await markAsRead(notification.id);
      setActionDone((prev) => ({
        ...prev,
        [notification.id]: approved ? "Approved" : "Declined",
      }));
    } catch (err) {
      console.error("Error responding to group join request:", err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [notification.id]: false }));
    }
  };

  // Handle Tutor Match Request Respond
  const handleMatchRequestAction = async (notification, accept) => {
    const requestId = notification.payload?.request_id;
    if (!requestId) return;

    setActionLoading((prev) => ({ ...prev, [notification.id]: true }));
    try {
      const { data, error } = await supabase.rpc("respond_match_request", {
        p_request_id: requestId,
        p_accept: accept,
      });

      if (error) throw error;

      await markAsRead(notification.id);
      setActionDone((prev) => ({
        ...prev,
        [notification.id]: accept ? "Accepted! Chat created." : "Declined",
      }));
    } catch (err) {
      console.error("Error responding to match request:", err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [notification.id]: false }));
    }
  };

  // Handle Message Button on Accepted Request
  const handleStartMessage = async (notification) => {
    const actorId = notification.actor_id;
    if (!actorId) return;

    setActionLoading((prev) => ({ ...prev, [notification.id]: true }));
    try {
      const { error: rsvpErr } = await supabase
        .from("group_study_session_participants")
        .upsert(
          {
            session_id: sessionId,
            user_id: user.id,
            status,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "session_id,user_id" }
        );

      if (rsvpErr) throw rsvpErr;

      await markAsRead(notification.id);
      onClose?.();

      if (onOpenChat) {
        onOpenChat(convId);
      } else {
        navigate(`/community/chat/${convId}`);
      }
    } catch (err) {
      console.error("Error updating session RSVP:", err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [notification.id]: false }));
    }
  };

  // Deep-link navigation on row tap
  const handleNotificationTap = async (notification) => {
    await markAsRead(notification.id);
    if (!inlineMode) onClose?.();

    const actorName = actorProfiles[notification.actor_id]?.full_name || "Someone";
    const details = getNotificationDetails(notification, actorName);

    if (onOpenSession) {
      onOpenSession(sessionId);
    } else {
      navigate("/community", { state: { openSessionId: sessionId } });
    }
  };

  const handleClearAll = async () => {
    await deleteAllNotifications();
    setShowClearConfirm(false);
  };

  const { today, yesterday, earlier } = groupNotificationsByDate(notifications);

  const renderSection = (title, items) => {
    if (!items || items.length === 0) return null;

    return (
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
          {title}
        </p>
        <div className="space-y-2.5">
          {items.map((item) => {
            const actor = actorProfiles[item.actor_id];
            const actorName = actor?.full_name || actor?.username || "Someone";
            const isUnread = !item.is_read;
            const isBusy = actionLoading[item.id];
            const doneLabel = actionDone[item.id];
            const currentRsvp = rsvpState[item.id] || item.payload?.user_rsvp;
            const details = getNotificationDetails(item, actorName);

            return (
              <div
                key={item.id}
                onClick={() => handleNotificationTap(item)}
                className={`group relative overflow-hidden rounded-2xl border p-4 transition cursor-pointer ${
                  isUnread
                    ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                    : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-[#18211f] dark:hover:bg-[#1f2b28]"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Actor Avatar or System Icon */}
                  {item.type === "achievement_unlocked" ? (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-300">
                      <Award className="h-5 w-5" />
                    </div>
                  ) : actor?.user_img ? (
                    <img
                      src={actor.user_img}
                      alt={actorName}
                      className="h-9 w-9 rounded-full object-cover shrink-0 ring-2 ring-white dark:ring-slate-800"
                    />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-200 text-xs font-bold text-emerald-900 ring-2 ring-white dark:bg-emerald-900 dark:text-emerald-100 dark:ring-slate-800">
                      {actorName.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {item.type === "achievement_unlocked" ? "Achievement Unlocked!" : actorName}
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isUnread && (
                          <span
                            className="h-2 w-2 rounded-full bg-emerald-500"
                            title="Unread notification"
                          />
                        )}
                        <span className="text-[10px] text-slate-400 font-medium">
                          {formatRelativeTime(item.created_at)}
                        </span>

                        <button
                          type="button"
                          aria-label="Delete notification"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(item.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Notification content based on payload type */}
                    {item.type === "friend_request" && (
                      <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                        {doneLabel ? (
                          <span className="inline-block rounded-xl bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {doneLabel}
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleFriendRequestAction(item, "accepted")}
                              className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                              <span>Accept</span>
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleFriendRequestAction(item, "declined")}
                              className="inline-flex items-center gap-1 rounded-xl bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300"
                            >
                              <X className="h-3.5 w-3.5" />
                              <span>Decline</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {item.type === "friend_request_accepted" && (
                      <div className="mt-2.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => {
                            if (!inlineMode) onClose?.();
                            navigate(`/community/u/${item.actor_id || ""}`);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span>Message</span>
                        </button>
                      </div>
                    )}

                    {item.type === "group_join_request" && (
                      <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                        {doneLabel ? (
                          <span className="inline-block rounded-xl bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {doneLabel}
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleGroupJoinRequestAction(item, true)}
                              className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                              <span>Approve</span>
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleGroupJoinRequestAction(item, false)}
                              className="inline-flex items-center gap-1 rounded-xl bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300"
                            >
                              <X className="h-3.5 w-3.5" />
                              <span>Decline</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {item.type === "forum_answer" && (
                      <div className="mt-1">
                        <p className="text-xs text-slate-700 dark:text-slate-300">
                          Answered your question: <strong>"{item.payload?.title || "Forum Post"}"</strong>
                        </p>
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            await markAsRead(item.id);
                            onClose?.();
                            navigate(`/community/help/${item.payload?.post_id}`);
                          }}
                          className="mt-2 inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700"
                        >
                          <HelpCircle className="h-3.5 w-3.5" /> View Answer
                        </button>
                      </div>
                    )}

                    {item.type === "forum_answer_accepted" && (
                      <div className="mt-1">
                        <p className="text-xs text-slate-700 dark:text-slate-300">
                          Accepted your answer on <strong>"{item.payload?.title || "Forum Post"}"</strong>
                          {item.payload?.xp && (
                            <span className="ml-1 text-amber-600 font-bold dark:text-amber-400">
                              (+{item.payload.xp} XP)
                            </span>
                          )}
                        </p>
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            await markAsRead(item.id);
                            onClose?.();
                            navigate(`/community/help/${item.payload?.post_id}`);
                          }}
                          className="mt-2 inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700"
                        >
                          View Question
                        </button>
                      </div>
                    )}

                    {item.type === "match_request" && (
                      <div className="mt-1">
                        <p className="text-xs text-slate-700 dark:text-slate-300">
                          Requested tutoring in <strong>{item.payload?.subject}</strong> ({item.payload?.topic}).
                        </p>
                        {item.payload?.preview && (
                          <p className="mt-1 text-[11px] text-slate-500 italic">
                            "{item.payload.preview}"
                          </p>
                        )}

                        {doneLabel ? (
                          <span className="mt-2 inline-block rounded-xl bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {doneLabel}
                          </span>
                        ) : (
                          <div className="mt-3 flex items-center gap-2">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMatchRequestAction(item, true);
                              }}
                              className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                            >
                              <Check className="h-3.5 w-3.5" /> Accept
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMatchRequestAction(item, false);
                              }}
                              className="inline-flex items-center gap-1 rounded-xl bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300"
                            >
                              <X className="h-3.5 w-3.5" /> Decline
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {item.type === "match_accepted" && (
                      <div className="mt-1">
                        <p className="text-xs text-slate-700 dark:text-slate-300">
                          Accepted your tutor request for <strong>{item.payload?.subject}</strong>!
                        </p>
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            await markAsRead(item.id);
                            onClose?.();
                            if (item.payload?.conversation_id) {
                              navigate(`/community/chat/${item.payload.conversation_id}`);
                            }
                          }}
                          className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700"
                        >
                          <MessageSquare className="h-3.5 w-3.5" /> Open Chat
                        </button>
                      </div>
                    )}

                    {item.type === "match_declined" && (
                      <div className="mt-1">
                        <p className="text-xs text-slate-700 dark:text-slate-300">
                          Declined tutor request for <strong>{item.payload?.subject}</strong>.
                        </p>
                      </div>
                    )}

                    {item.type === "match_completed" && (
                      <div className="mt-1">
                        <p className="text-xs text-slate-700 dark:text-slate-300">
                          Tutoring session completed for <strong>{item.payload?.subject}</strong> (Rated {item.payload?.rating}★).
                        </p>
                      </div>
                    )}

                    {item.type === "achievement_unlocked" && (
                      <div className="mt-1">
                        <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                          {item.payload?.icon || "🏆"} {item.payload?.title || "New Badge"}
                        </p>
                        <p className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold">
                          +{item.payload?.xp_reward || 0} XP
                        </p>
                      </div>
                    )}

                    {!["friend_request", "friend_request_accepted", "group_join_request", "group_join_approved", "group_study_session_scheduled", "forum_answer", "forum_answer_accepted", "match_request", "match_accepted", "match_declined", "match_completed", "achievement_unlocked"].includes(item.type) && (
                      <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">
                        {item.payload?.message || item.body || "New activity update."}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const mainContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <BellRing className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h2 id={titleId} className="text-xl font-bold text-slate-900 dark:text-white">
            Notifications
          </h2>
          {unreadCount > 0 && (
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
        {!inlineMode && (
          <button
            type="button"
            aria-label="Close notifications"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-800 dark:bg-[#18211f]">
        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
          {unreadCount} unread
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-40 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/80"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </button>
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            disabled={notifications.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear all
          </button>
        </div>
      </div>

      {showClearConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-[#14171c]">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Clear all notifications?</h3>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              This will permanently delete all your notifications. This action cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="rounded-xl bg-slate-100 px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-rose-700"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 flex-1 space-y-6 overflow-y-auto pr-1">
        {loading ? (
          <div className="flex min-h-[250px] flex-col items-center justify-center p-8">
            <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
            <p className="mt-2 text-xs text-slate-500">Loading notifications...</p>
          </div>
        ) : error ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center dark:border-rose-900/40 dark:bg-rose-950/20">
            <AlertCircle className="h-7 w-7 text-rose-600" />
            <p className="mt-2 text-xs font-bold text-rose-800 dark:text-rose-200">{error}</p>
            <button
              type="button"
              onClick={refreshNotifications}
              className="mt-3 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700"
            >
              Retry
            </button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex min-h-[250px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center dark:border-slate-800 dark:bg-[#18211f]">
            <BellRing className="h-10 w-10 text-slate-300 dark:text-slate-700" />
            <p className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200">You're all caught up!</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Updates from friends, study groups, and messages will appear here.
            </p>
          </div>
        ) : (
          <>
            {renderSection("Today", today)}
            {renderSection("Yesterday", yesterday)}
            {renderSection("Earlier", earlier)}
          </>
        )}
      </div>
    </div>
  );

  if (inlineMode) {
    return (
      <div className="w-full max-w-3xl mx-auto p-4 sm:p-6 bg-white dark:bg-[#14171c] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm min-h-[80vh]">
        {mainContent}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[120] bg-slate-950/50 backdrop-blur-xs"
      onClick={onClose}
    >
      <aside
        className="motion-dialog absolute right-0 top-0 h-full w-full max-w-md border-l border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#14171c] dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        {mainContent}
      </aside>
    </div>
  );
}

export default NotificationCenter;
