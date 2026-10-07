import test from "node:test";
import assert from "node:assert/strict";
import { getEducationLevelInfo, EDUCATION_LEVEL_INFO } from "../src/lib/educationLevel.js";

test("getEducationLevelInfo maps all 4 onboarding education levels accurately", () => {
  const levels = ["High school", "College / university", "Working professional", "Independent learner"];

  for (const level of levels) {
    const info = getEducationLevelInfo(level);
    assert.equal(info.badge, EDUCATION_LEVEL_INFO[level].badge);
    assert.equal(info.note, EDUCATION_LEVEL_INFO[level].note);
  }
});

test("getEducationLevelInfo falls back safely when education level is missing, null, or unknown", () => {
  const defaultInfo = {
    badge: "General Learner",
    note: "Balanced study guidance tailored to your learning goals and schedule.",
  };

  assert.deepEqual(getEducationLevelInfo(null), defaultInfo);
  assert.deepEqual(getEducationLevelInfo(undefined), defaultInfo);
  assert.deepEqual(getEducationLevelInfo(""), defaultInfo);
  assert.deepEqual(getEducationLevelInfo("Unknown Level"), defaultInfo);
});
