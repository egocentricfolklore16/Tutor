import { useState } from "react";
import { AlertCircle, CheckCircle, ExternalLink, Loader2 } from "lucide-react";
import supabase from "../../lib/supabase.js";

function toGoogleEvent(studySession) {
  const start = new Date(studySession.date);
  const [hours, minutes] = (studySession.startTime || "09:00").split(":").map(Number);
  start.setHours(hours || 9, minutes || 0, 0, 0);
  const end = new Date(start.getTime() + (Number(studySession.duration) || 1) * 60 * 60 * 1000);
  return {
    summary: studySession.title || studySession.subject || "Hyper Tutor Study Session",
    description: `Planned In Hyper Tutor${studySession.subject ? `\nSubject: ${studySession.subject}` : ""}`,
    start: { dateTime: start.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    end: { dateTime: end.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
  };
}

function ExternalCalendarSync({ sessions = [] }) {
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const reconnectGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: "https://www.googleapis.com/auth/calendar.events",
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (error) {
      setStatus("error");
      setMessage(`Google Reconnection Failed: ${error.message}`);
    }
  };

  const syncGoogleCalendar = async () => {
    setStatus("loading");
    setMessage("");
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.provider_token) {
      setStatus("error");
      setMessage("Reconnect With Google And Allow Calendar Events Access Before Syncing.");
      return;
    }
    const upcomingSessions = sessions.filter((item) => item.date && new Date(item.date) >= new Date()).slice(0, 50);
    if (!upcomingSessions.length) {
      setStatus("error");
      setMessage("Create A Future Study Session Before Syncing.");
      return;
    }
    const results = await Promise.all(upcomingSessions.map((item) => fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.provider_token}`, "Content-Type": "application/json" },
      body: JSON.stringify(toGoogleEvent(item)),
    })));
    if (results.some((result) => !result.ok)) {
      setStatus("error");
      setMessage("Google Calendar Could Not Be Updated. Reconnect Google And Try Again.");
      return;
    }
    setStatus("success");
    setMessage(`${upcomingSessions.length} Study Session${upcomingSessions.length === 1 ? "" : "s"} Added To Google Calendar.`);
  };

  return (
    <section className="rounded-lg bg-gray-50 p-4">
      <div className="mb-3 flex items-center gap-2"><ExternalLink className="h-5 w-5 text-gray-600" /><h3 className="font-medium text-gray-900">Google Calendar Sync</h3></div>
      <p className="mb-4 text-sm text-gray-600">Add Your Upcoming Hyper Tutor Sessions To Your Primary Google Calendar.</p>
      <button type="button" onClick={syncGoogleCalendar} disabled={status === "loading"} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
        {status === "loading" ? <Loader2 className="animate-spin" size={16} /> : status === "success" ? <CheckCircle size={16} /> : <ExternalLink size={16} />}
        {status === "loading" ? "Syncing..." : status === "success" ? "Synced" : "Sync Google Calendar"}
      </button>
      {message && <p className={`mt-3 flex items-start gap-2 text-sm ${status === "error" ? "text-red-700" : "text-emerald-700"}`}>{status === "error" ? <AlertCircle size={16} className="mt-0.5 shrink-0" /> : <CheckCircle size={16} className="mt-0.5 shrink-0" />}{message}</p>}
      {status === "error" && <button type="button" onClick={reconnectGoogle} className="mt-3 rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">Reconnect Google</button>}
      <p className="mt-4 text-xs text-gray-500">Google Login Must Be Connected With Calendar Events Access.</p>
    </section>
  );
}

export default ExternalCalendarSync;
