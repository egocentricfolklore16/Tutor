import test from "node:test";
import assert from "node:assert/strict";
import { getLearningStyleSuggestion } from "../src/lib/learningStyle.js";

test("getLearningStyleSuggestion handles valid onboarding learning styles as single strings", () => {
  const explanations = getLearningStyleSuggestion("Explanations");
  assert.equal(explanations.label, "Concept-First Learner");
  assert.match(explanations.strategy, /foundational explanations/);

  const practiceQuestions = getLearningStyleSuggestion("Practice questions");
  assert.equal(practiceQuestions.label, "Practice-First Learner");
  assert.match(practiceQuestions.strategy, /immediate problem sets/);

  const examples = getLearningStyleSuggestion("Examples");
  assert.equal(examples.label, "Example-Driven Learner");
  assert.match(examples.strategy, /worked examples/);

  const quizzes = getLearningStyleSuggestion("Quizzes");
  assert.equal(quizzes.label, "Quiz-Focused Learner");
  assert.match(quizzes.strategy, /micro-quizzes/);

  const stepByStep = getLearningStyleSuggestion("Step-by-step");
  assert.equal(stepByStep.label, "Step-by-Step Learner");
  assert.match(stepByStep.strategy, /breaking complex topics/);
});

test("getLearningStyleSuggestion handles onboarding learning styles as array inputs", () => {
  const arrPractice = getLearningStyleSuggestion(["Practice questions", "Explanations"]);
  assert.equal(arrPractice.label, "Practice-First Learner");

  const arrExplanations = getLearningStyleSuggestion(["Explanations"]);
  assert.equal(arrExplanations.label, "Concept-First Learner");

  const arrExamples = getLearningStyleSuggestion(["Examples", "Quizzes"]);
  assert.equal(arrExamples.label, "Example-Driven Learner");
});

test("getLearningStyleSuggestion handles legacy and case variations", () => {
  assert.equal(getLearningStyleSuggestion("Visual").label, "Visual Learner");
  assert.equal(getLearningStyleSuggestion("Practice first").label, "Practice-First Learner");
  assert.equal(getLearningStyleSuggestion("STEP BY STEP").label, "Step-by-Step Learner");
  assert.equal(getLearningStyleSuggestion("conversational").label, "Conversational Learner");
});

test("getLearningStyleSuggestion falls back safely for null, undefined, empty, or unknown inputs", () => {
  const defaultRes = getLearningStyleSuggestion(null);
  assert.equal(defaultRes.label, "Adaptable Learner");
  assert.match(defaultRes.strategy, /balanced combination/);

  assert.equal(getLearningStyleSuggestion(undefined).label, "Adaptable Learner");
  assert.equal(getLearningStyleSuggestion("").label, "Adaptable Learner");
  assert.equal(getLearningStyleSuggestion("   ").label, "Adaptable Learner");
  assert.equal(getLearningStyleSuggestion([]).label, "Adaptable Learner");
  assert.equal(getLearningStyleSuggestion("UnknownStyle").label, "Adaptable Learner");
});
