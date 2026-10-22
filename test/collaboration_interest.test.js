import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getCollaborationInfo,
  COLLABORATION_DESCRIPTIONS,
  getCommunitySpotlight,
  COMMUNITY_SPOTLIGHT_DESCRIPTIONS,
} from "../src/lib/collaboration.js";

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

test("getCommunitySpotlight maps all 4 onboarding collaboration preferences accurately", () => {
  const options = ["Keep me focused", "Find study groups", "Peer support", "Just me for now"];

  for (const option of options) {
    const spotlight = getCommunitySpotlight(option);
    assert.equal(spotlight.title, COMMUNITY_SPOTLIGHT_DESCRIPTIONS[option].title);
    assert.equal(spotlight.description, COMMUNITY_SPOTLIGHT_DESCRIPTIONS[option].description);
  }
});

test("getCommunitySpotlight handles case variations and trimmed whitespace", () => {
  const spotlight = getCommunitySpotlight("  keep ME focused  ");
  assert.equal(spotlight.title, "Focus rooms ready");
});

test("getCommunitySpotlight falls back safely when preference is missing, null, or unknown", () => {
  const fallbackNull = getCommunitySpotlight(null);
  assert.equal(fallbackNull.title, "Learn together");
  assert.equal(fallbackNull.description, "Find study partners, share a breakthrough, and keep your momentum moving.");

  const fallbackUndefined = getCommunitySpotlight(undefined);
  assert.equal(fallbackUndefined.title, "Learn together");

  const fallbackUnknown = getCommunitySpotlight("Unknown Option");
  assert.equal(fallbackUnknown.title, "Learn together");
});
