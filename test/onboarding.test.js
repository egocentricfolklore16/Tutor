import test from "node:test";
import assert from "node:assert/strict";

function validateDisplayName(name) {
  if (!name || !name.trim()) return "Name is required.";
  const trimmed = name.trim();
  if (trimmed.length < 2) return "Name must be at least 2 characters.";
  if (trimmed.length > 24) return "Name must be 24 characters or less.";
  if (!/^[a-zA-Z0-9 '-]+$/.test(trimmed)) {
    return "Name can only contain letters, numbers, spaces, hyphens, and apostrophes.";
  }
  return null;
}

test("validateDisplayName validates display name inputs correctly", () => {
  // Empty or missing
  assert.equal(validateDisplayName(""), "Name is required.");
  assert.equal(validateDisplayName("   "), "Name is required.");

  // Too short
  assert.equal(validateDisplayName("A"), "Name must be at least 2 characters.");

  // Too long
  assert.equal(validateDisplayName("a".repeat(25)), "Name must be 24 characters or less.");

  // Invalid characters
  assert.equal(validateDisplayName("Alex<script>"), "Name can only contain letters, numbers, spaces, hyphens, and apostrophes.");
  assert.equal(validateDisplayName("John@Doe"), "Name can only contain letters, numbers, spaces, hyphens, and apostrophes.");

  // Valid names
  assert.equal(validateDisplayName("Alex"), null);
  assert.equal(validateDisplayName("Mary-Jane O'Connor"), null);
  assert.equal(validateDisplayName("Learner 123"), null);
});

test("onboarding step index calculation and clamp logic", () => {
  const TOTAL_STEPS = 12;

  const getClampedStep = (savedStep) => {
    const parsed = typeof savedStep === "number" ? savedStep : 0;
    return Math.min(Math.max(0, parsed), TOTAL_STEPS - 1);
  };

  assert.equal(getClampedStep(0), 0);
  assert.equal(getClampedStep(5), 5);
  assert.equal(getClampedStep(15), 11);
  assert.equal(getClampedStep(-2), 0);
  assert.equal(getClampedStep(undefined), 0);
});
