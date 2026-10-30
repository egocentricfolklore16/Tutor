import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getFriendshipState,
  computeFriendStats,
  filterFriendsList,
} from "../src/features/community/utils/friendsUtils.js";

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

describe("computeFriendStats", () => {
  it("returns default zero stats for empty, non-array, or null inputs", () => {
    assert.deepEqual(computeFriendStats([]), { totalFriends: 0, avgLevel: 1, activeCount: 0 });
    assert.deepEqual(computeFriendStats(null), { totalFriends: 0, avgLevel: 1, activeCount: 0 });
  });

  it("calculates total friends, average level, and active count correctly", () => {
    const friends = [
      {
        id: "f-1",
        friend_profile: { level: 5, full_name: "Alice", username: "alice" },
      },
      {
        id: "f-2",
        friend_profile: { level: 10, full_name: "Bob", username: "bob" },
      },
      {
        id: "f-3",
        friend_profile: { level: 3, full_name: "Charlie", username: "charlie" },
      },
    ];

    const stats = computeFriendStats(friends, "me");
    assert.equal(stats.totalFriends, 3);
    assert.equal(stats.avgLevel, 6);
    assert.equal(stats.activeCount, 3);
  });
});

describe("filterFriendsList", () => {
  const friends = [
    {
      id: "f-1",
      friend_profile: { full_name: "Alice Smith", username: "asmith" },
    },
    {
      id: "f-2",
      friend_profile: { full_name: "Bob Johnson", username: "bjohnson" },
    },
    {
      id: "f-3",
      friend_profile: { full_name: "Charlie Brown", username: "cbrown" },
    },
  ];

  it("returns all friends if search query is empty or whitespace", () => {
    assert.equal(filterFriendsList(friends, "me", "").length, 3);
    assert.equal(filterFriendsList(friends, "me", "  ").length, 3);
  });

  it("filters friends by matching full name or username case-insensitively", () => {
    const resAlice = filterFriendsList(friends, "me", "alice");
    assert.equal(resAlice.length, 1);
    assert.equal(resAlice[0].id, "f-1");

    const resJohnson = filterFriendsList(friends, "me", "JOHNS");
    assert.equal(resJohnson.length, 1);
    assert.equal(resJohnson[0].id, "f-2");

    const resNone = filterFriendsList(friends, "me", "nonexistent");
    assert.equal(resNone.length, 0);
  });
});
