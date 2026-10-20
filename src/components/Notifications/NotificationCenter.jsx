import React, { useState, useEffect, useId } from "react";
import {
  BellRing,
  CheckCheck,
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
import { formatRelativeTime } from "../../lib/communityChat";
import supabase from "../../lib/supabase";
import ErrorBoundary from "../common/ErrorBoundary";

function NotificationCenterInner({ onClose, onOpenChat, _onOpenSession, inlineMode }) {
  const titleId = useId();
  const navigate = useNavigate();
  const {
    notifications,
    actorProfiles,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
  } = useInAppNotifications();

  const [actionLoading, setActionLoading] = useState({});
  const [actionDone, setActionDone] = useState({});

  // Escape key listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Handle Friend Request Accept/Decline
  const handleFriendRequestAction = async (notification, status) => {
    const friendshipId = notification.payload?.friendship_id;
    if (!friendshipId) {
      setActionDone((prev) => ({ ...prev, [notification.id]: "This request is no longer available" }));
      return;
    }

    setActionLoading((prev) => ({ ...prev, [notification.id]: true }));
    try {
      const { data: fsData, error: fsError } = await supabase
        .from("friendships")
        .update({ status, responded_at: new Date().toISOString() })
        .eq("id", friendshipId)
        .select();

      if (fsError || !fsData || fsData.length === 0) {
        setActionDone((prev) => ({
          ...prev,
          [notification.id]: "This request is no longer available",
        }));
        await markAsRead(notification.id);
        return;
      }

      await markAsRead(notification.id);
      setActionDone((prev) => ({
        ...prev,
        [notification.id]: status === "accepted" ? "Accepted" : "Declined",
      }));
    } catch (err) {
      console.error(`Failed to ${status} friend request:`, err);
      setActionDone((prev) => ({
        ...prev,
        [notification.id]: "This request is no longer available",
      }));
    } finally {
      setActionLoading((prev) => ({ ...prev, [notification.id]: false }));
    }
  };

  // Handle Group Join Request Approve/Decline
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
      setActionDone((prev) => ({ ...prev, [notification.id]: approved ? "Approved" : "Declined" }));
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
      const { error } = await supabase.rpc("respond_match_request", {
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
      const { data: convId, error } = await supabase.rpc(
        "get_or_create_direct_conversation",
        { p_other_user_id: actorId }
      );

      if (error) throw error;

      await markAsRead(notification.id);
      onClose?.();

      if (onOpenChat) {
        onOpenChat(convId);
      } else {
        navigate(`/community/chat/${convId}`);
      }
    } catch (err) {
      console.error("Error starting direct conversation:", err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [notification.id]: false }));
    }
  };

  const content = (
    <div className={`flex flex-col h-full ${inlineMode ? "w-full" : ""}`}>
      {/* Header (shown if not inlineMode) */}
      {!inlineMode && (
        <div className="flex items-center justify-between p-6 pb-2">
          <div className="flex items-center gap-2">
            <BellRing className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h2 id={titleId} className="text-xl font-bold text-slate-900 dark:text-white">
              Notifications
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close notifications"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Subheader / Actions */}
      <div className={`flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-800 dark:bg-[#18211f] ${inlineMode ? "mb-4" : "mx-6 my-2"}`}>
        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
          {unreadCount} unread
        </p>
        <button
          type="button"
          onClick={markAllAsRead}
          disabled={unreadCount === 0}
          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-40 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/80"
        >
          <CheckCheck className="h-3.5 w-3.5" />
          Mark all read
        </button>
      </div>

      {/* List Body */}
      <div className={`flex-1 space-y-3 overflow-y-auto ${inlineMode ? "" : "px-6 pb-6"}`}>
        {loading ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center p-8">
            <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
            <p className="mt-2 text-xs text-slate-500">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-[#18211f] dark:text-slate-400">
            You're all caught up! Updates from friends and study groups will appear here.
          </div>
        ) : (
          notifications.map((item) => {
            const actor = actorProfiles[item.actor_id];
            const actorName = actor?.full_name || actor?.username || "Someone";
            const isUnread = !item.is_read;
            const isBusy = actionLoading[item.id];
            const doneLabel = actionDone[item.id];

            return (
              <div
                key={item.id}
                onClick={() => !item.is_read && markAsRead(item.id)}
                className={`group relative rounded-2xl border p-4 transition ${
                  isUnread
                    ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                    : "border-slate-200 bg-white dark:border-slate-800 dark:bg-[#18211f]"
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
                      className="h-9 w-9 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-200 text-xs font-bold text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100">
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
                      </div>
                    </div>

                    {/* Notification content based on payload type */}
                    {item.type === "friend_request" && (
                      <div className="mt-1">
                        <p className="text-xs text-slate-700 dark:text-slate-300">
                          Sent you a friend request.
                        </p>
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
                                handleFriendRequestAction(item, "accepted");
                              }}
                              className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                              <span>Accept</span>
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFriendRequestAction(item, "declined");
                              }}
                              className="inline-flex items-center gap-1 rounded-xl bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 disabled:opacity-50"
                            >
                              <X className="h-3.5 w-3.5" />
                              <span>Decline</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {item.type === "friend_request_accepted" && (
                      <div className="mt-1">
                        <p className="text-xs text-slate-700 dark:text-slate-300">
                          Accepted your friend request!
                        </p>
                        <div className="mt-2.5">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartMessage(item);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span>Message</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {item.type === "group_join_request" && (
                      <div className="mt-1">
                        <p className="text-xs text-slate-700 dark:text-slate-300">
                          Requested to join your study group.
                        </p>
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
                                handleGroupJoinRequestAction(item, true);
                              }}
                              className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                            >
                              <span>Approve</span>
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGroupJoinRequestAction(item, false);
                              }}
                              className="inline-flex items-center gap-1 rounded-xl bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300"
                            >
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
          })
        )}
      </div>
    </div>
  );

  if (inlineMode) {
    return content;
  }

  return (
    <div
      className="fixed inset-0 z-[120] bg-slate-950/50 backdrop-blur-xs"
      onClick={onClose}
    >
      <aside
        className="motion-dialog absolute right-0 top-0 h-full w-full max-w-md border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#14171c] dark:text-slate-100 flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        {content}
      </aside>
    </div>
  );
}

export default function NotificationCenter(props) {
  return (
    <ErrorBoundary>
      <NotificationCenterInner {...props} />
    </ErrorBoundary>
  );
}
