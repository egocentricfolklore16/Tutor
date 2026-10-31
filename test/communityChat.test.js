import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatRelativeTime,
  formatDateSectionLabel,
  groupMessagesByDateAndSender,
  calculateUnreadCount,
  sanitizeUrl,
  parseLinksInText,
  toggleMessageReaction,
  filterMessagesBySearchQuery,
  formatReplyReference,
  togglePinnedMessage,
} from "../src/lib/communityChat.js";

test("formatRelativeTime returns 'just now' for null or invalid inputs", () => {
  assert.equal(formatRelativeTime(null), "just now");
  assert.equal(formatRelativeTime("invalid-date"), "just now");
  assert.equal(formatRelativeTime(new Date()), "just now");
});

test("formatRelativeTime formats minutes, hours, and days correctly", () => {
  const now = new Date();

  const fiveMinsAgo = new Date(now.getTime() - 5 * 60 * 1000);
  assert.equal(formatRelativeTime(fiveMinsAgo), "5m ago");

  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  assert.equal(formatRelativeTime(twoHoursAgo), "2h ago");

  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  assert.equal(formatRelativeTime(threeDaysAgo), "3d ago");
});

test("formatDateSectionLabel identifies Today and Yesterday accurately", () => {
  const now = new Date();
  assert.equal(formatDateSectionLabel(now), "Today");

  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  assert.equal(formatDateSectionLabel(yesterday), "Yesterday");
});

test("groupMessagesByDateAndSender groups messages chronologically and clusters consecutive sender messages", () => {
  const now = new Date();
  const m1 = {
    id: "1",
    sender_id: "user-a",
    content: "Hello",
    created_at: new Date(now.getTime() - 10000).toISOString(),
  };
  const m2 = {
    id: "2",
    sender_id: "user-a",
    content: "How are you?",
    created_at: new Date(now.getTime() - 5000).toISOString(),
  };
  const m3 = {
    id: "3",
    sender_id: "user-b",
    content: "I am good!",
    created_at: now.toISOString(),
  };

  const groups = groupMessagesByDateAndSender([m2, m1, m3]); // Out of order input

  assert.equal(groups.length, 1);
  assert.equal(groups[0].dateLabel, "Today");
  assert.equal(groups[0].clusters.length, 2);

  // Cluster 1 (user-a)
  assert.equal(groups[0].clusters[0].senderId, "user-a");
  assert.equal(groups[0].clusters[0].messages.length, 2);
  assert.equal(groups[0].clusters[0].messages[0].id, "1");

  // Cluster 2 (user-b)
  assert.equal(groups[0].clusters[1].senderId, "user-b");
  assert.equal(groups[0].clusters[1].messages.length, 1);
  assert.equal(groups[0].clusters[1].messages[0].id, "3");
});

test("calculateUnreadCount counts messages newer than last_read_at sent by other users", () => {
  const currentUserId = "me";
  const lastReadAt = new Date("2025-01-01T12:00:00Z").toISOString();

  const messages = [
    { id: "1", sender_id: "other", created_at: "2025-01-01T10:00:00Z" }, // Older -> read
    { id: "2", sender_id: "me", created_at: "2025-01-01T13:00:00Z" },    // Own msg -> ignore
    { id: "3", sender_id: "other", created_at: "2025-01-01T14:00:00Z" }, // Newer -> unread
    { id: "4", sender_id: "other", created_at: "2025-01-01T15:00:00Z" }, // Newer -> unread
  ];

  const count = calculateUnreadCount(messages, lastReadAt, currentUserId);
  assert.equal(count, 2);
});

test("sanitizeUrl allows safe protocols and neutralizes dangerous protocols", () => {
  assert.equal(sanitizeUrl("https://example.com/study"), "https://example.com/study");
  assert.equal(sanitizeUrl("http://localhost:3000"), "http://localhost:3000");
  assert.equal(sanitizeUrl("mailto:support@example.com"), "mailto:support@example.com");
  assert.equal(sanitizeUrl("/community/chat"), "/community/chat");
  assert.equal(sanitizeUrl("#section"), "#section");

  // XSS payloads
  assert.equal(sanitizeUrl("javascript:alert(1)"), "#");
  assert.equal(sanitizeUrl("  javascript:alert(1)  "), "#");
  assert.equal(sanitizeUrl("JAVASCRIPT:alert('xss')"), "#");
  assert.equal(sanitizeUrl("javascript:document.cookie"), "#");
  assert.equal(sanitizeUrl("data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=="), "#");
  assert.equal(sanitizeUrl("vbscript:msgbox(1)"), "#");

  // ASCII control character obfuscation payloads
  assert.equal(sanitizeUrl("java\x00script:alert(1)"), "#");
  assert.equal(sanitizeUrl("java\r\nscript:alert(1)"), "#");
  assert.equal(sanitizeUrl("https://example.com/path\x07"), "https://example.com/path");

  // Open redirect & protocol-relative URL bypass payloads
  assert.equal(sanitizeUrl("//evil.com"), "#");
  assert.equal(sanitizeUrl("//evil.com/path"), "#");
  assert.equal(sanitizeUrl("/\\evil.com"), "#");
  assert.equal(sanitizeUrl("/\\evil.com/path"), "#");
  assert.equal(sanitizeUrl("///evil.com"), "#");
  assert.equal(sanitizeUrl("/"), "/");
  assert.equal(sanitizeUrl("/planner"), "/planner");
  assert.equal(sanitizeUrl("/community/chat"), "/community/chat");

  // Edge cases
  assert.equal(sanitizeUrl(null), "#");
  assert.equal(sanitizeUrl(undefined), "#");
  assert.equal(sanitizeUrl(""), "#");
});

test("parseLinksInText extracts and sanitizes links from message text", () => {
  const text = "Check out https://hypertutor.app for study tools";
  const parts = parseLinksInText(text);

  assert.equal(parts.length, 3);
  assert.equal(parts[0].type, "text");
  assert.equal(parts[0].value, "Check out ");
  assert.equal(parts[1].type, "link");
  assert.equal(parts[1].value, "https://hypertutor.app");
  assert.equal(parts[2].type, "text");
  assert.equal(parts[2].value, " for study tools");
});

test("toggleMessageReaction adds and removes reactions correctly", () => {
  const initial = {};
  const step1 = toggleMessageReaction(initial, "user-1", "👍");
  assert.deepEqual(step1, { "👍": ["user-1"] });

  const step2 = toggleMessageReaction(step1, "user-2", "👍");
  assert.deepEqual(step2, { "👍": ["user-1", "user-2"] });

  const step3 = toggleMessageReaction(step2, "user-1", "👍");
  assert.deepEqual(step3, { "👍": ["user-2"] });

  const step4 = toggleMessageReaction(step3, "user-2", "👍");
  assert.deepEqual(step4, {});
});

test("filterMessagesBySearchQuery filters messages by text content or resource title", () => {
  const messages = [
    { id: "1", content: "Let's study Calculus" },
    { id: "2", content: "Physics notes", resourceTitle: "Mechanics Ch 1" },
    { id: "3", content: "Where is the room link?" },
  ];

  assert.equal(filterMessagesBySearchQuery(messages, "calculus").length, 1);
  assert.equal(filterMessagesBySearchQuery(messages, "mechanics").length, 1);
  assert.equal(filterMessagesBySearchQuery(messages, "").length, 3);
  assert.equal(filterMessagesBySearchQuery(messages, "biology").length, 0);
});

test("formatReplyReference formats target message preview for reply quote", () => {
  const messages = [
    { id: "msg-10", sender_id: "u-1", content: "What time is our group study session?" },
  ];
  const profiles = {
    "u-1": { full_name: "Alice Newton" },
  };

  const ref = formatReplyReference(messages, "msg-10", profiles);
  assert.equal(ref.id, "msg-10");
  assert.equal(ref.senderName, "Alice Newton");
  assert.equal(ref.snippet, "What time is our group study session?");
});

test("togglePinnedMessage adds and removes message ID from pinned list", () => {
  const pinned = ["msg-1"];
  const added = togglePinnedMessage(pinned, "msg-2");
  assert.deepEqual(added, ["msg-1", "msg-2"]);

  const removed = togglePinnedMessage(added, "msg-1");
  assert.deepEqual(removed, ["msg-2"]);
});
