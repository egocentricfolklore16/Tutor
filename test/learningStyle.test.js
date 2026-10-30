import test from "node:test";
import assert from "node:assert/strict";
import { getLearningStyleSuggestion, resolveLearningStyleFromProfile } from "../src/lib/learningStyle.js";

test("resolveLearningStyleFromProfile resolves style string from profile object, array, or string", () => {
  assert.equal(resolveLearningStyleFromProfile({ learning_style: ["Practice questions", "Quizzes"] }), "Practice questions");
  assert.equal(resolveLearningStyleFromProfile({ learning_style: "Explanations" }), "Explanations");
  assert.equal(resolveLearningStyleFromProfile(["Examples"]), "Examples");
  assert.equal(resolveLearningStyleFromProfile('["Quizzes"]'), "Quizzes");
  assert.equal(resolveLearningStyleFromProfile(null), "");
  assert.equal(resolveLearningStyleFromProfile(undefined), "");
  assert.equal(resolveLearningStyleFromProfile([]), "");
});

test("getLearningStyleSuggestion handles onboarding learning style options", () => {
  const explanations = getLearningStyleSuggestion("Explanations");
  assert.equal(explanations.label, "Explanation-Focused Learner");
  assert.match(explanations.strategy, /conceptual breakdowns/);

  const practiceQuestions = getLearningStyleSuggestion("Practice questions");
  assert.equal(practiceQuestions.label, "Practice-First Learner");
  assert.match(practiceQuestions.strategy, /immediate problem sets/);

  const examples = getLearningStyleSuggestion("Examples");
  assert.equal(examples.label, "Example-Driven Learner");
  assert.match(examples.strategy, /worked examples/);

  const quizzes = getLearningStyleSuggestion("Quizzes");
  assert.equal(quizzes.label, "Quiz-Focused Learner");
  assert.match(quizzes.strategy, /self-assessment quizzes/);

  const stepByStep = getLearningStyleSuggestion("Step-by-step");
  assert.equal(stepByStep.label, "Step-by-Step Learner");
  assert.match(stepByStep.strategy, /breaking complex topics/);
});

test("getLearningStyleSuggestion handles array inputs from onboarding profile", () => {
  const arrayStyle = getLearningStyleSuggestion(["Practice questions", "Quizzes"]);
  assert.equal(arrayStyle.label, "Practice-First Learner");
  assert.match(arrayStyle.strategy, /immediate problem sets/);

  const explanationsArray = getLearningStyleSuggestion(["Explanations"]);
  assert.equal(explanationsArray.label, "Explanation-Focused Learner");

  const emptyArray = getLearningStyleSuggestion([]);
  assert.equal(emptyArray.label, "Adaptable Learner");
});

test("getLearningStyleSuggestion handles legacy options and case variations", () => {
  assert.equal(getLearningStyleSuggestion("Visual").label, "Visual Learner");
  assert.equal(getLearningStyleSuggestion("Practice first").label, "Practice-First Learner");
  assert.equal(getLearningStyleSuggestion("practice-first").label, "Practice-First Learner");
  assert.equal(getLearningStyleSuggestion("STEP BY STEP").label, "Step-by-Step Learner");
  assert.equal(getLearningStyleSuggestion("Conversation").label, "Conversational Learner");
  assert.equal(getLearningStyleSuggestion("conversational").label, "Conversational Learner");
});

test("getLearningStyleSuggestion falls back safely for null, undefined, empty, or unknown inputs", () => {
  const defaultRes = getLearningStyleSuggestion(null);
  assert.equal(defaultRes.label, "Adaptable Learner");
  assert.match(defaultRes.strategy, /balanced combination/);

  assert.equal(getLearningStyleSuggestion(undefined).label, "Adaptable Learner");
  assert.equal(getLearningStyleSuggestion("").label, "Adaptable Learner");
  assert.equal(getLearningStyleSuggestion("   ").label, "Adaptable Learner");
  assert.equal(getLearningStyleSuggestion("UnknownStyle").label, "Adaptable Learner");
});
