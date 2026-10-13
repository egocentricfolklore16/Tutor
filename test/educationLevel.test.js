import test from "node:test";
import assert from "node:assert/strict";
import { getEducationLevelSuggestion, EDUCATION_LEVEL_SUGGESTIONS } from "../src/lib/educationLevel.js";

test("getEducationLevelSuggestion maps all onboarding options accurately", () => {
  const options = ["High school", "College / university", "Working professional", "Independent learner"];

  for (const option of options) {
    const info = getEducationLevelSuggestion(option);
    assert.equal(info.badge, EDUCATION_LEVEL_SUGGESTIONS[option].badge);
    assert.equal(info.contextNote, EDUCATION_LEVEL_SUGGESTIONS[option].contextNote);
  }
});

test("getEducationLevelSuggestion handles case variations and grade level strings", () => {
  assert.equal(getEducationLevelSuggestion("high school").badge, "High School");
  assert.equal(getEducationLevelSuggestion("11th Grade").badge, "High School");
  assert.equal(getEducationLevelSuggestion("College Freshman").badge, "College / University");
  assert.equal(getEducationLevelSuggestion("Professional").badge, "Professional");
});

test("getEducationLevelSuggestion falls back safely for null, undefined, empty, or unknown inputs", () => {
  const defaultRes = getEducationLevelSuggestion(null);
  assert.equal(defaultRes.badge, "Learner");
  assert.match(defaultRes.contextNote, /tailored for your academic goals/);

  assert.equal(getEducationLevelSuggestion(undefined).badge, "Learner");
  assert.equal(getEducationLevelSuggestion("").badge, "Learner");
  assert.equal(getEducationLevelSuggestion("   ").badge, "Learner");

  const customVal = getEducationLevelSuggestion("Custom Level");
  assert.equal(customVal.badge, "Custom Level");
  assert.equal(customVal.contextNote, "tailored for your academic goals");
});
