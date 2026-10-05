import { test } from "node:test";
import assert from "node:assert/strict";
import { isPreferredStudyDay, getStudyDaysSummary } from "../src/lib/studyDays.js";

test("isPreferredStudyDay correctly matches day names case-insensitively", () => {
  const studyDays = ["Mon", "Wed", "Fri"];

  assert.equal(isPreferredStudyDay("Mon", studyDays), true);
  assert.equal(isPreferredStudyDay("mon", studyDays), true);
  assert.equal(isPreferredStudyDay("Wed", studyDays), true);
  assert.equal(isPreferredStudyDay("Tue", studyDays), false);
  assert.equal(isPreferredStudyDay("Sun", studyDays), false);
});

test("isPreferredStudyDay handles missing, null, empty, or non-array inputs safely", () => {
  assert.equal(isPreferredStudyDay("Mon", null), false);
  assert.equal(isPreferredStudyDay("Mon", undefined), false);
  assert.equal(isPreferredStudyDay("Mon", []), false);
  assert.equal(isPreferredStudyDay(null, ["Mon"]), false);
  assert.equal(isPreferredStudyDay(undefined, ["Mon"]), false);
});

test("getStudyDaysSummary formats summary strings correctly", () => {
  assert.equal(getStudyDaysSummary(["Mon", "Wed", "Fri"]), "3 target study days (Mon, Wed, Fri)");
  assert.equal(getStudyDaysSummary(["Tue"]), "1 target study day (Tue)");
  assert.equal(getStudyDaysSummary(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]), "Daily study schedule");
  assert.equal(getStudyDaysSummary([]), "No target study days selected");
  assert.equal(getStudyDaysSummary(null), "No target study days selected");
  assert.equal(getStudyDaysSummary(undefined), "No target study days selected");
});
