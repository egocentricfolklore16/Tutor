import test from "node:test";
import assert from "node:assert/strict";
import { verifyAuthorization } from "../supabase/functions/ai-tutor-chat/authorization.ts";

test("verifyAuthorization returns 401 if Authorization header is missing", async () => {
  const mockAuth = {
    getUser: async () => ({ data: { user: { id: "user_123" } } }),
  };
  const result = await verifyAuthorization(null, mockAuth);
  assert.strictEqual(result.status, 401);
  assert.strictEqual(result.error, "Missing Authorization header");
});

test("verifyAuthorization returns 401 if user token is invalid or expired", async () => {
  const mockAuth = {
    getUser: async () => ({ data: { user: null }, error: { message: "Invalid JWT" } }),
  };
  const result = await verifyAuthorization("Bearer invalid_token", mockAuth);
  assert.strictEqual(result.status, 401);
  assert.strictEqual(result.error, "Unauthorized: Invalid or expired token");
});

test("verifyAuthorization succeeds when user is validly authenticated", async () => {
  const mockAuth = {
    getUser: async (token) => {
      assert.strictEqual(token, "valid_token");
      return { data: { user: { id: "user_123" } }, error: null };
    },
  };
  const result = await verifyAuthorization("Bearer valid_token", mockAuth);
  assert.strictEqual(result.status, 200);
  assert.strictEqual(result.userId, "user_123");
});
