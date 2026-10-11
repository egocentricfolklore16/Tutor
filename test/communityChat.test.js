import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatRelativeTime,
  formatDateSectionLabel,
  groupMessagesByDateAndSender,
  calculateUnreadCount,
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
