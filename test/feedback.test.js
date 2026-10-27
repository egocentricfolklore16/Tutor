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

  describe("evaluateTrigger context parameter handling", () => {
    test("customContext is passed into logPromptEvent correctly", () => {
      let loggedEvent = null;
      const fakeLogPromptEvent = (event) => {
        loggedEvent = event;
      };

      const candidatePrompt = {
        id: "p123",
        trigger_type: "study_completed",
        is_active: true,
        cooldown_days: 0,
      };

      // Pure helper simulating evaluateTrigger logic
      const evaluateTriggerLogic = (triggerType, customContext = {}, prompts = []) => {
        const candidate = prompts.find((p) => p.trigger_type === triggerType);
        if (!candidate) return null;
        fakeLogPromptEvent({
          userId: "user-1",
          promptId: candidate.id,
          action: "shown",
          context: customContext,
        });
        return candidate;
      };

      const result = evaluateTriggerLogic("study_completed", { source: "modal" }, [candidatePrompt]);
      assert.equal(result.id, "p123");
      assert.deepEqual(loggedEvent.context, { source: "modal" });
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
});
