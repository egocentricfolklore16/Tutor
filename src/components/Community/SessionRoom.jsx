import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Users,
  Clock,
  Play,
  CheckCircle,
  Loader2,
  Paperclip,
  Video,
  Radio,
} from "lucide-react";
import supabase from "../../lib/supabase";
import ChatThread from "./ChatThread";

export default function SessionRoom({
  sessionId,
  groupConversationId: initialGroupConvId,
  currentUserId,
  onClose,
}) {
  const [session, setSession] = useState(null);
  const [groupConversationId, setGroupConversationId] = useState(initialGroupConvId || null);
  const [participants, setParticipants] = useState([]);
  const [participantProfiles, setParticipantProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // 1. Fetch Session Details & Participants
  const fetchSessionData = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const { data: sess, error: sessErr } = await supabase
        .from("group_study_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (sessErr) throw sessErr;
      setSession(sess);
      setIsHost(sess.host_id === currentUserId);

      // If groupConversationId is missing, fetch from conversations table
      if (!initialGroupConvId && sess.group_id) {
        const { data: convData } = await supabase
          .from("conversations")
          .select("id")
          .eq("study_group_id", sess.group_id)
          .maybeSingle();

        if (convData) {
          setGroupConversationId(convData.id);
        }
      }

      // Fetch participants
      const { data: partRows, error: partErr } = await supabase
        .from("group_study_session_participants")
        .select("*")
        .eq("session_id", sessionId);

      if (!partErr && partRows) {
        setParticipants(partRows);
        const userIds = partRows.map((p) => p.user_id);
        if (userIds.length > 0) {
          const { data: profs } = await supabase
            .from("community_profiles")
            .select("*")
            .in("user_id", userIds);

          const profMap = {};
          (profs || []).forEach((p) => {
            profMap[p.user_id] = p;
          });
          setParticipantProfiles(profMap);
        }
      }
    } catch (err) {
      console.error("Error fetching session room data:", err);
    } finally {
      setLoading(false);
    }
  }, [sessionId, initialGroupConvId, currentUserId]);

  useEffect(() => {
    fetchSessionData();
  }, [fetchSessionData]);

  // Realtime subscription for session status and participant RSVP changes
  useEffect(() => {
    if (!sessionId) return;

    const channelName = `group_session:${sessionId}:${crypto.randomUUID()}`;
    const channel = supabase.channel(channelName);

    channel
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "group_study_sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          setSession(payload.new);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "group_study_session_participants",
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          fetchSessionData();
        }
      );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, fetchSessionData]);

  // 2. Shared Timer countdown calculation
  useEffect(() => {
    if (!session?.scheduled_start) return;

    const calculateTimer = () => {
      const startTime = new Date(session.scheduled_start).getTime();
      const durationMs = (session.duration_minutes || 60) * 60 * 1000;
      const endTime = startTime + durationMs;
      const now = Date.now();

      if (now < startTime) {
        const diffSec = Math.floor((startTime - now) / 1000);
        const mins = Math.floor(diffSec / 60);
        const secs = diffSec % 60;
        setTimeLeft(`Starts in ${mins}m ${secs < 10 ? "0" : ""}${secs}s`);
      } else if (now >= startTime && now <= endTime) {
        const diffSec = Math.floor((endTime - now) / 1000);
        const mins = Math.floor(diffSec / 60);
        const secs = diffSec % 60;
        setTimeLeft(`${mins}:${secs < 10 ? "0" : ""}${secs} remaining`);
      } else {
        setTimeLeft("Session time ended");
      }
    };

    calculateTimer();
    const interval = setInterval(calculateTimer, 1000);
    return () => clearInterval(interval);
  }, [session]);

  // Host action: Change Session Status ('live' | 'completed')
  const handleUpdateStatus = async (nextStatus) => {
    if (!isHost || !sessionId) return;
    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from("group_study_sessions")
        .update({ status: nextStatus })
        .eq("id", sessionId);

      if (error) throw error;
      setSession((prev) => (prev ? { ...prev, status: nextStatus } : prev));
    } catch (err) {
      console.error("Error updating session status:", err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
        <div className="flex flex-col items-center justify-center rounded-3xl bg-white p-8 dark:bg-[#14171c]">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="mt-3 text-xs text-slate-500 font-bold">Joining study session room...</p>
        </div>
      </div>
    );
  }

  const goingParticipants = participants.filter((p) => p.status === "going");

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/60 p-2 sm:p-4 backdrop-blur-sm">
      <div className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#14171c]">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4 dark:border-slate-800 dark:bg-[#14171c]">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
              <Radio className="h-5 w-5 animate-pulse text-emerald-600" />
            </span>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-lg font-black text-slate-900 dark:text-white">
                  {session?.title || "Group Study Session"}
                </h2>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
                    session?.status === "live"
                      ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                      : session?.status === "completed"
                      ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  }`}
                >
                  {session?.status || "scheduled"}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-semibold">
                Subject: {session?.subject || "General"}
              </p>
            </div>
          </div>

          {/* Shared Timer & Host Controls */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 rounded-2xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-800 dark:bg-[#18211f] dark:text-slate-200">
              <Clock className="h-4 w-4 text-emerald-600" />
              <span>{timeLeft}</span>
            </div>

            {isHost && session?.status !== "completed" && (
              <div className="flex items-center gap-2">
                {session?.status !== "live" && (
                  <button
                    type="button"
                    disabled={updatingStatus}
                    onClick={() => handleUpdateStatus("live")}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 shadow-sm"
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span>Go Live</span>
                  </button>
                )}

                <button
                  type="button"
                  disabled={updatingStatus}
                  onClick={() => handleUpdateStatus("completed")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-900"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span>End Session</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Leave session room"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Room Body: Main Chat & Side Participant Bar */}
        <div className="flex flex-1 overflow-hidden">
          {/* Main Area: Realtime Group Chat Thread */}
          <div className="flex-1 p-3 sm:p-4 overflow-hidden">
            {groupConversationId ? (
              <ChatThread
                conversationId={groupConversationId}
                currentUserId={currentUserId}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-slate-500 text-xs">
                No active chat attached to this group.
              </div>
            )}
          </div>

          {/* Right Sidebar: Active Participants */}
          <div className="hidden lg:flex w-72 flex-col border-l border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-[#18211f]/60">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Session Room ({goingParticipants.length})
              </h3>
              <Users className="h-4 w-4 text-slate-400" />
            </div>

            <div className="flex-1 space-y-2.5 overflow-y-auto pr-1">
              {goingParticipants.map((part) => {
                const prof = participantProfiles[part.user_id];
                const name = prof?.full_name || prof?.username || "Participant";

                return (
                  <div
                    key={part.id}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-xs dark:border-slate-800 dark:bg-[#14171c]"
                  >
                    {prof?.user_img ? (
                      <img
                        src={prof.user_img}
                        alt={name}
                        className="h-8 w-8 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-200 text-xs font-bold text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100">
                        {name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                        {name}
                      </p>
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                        Active in Session
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
