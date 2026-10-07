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

const VALID_STRICTNESS = new Set(["always_guide", "hints_then_answer", "direct_help"]);

function resolveStrictnessHelper(override, dbStrictness, userId) {
  if (typeof override === "string" && VALID_STRICTNESS.has(override)) {
    return override;
  }
  if (!userId) return "hints_then_answer";
  if (typeof dbStrictness === "string" && VALID_STRICTNESS.has(dbStrictness)) {
    return dbStrictness;
  }
  return "hints_then_answer";
}

test("resolveStrictness accepts valid strictness overrides", () => {
  assert.strictEqual(resolveStrictnessHelper("always_guide", null, "u1"), "always_guide");
  assert.strictEqual(resolveStrictnessHelper("direct_help", null, "u1"), "direct_help");
  assert.strictEqual(resolveStrictnessHelper("hints_then_answer", null, "u1"), "hints_then_answer");
});

test("resolveStrictness safely rejects prototype key injections and invalid overrides", () => {
  // Prototype property lookup injections must be ignored
  assert.strictEqual(resolveStrictnessHelper("toString", "always_guide", "u1"), "always_guide");
  assert.strictEqual(resolveStrictnessHelper("constructor", null, "u1"), "hints_then_answer");
  assert.strictEqual(resolveStrictnessHelper("__proto__", null, "u1"), "hints_then_answer");
  assert.strictEqual(resolveStrictnessHelper("valueOf", "direct_help", "u1"), "direct_help");
  assert.strictEqual(resolveStrictnessHelper("invalid_mode", null, "u1"), "hints_then_answer");
});
