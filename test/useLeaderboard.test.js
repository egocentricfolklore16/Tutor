import test from "node:test";
import assert from "node:assert/strict";

import { formatXpDisplay } from "../src/lib/leaderboardUtils.js";

test("formatXpDisplay formats numbers under 10k with locale string", () => {
  assert.equal(formatXpDisplay(0), "0");
  assert.equal(formatXpDisplay(350), "350");
  assert.equal(formatXpDisplay(1250), "1,250");
  assert.equal(formatXpDisplay(9999), "9,999");
});

test("formatXpDisplay abbreviates numbers 10k and above with 'k'", () => {
  assert.equal(formatXpDisplay(10000), "10.0k");
  assert.equal(formatXpDisplay(12400), "12.4k");
  assert.equal(formatXpDisplay(123456), "123.5k");
});

test("formatXpDisplay safely handles null, undefined, or invalid inputs", () => {
  assert.equal(formatXpDisplay(null), "0");
  assert.equal(formatXpDisplay(undefined), "0");
  assert.equal(formatXpDisplay("not a number"), "0");
});
