import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeFlashcard,
  normalizeFlashcardValue,
} from "../src/lib/flashcardNormalization.js";

test("normalizes structured JSON strings into clean question and answer text", () => {
  const card = normalizeFlashcard({
    question: '"question": "What defines a flashcard review queue?"',
    answer: '"answer": "It is a timed recall cycle for spaced repetition."',
  });

  assert.equal(card.question, "What defines a flashcard review queue?");
  assert.equal(card.answer, "It is a timed recall cycle for spaced repetition.");

  const nested = normalizeFlashcardValue('{"question":"What defines a deck?","answer":"A pile of review cards."}', "question");
  assert.equal(nested, "What defines a deck?");
});
