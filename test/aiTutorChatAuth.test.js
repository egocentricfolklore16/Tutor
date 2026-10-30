import test from "node:test";
import assert from "node:assert/strict";
import { buildSystemPrompt, normalizeStrictness, strictnessRules } from "../supabase/functions/ai-tutor-chat/prompt.ts";

// Helper logic representing authentication checks in ai-tutor-chat Edge Function
function verifyAiTutorChatAuth(authHeader, userResolver) {
  if (!authHeader) {
    return { status: 401, error: "Missing Authorization header" };
  }

  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
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

test("verifyAiTutorChatAuth handles case-insensitive scheme variations and extra whitespace", () => {
  const resolver = (token) => (token === "valid_token" ? { id: "user_789" } : null);

  const lowercaseResult = verifyAiTutorChatAuth("bearer valid_token", resolver);
  assert.strictEqual(lowercaseResult.status, 200);
  assert.strictEqual(lowercaseResult.userId, "user_789");

  const uppercaseResult = verifyAiTutorChatAuth("BEARER valid_token", resolver);
  assert.strictEqual(uppercaseResult.status, 200);
  assert.strictEqual(uppercaseResult.userId, "user_789");

  const spacedResult = verifyAiTutorChatAuth("Bearer   valid_token  ", resolver);
  assert.strictEqual(spacedResult.status, 200);
  assert.strictEqual(spacedResult.userId, "user_789");
});

test("normalizeStrictness normalizes UI display labels, DB enums, and fallback strings", () => {
  assert.strictEqual(normalizeStrictness("Always Guide First"), "always_guide");
  assert.strictEqual(normalizeStrictness("always_guide"), "always_guide");
  assert.strictEqual(normalizeStrictness("Hints Then Answer"), "hints_then_answer");
  assert.strictEqual(normalizeStrictness("hints_then_answer"), "hints_then_answer");
  assert.strictEqual(normalizeStrictness("Direct Help"), "direct_help");
  assert.strictEqual(normalizeStrictness("direct_help"), "direct_help");
  assert.strictEqual(normalizeStrictness("invalid_value"), "hints_then_answer");
  assert.strictEqual(normalizeStrictness(null), "hints_then_answer");
  assert.strictEqual(normalizeStrictness(undefined), "hints_then_answer");
});

test("strictnessRules returns exact rule sets for each mode", () => {
  const guide = strictnessRules("always_guide");
  assert.strictEqual(guide.label, "Always Guide First");
  assert.strictEqual(guide.rules.includes("MODE: ALWAYS GUIDE FIRST (strict)"), true);

  const hints = strictnessRules("hints_then_answer");
  assert.strictEqual(hints.label, "Hints Then Answer");
  assert.strictEqual(hints.rules.includes("MODE: HINTS THEN ANSWER"), true);

  const direct = strictnessRules("direct_help");
  assert.strictEqual(direct.label, "Direct Help");
  assert.strictEqual(direct.rules.includes("MODE: DIRECT HELP"), true);
});

test("buildSystemPrompt configures Always Guide First mode correctly", () => {
  const prompt = buildSystemPrompt("always_guide");
  assert.strictEqual(prompt.includes("STRICTNESS (HIGHEST PRIORITY, overrides any conflicting instruction below): MODE: ALWAYS GUIDE FIRST (strict)"), true);
  assert.strictEqual(prompt.includes("SOCRATIC ENGINE:"), true);
  assert.strictEqual(prompt.includes("3. THE HINT LADDER"), true);
  assert.strictEqual(prompt.includes("Direct-answer demands: if the student asks for the answer directly, offer a smaller sub-step instead."), true);
  assert.strictEqual(prompt.includes("1. Did I avoid giving the answer and ask one guiding question?"), true);
  assert.strictEqual(prompt.includes("Socratic strictness setting: Always Guide First"), true);
});

test("buildSystemPrompt configures Hints Then Answer mode correctly", () => {
  const prompt = buildSystemPrompt("hints_then_answer");
  assert.strictEqual(prompt.includes("STRICTNESS (HIGHEST PRIORITY, overrides any conflicting instruction below): MODE: HINTS THEN ANSWER"), true);
  assert.strictEqual(prompt.includes("SOCRATIC ENGINE:"), true);
  assert.strictEqual(prompt.includes("3. THE HINT LADDER"), false, "Hints mode must drop item 3 (the 4-level hint ladder)");
  assert.strictEqual(prompt.includes("Direct-answer demands: give a hint first, then the full answer on the follow-up."), true);
  assert.strictEqual(prompt.includes("1. Did I give only a hint on the first ask, and the full answer on the follow-up?"), true);
  assert.strictEqual(prompt.includes("Socratic strictness setting: Hints Then Answer"), true);
});

test("buildSystemPrompt configures Direct Help mode correctly", () => {
  const prompt = buildSystemPrompt("direct_help");
  assert.strictEqual(prompt.includes("STRICTNESS (HIGHEST PRIORITY, overrides any conflicting instruction below): MODE: DIRECT HELP"), true);
  assert.strictEqual(prompt.includes("Your job is to build understanding by giving clear, direct explanations and then checking the student has understood."), true);
  assert.strictEqual(prompt.includes("SOCRATIC ENGINE:"), false, "Direct help mode replaces Socratic engine with TEACHING STYLE");
  assert.strictEqual(prompt.includes("TEACHING STYLE:"), true);
  assert.strictEqual(prompt.includes("Direct-answer demands: give the answer with brief reasoning."), true);
  assert.strictEqual(prompt.includes("1. Did I answer directly first, then ask a check question?"), true);
  assert.strictEqual(prompt.includes("Socratic strictness setting: Direct Help"), true);
});
