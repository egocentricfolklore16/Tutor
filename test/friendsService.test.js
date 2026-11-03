import test from "node:test";
import assert from "node:assert/strict";
import { sendFriendRequest, searchUsers } from "../src/features/community/services/friendsService.js";

test("sendFriendRequest rejects self-friend requests", async () => {
  await assert.rejects(
    async () => {
      await sendFriendRequest("user-123", "user-123");
    },
    {
      name: "Error",
      message: "You cannot send a friend request to yourself",
    }
  );
});

test("searchUsers returns empty array for short search queries", async () => {
  const results = await searchUsers("a", "user-123");
  assert.deepStrictEqual(results, []);
});
