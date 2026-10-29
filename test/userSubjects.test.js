import test from "node:test";
import assert from "node:assert/strict";
import { getUserSubjectsList, getUserSubjectsFormatted, getSubjectOptions, ONBOARDING_SUBJECTS } from "../src/lib/userSubjects.js";

test("getUserSubjectsList extracts array of clean subject strings from profile", () => {
  const profile = { subjects: ["Math", " Science ", "Computer science"] };
  assert.deepEqual(getUserSubjectsList(profile), ["Math", "Science", "Computer science"]);
});

test("getUserSubjectsList falls back to settings_subject or subject string", () => {
  assert.deepEqual(getUserSubjectsList({ subjects: [], settings_subject: "Physics" }), ["Physics"]);
  assert.deepEqual(getUserSubjectsList({ subjects: null, subject: "Chemistry" }), ["Chemistry"]);
});

test("getUserSubjectsList returns empty array for null, undefined, or empty profile", () => {
  assert.deepEqual(getUserSubjectsList(null), []);
  assert.deepEqual(getUserSubjectsList(undefined), []);
  assert.deepEqual(getUserSubjectsList({}), []);
  assert.deepEqual(getUserSubjectsList({ subjects: ["   "] }), []);
});

test("getUserSubjectsFormatted formats profile subjects array correctly", () => {
  const profile = { subjects: ["Math", "Science", "Computer science"] };
  assert.equal(getUserSubjectsFormatted(profile), "Math, Science, Computer science");
});

test("getUserSubjectsFormatted falls back to settings_subject or subject string if subjects array is empty", () => {
  assert.equal(getUserSubjectsFormatted({ subjects: [], settings_subject: "Physics" }), "Physics");
  assert.equal(getUserSubjectsFormatted({ subjects: null, subject: "Chemistry" }), "Chemistry");
});

test("getUserSubjectsFormatted falls back safely to 'your priority subjects' when profile or values are missing or null", () => {
  assert.equal(getUserSubjectsFormatted(null), "your priority subjects");
  assert.equal(getUserSubjectsFormatted(undefined), "your priority subjects");
  assert.equal(getUserSubjectsFormatted({}), "your priority subjects");
  assert.equal(getUserSubjectsFormatted({ subjects: [] }), "your priority subjects");
  assert.equal(getUserSubjectsFormatted({ subjects: ["   "] }), "your priority subjects");
});

test("StudyCompanion topic resolution prioritizes current_topic over onboarding subjects and safe fallback", () => {
  const resolveTopic = (p) => p?.current_topic || getUserSubjectsFormatted(p);

  assert.equal(resolveTopic({ current_topic: "Cell Division", subjects: ["Math", "Science"] }), "Cell Division");
  assert.equal(resolveTopic({ current_topic: "", subjects: ["Math", "Science"] }), "Math, Science");
  assert.equal(resolveTopic({ subjects: ["Computer science"] }), "Computer science");
  assert.equal(resolveTopic(null), "your priority subjects");
});

test("getSubjectOptions includes all onboarding subjects in options list", () => {
  const generalOptions = getSubjectOptions("College / university");
  for (const subject of ONBOARDING_SUBJECTS) {
    assert.ok(generalOptions.includes(subject), `Missing ${subject} in general options`);
  }
});

test("getSubjectOptions adds school subjects for High School and grade levels", () => {
  const hsOptions = getSubjectOptions("High school");
  assert.ok(hsOptions.includes("AP Calculus"));
  assert.ok(hsOptions.includes("Math"));

  const gradeOptions = getSubjectOptions("11th Grade");
  assert.ok(gradeOptions.includes("AP Biology"));
});
