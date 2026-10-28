import test from "node:test";
import assert from "node:assert/strict";
import { getHeroState, HERO_QUOTES } from "../src/components/Dashboard/getHeroState.js";

test("getHeroState Priority 1: Resumable session takes precedence", () => {
  const state = getHeroState({
    hour: 10,
    name: "Alex",
    resumable: { id: "123", subject: "Mathematics", topic: "Calculus Derivatives" },
    streak: 5,
  });

  assert.equal(state.headline, "Pick up where you left off, Alex.");
  assert.equal(state.subline, '"Calculus Derivatives" is waiting for you.');
  assert.equal(state.primaryLabel, "Resume Calculus Derivatives");
  assert.equal(state.primaryAction, "resume_session");
  assert.equal(state.eyebrow, "GOOD MORNING");
  assert.equal(state.timeVariant, "morning");
});

test("getHeroState Priority 2: New user onboarding state", () => {
  const state = getHeroState({
    hour: 14,
    name: "Sarah",
    isNewUser: true,
  });

  assert.equal(state.headline, "Welcome to Hyper Tutor, Sarah.");
  assert.equal(state.subline, "Start your first session and Lumo will tailor everything to you.");
  assert.equal(state.primaryLabel, "Start your first session");
  assert.equal(state.eyebrow, "GOOD AFTERNOON");
  assert.equal(state.timeVariant, "afternoon");
});

test("getHeroState Priority 3: Goal crushed today", () => {
  const state = getHeroState({
    hour: 18,
    name: "Michael",
    goalMinutes: 45,
    doneMinutes: 50,
  });

  assert.equal(state.headline, "Goal crushed, Michael!");
  assert.equal(state.subline, "Keep the momentum or review what you learned.");
  assert.equal(state.owlPose, "celebrate");
  assert.equal(state.primaryLabel, "Start another session");
});

test("getHeroState Priority 4: Streak at risk when streak > 0, not studied today, hour >= 18", () => {
  const state = getHeroState({
    hour: 19,
    name: "David",
    streak: 7,
    studiedToday: false,
  });

  assert.equal(state.headline, "Keep your 7-day streak alive.");
  assert.equal(state.subline, "A 10-minute session is enough.");
  assert.equal(state.primaryLabel, "Start a quick session");
  assert.equal(state.eyebrow, "GOOD EVENING");
  assert.equal(state.timeVariant, "evening");
});

test("getHeroState does NOT trigger streak at risk for 0-day streak", () => {
  const state = getHeroState({
    hour: 20,
    name: "Emma",
    streak: 0,
    studiedToday: false,
  });

  assert.notEqual(state.headline, "Keep your 0-day streak alive.");
  assert.equal(state.headline, "Make today count, Emma.");
});

test("getHeroState Priority 5: Returning user", () => {
  const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
  const state = getHeroState({
    hour: 22,
    name: "Chris",
    lastActiveDate: fourDaysAgo,
  });

  assert.equal(state.headline, "Welcome back, Chris.");
  assert.equal(state.subline, "Let's ease back in with a short session.");
  assert.equal(state.timeVariant, "night");
  assert.equal(state.owlPose, "sleepy");
});

test("getHeroState name truncation for names over 14 characters", () => {
  const state = getHeroState({
    hour: 10,
    name: "BartholomewAlexander",
  });

  assert.equal(state.headline, "Make today count, BartholomewAle….");
});

test("getHeroState hour boundaries test", () => {
  assert.equal(getHeroState({ hour: 4 }).timeVariant, "night");
  assert.equal(getHeroState({ hour: 5 }).timeVariant, "morning");
  assert.equal(getHeroState({ hour: 11 }).timeVariant, "morning");
  assert.equal(getHeroState({ hour: 12 }).timeVariant, "afternoon");
  assert.equal(getHeroState({ hour: 16 }).timeVariant, "afternoon");
  assert.equal(getHeroState({ hour: 17 }).timeVariant, "evening");
  assert.equal(getHeroState({ hour: 21 }).timeVariant, "evening");
  assert.equal(getHeroState({ hour: 22 }).timeVariant, "night");
});

test("HERO_QUOTES constant is populated with 10 motivational quotes", () => {
  assert.equal(HERO_QUOTES.length, 10);
  assert.ok(HERO_QUOTES.includes("Progress beats perfect."));
});
