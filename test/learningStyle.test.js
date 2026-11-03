import test from "node:test";
import assert from "node:assert/strict";
import { getLearningStyleSuggestion } from "../src/lib/learningStyle.js";

test("getLearningStyleSuggestion handles valid onboarding learning styles", () => {
  const visual = getLearningStyleSuggestion("Visual");
  assert.equal(visual.label, "Visual Learner");
  assert.match(visual.strategy, /diagrams, mind maps/);

  const practiceFirst = getLearningStyleSuggestion("Practice first");
  assert.equal(practiceFirst.label, "Practice-First Learner");
  assert.match(practiceFirst.strategy, /immediate problem sets/);

  const stepByStep = getLearningStyleSuggestion("Step-by-step");
  assert.equal(stepByStep.label, "Step-by-Step Learner");
  assert.match(stepByStep.strategy, /breaking complex topics/);

  const conversation = getLearningStyleSuggestion("Conversation");
  assert.equal(conversation.label, "Conversational Learner");
  assert.match(conversation.strategy, /interactive Q&A/);
});

test("getLearningStyleSuggestion handles case variations and alternative formats", () => {
  assert.equal(getLearningStyleSuggestion("practice-first").label, "Practice-First Learner");
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
  assert.equal(getLearningStyleSuggestion("UnknownStyle").label, "Adaptable Learner");
});
