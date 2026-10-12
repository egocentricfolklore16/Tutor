import { test } from "node:test";
import assert from "node:assert/strict";

// Pure helper function for quiet hours calculation
function isQuietHoursActive(quietStart, quietEnd, nowTime = "23:30") {
  if (!quietStart || !quietEnd) return false;
  const [nowH, nowM] = nowTime.split(":").map(Number);
  const currentMins = nowH * 60 + (nowM || 0);

  const [sH, sM] = quietStart.split(":").map(Number);
  const [eH, eM] = quietEnd.split(":").map(Number);
  const startMins = sH * 60 + (sM || 0);
  const endMins = eH * 60 + (eM || 0);

  if (startMins < endMins) {
    return currentMins >= startMins && currentMins < endMins;
  } else {
    // Overnight span (e.g., 22:00 to 07:00)
    return currentMins >= startMins || currentMins < endMins;
  }
}

// Pure helper function for notification payload construction
function buildNotificationPayload({ type, title, body, conversationId, actorId, showPreview = true }) {
  let finalTitle = title || "Hyper Tutor";
  let finalBody = body || "You have a new update.";
  let url = "/community/chat";
  let tag = `notif-${Date.now()}`;

  if (type === "message") {
    url = conversationId ? `/community/chat/${conversationId}` : "/community/chat";
    tag = conversationId ? `chat-${conversationId}` : "chat-general";

    if (!showPreview) {
      finalBody = "Sent you a message";
    } else if (finalBody && finalBody.length > 100) {
      finalBody = finalBody.substring(0, 97) + "...";
    }
  } else if (type === "friend_request") {
    finalTitle = "New friend request";
    url = "/community/friends";
    tag = "friend-requests";
  } else if (type === "friend_accepted") {
    finalTitle = "Friend request accepted";
    url = "/community/friends";
    tag = "friend-accepts";
  }

  return {
    title: finalTitle,
    body: finalBody,
    url,
    tag,
  };
}

// Pure helper function for mute status check
function isConversationMuted(mutedUntilISO, nowISO = new Date().toISOString()) {
  if (mutedUntilISO === undefined || mutedUntilISO === null) return false;
  // If muted_until is set, check if timestamp is in the future
  return new Date(mutedUntilISO).getTime() > new Date(nowISO).getTime();
}

test("buildNotificationPayload constructs direct message payload with preview", () => {
  const payload = buildNotificationPayload({
    type: "message",
    title: "Alice",
    body: "Hey, do you want to study Calculus together today?",
    conversationId: "conv-123",
    showPreview: true,
  });

  assert.equal(payload.title, "Alice");
  assert.equal(payload.body, "Hey, do you want to study Calculus together today?");
  assert.equal(payload.url, "/community/chat/conv-123");
  assert.equal(payload.tag, "chat-conv-123");
});

test("buildNotificationPayload hides preview when show_message_preview is false", () => {
  const payload = buildNotificationPayload({
    type: "message",
    title: "Bob",
    body: "Confidential message content",
    conversationId: "conv-456",
    showPreview: false,
  });

  assert.equal(payload.body, "Sent you a message");
});

test("buildNotificationPayload truncates message text longer than 100 characters", () => {
  const longText = "a".repeat(120);
  const payload = buildNotificationPayload({
    type: "message",
    title: "Carol",
    body: longText,
    conversationId: "conv-789",
    showPreview: true,
  });

  assert.equal(payload.body.length, 100);
  assert.ok(payload.body.endsWith("..."));
});

test("buildNotificationPayload constructs friend request payload", () => {
  const payload = buildNotificationPayload({
    type: "friend_request",
    body: "David wants to be your friend",
  });

  assert.equal(payload.title, "New friend request");
  assert.equal(payload.url, "/community/friends");
  assert.equal(payload.tag, "friend-requests");
});

test("buildNotificationPayload constructs friend accepted payload", () => {
  const payload = buildNotificationPayload({
    type: "friend_accepted",
    body: "Eve accepted your friend request",
  });

  assert.equal(payload.title, "Friend request accepted");
  assert.equal(payload.url, "/community/friends");
  assert.equal(payload.tag, "friend-accepts");
});

test("isQuietHoursActive detects active quiet hours spanning midnight", () => {
  assert.equal(isQuietHoursActive("22:00", "07:00", "23:30"), true);
  assert.equal(isQuietHoursActive("22:00", "07:00", "05:15"), true);
  assert.equal(isQuietHoursActive("22:00", "07:00", "14:00"), false);
});

test("isConversationMuted calculates active mute window correctly", () => {
  const futureDate = new Date(Date.now() + 3600000).toISOString();
  const pastDate = new Date(Date.now() - 3600000).toISOString();

  assert.equal(isConversationMuted(futureDate), true);
  assert.equal(isConversationMuted(pastDate), false);
  assert.equal(isConversationMuted(null), false);
});
