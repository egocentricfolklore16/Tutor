import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  validateFeedbackInput,
  saveFeedbackDraft,
  getFeedbackDraft,
  clearFeedbackDraft,
  checkRateLimit,
  checkPromptEligibility,
  exportFeedbackToCSV,
  FEEDBACK_TYPES,
  FEEDBACK_STATUSES,
} from "../src/lib/feedback.js";

// Mock localStorage for Node test environment
const mockStorage = new Map();
globalThis.localStorage = {
  getItem: (key) => mockStorage.get(key) || null,
  setItem: (key, value) => mockStorage.set(key, String(value)),
  removeItem: (key) => mockStorage.delete(key),
  clear: () => mockStorage.clear(),
};

describe("Feedback Module Unit & Guardrail Tests", () => {
  describe("validateFeedbackInput", () => {
    test("accepts valid feedback inputs", () => {
      const result = validateFeedbackInput({
        type: FEEDBACK_TYPES.BUG,
        rating: 4,
        nps_score: 9,
        message: "Great feature overall!",
      });
      assert.equal(result.isValid, true);
      assert.equal(result.errors.length, 0);
    });

    test("rejects invalid feedback types", () => {
      const result = validateFeedbackInput({ type: "super_invalid_type" });
      assert.equal(result.isValid, false);
      assert.ok(result.errors.some((e) => e.includes("Invalid feedback type")));
    });

    test("rejects ratings out of bounds (1-5)", () => {
      const lowResult = validateFeedbackInput({ rating: 0 });
      assert.equal(lowResult.isValid, false);

      const highResult = validateFeedbackInput({ rating: 6 });
      assert.equal(highResult.isValid, false);
    });

    test("rejects NPS scores out of bounds (0-10)", () => {
      const lowResult = validateFeedbackInput({ nps_score: -1 });
      assert.equal(lowResult.isValid, false);

      const highResult = validateFeedbackInput({ nps_score: 11 });
      assert.equal(highResult.isValid, false);
    });

    test("rejects messages exceeding 3000 characters", () => {
      const longMessage = "a".repeat(3001);
      const result = validateFeedbackInput({ message: longMessage });
      assert.equal(result.isValid, false);
      assert.ok(result.errors.some((e) => e.includes("exceed 3000 characters")));
    });
  });

  describe("Offline Draft Utilities", () => {
    test("saves, retrieves, and clears feedback draft in localStorage", () => {
      mockStorage.clear();
      const draftData = {
        type: FEEDBACK_TYPES.FEATURE_REQUEST,
        rating: 5,
        message: "Please add dark mode toggle!",
      };

      saveFeedbackDraft(draftData);
      const retrieved = getFeedbackDraft();
      assert.equal(retrieved.type, FEEDBACK_TYPES.FEATURE_REQUEST);
      assert.equal(retrieved.message, "Please add dark mode toggle!");
      assert.ok(retrieved.savedAt);

      clearFeedbackDraft();
      assert.equal(getFeedbackDraft(), null);
    });
  });

  describe("Rate Limiting", () => {
    test("checkRateLimit allows up to 5 submissions within 1 hour", () => {
      mockStorage.clear();
      const check1 = checkRateLimit();
      assert.equal(check1.allowed, true);
      assert.equal(check1.remaining, 5);

      // Simulate 5 recent timestamps
      const now = Date.now();
      const timestamps = [now - 1000, now - 2000, now - 3000, now - 4000, now - 5000];
      mockStorage.set("hyper-tutor-feedback-rate-limit", JSON.stringify(timestamps));

      const check2 = checkRateLimit();
      assert.equal(check2.allowed, false);
      assert.equal(check2.remaining, 0);
      assert.ok(check2.resetMinutes > 0);
    });
  });

  describe("checkPromptEligibility", () => {
    const activePrompt = {
      id: "p1",
      is_active: true,
      cooldown_days: 7,
      max_shows_per_user: 3,
    };

    test("rejects inactive prompt", () => {
      const res = checkPromptEligibility({ prompt: { is_active: false } });
      assert.equal(res.eligible, false);
      assert.equal(res.reason, "inactive");
    });

    test("rejects if already prompted in current session", () => {
      const res = checkPromptEligibility({ prompt: activePrompt, sessionPromptedThisSession: true });
      assert.equal(res.eligible, false);
      assert.equal(res.reason, "already_prompted_this_session");
    });

    test("rejects if user is currently snoozed", () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const userState = { snooze_until: futureDate };
      const res = checkPromptEligibility({ prompt: activePrompt, userState });
      assert.equal(res.eligible, false);
      assert.equal(res.reason, "snoozed");
    });

    test("rejects if within cooldown days", () => {
      const recentDate = new Date(Date.now() - 86400000).toISOString(); // 1 day ago (cooldown is 7)
      const userState = { last_prompted_at: recentDate };
      const res = checkPromptEligibility({ prompt: activePrompt, userState });
      assert.equal(res.eligible, false);
      assert.equal(res.reason, "cooldown_active");
    });

    test("accepts eligible prompt", () => {
      const oldDate = new Date(Date.now() - 10 * 86400000).toISOString(); // 10 days ago
      const userState = { last_prompted_at: oldDate, total_submitted: 1 };
      const res = checkPromptEligibility({ prompt: activePrompt, userState });
      assert.equal(res.eligible, true);
    });
  });

  describe("exportFeedbackToCSV", () => {
    test("returns empty string for empty input array", () => {
      assert.equal(exportFeedbackToCSV([]), "");
    });

    test("formats CSV with headers and escaped quotes", () => {
      const feedbackList = [
        {
          id: "fb-123",
          type: FEEDBACK_TYPES.BUG,
          status: FEEDBACK_STATUSES.NEW,
          priority: 1,
          rating: 2,
          message: 'Found a "bug" in study room',
          screen: "/study",
          created_at: "2028-05-18T10:00:00Z",
        },
      ];

      const csv = exportFeedbackToCSV(feedbackList);
      assert.ok(csv.startsWith("ID,Type,Status,Priority,Rating"));
      assert.ok(csv.includes("fb-123"));
      assert.ok(csv.includes('"Found a ""bug"" in study room"'));
    });
  });

  describe("Admin & Prompt Context Operations", () => {
    test("updateAdminFeedback sets resolved_at timestamp when resolving or closing", async () => {
      const { updateAdminFeedback, FEEDBACK_STATUSES } = await import("../src/lib/feedback.js");
      const supabaseModule = await import("../src/lib/supabase.js");
      const originalFrom = supabaseModule.default.from;

      let updatedPayload = null;
      supabaseModule.default.from = (table) => {
        if (table === "feedback") {
          return {
            update: (payload) => {
              updatedPayload = payload;
              return {
                eq: (col, val) => ({
                  select: () => ({
                    single: () => Promise.resolve({ data: { id: val, ...payload }, error: null }),
                  }),
                }),
              };
            },
          };
        }
        return originalFrom(table);
      };

      try {
        const res = await updateAdminFeedback("fb-999", { status: FEEDBACK_STATUSES.RESOLVED, priority: 1 });
        assert.equal(res.success, true);
        assert.equal(updatedPayload.priority, 1);
        assert.equal(updatedPayload.status, FEEDBACK_STATUSES.RESOLVED);
        assert.ok(updatedPayload.resolved_at, "resolved_at must be populated when status is RESOLVED");
      } finally {
        supabaseModule.default.from = originalFrom;
      }
    });

    test("addFeedbackReply validates missing parameters and handles reply inserts", async () => {
      const { addFeedbackReply } = await import("../src/lib/feedback.js");

      // Missing message
      const missingMsgRes = await addFeedbackReply({ feedbackId: "fb-1", authorId: "usr-1", message: "" });
      assert.equal(missingMsgRes.success, false);
      assert.equal(missingMsgRes.error, "Missing required fields.");

      const supabaseModule = await import("../src/lib/supabase.js");
      const originalFrom = supabaseModule.default.from;

      let insertedReply = null;
      supabaseModule.default.from = (table) => {
        if (table === "feedback_replies") {
          return {
            insert: (payloads) => {
              insertedReply = payloads[0];
              return {
                select: () => ({
                  single: () => Promise.resolve({ data: { id: "reply-1", ...payloads[0] }, error: null }),
                }),
              };
            },
          };
        }
        return originalFrom(table);
      };

      try {
        const res = await addFeedbackReply({
          feedbackId: "fb-1",
          authorId: "admin-1",
          message: "We have deployed a fix!",
          isInternal: false,
        });

        assert.equal(res.success, true);
        assert.equal(insertedReply.feedback_id, "fb-1");
        assert.equal(insertedReply.message, "We have deployed a fix!");
        assert.equal(insertedReply.is_internal, false);
      } finally {
        supabaseModule.default.from = originalFrom;
      }
    });

    test("logPromptEvent handles snoozed, dismissed, and submitted prompt event state transitions", async () => {
      const { logPromptEvent } = await import("../src/lib/feedback.js");
      const supabaseModule = await import("../src/lib/supabase.js");
      const originalFrom = supabaseModule.default.from;

      let loggedEvent = null;
      let updatedState = null;

      supabaseModule.default.from = (table) => {
        if (table === "feedback_prompt_events") {
          return {
            insert: (payloads) => {
              loggedEvent = payloads[0];
              return Promise.resolve({ error: null });
            },
          };
        }
        if (table === "user_feedback_state") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: { total_submitted: 0, total_dismissed: 1 }, error: null }),
              }),
            }),
            update: (payload) => {
              updatedState = payload;
              return { eq: () => Promise.resolve({ error: null }) };
            },
          };
        }
        return originalFrom(table);
      };

      try {
        // Test dismissed twice triggering 14-day snooze
        await logPromptEvent({
          userId: "usr-77",
          promptId: "prompt-88",
          action: "dismissed",
          currentDismissedCount: 1,
        });

        assert.equal(loggedEvent.user_id, "usr-77");
        assert.equal(loggedEvent.prompt_id, "prompt-88");
        assert.equal(loggedEvent.action, "dismissed");

        assert.equal(updatedState.total_dismissed, 2);
        assert.ok(updatedState.snooze_until, "Snooze date should be set when dismissed twice");
      } finally {
        supabaseModule.default.from = originalFrom;
      }
    });
  });
});
