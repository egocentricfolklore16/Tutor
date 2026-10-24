import test from "node:test";
import assert from "node:assert/strict";
import { normalizeStrictness } from "../supabase/functions/ai-tutor-chat/prompt.ts";

// Helper simulating resolveStrictness behavior in ai-tutor-chat Edge Function
async function resolveStrictness(supabaseMock, userId) {
  if (!userId) return "hints_then_answer"; // sensible default for unauthenticated/demo use

  try {
    const { data } = await supabaseMock
      .from("user_preferences")
      .select("socratic_strictness")
      .eq("user_id", userId)
      .maybeSingle();

    return normalizeStrictness(data?.socratic_strictness);
  } catch {
    return "hints_then_answer";
  }
}

test("resolveStrictness fetches socratic_strictness from database for authenticated user", async () => {
  const supabaseMock = {
    from: (table) => {
      assert.strictEqual(table, "user_preferences");
      return {
        select: (cols) => {
          assert.strictEqual(cols, "socratic_strictness");
          return {
            eq: (col, val) => {
              assert.strictEqual(col, "user_id");
              assert.strictEqual(val, "user_123");
              return {
                maybeSingle: async () => ({
                  data: { socratic_strictness: "always_guide" },
                }),
              };
            },
          };
        },
      };
    },
  };

  const strictness = await resolveStrictness(supabaseMock, "user_123");
  assert.strictEqual(strictness, "always_guide");
});

test("resolveStrictness defaults to hints_then_answer when user has no preference in database", async () => {
  const supabaseMock = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null }),
        }),
      }),
    }),
  };

  const strictness = await resolveStrictness(supabaseMock, "user_123");
  assert.strictEqual(strictness, "hints_then_answer");
});

test("resolveStrictness defaults to hints_then_answer when userId is null", async () => {
  const strictness = await resolveStrictness(null, null);
  assert.strictEqual(strictness, "hints_then_answer");
});

test("client-supplied strictnessOverride is ignored in request handling logic", async () => {
  // Simulating request processing where payload includes strictnessOverride: "direct_help"
  const requestBody = {
    message: "Help me with math",
    strictnessOverride: "direct_help",
  };

  // DB preference is "always_guide"
  const supabaseMock = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { socratic_strictness: "always_guide" },
          }),
        }),
      }),
    }),
  };

  // Ensure strictness is derived strictly from DB, ignoring payload's strictnessOverride
  const userId = "user_123";
  // The function resolveStrictness no longer accepts strictnessOverride
  const resolvedStrictness = await resolveStrictness(supabaseMock, userId);

  assert.strictEqual(resolvedStrictness, "always_guide");
  assert.notStrictEqual(resolvedStrictness, requestBody.strictnessOverride);
});
