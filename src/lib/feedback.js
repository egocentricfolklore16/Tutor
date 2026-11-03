import supabase from "./supabase.js";
import { awardUserRewards } from "./gamification.js";

export const FEEDBACK_TYPES = {
  BUG: "bug",
  FEATURE_REQUEST: "feature_request",
  CONTENT_QUALITY: "content_quality",
  GENERAL: "general",
  TUTOR_RESPONSE: "tutor_response",
  NPS: "nps",
  ONBOARDING: "onboarding",
};

export const FEEDBACK_STATUSES = {
  NEW: "new",
  REVIEWING: "reviewing",
  PLANNED: "planned",
  IN_PROGRESS: "in_progress",
  RESOLVED: "resolved",
  CLOSED: "closed",
  WONT_FIX: "wont_fix",
};

const DRAFT_KEY = "hyper-tutor-feedback-draft";
const RATE_LIMIT_KEY = "hyper-tutor-feedback-rate-limit";
const MAX_SUBMISSIONS_PER_HOUR = 5;

/**
 * Capture browser, OS, screen resolution, and viewport details.
 */
export function getDeviceMetadata() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return { platform: "unknown" };
  }

  const ua = navigator.userAgent || "";
  let browser = "Unknown Browser";
  if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("Chrome/")) browser = "Chrome";
  else if (ua.includes("Safari/")) browser = "Safari";

  let os = "Unknown OS";
  if (ua.includes("Win")) os = "Windows";
  else if (ua.includes("Mac")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  return {
    browser,
    os,
    user_agent: ua,
    screen_resolution: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
    viewport_size: `${window.innerWidth || 0}x${window.innerHeight || 0}`,
    language: navigator.language || "en",
  };
}

/**
 * Get current application version.
 */
export function getAppVersion() {
  return "0.0.0";
}

/**
 * Collect automatic environmental context.
 */
export function getAutoContext(customContext = {}) {
  const page_url = typeof window !== "undefined" ? window.location.href : "";
  const screen = typeof window !== "undefined" ? window.location.pathname : "";

  return {
    screen,
    page_url,
    device: getDeviceMetadata(),
    app_version: getAppVersion(),
    context: customContext,
  };
}

/**
 * Basic local rate limiting check (Max 5 submissions per hour per user).
 */
export function checkRateLimit() {
  try {
    if (typeof localStorage === "undefined") return { allowed: true, remaining: 5 };
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    const now = Date.now();
    const windowMs = 60 * 60 * 1000; // 1 hour

    let timestamps = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(timestamps)) timestamps = [];

    // Filter out timestamps older than 1 hour
    timestamps = timestamps.filter((ts) => typeof ts === "number" && now - ts < windowMs);
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(timestamps));

    if (timestamps.length >= MAX_SUBMISSIONS_PER_HOUR) {
      const oldest = timestamps[0];
      const resetMinutes = Math.ceil((windowMs - (now - oldest)) / (60 * 1000));
      return { allowed: false, remaining: 0, resetMinutes };
    }

    return { allowed: true, remaining: MAX_SUBMISSIONS_PER_HOUR - timestamps.length };
  } catch (err) {
    console.error("Rate limit check failed:", err);
    return { allowed: true, remaining: 5 };
  }
}

/**
 * Record successful submission timestamp for rate limiting.
 */
export function recordSubmissionTimestamp() {
  try {
    if (typeof localStorage === "undefined") return;
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    const now = Date.now();
    let timestamps = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(timestamps)) timestamps = [];
    timestamps.push(now);
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(timestamps));
  } catch (err) {
    console.error("Failed to record submission timestamp:", err);
  }
}

/**
 * Save draft offline in localStorage.
 */
export function saveFeedbackDraft(draft) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, savedAt: new Date().toISOString() }));
  } catch (err) {
    console.error("Error saving feedback draft:", err);
  }
}

/**
 * Retrieve saved draft from localStorage.
 */
export function getFeedbackDraft() {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Clear saved draft from localStorage.
 */
export function clearFeedbackDraft() {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(DRAFT_KEY);
    }
  } catch (err) {
    console.error("Error clearing feedback draft:", err);
  }
}

/**
 * Validate input fields for feedback submission.
 */
export function validateFeedbackInput({ type, rating, nps_score, message }) {
  const errors = [];

  const validTypes = Object.values(FEEDBACK_TYPES);
  if (type && !validTypes.includes(type)) {
    errors.push("Invalid feedback type selected.");
  }

  if (rating !== undefined && rating !== null) {
    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      errors.push("Rating must be a number between 1 and 5.");
    }
  }

  if (nps_score !== undefined && nps_score !== null) {
    if (typeof nps_score !== "number" || nps_score < 0 || nps_score > 10) {
      errors.push("NPS score must be between 0 and 10.");
    }
  }

  if (message && typeof message === "string" && message.trim().length > 3000) {
    errors.push("Message cannot exceed 3000 characters.");
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Grant reward for feedback submission if not already granted today.
 */
export async function processFeedbackReward(userId, feedbackId) {
  if (!userId || !feedbackId) return { granted: false, reason: "missing_params" };

  try {
    // Attempt RPC first
    const { data: rpcData, error: rpcErr } = await supabase.rpc("grant_feedback_bonus", {
      p_feedback_id: feedbackId,
    });

    if (!rpcErr && rpcData) {
      if (rpcData.granted) {
        awardUserRewards(userId, { xp: 10 });
      }
      return rpcData;
    }
  } catch (err) {
    console.warn("RPC grant_feedback_bonus unavailable, trying table fallback:", err);
  }

  // Fallback: table query and insert
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: existingRewards } = await supabase
      .from("feedback_rewards")
      .select("id")
      .eq("user_id", userId)
      .gte("granted_at", todayStart.toISOString());

    if (existingRewards && existingRewards.length > 0) {
      return { granted: false, reason: "daily_limit_reached" };
    }

    const { error: insertErr } = await supabase.from("feedback_rewards").insert({
      user_id: userId,
      feedback_id: feedbackId,
      reward_type: "feedback_bonus",
      reward_value: 10,
      granted_at: new Date().toISOString(),
    });

    if (!insertErr) {
      await awardUserRewards(userId, { xp: 10 });
      return { granted: true, reward_type: "feedback_bonus", reward_value: 10 };
    }
  } catch (fallbackErr) {
    console.error("Fallback processFeedbackReward failed:", fallbackErr);
  }

  return { granted: false, reason: "failed" };
}

/**
 * Submit feedback to Supabase with auto-metadata capture, rate limiting, and incentive logic.
 */
export async function submitFeedback(payload, customContext = {}) {
  const rateCheck = checkRateLimit();
  if (!rateCheck.allowed) {
    return {
      success: false,
      error: `Rate limit reached. Please wait ${rateCheck.resetMinutes} minute(s) before submitting again.`,
      isRateLimit: true,
    };
  }

  const validation = validateFeedbackInput(payload);
  if (!validation.isValid) {
    return {
      success: false,
      error: validation.errors.join(" "),
    };
  }

  const autoMeta = getAutoContext(customContext);

  const insertData = {
    user_id: payload.user_id || null,
    type: payload.type || FEEDBACK_TYPES.GENERAL,
    rating: payload.rating || null,
    nps_score: payload.nps_score ?? null,
    message: payload.message ? payload.message.trim() : null,
    category: payload.category || null,
    tags: payload.tags || [],
    screen: payload.screen || autoMeta.screen,
    page_url: payload.page_url || autoMeta.page_url,
    context: payload.context ? { ...autoMeta.context, ...payload.context } : autoMeta.context,
    attachment_url: payload.attachment_url || null,
    email: payload.email || null,
    allow_contact: Boolean(payload.allow_contact),
    is_public: Boolean(payload.is_public),
    status: FEEDBACK_STATUSES.NEW,
    device: autoMeta.device,
    app_version: autoMeta.app_version,
  };

  try {
    const { data, error } = await supabase
      .from("feedback")
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error("Error inserting feedback:", error);
      saveFeedbackDraft(payload);
      return {
        success: false,
        error: error.message || "Failed to submit feedback. Draft saved locally.",
        savedDraft: true,
      };
    }

    clearFeedbackDraft();
    recordSubmissionTimestamp();

    // Reward handling if user is authenticated and submitted a message
    let rewardResult = { granted: false };
    if (insertData.user_id && insertData.message && insertData.message.length > 0) {
      rewardResult = await processFeedbackReward(insertData.user_id, data.id);
    }

    return {
      success: true,
      data,
      reward: rewardResult,
    };
  } catch (err) {
    console.error("Unexpected error submitting feedback:", err);
    saveFeedbackDraft(payload);
    return {
      success: false,
      error: "Network or server error. Your feedback draft was saved locally.",
      savedDraft: true,
    };
  }
}

/**
 * Check if a prompt is eligible to be shown to the user according to anti-annoyance rules.
 */
export function checkPromptEligibility({ prompt, userState, sessionPromptedThisSession = false }) {
  if (!prompt || !prompt.is_active) {
    return { eligible: false, reason: "inactive" };
  }

  // Anti-annoyance Rule 1: Never show more than one prompt per session
  if (sessionPromptedThisSession) {
    return { eligible: false, reason: "already_prompted_this_session" };
  }

  if (!userState) {
    return { eligible: true };
  }

  const now = new Date();

  // Anti-annoyance Rule 2: Honor snooze_until
  if (userState.snooze_until) {
    const snoozeUntilDate = new Date(userState.snooze_until);
    if (snoozeUntilDate > now) {
      return { eligible: false, reason: "snoozed" };
    }
  }

  // Anti-annoyance Rule 3: Respect cooldown_days
  if (prompt.cooldown_days && userState.last_prompted_at) {
    const lastPrompted = new Date(userState.last_prompted_at);
    const cooldownMs = prompt.cooldown_days * 24 * 60 * 60 * 1000;
    if (now.getTime() - lastPrompted.getTime() < cooldownMs) {
      return { eligible: false, reason: "cooldown_active" };
    }
  }

  // Anti-annoyance Rule 4: Respect max_shows_per_user
  if (prompt.max_shows_per_user && userState.total_submitted) {
    if ((userState.total_submitted || 0) >= prompt.max_shows_per_user) {
      return { eligible: false, reason: "max_shows_reached" };
    }
  }

  return { eligible: true };
}

/**
 * Fetch active prompts from feedback_prompts.
 */
export async function fetchActivePrompts() {
  try {
    const { data, error } = await supabase
      .from("feedback_prompts")
      .select("*")
      .eq("is_active", true);

    if (error) {
      console.error("Error fetching active prompts:", error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("Unexpected error fetching feedback prompts:", err);
    return [];
  }
}

/**
 * Fetch or initialize user_feedback_state for a user.
 */
export async function fetchUserFeedbackState(userId) {
  if (!userId) return null;

  try {
    const { data, error } = await supabase
      .from("user_feedback_state")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching user feedback state:", error);
      return null;
    }

    if (!data) {
      // Initialize default state row
      const initialState = {
        user_id: userId,
        total_submitted: 0,
        total_dismissed: 0,
        sessions_since_prompt: 0,
      };
      const { data: created } = await supabase
        .from("user_feedback_state")
        .insert([initialState])
        .select()
        .single();
      return created || initialState;
    }

    return data;
  } catch (err) {
    console.error("Unexpected error fetching user feedback state:", err);
    return null;
  }
}

/**
 * Log prompt events (shown, dismissed, snoozed, submitted) and update user_feedback_state.
 */
export async function logPromptEvent({ userId, promptId, action, feedbackId = null, currentDismissedCount = 0 }) {
  if (!userId || !promptId) return;

  try {
    // 1. Log event
    await supabase.from("feedback_prompt_events").insert([
      {
        user_id: userId,
        prompt_id: promptId,
        action,
        feedback_id: feedbackId,
        created_at: new Date().toISOString(),
      },
    ]);

    // 2. Prepare state updates based on action
    const nowIso = new Date().toISOString();
    const stateUpdates = {
      last_prompted_at: nowIso,
    };

    if (action === "submitted") {
      stateUpdates.last_submitted_at = nowIso;
      stateUpdates.snooze_until = null; // reset snooze on submission
    } else if (action === "snoozed") {
      // "Maybe later" snoozes 3 days
      const snoozeDate = new Date();
      snoozeDate.setDate(snoozeDate.getDate() + 3);
      stateUpdates.snooze_until = snoozeDate.toISOString();
    } else if (action === "dismissed") {
      const nextDismissedCount = currentDismissedCount + 1;
      stateUpdates.total_dismissed = nextDismissedCount;
      if (nextDismissedCount >= 2) {
        // Dismissing twice snoozes 14 days
        const snoozeDate = new Date();
        snoozeDate.setDate(snoozeDate.getDate() + 14);
        stateUpdates.snooze_until = snoozeDate.toISOString();
      }
    }

    // Upsert state update
    const { data: existingState } = await supabase
      .from("user_feedback_state")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingState) {
      if (action === "submitted") {
        stateUpdates.total_submitted = (existingState.total_submitted || 0) + 1;
      }
      await supabase
        .from("user_feedback_state")
        .update(stateUpdates)
        .eq("user_id", userId);
    } else {
      await supabase.from("user_feedback_state").insert([
        {
          user_id: userId,
          ...stateUpdates,
          total_submitted: action === "submitted" ? 1 : 0,
          total_dismissed: action === "dismissed" ? 1 : 0,
        },
      ]);
    }
  } catch (err) {
    console.error("Error logging prompt event or updating state:", err);
  }
}

/**
 * Submit inline tutor answer feedback.
 */
export async function submitTutorResponseFeedback({ userId, messageId, rating, message = "", context = {} }) {
  return submitFeedback(
    {
      user_id: userId,
      type: FEEDBACK_TYPES.TUTOR_RESPONSE,
      rating: rating,
      message: message,
      context: {
        tutor_message_id: messageId,
        ...context,
      },
    },
    { tutor_message_id: messageId }
  );
}

/**
 * Fetch feedback submissions for current user with replies.
 */
export async function fetchMyFeedback(userId) {
  if (!userId) return [];

  try {
    const { data, error } = await supabase
      .from("feedback")
      .select(`
        *,
        feedback_replies (
          id,
          author_id,
          message,
          is_internal,
          created_at
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching my feedback:", error);
      return [];
    }

    // Filter out internal replies for end users
    return (data || []).map((item) => ({
      ...item,
      feedback_replies: (item.feedback_replies || []).filter((r) => !r.is_internal),
    }));
  } catch (err) {
    console.error("Unexpected error fetching user feedback:", err);
    return [];
  }
}

/**
 * Fetch public feature request ideas for Roadmap.
 */
export async function fetchPublicRoadmap(userId = null) {
  try {
    const { data, error } = await supabase
      .from("feedback")
      .select(`
        *,
        feedback_votes (
          id,
          user_id
        )
      `)
      .eq("is_public", true)
      .eq("type", FEEDBACK_TYPES.FEATURE_REQUEST)
      .order("vote_count", { ascending: false });

    if (error) {
      console.error("Error fetching public roadmap:", error);
      return [];
    }

    return (data || []).map((item) => {
      const votes = item.feedback_votes || [];
      const userHasVoted = userId ? votes.some((v) => v.user_id === userId) : false;
      return {
        ...item,
        userHasVoted,
      };
    });
  } catch (err) {
    console.error("Unexpected error fetching public roadmap:", err);
    return [];
  }
}

/**
 * Toggle vote on public feedback item.
 */
export async function toggleFeedbackVote(feedbackId, userId) {
  if (!feedbackId || !userId) return { success: false, error: "Authentication required to vote." };

  try {
    // Try RPC first
    const { data: rpcData, error: rpcErr } = await supabase.rpc("toggle_feedback_vote", {
      p_feedback_id: feedbackId,
    });

    if (!rpcErr && rpcData) {
      return { success: true, voted: rpcData.voted, vote_count: rpcData.vote_count };
    }
  } catch (err) {
    console.warn("RPC toggle_feedback_vote unavailable, fallback to direct query:", err);
  }

  // Fallback direct table handling
  try {
    const { data: existing } = await supabase
      .from("feedback_votes")
      .select("id")
      .eq("feedback_id", feedbackId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      await supabase.from("feedback_votes").delete().eq("id", existing.id);
      return { success: true, voted: false };
    } else {
      await supabase.from("feedback_votes").insert([{ feedback_id: feedbackId, user_id: userId }]);
      return { success: true, voted: true };
    }
  } catch (fallbackErr) {
    console.error("Fallback toggle vote error:", fallbackErr);
    return { success: false, error: "Failed to process vote." };
  }
}

/**
 * Fetch all feedback items for Admin Dashboard.
 */
export async function fetchAdminFeedbackList(filters = {}) {
  try {
    let query = supabase
      .from("feedback")
      .select(`
        *,
        feedback_replies (
          id,
          author_id,
          message,
          is_internal,
          created_at
        )
      `)
      .order("created_at", { ascending: false });

    if (filters.type && filters.type !== "all") {
      query = query.eq("type", filters.type);
    }
    if (filters.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }
    if (filters.rating && filters.rating !== "all") {
      query = query.eq("rating", Number(filters.rating));
    }
    if (filters.search) {
      query = query.or(`message.ilike.%${filters.search}%,category.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching admin feedback list:", error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("Unexpected error fetching admin feedback:", err);
    return [];
  }
}

/**
 * Update feedback status, priority, tags, and admin notes (Admin function).
 */
export async function updateAdminFeedback(feedbackId, updates) {
  try {
    const payload = {
      ...updates,
      updated_at: new Date().toISOString(),
    };
    if (updates.status === FEEDBACK_STATUSES.RESOLVED || updates.status === FEEDBACK_STATUSES.CLOSED) {
      payload.resolved_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("feedback")
      .update(payload)
      .eq("id", feedbackId)
      .select()
      .single();

    if (error) {
      console.error("Error updating admin feedback:", error);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    console.error("Unexpected error updating feedback:", err);
    return { success: false, error: "Failed to update feedback item." };
  }
}

/**
 * Add admin reply to feedback (Public or Internal).
 */
export async function addFeedbackReply({ feedbackId, authorId, message, isInternal = false }) {
  if (!feedbackId || !message) return { success: false, error: "Missing required fields." };

  try {
    const { data, error } = await supabase
      .from("feedback_replies")
      .insert([
        {
          feedback_id: feedbackId,
          author_id: authorId,
          message: message.trim(),
          is_internal: Boolean(isInternal),
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error adding feedback reply:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    console.error("Unexpected error adding reply:", err);
    return { success: false, error: "Failed to add reply." };
  }
}

/**
 * Generate CSV data export for Admin dashboard.
 */
export function exportFeedbackToCSV(feedbackList = []) {
  if (!feedbackList || feedbackList.length === 0) return "";

  const headers = [
    "ID",
    "Type",
    "Status",
    "Priority",
    "Rating",
    "NPS Score",
    "Category",
    "Message",
    "Screen",
    "Page URL",
    "Email",
    "Vote Count",
    "Created At",
  ];

  const rows = feedbackList.map((item) => [
    item.id || "",
    item.type || "",
    item.status || "",
    item.priority || "",
    item.rating || "",
    item.nps_score ?? "",
    `"${(item.category || "").replace(/"/g, '""')}"`,
    `"${(item.message || "").replace(/"/g, '""')}"`,
    `"${(item.screen || "").replace(/"/g, '""')}"`,
    `"${(item.page_url || "").replace(/"/g, '""')}"`,
    item.email || "",
    item.vote_count || 0,
    item.created_at || "",
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}
