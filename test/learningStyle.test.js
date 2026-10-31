import test from "node:test";
import assert from "node:assert/strict";
import {
  getLearningStyleSuggestion,
  resolveLearningStyleFromProfile,
  LEARNING_STYLE_OPTIONS,
} from "../src/lib/learningStyle.js";

test("getLearningStyleSuggestion handles all onboarding learning styles", () => {
  const explanations = getLearningStyleSuggestion("Explanations");
  assert.equal(explanations.label, "Concept-First Learner");
  assert.match(explanations.strategy, /explanatory breakdowns/);

  const practice = getLearningStyleSuggestion("Practice questions");
  assert.equal(practice.label, "Practice-First Learner");
  assert.match(practice.strategy, /immediate problem sets/);

  const examples = getLearningStyleSuggestion("Examples");
  assert.equal(examples.label, "Example-Driven Learner");
  assert.match(examples.strategy, /worked examples/);

  const quizzes = getLearningStyleSuggestion("Quizzes");
  assert.equal(quizzes.label, "Quiz-Focused Learner");
  assert.match(quizzes.strategy, /rapid self-testing/);

  const stepByStep = getLearningStyleSuggestion("Step-by-step");
  assert.equal(stepByStep.label, "Step-by-Step Learner");
  assert.match(stepByStep.strategy, /breaking complex topics/);
});

test("getLearningStyleSuggestion handles array inputs from onboarding multi-select", () => {
  const arrayExplanations = getLearningStyleSuggestion(["Explanations", "Quizzes"]);
  assert.equal(arrayExplanations.label, "Concept-First Learner");

  const arrayPractice = getLearningStyleSuggestion(["Practice questions", "Examples"]);
  assert.equal(arrayPractice.label, "Practice-First Learner");

  const arrayQuizzes = getLearningStyleSuggestion(["Quizzes"]);
  assert.equal(arrayQuizzes.label, "Quiz-Focused Learner");
});

test("getLearningStyleSuggestion handles legacy learning styles and alternative formats", () => {
  const visual = getLearningStyleSuggestion("Visual");
  assert.equal(visual.label, "Visual Learner");
  assert.match(visual.strategy, /diagrams, mind maps/);

  const practiceFirst = getLearningStyleSuggestion("Practice first");
  assert.equal(practiceFirst.label, "Practice-First Learner");

  const practiceFirstHyphen = getLearningStyleSuggestion("practice-first");
  assert.equal(practiceFirstHyphen.label, "Practice-First Learner");

  const conversation = getLearningStyleSuggestion("Conversation");
  assert.equal(conversation.label, "Conversational Learner");
  assert.match(conversation.strategy, /interactive Q&A/);

  const conversational = getLearningStyleSuggestion("conversational");
  assert.equal(conversational.label, "Conversational Learner");

  assert.equal(getLearningStyleSuggestion("STEP BY STEP").label, "Step-by-Step Learner");
});

test("getLearningStyleSuggestion falls back safely for null, undefined, empty, or unknown inputs", () => {
  const defaultRes = getLearningStyleSuggestion(null);
  assert.equal(defaultRes.label, "Adaptable Learner");
  assert.match(defaultRes.strategy, /balanced combination/);

  assert.equal(getLearningStyleSuggestion(undefined).label, "Adaptable Learner");
  assert.equal(getLearningStyleSuggestion("").label, "Adaptable Learner");
  assert.equal(getLearningStyleSuggestion("   ").label, "Adaptable Learner");
  assert.equal(getLearningStyleSuggestion([]).label, "Adaptable Learner");
  assert.equal(getLearningStyleSuggestion([""]).label, "Adaptable Learner");
  assert.equal(getLearningStyleSuggestion(["UnknownStyle"]).label, "Adaptable Learner");
  assert.equal(getLearningStyleSuggestion("UnknownStyle").label, "Adaptable Learner");
});

test("resolveLearningStyleFromProfile resolves array, string, and legacy preferences", () => {
  assert.equal(resolveLearningStyleFromProfile(["Explanations", "Quizzes"]), "Explanations");
  assert.equal(resolveLearningStyleFromProfile(["practice questions"]), "Practice questions");
  assert.equal(resolveLearningStyleFromProfile(["Quizzes"]), "Quizzes");
  assert.equal(resolveLearningStyleFromProfile("Examples"), "Examples");
  assert.equal(resolveLearningStyleFromProfile("quizzes"), "Quizzes");
  assert.equal(resolveLearningStyleFromProfile("Step-by-step"), "Step-by-step");

  // Legacy mappings
  assert.equal(resolveLearningStyleFromProfile("Practice first"), "Practice questions");
  assert.equal(resolveLearningStyleFromProfile("Visual"), "Examples");
  assert.equal(resolveLearningStyleFromProfile("Conversation"), "Explanations");

  // Fallbacks
  assert.equal(resolveLearningStyleFromProfile(null), "Step-by-step");
  assert.equal(resolveLearningStyleFromProfile(undefined), "Step-by-step");
  assert.equal(resolveLearningStyleFromProfile(""), "Step-by-step");
  assert.equal(resolveLearningStyleFromProfile([]), "Step-by-step");
});

test("LEARNING_STYLE_OPTIONS contains all 5 onboarding learning styles", () => {
  assert.deepEqual(LEARNING_STYLE_OPTIONS, [
    "Explanations",
    "Practice questions",
    "Examples",
    "Quizzes",
    "Step-by-step",
  ]);
});
