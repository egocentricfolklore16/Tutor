import { test } from "node:test";
import assert from "node:assert/strict";
import { getPreferredTimeNote, PREFERRED_TIME_NOTES } from "../src/lib/preferredTime.js";

test("getPreferredTimeNote maps all onboarding preferred time choices accurately", () => {
  const options = ["Morning", "Afternoon", "Evening", "Flexible"];

  for (const option of options) {
    const note = getPreferredTimeNote(option);
    assert.equal(note, PREFERRED_TIME_NOTES[option]);
  }
});

test("getPreferredTimeNote falls back safely when preferred time is missing, null, or unknown", () => {
  const defaultNote = "Schedule sessions when your energy is highest to stay consistent.";

  assert.equal(getPreferredTimeNote(null), defaultNote);
  assert.equal(getPreferredTimeNote(undefined), defaultNote);
  assert.equal(getPreferredTimeNote(""), defaultNote);
  assert.equal(getPreferredTimeNote("Late Night"), defaultNote);
});
