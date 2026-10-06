import test from "node:test";
import assert from "node:assert/strict";

// Helper logic representing authorization enforcement in ai-tutor-chat Edge Function
function verifyAiTutorChatAuthorization(authHeader, user) {
  if (!authHeader) {
    return { status: 401, success: false, error: "Missing Authorization header" };
  }

  if (!user) {
    return { status: 401, success: false, error: "Unauthorized: Invalid or expired token" };
  }

  return { status: 200, success: true, userId: user.id };
}

test("verifyAiTutorChatAuthorization returns 401 if Authorization header is missing", () => {
  const result = verifyAiTutorChatAuthorization(null, { id: "user_123" });
  assert.strictEqual(result.status, 401);
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.error, "Missing Authorization header");
});

test("verifyAiTutorChatAuthorization returns 401 if user authentication fails", () => {
  const result = verifyAiTutorChatAuthorization("Bearer invalid_token", null);
  assert.strictEqual(result.status, 401);
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.error, "Unauthorized: Invalid or expired token");
});

test("verifyAiTutorChatAuthorization succeeds when user is authenticated", () => {
  const result = verifyAiTutorChatAuthorization("Bearer valid_token", { id: "user_123" });
  assert.strictEqual(result.status, 200);
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.userId, "user_123");
});
