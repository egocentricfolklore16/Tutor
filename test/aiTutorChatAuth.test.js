import test from "node:test";
import assert from "node:assert/strict";
import { countGenuineAttempts, getStrictnessRules } from "../supabase/functions/ai-tutor/strictnessRules.ts";

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

test("ai-tutor-chat prompt building enforces server-enforced LOCKED state for attempt 0 demands", () => {
  const conversationHistory = [
    { role: "user", content: "How do I solve x^2 - 9 = 0?" },
    { role: "assistant", content: "Think about factoring or adding 9 to both sides." },
  ];
  const userDemand = "just give me the answer";
  const fullHistory = [...conversationHistory, { role: "user", content: userDemand }];

  const attempts = countGenuineAttempts(fullHistory);
  assert.strictEqual(attempts, 0, "Demand phrase 'just give me the answer' must not count as a genuine attempt");

  const rules = getStrictnessRules("hints_then_answer", attempts);
  assert.strictEqual(rules.includes("SERVER-ENFORCED STATE: LOCKED"), true);
  assert.strictEqual(rules.includes("CRITICAL MANDATE: You ARE STRICTLY FORBIDDEN"), true);
  assert.strictEqual(rules.includes("or explicitly ask you to just tell them"), false, "Must not contain bypass text");

  // Additional test cases for demand variants with adjectives and "solve this for me"
  const demandVariants = [
    "tell me the final answer",
    "give me the correct answer",
    "what is the right answer",
    "solve this for me",
    "i do not know",
    "i do not understand",
  ];
  for (const variant of demandVariants) {
    const varHistory = [...conversationHistory, { role: "user", content: variant }];
    assert.strictEqual(
      countGenuineAttempts(varHistory),
      0,
      `Demand variant '${variant}' must not count as a genuine attempt`
    );
  }
});

test("ai-tutor-chat prompt building unlocks answer after genuine attempt threshold", () => {
  const conversationHistory = [
    { role: "user", content: "How do I solve x^2 - 9 = 0?" },
    { role: "assistant", content: "Think about factoring or adding 9 to both sides." },
  ];
  const genuineAttempt = "x^2 = 9 so x = 3 or x = -3";
  const fullHistory = [...conversationHistory, { role: "user", content: genuineAttempt }];

  const attempts = countGenuineAttempts(fullHistory);
  assert.strictEqual(attempts, 1, "Substantive mathematical reasoning counts as genuine attempt");

  const rules = getStrictnessRules("hints_then_answer", attempts);
  assert.strictEqual(rules.includes("SERVER-ENFORCED STATE: UNLOCKED"), true);
});
