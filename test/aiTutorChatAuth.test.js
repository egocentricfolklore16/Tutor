import test from "node:test";
import assert from "node:assert/strict";

// Helper logic representing authentication checks in ai-tutor-chat Edge Function
function verifyAiTutorChatAuth(authHeader, userResolver) {
  if (!authHeader) {
    return { status: 401, error: "Missing Authorization header" };
  }

  const token = authHeader.replace("Bearer ", "");
  const user = userResolver(token);
  if (!user) {
    return { status: 401, error: "Unauthorized: Invalid or expired session token" };
  }

  return { status: 200, userId: user.id };
}

test("verifyAiTutorChatAuth returns 401 if Authorization header is missing", () => {
  const result = verifyAiTutorChatAuth(null, () => ({ id: "user_123" }));
  assert.strictEqual(result.status, 401);
  assert.strictEqual(result.error, "Missing Authorization header");
});

test("verifyAiTutorChatAuth returns 401 if token is invalid or expired", () => {
  const result = verifyAiTutorChatAuth("Bearer invalid_token", () => null);
  assert.strictEqual(result.status, 401);
  assert.strictEqual(result.error, "Unauthorized: Invalid or expired session token");
});

test("verifyAiTutorChatAuth returns 200 and userId if token is valid", () => {
  const result = verifyAiTutorChatAuth("Bearer valid_token", (token) => {
    if (token === "valid_token") return { id: "user_456" };
    return null;
  });
  assert.strictEqual(result.status, 200);
  assert.strictEqual(result.userId, "user_456");
});
