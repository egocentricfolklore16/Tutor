import { test } from "node:test";
import assert from "node:assert/strict";
import { getCollaborationInfo, COLLABORATION_DESCRIPTIONS } from "../src/lib/collaboration.js";

test("getCollaborationInfo maps all 4 onboarding collaboration preferences accurately", () => {
  const options = ["Keep me focused", "Find study groups", "Peer support", "Just me for now"];

  for (const option of options) {
    const info = getCollaborationInfo(option);
    assert.equal(info.badge, COLLABORATION_DESCRIPTIONS[option].badge);
    assert.equal(info.description, COLLABORATION_DESCRIPTIONS[option].description);
  }
});

test("getCollaborationInfo falls back safely when preference is missing, null, or unknown", () => {
  const fallbackNull = getCollaborationInfo(null);
  assert.equal(fallbackNull.badge, "Personalized Community Experience");
  assert.ok(fallbackNull.description.includes("Tailored social learning features"));

  const fallbackUndefined = getCollaborationInfo(undefined);
  assert.equal(fallbackUndefined.badge, "Personalized Community Experience");

  const fallbackUnknown = getCollaborationInfo("Unknown Preference");
  assert.equal(fallbackUnknown.badge, "Personalized Community Experience");
});
