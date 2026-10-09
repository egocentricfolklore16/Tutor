import test from "node:test";
import assert from "node:assert/strict";
import { isPreferredStudyDay } from "../src/lib/studyDays.js";

test("isPreferredStudyDay matches short day names and full day names accurately", () => {
  const preferred = ["Mon", "Wed", "Fri"];

  assert.equal(isPreferredStudyDay("Mon", preferred), true);
  assert.equal(isPreferredStudyDay("Monday", preferred), true);
  assert.equal(isPreferredStudyDay("Wed", preferred), true);
  assert.equal(isPreferredStudyDay("Wednesday", preferred), true);
  assert.equal(isPreferredStudyDay("Fri", preferred), true);
  assert.equal(isPreferredStudyDay("Friday", preferred), true);

  assert.equal(isPreferredStudyDay("Tue", preferred), false);
  assert.equal(isPreferredStudyDay("Thu", preferred), false);
  assert.equal(isPreferredStudyDay("Sat", preferred), false);
  assert.equal(isPreferredStudyDay("Sun", preferred), false);
});

test("isPreferredStudyDay is case insensitive and handles whitespace", () => {
  const preferred = ["mon", "WED", " fri "];

  assert.equal(isPreferredStudyDay("MON", preferred), true);
  assert.equal(isPreferredStudyDay("wednesday", preferred), true);
  assert.equal(isPreferredStudyDay("FRI", preferred), true);
});

test("isPreferredStudyDay falls back safely when dayName or preferredDays are missing or invalid", () => {
  assert.equal(isPreferredStudyDay(null, ["Mon"]), false);
  assert.equal(isPreferredStudyDay(undefined, ["Mon"]), false);
  assert.equal(isPreferredStudyDay("", ["Mon"]), false);

  assert.equal(isPreferredStudyDay("Mon", null), false);
  assert.equal(isPreferredStudyDay("Mon", undefined), false);
  assert.equal(isPreferredStudyDay("Mon", []), false);
  assert.equal(isPreferredStudyDay("Mon", "not-an-array"), false);
});
