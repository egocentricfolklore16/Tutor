import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  Clock,
  Plus,
  Users,
  Play,
  Check,
  X,
  HelpCircle,
  Loader2,
} from "lucide-react";
import supabase from "../../lib/supabase";
import { toDate, toTime } from "../../lib/dates";
import ResponsiveSheet from "../common/ResponsiveSheet";

function AvatarItem({ prof }) {
  const [imgError, setImgError] = useState(false);
  const initial = (prof?.full_name || prof?.username || "U").charAt(0).toUpperCase();

  if (prof?.user_img && !imgError) {
    return (
      <img
        src={prof.user_img}
        alt={prof.username || "User"}
        onError={() => setImgError(true)}
        className="inline-block h-7 w-7 rounded-full ring-2 ring-white dark:ring-[#14171c] object-cover"
      />
    );
  }

  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-200 text-[10px] font-bold text-emerald-900 ring-2 ring-white dark:ring-[#14171c] dark:bg-emerald-900 dark:text-emerald-100">
      {initial}
    </div>
  );
}

export default function GroupStudySessions({
  groupId,
  currentUserId,
  onJoinSession,
}) {
  const [sessions, setSessions] = useState([]);
  const [participantsMap, setParticipantsMap] = useState({});
  const [participantProfiles, setParticipantProfiles] = useState({});
  const [loading, setLoading] = useState(true);

  // Form Modal State
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [scheduledStart, setScheduledStart] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [scheduling, setScheduling] = useState(false);

  // Fetch upcoming sessions for group
  const fetchSessions = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      const { data: sessRows, error: sessErr } = await supabase
        .from("group_study_sessions")
        .select("*")
        .eq("group_id", groupId)
        .order("scheduled_start", { ascending: true });

      if (sessErr) throw sessErr;
      const items = sessRows || [];
      setSessions(items);

      // Fetch participants for these sessions
      const sessionIds = items.map((s) => s.id);
      if (sessionIds.length > 0) {
        const { data: partRows, error: partErr } = await supabase
          .from("group_study_session_participants")
          .select("*")
          .in("session_id", sessionIds);

        if (!partErr && partRows) {
          const pMap = {};
          const userIds = Array.from(new Set(partRows.map((p) => p.user_id)));

          partRows.forEach((p) => {
            if (!pMap[p.session_id]) pMap[p.session_id] = [];
            pMap[p.session_id].push(p);
          });
          setParticipantsMap(pMap);

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

            const profMap = {};
            profsList.forEach((p) => {
              if (p) profMap[p.user_id] = p;
            });
            setParticipantProfiles(profMap);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching group study sessions:", err);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Handle Schedule Session submit
  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !scheduledStart) return;

    setScheduling(true);
    try {
      const { data, error } = await supabase
        .from("group_study_sessions")
        .insert({
          group_id: groupId,
          host_id: currentUserId,
          title: title.trim(),
          subject: subject.trim() || "General",
          scheduled_start: new Date(scheduledStart).toISOString(),
          duration_minutes: parseInt(durationMinutes, 10) || 60,
          status: "scheduled",
        })
        .select()
        .single();

      if (error) throw error;

      // Automatically add host as 'going'
      if (data) {
        await supabase.from("group_study_session_participants").insert({
          session_id: data.id,
          user_id: currentUserId,
          status: "going",
        });
      }

      setShowScheduleForm(false);
      setTitle("");
      setSubject("");
      setScheduledStart("");
      setDurationMinutes(60);
      fetchSessions();
    } catch (err) {
      console.error("Error scheduling group session:", err);
    } finally {
      setScheduling(false);
    }
  };

  // RSVP toggle action (going | maybe | declined)
  const handleRsvp = async (sessionId, status) => {
    try {
      const { error } = await supabase
        .from("group_study_session_participants")
        .upsert(
          {
            session_id: sessionId,
            user_id: currentUserId,
            status,
          },
          { onConflict: "session_id,user_id" }
        );

      if (error) throw error;
      fetchSessions();
    } catch (err) {
      console.error("Error updating RSVP:", err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Schedule CTA */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Scheduled Study Sessions
        </h3>
        <button
          type="button"
          onClick={() => setShowScheduleForm(true)}
          className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm"
        >
          <Plus className="h-4 w-4" /> Schedule Session
        </button>
      </div>

      {/* Schedule Form Modal */}
      <ResponsiveSheet
        isOpen={showScheduleForm}
        onClose={() => setShowScheduleForm(false)}
        title="Schedule Group Study Session"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setShowScheduleForm(false)}
              className="rounded-xl bg-slate-200 px-4 py-2 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleScheduleSubmit}
              disabled={scheduling || !title.trim() || !scheduledStart}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {scheduling && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Save Session</span>
            </button>
          </div>
        }
      >
        <form onSubmit={handleScheduleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Session Title
              </label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Midterm Exam Prep"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-[#14171c] dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Subject
              </label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Organic Chemistry"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-[#14171c] dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Date & Start Time
              </label>
              <input
                required
                type="datetime-local"
                value={scheduledStart}
                onChange={(e) => setScheduledStart(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-[#14171c] dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Duration (minutes)
              </label>
              <input
                type="number"
                min={15}
                max={240}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-[#14171c] dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </form>
      </ResponsiveSheet>

      {/* Sessions List */}
      {loading ? (
        <div className="flex min-h-[150px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-[#18211f]">
          No upcoming study sessions. Schedule one above!
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((sess) => {
            const parts = participantsMap[sess.id] || [];
            const userRsvp = parts.find((p) => p.user_id === currentUserId)?.status;

            const goingUsers = parts.filter((p) => p.status === "going");

            const startTime = toTime(sess.scheduled_start);
            const now = Date.now();
            const tenMinutesBefore = startTime - 10 * 60 * 1000;

            // Join is enabled if status is 'live' or start time is within 10 mins (or past start)
            const canJoin =
              sess.status === "live" || (now >= tenMinutesBefore && sess.status !== "completed");

            return (
              <div
                key={sess.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#14171c]"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <span className="rounded-full bg-cyan-100 px-2.5 py-0.5 text-[10px] font-bold text-cyan-900 dark:bg-cyan-950 dark:text-cyan-200">
                      {sess.subject}
                    </span>
                    <h4 className="mt-1.5 text-sm font-bold text-slate-900 dark:text-white">
                      {sess.title}
                    </h4>
                    <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {toDate(sess.scheduled_start)?.toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        }) ?? "Scheduled"}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {sess.duration_minutes}m
                      </span>
                    </p>
                  </div>

                  {/* Join Button */}
                  {canJoin && (
                    <button
                      type="button"
                      onClick={() => onJoinSession(sess.id)}
                      className="inline-flex items-center gap-1.5 rounded-2xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 animate-pulse"
                    >
                      <Play className="h-3.5 w-3.5" /> Join Live
                    </button>
                  )}
                </div>

                {/* RSVP & Participant Avatars */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                  {/* Avatar Stack */}
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2 overflow-hidden">
                      {goingUsers.slice(0, 5).map((p) => {
                        const prof = participantProfiles[p.user_id];
                        return <AvatarItem key={p.id} prof={prof} />;
                      })}
                    </div>

                    <span className="text-xs text-slate-500 font-semibold">
                      {goingUsers.length} going
                    </span>
                  </div>

                  {/* RSVP Segmented Controls */}
                  <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-[#18211f]">
                    <button
                      type="button"
                      onClick={() => handleRsvp(sess.id, "going")}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                        userRsvp === "going"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                      }`}
                    >
                      <Check className="h-3 w-3" /> Going
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRsvp(sess.id, "maybe")}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                        userRsvp === "maybe"
                          ? "bg-amber-500 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                      }`}
                    >
                      <HelpCircle className="h-3 w-3" /> Maybe
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRsvp(sess.id, "declined")}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                        userRsvp === "declined"
                          ? "bg-rose-600 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                      }`}
                    >
                      <X className="h-3 w-3" /> Declined
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
