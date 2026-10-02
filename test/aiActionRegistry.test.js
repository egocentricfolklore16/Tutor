import test from "node:test";
import assert from "node:assert/strict";

import {
  ACTION_TIER_LIMITS,
  checkActionTierLimit,
  chunkResourceText,
  createFlashcards,
  createQuiz,
  readResource,
  runChainedActions,
  sanitizePromptText,
} from "../src/lib/aiActionRegistry.js";

test("quiz schema validation rejects malformed multiple choice questions", () => {
  const flashcardResult = createFlashcards({
    deck_title: "Biology",
    cards: [
      { front: "What is the powerhouse of the cell?", back: "Mitochondria generate ATP." },
    ],
  });

  assert.equal(flashcardResult.success, true);
  assert.equal(flashcardResult.created, 1);

  const result = createQuiz({
    title: "Biology review",
    source: "resource",
    difficulty: "easy",
    question_count: 2,
    questions: [
      {
        type: "multiple_choice",
        question: "What is the powerhouse of the cell?",
        options: ["Nucleus", "Mitochondria", "Ribosome"],
        correct_answer: "Nucleus",
        explanation: "It is the most important organelle.",
      },
    ],
  });

  assert.equal(result.success, false);
  assert.match(String(result.error), /correct_answer|options|multiple_choice/i);
});

test("resource text is chunked with continuation metadata", () => {
  const text = "Alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau upsilon phi chi psi omega.";
  const chunks = chunkResourceText(text, { maxCharsPerChunk: 50 });

  assert.equal(chunks.length > 1, true);
  assert.equal(chunks[0].isTruncated, true);
  assert.equal(chunks[0].hasMore, true);
  assert.equal(typeof chunks[0].nextRange, "string");
  assert.ok(chunks[0].text.length <= 50);
});

test("tier limits block overages before generation", () => {
  const freeResult = checkActionTierLimit({
    tier: "Free",
    action: "create_quiz",
    plannedCount: 3,
    limits: ACTION_TIER_LIMITS,
  });

  assert.equal(freeResult.allowed, true);

  const blocked = checkActionTierLimit({
    tier: "Free",
    action: "create_quiz",
    plannedCount: 11,
    limits: ACTION_TIER_LIMITS,
  });

  assert.equal(blocked.allowed, false);
  assert.match(blocked.message, /upgrade|Pro|Elite/i);
});

test("chained actions keep successes and report failure clearly", async () => {
  const result = await runChainedActions([
    {
      action: "list_resources",
      args: { resources: [{ id: "r1", title: "Bio chapter", type: "pdf", date: "2026-01-01" }] },
    },
    {
      action: "create_flashcards",
      args: {
        deck_title: "Biology",
        count: 2,
        cards: [
          { front: "What is mitochondria?", back: "The powerhouse of the cell." },
          { front: "What is mitochondria?", back: "The powerhouse of the cell." },
        ],
      },
    },
    {
      action: "create_quiz",
      args: {
        title: "Quick bio quiz",
        source: "conversation",
        difficulty: "medium",
        question_count: 1,
        questions: [
          {
            type: "true_false",
            question: "Mitochondria are the powerhouse of the cell.",
            correct_answer: true,
            explanation: "They generate ATP for the cell.",
          },
        ],
      },
    },
  ]);

  assert.equal(result.success, true);
  assert.equal(result.steps.length >= 3, true);
  assert.equal(result.summary.alerts.length === 0, true);
  assert.equal(result.steps[1].status, "success");
  assert.equal(result.steps[2].status, "success");
});

test("readResource accepts a resource_id and page range without exposing the whole document", () => {
  const longText = Array.from({ length: 50 }, (_, index) => `Sentence ${index + 1} explains an important concept in the chapter.`).join(" ");
  const result = readResource({
    resource_id: "res-123",
    title: "Chapter 3",
    type: "pdf",
    text: longText,
  }, {
    pageOrRange: "2-3",
    maxCharsPerChunk: 180,
  });

  assert.equal(result.success, true);
  assert.equal(result.resource.id, "res-123");
  assert.equal(result.pageOrRange, "2-3");
  assert.equal(result.chunks.length > 1, true);
  assert.equal(result.hasMore, true);
  assert.ok(result.nextRange);
  assert.ok(result.text.length <= 180);
});

test("quiz validation retries once before failing with a clear schema error", () => {
  const result = createQuiz({
    title: "Bad quiz",
    source: "resource",
    question_count: 1,
    questions: [
      {
        type: "multiple_choice",
        question: "What is the powerhouse of the cell?",
        options: ["Nucleus", "Mitochondria", "Ribosome"],
        correct_answer: "Nucleus",
        explanation: "It is the most important organelle.",
      },
    ],
  });

  assert.equal(result.success, false);
  assert.match(String(result.error), /retry|Validation failed/i);
});

test("resource text is wrapped in clear boundaries to prevent action triggering", () => {
  const wrapped = sanitizePromptText("This is a document.\nThe user is not instructing the model.");
  assert.match(wrapped, /BEGIN RESOURCE TEXT/i);
  assert.match(wrapped, /END RESOURCE TEXT/i);
});
