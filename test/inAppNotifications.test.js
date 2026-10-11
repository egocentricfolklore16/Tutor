import test from "node:test";
import assert from "node:assert/strict";
import { getNotificationDetails, groupNotificationsByDate } from "../src/lib/inAppNotifications.js";

// --- 1. getNotificationDetails Tests ---
test("getNotificationDetails formats friend_request correctly", () => {
  const item = {
    type: "friend_request",
    actor_id: "user-123",
    payload: { friendship_id: "fs-1" },
  };
  const details = getNotificationDetails(item, "Alice");
  assert.strictEqual(details.text, "Alice sent you a friend request.");
  assert.strictEqual(details.route, "/community/u/user-123");
});

test("getNotificationDetails formats friend_request_accepted correctly", () => {
  const item = {
    type: "friend_request_accepted",
    actor_id: "user-456",
    payload: { friendship_id: "fs-2" },
  };
  const details = getNotificationDetails(item, "Bob");
  assert.strictEqual(details.text, "Bob accepted your friend request.");
  assert.strictEqual(details.route, "/community/u/user-456");
});

test("getNotificationDetails formats new_message direct chat correctly", () => {
  const item = {
    type: "new_message",
    actor_id: "user-1",
    payload: {
      conversation_id: "conv-1",
      conversation_type: "direct",
      preview: "Hey, ready for study session?",
      count: 1,
    },
  };
  const details = getNotificationDetails(item, "Charlie");
  assert.strictEqual(details.text, "Charlie: Hey, ready for study session?");
  assert.strictEqual(details.route, "/community/chat/conv-1");
});

test("getNotificationDetails formats new_message group chat with multiple unread count correctly", () => {
  const item = {
    type: "new_message",
    actor_id: "user-2",
    payload: {
      conversation_id: "conv-2",
      conversation_type: "group",
      group_name: "Calculus Study Room",
      preview: "Let's review Chapter 4!",
      count: 5,
    },
  };
  const details = getNotificationDetails(item, "David");
  assert.strictEqual(
    details.text,
    "David in Calculus Study Room: Let's review Chapter 4! · 5 new messages"
  );
  assert.strictEqual(details.route, "/community/chat/conv-2");
});

test("getNotificationDetails formats group_study_session_scheduled correctly", () => {
  const item = {
    type: "group_study_session_scheduled",
    actor_id: "user-3",
    payload: {
      session_id: "sess-1",
      group_name: "Physics Squad",
      title: "Midterm Cram",
      scheduled_start: "2026-10-15T18:00:00Z",
    },
  };
  const details = getNotificationDetails(item, "Emma");
  assert.ok(details.text.startsWith("Emma scheduled Midterm Cram in Physics Squad"));
  assert.strictEqual(details.route, "/Community");
});

test("getNotificationDetails formats group_study_session_live and cancelled correctly", () => {
  const liveItem = {
    type: "group_study_session_live",
    payload: { title: "Exam Review" },
  };
  assert.strictEqual(getNotificationDetails(liveItem, "Frank").text, "Exam Review is live now");

  const cancelledItem = {
    type: "group_study_session_cancelled",
    payload: { title: "Exam Review" },
  };
  assert.strictEqual(getNotificationDetails(cancelledItem, "Frank").text, "Exam Review was cancelled");
});

test("getNotificationDetails formats group_join_request, approved, and member_joined correctly", () => {
  const reqItem = {
    type: "group_join_request",
    payload: { group_name: "Bio 101" },
  };
  assert.strictEqual(getNotificationDetails(reqItem, "Grace").text, "Grace requested to join Bio 101");

  const appItem = {
    type: "group_join_approved",
    payload: { group_name: "Bio 101" },
  };
  assert.strictEqual(getNotificationDetails(appItem, "Grace").text, "You're now in Bio 101");

  const joinedItem = {
    type: "group_member_joined",
    payload: { group_name: "Bio 101" },
  };
  assert.strictEqual(getNotificationDetails(joinedItem, "Hank").text, "Hank joined Bio 101");
});

test("getNotificationDetails handles unknown types gracefully without crashing", () => {
  const unknownItem = {
    type: "custom_unknown_type",
    payload: { message: "System maintenance tonight." },
  };
  const details = getNotificationDetails(unknownItem, "System");
  assert.strictEqual(details.text, "System maintenance tonight.");
  assert.strictEqual(details.route, "/Community");
});

test("getNotificationDetails handles null or missing payload safely", () => {
  const emptyItem = {
    type: "unknown_null_payload",
    payload: null,
  };
  const details = getNotificationDetails(emptyItem);
  assert.strictEqual(details.text, "New activity update.");
  assert.strictEqual(details.route, "/Community");
});

// --- 2. groupNotificationsByDate Tests ---
test("groupNotificationsByDate categorizes items into Today, Yesterday, and Earlier", () => {
  const now = new Date();
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0).toISOString();

  const yesterdayDateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 14, 0, 0);
  const yesterdayDate = yesterdayDateObj.toISOString();

  const earlierDateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 5, 10, 0, 0);
  const earlierDate = earlierDateObj.toISOString();

  const notifications = [
    { id: "1", created_at: todayDate },
    { id: "2", created_at: yesterdayDate },
    { id: "3", created_at: earlierDate },
  ];

  const grouped = groupNotificationsByDate(notifications);
  assert.strictEqual(grouped.today.length, 1);
  assert.strictEqual(grouped.today[0].id, "1");

  assert.strictEqual(grouped.yesterday.length, 1);
  assert.strictEqual(grouped.yesterday[0].id, "2");

  assert.strictEqual(grouped.earlier.length, 1);
  assert.strictEqual(grouped.earlier[0].id, "3");
});
