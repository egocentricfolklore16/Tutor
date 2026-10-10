import supabase from "./supabase.js";

/**
 * Convert a study session to Google Calendar event format
 */
export function toGoogleEvent(studySession) {
  const start = new Date(studySession.date);
  const [hours, minutes] = (studySession?.startTime || "09:00").split(":").map(Number);
  start.setHours(hours || 9, minutes || 0, 0, 0);
  const end = new Date(start.getTime() + (Number(studySession.duration) || 1) * 60 * 60 * 1000);
  
  return {
    summary: studySession.title || studySession.subject || "Hyper Tutor Study Session",
    description: `Planned In Hyper Tutor${studySession.subject ? `\nSubject: ${studySession.subject}` : ""}`,
    start: { 
      dateTime: start.toISOString(), 
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone 
    },
    end: { 
      dateTime: end.toISOString(), 
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone 
    },
  };
}

/**
 * Check if user has Google OAuth connected with calendar access
 */
export async function hasGoogleCalendarAccess() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) return false;
    
    // Check if provider_token exists (indicates OAuth is connected)
    return !!session.provider_token;
  } catch (err) {
    console.error("Error checking Google calendar access:", err);
    return false;
  }
}

/**
 * Sync a single study session to Google Calendar
 * @param {Object} studySession - The session to sync
 * @returns {Promise<{success: boolean, message: string, eventId?: string}>}
 */
export async function syncSessionToGoogleCalendar(studySession) {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.provider_token) {
      return {
        success: false,
        message: "Google Calendar not connected. Please connect your Google account with calendar access.",
      };
    }

    // Only sync future sessions
    if (new Date(studySession.date) < new Date()) {
      return {
        success: false,
        message: "Cannot sync past sessions to Google Calendar.",
      };
    }

    const googleEvent = toGoogleEvent(studySession);

    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.provider_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(googleEvent),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to sync with Google Calendar");
    }

    const data = await response.json();
    return {
      success: true,
      message: "Session synced to Google Calendar successfully!",
      eventId: data.id,
    };
  } catch (err) {
    console.error("Error syncing to Google Calendar:", err);
    return {
      success: false,
      message: `Failed to sync: ${err.message}`,
    };
  }
}

/**
 * Request Google OAuth connection with calendar access
 */
export async function requestGoogleCalendarConnection() {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: "https://www.googleapis.com/auth/calendar.events",
        queryParams: { 
          access_type: "offline", 
          prompt: "consent" 
        },
      },
    });

    if (error) {
      return {
        success: false,
        message: `Google connection failed: ${error.message}`,
      };
    }

    return {
      success: true,
      message: "Redirecting to Google authentication...",
    };
  } catch (err) {
    console.error("Error requesting Google connection:", err);
    return {
      success: false,
      message: `Connection error: ${err.message}`,
    };
  }
}
