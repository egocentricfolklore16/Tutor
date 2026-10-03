import { test } from "node:test";
import assert from "node:assert/strict";
import { getEducationLevelInfo, EDUCATION_LEVEL_DESCRIPTIONS } from "../src/lib/educationLevel.js";

test("getEducationLevelInfo maps all 4 onboarding education levels accurately", () => {
  const options = ["High school", "College / university", "Working professional", "Independent learner"];

  for (const option of options) {
    const info = getEducationLevelInfo(option);
    assert.equal(info.badge, EDUCATION_LEVEL_DESCRIPTIONS[option].badge);
    assert.equal(info.guidance, EDUCATION_LEVEL_DESCRIPTIONS[option].guidance);
  }
});

test("getEducationLevelInfo falls back safely when education level is missing, null, or unknown", () => {
  const fallbackNull = getEducationLevelInfo(null);
  assert.equal(fallbackNull.badge, "General Studies");
  assert.ok(fallbackNull.guidance.includes("Adaptable study sessions"));

  const fallbackUndefined = getEducationLevelInfo(undefined);
  assert.equal(fallbackUndefined.badge, "General Studies");

  const fallbackUnknown = getEducationLevelInfo("Unknown Level");
  assert.equal(fallbackUnknown.badge, "General Studies");
});
