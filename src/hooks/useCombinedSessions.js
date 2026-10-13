import { useState, useEffect, useCallback } from "react";
import supabase from "../lib/supabase";
import { scheduleGroupSessionReminders, getNotificationPreferences } from "../lib/notifications";

/**
 * Custom hook to fetch personal study sessions and group study sessions
 * from groups the user is an approved member of, excluding declined group sessions.
 */
export function useCombinedSessions() {
  const [sessions, setSessions] = useState([]);
  const [personalSessions, setPersonalSessions] = useState([]);
  const [groupSessions, setGroupSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCombinedSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSessions([]);
        setLoading(false);
        return;
      }

      // 1. Query personal study sessions
      const { data: personalData, error: personalErr } = await supabase
        .from("Study")
        .select("*")
        .eq("user_id", user.id)
        .neq("session_status", "completed");

      if (personalErr) throw personalErr;

      const normalizedPersonal = (personalData || []).map((item) => {
        const startIso = item.Date && item.Start ? `${item.Date}T${item.Start.slice(0, 5)}:00` : null;
        return {
          ...item,
          id: item.id,
          title: item.Topic || item.Subject || "Study Session",
          subject: item.Subject || "General",
          Date: item.Date,
          Start: item.Start,
          Duration: item.Duration || 1,
          duration_minutes: (Number(item.Duration) || 1) * 60,
          scheduled_start: startIso ? new Date(startIso).toISOString() : new Date().toISOString(),
          is_group_session: false,
          Status: item.Status || "Medium",
        };
      });

      // 2. Query user's approved groups
      const { data: groupMemberRows, error: memberErr } = await supabase
        .from("study_group_members")
        .select("group_id")
        .eq("user_id", user.id)
        .eq("status", "approved");

      let normalizedGroup = [];

      if (!memberErr && groupMemberRows && groupMemberRows.length > 0) {
        const approvedGroupIds = groupMemberRows.map((m) => m.group_id);

        // Fetch group names
        const { data: groupsData } = await supabase
          .from("study_groups")
          .select("id, name")
          .in("id", approvedGroupIds);

        const groupNameMap = {};
        (groupsData || []).forEach((g) => {
          groupNameMap[g.id] = g.name;
        });

        // Query group study sessions for user's approved groups
        const { data: gssRows, error: gssErr } = await supabase
          .from("group_study_sessions")
          .select("*")
          .in("group_id", approvedGroupIds)
          .neq("status", "completed");

        if (!gssErr && gssRows && gssRows.length > 0) {
          const gssIds = gssRows.map((s) => s.id);

          // Fetch participants for user RSVP status and going counts
          const { data: partRows } = await supabase
            .from("group_study_session_participants")
            .select("*")
            .in("session_id", gssIds);

          const partMap = {};
          (partRows || []).forEach((p) => {
            if (!partMap[p.session_id]) partMap[p.session_id] = [];
            partMap[p.session_id].push(p);
          });

          normalizedGroup = gssRows
            .map((item) => {
              const parts = partMap[item.id] || [];
              const userParticipant = parts.find((p) => p.user_id === user.id);
              const userRsvp = userParticipant ? userParticipant.status : "not_responded";
              const goingCount = parts.filter((p) => p.status === "going").length;

              const startDateObj = new Date(item.scheduled_start);
              const dateStr = !isNaN(startDateObj.getTime())
                ? startDateObj.toISOString().slice(0, 10)
                : "";
              const timeStr = !isNaN(startDateObj.getTime())
                ? startDateObj.toTimeString().slice(0, 5)
                : "";

              return {
                id: item.id,
                title: item.title || "Group Study Session",
                subject: item.subject || "General",
                Date: dateStr,
                Start: timeStr,
                Duration: (Number(item.duration_minutes) || 60) / 60,
                duration_minutes: Number(item.duration_minutes) || 60,
                scheduled_start: item.scheduled_start,
                is_group_session: true,
                group_id: item.group_id,
                group_name: groupNameMap[item.group_id] || "Study Group",
                user_rsvp: userRsvp,
                going_count: goingCount,
                participants: parts,
                Status: "Medium",
                session_status: item.status || "scheduled",
                host_id: item.host_id,
              };
            })
            // Exclude group sessions where user marked RSVP as declined
            .filter((s) => s.user_rsvp !== "declined");
        }
      }

      setPersonalSessions(normalizedPersonal);
      setGroupSessions(normalizedGroup);

      const combined = [...normalizedPersonal, ...normalizedGroup].sort((a, b) => {
        const timeA = new Date(a.scheduled_start).getTime();
        const timeB = new Date(b.scheduled_start).getTime();
        return timeA - timeB;
      });

      setSessions(combined);

      // Schedule/update group session reminders
      scheduleGroupSessionReminders(normalizedGroup, getNotificationPreferences());
    } catch (err) {
      console.error("Error fetching combined sessions:", err);
      setError(err.message || "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCombinedSessions();

    // Check reminders periodically and on tab focus
    const interval = setInterval(() => {
      if (groupSessions.length > 0) {
        scheduleGroupSessionReminders(groupSessions, getNotificationPreferences());
      }
    }, 45000);

    const handleFocus = () => {
      if (groupSessions.length > 0) {
        scheduleGroupSessionReminders(groupSessions, getNotificationPreferences());
      }
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchCombinedSessions, groupSessions]);

  return {
    sessions,
    personalSessions,
    groupSessions,
    loading,
    error,
    refreshSessions: fetchCombinedSessions,
  };
}

export default useCombinedSessions;
