import { test } from "node:test";
import assert from "node:assert/strict";
import { getLearnerTypeSuggestion, LEARNER_TYPE_SUGGESTIONS } from "../src/lib/learnerType.js";

test("getLearnerTypeSuggestion maps all 3 onboarding learner types accurately", () => {
  const options = ["Academic achiever", "Struggling learner", "Lifelong learner"];

  for (const option of options) {
    const info = getLearnerTypeSuggestion(option);
    assert.equal(info.badge, LEARNER_TYPE_SUGGESTIONS[option].badge);
    assert.equal(info.recommendation, LEARNER_TYPE_SUGGESTIONS[option].recommendation);
  }
});

test("getLearnerTypeSuggestion falls back safely when learner type is missing, null, or unknown", () => {
  const fallbackNull = getLearnerTypeSuggestion(null);
  assert.equal(fallbackNull.badge, "Personalized Strategy");
  assert.ok(fallbackNull.recommendation.includes("balanced study routine"));

  const fallbackUndefined = getLearnerTypeSuggestion(undefined);
  assert.equal(fallbackUndefined.badge, "Personalized Strategy");

  const fallbackUnknown = getLearnerTypeSuggestion("Unknown Learner Type");
  assert.equal(fallbackUnknown.badge, "Personalized Strategy");
});
