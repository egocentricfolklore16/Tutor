/**
 * Pure decision logic helper for the Dashboard Greeting Hero.
 *
 * Priority order:
 * 1. Resumable active/paused session exists -> "Pick up where you left off, {name}."
 * 2. New user (0 study history and 0 sessions) -> "Welcome to Hyper Tutor, {name}."
 * 3. Daily goal crushed (doneMinutes >= goalMinutes) -> "Goal crushed, {name}!"
 * 4. Streak at risk (streak > 0, not studied today, hour >= 18) -> "Keep your {n}-day streak alive."
 * 5. Returning user (lastActiveDate >= 3 days ago) -> "Welcome back, {name}."
 * 6. Default -> "Make today count, {name}."
 */

export function getHeroState({
  hour = 12,
  name = "there",
  isNewUser = false,
  resumable = null, // { id, topic, subject }
  streak = 0,
  lastActiveDate = null,
  studiedToday = false,
  goalMinutes = 45,
  doneMinutes = 0,
}) {
  // Truncate first name at 14 characters
  const rawName = (name || "there").trim();
  const firstName = rawName.split(" ")[0];
  const truncatedName = firstName.length > 14 ? `${firstName.slice(0, 14)}…` : firstName || "there";

  // Determine Eyebrow text and timeVariant by hour (in user's timezone)
  let eyebrow = "GOOD DAY";
  let timeVariant = "afternoon";

  if (hour >= 5 && hour < 12) {
    eyebrow = "GOOD MORNING";
    timeVariant = "morning";
  } else if (hour >= 12 && hour < 17) {
    eyebrow = "GOOD AFTERNOON";
    timeVariant = "afternoon";
  } else if (hour >= 17 && hour < 22) {
    eyebrow = "GOOD EVENING";
    timeVariant = "evening";
  } else {
    eyebrow = "LATE NIGHT";
    timeVariant = "night";
  }

  let headline = "";
  let subline = "";
  let primaryLabel = "Start Study Session";
  let primaryAction = "start_session";
  let secondaryLabel = "Ask AI Tutor";
  let secondaryAction = "open_ai_tutor";
  let owlPose = timeVariant === "night" ? "sleepy" : "greeting";

  // Priority 1: Resumable active or paused session
  if (resumable && (resumable.topic || resumable.subject)) {
    const rawTopic = resumable.topic || resumable.subject;
    const topicTruncated = rawTopic.length > 22 ? `${rawTopic.slice(0, 22)}…` : rawTopic;
    headline = `Pick up where you left off, ${truncatedName}.`;
    subline = `"${topicTruncated}" is waiting for you.`;
    primaryLabel = `Resume ${topicTruncated}`;
    primaryAction = "resume_session";
  }
  // Priority 2: New user
  else if (isNewUser) {
    headline = `Welcome to Hyper Tutor, ${truncatedName}.`;
    subline = "Start your first session and Lumo will tailor everything to you.";
    primaryLabel = "Start your first session";
  }
  // Priority 3: Goal crushed today
  else if (goalMinutes > 0 && doneMinutes >= goalMinutes) {
    headline = `Goal crushed, ${truncatedName}!`;
    subline = "Keep the momentum or review what you learned.";
    owlPose = "celebrate";
    primaryLabel = "Start another session";
  }
  // Priority 4: Streak at risk (streak > 0, not studied today, local hour >= 18)
  else if (streak > 0 && !studiedToday && hour >= 18) {
    headline = `Keep your ${streak}-day streak alive.`;
    subline = "A 10-minute session is enough.";
    primaryLabel = "Start a quick session";
  }
  // Priority 5: Returning user (last active >= 3 days ago)
  else if (lastActiveDate && isDaysAgoOrMore(lastActiveDate, 3)) {
    headline = `Welcome back, ${truncatedName}.`;
    subline = "Let's ease back in with a short session.";
    primaryLabel = "Start Study Session";
  }
  // Priority 6: Default fallback
  else {
    headline = `Make today count, ${truncatedName}.`;
    subline = "Ready for a focused study session?";
    primaryLabel = "Start Study Session";
  }

  return {
    eyebrow,
    headline,
    subline,
    primaryLabel,
    primaryAction,
    secondaryLabel,
    secondaryAction,
    timeVariant,
    owlPose,
    truncatedName,
  };
}

function isDaysAgoOrMore(dateStr, days) {
  try {
    const past = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - past.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays >= days;
  } catch {
    return false;
  }
}

export const HERO_QUOTES = [
  "A brighter you, a bolder tomorrow.",
  "Small sessions, big results.",
  "Focus now. Shine later.",
  "Every question you ask makes you sharper.",
  "Progress beats perfect.",
  "Ten focused minutes still count.",
  "You are one session away from clarity.",
  "Consistency is your superpower.",
  "Learn it, test it, own it.",
  "Today's effort is tomorrow's confidence.",
];
