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

const ALLOWED_STRICTNESS = new Set([
  "always_guide",
  "hints_then_answer",
  "direct_help",
]);

function resolveStrictnessHelper(override, dbStrictness) {
  if (override && ALLOWED_STRICTNESS.has(override)) return override;
  if (dbStrictness && ALLOWED_STRICTNESS.has(dbStrictness)) return dbStrictness;
  return "hints_then_answer";
}

test("resolveStrictness accepts valid strictness enum values", () => {
  assert.strictEqual(resolveStrictnessHelper("always_guide", null), "always_guide");
  assert.strictEqual(resolveStrictnessHelper("hints_then_answer", null), "hints_then_answer");
  assert.strictEqual(resolveStrictnessHelper("direct_help", null), "direct_help");
  assert.strictEqual(resolveStrictnessHelper(null, "always_guide"), "always_guide");
});

test("resolveStrictness safely falls back when prototype properties or invalid values are passed", () => {
  assert.strictEqual(resolveStrictnessHelper("toString", null), "hints_then_answer");
  assert.strictEqual(resolveStrictnessHelper("constructor", null), "hints_then_answer");
  assert.strictEqual(resolveStrictnessHelper("valueOf", null), "hints_then_answer");
  assert.strictEqual(resolveStrictnessHelper("invalid_mode", null), "hints_then_answer");
  assert.strictEqual(resolveStrictnessHelper(null, "valueOf"), "hints_then_answer");
});
