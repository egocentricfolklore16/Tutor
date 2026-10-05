import test from "node:test";
import assert from "node:assert/strict";

// Helper representing the authorization logic in supabase/functions/ai-tutor-chat/index.ts
function verifyAiTutorChatAuth(authHeader, getUserFn) {
  if (!authHeader) {
    return { status: 401, reply: "Unauthorized: Missing Authorization header." };
  }

  const token = authHeader.replace("Bearer ", "");
  const { user, error } = getUserFn(token);

  if (error || !user) {
    return { status: 401, reply: "Unauthorized: Invalid or expired session." };
  }

  return { status: 200, userId: user.id };
}

test("verifyAiTutorChatAuth returns 401 if Authorization header is missing", () => {
  const result = verifyAiTutorChatAuth(null, () => ({ user: null, error: null }));
  assert.strictEqual(result.status, 401);
  assert.strictEqual(result.reply, "Unauthorized: Missing Authorization header.");
});

test("verifyAiTutorChatAuth returns 401 if token is invalid or user is not found", () => {
  const result = verifyAiTutorChatAuth("Bearer invalid_token", () => ({
    user: null,
    error: new Error("Invalid token"),
  }));
  assert.strictEqual(result.status, 401);
  assert.strictEqual(result.reply, "Unauthorized: Invalid or expired session.");
});

test("verifyAiTutorChatAuth succeeds and extracts userId when token is valid", () => {
  const result = verifyAiTutorChatAuth("Bearer valid_token", (token) => {
    if (token === "valid_token") {
      return { user: { id: "user_abc_123" }, error: null };
    }
    return { user: null, error: new Error("Invalid token") };
  });

  assert.strictEqual(result.status, 200);
  assert.strictEqual(result.userId, "user_abc_123");
});
