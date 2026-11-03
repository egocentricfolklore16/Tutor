import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getFriendshipState } from "../src/features/community/utils/friendsUtils.js";

describe("getFriendshipState", () => {
  const currentUserId = "user-123";
  const targetUserId = "user-456";

  it("returns 'self' when currentUserId matches targetUserId or inputs are invalid", () => {
    assert.deepEqual(getFriendshipState([], currentUserId, currentUserId), {
      state: "self",
      friendshipId: null,
    });
    assert.deepEqual(getFriendshipState([], null, targetUserId), {
      state: "self",
      friendshipId: null,
    });
  });

  it("returns 'none' when no friendship row exists", () => {
    assert.deepEqual(getFriendshipState([], currentUserId, targetUserId), {
      state: "none",
      friendshipId: null,
    });
  });

  it("returns 'accepted' when friendship status is accepted", () => {
    const friendships = [
      {
        id: "f-1",
        requester_id: currentUserId,
        addressee_id: targetUserId,
        status: "accepted",
      },
    ];
    assert.deepEqual(getFriendshipState(friendships, currentUserId, targetUserId), {
      state: "accepted",
      friendshipId: "f-1",
    });
  });

  it("returns 'pending_sent' when current user requested target user", () => {
    const friendships = [
      {
        id: "f-2",
        requester_id: currentUserId,
        addressee_id: targetUserId,
        status: "pending",
      },
    ];
    assert.deepEqual(getFriendshipState(friendships, currentUserId, targetUserId), {
      state: "pending_sent",
      friendshipId: "f-2",
    });
  });

  it("returns 'pending_received' when target user requested current user", () => {
    const friendships = [
      {
        id: "f-3",
        requester_id: targetUserId,
        addressee_id: currentUserId,
        status: "pending",
      },
    ];
    assert.deepEqual(getFriendshipState(friendships, currentUserId, targetUserId), {
      state: "pending_received",
      friendshipId: "f-3",
    });
  });

  it("returns 'blocked' when friendship status is blocked", () => {
    const friendships = [
      {
        id: "f-4",
        requester_id: currentUserId,
        addressee_id: targetUserId,
        status: "blocked",
      },
    ];
    assert.deepEqual(getFriendshipState(friendships, currentUserId, targetUserId), {
      state: "blocked",
      friendshipId: "f-4",
    });
  });
});
