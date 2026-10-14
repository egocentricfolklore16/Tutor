import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hasAccessibilityNeed, getAccessibilityClasses } from "../src/lib/accessibility.js";

describe("accessibility helpers", () => {
  it("hasAccessibilityNeed matches case-insensitively across array or profile objects", () => {
    assert.equal(hasAccessibilityNeed(["High contrast"], "High contrast"), true);
    assert.equal(hasAccessibilityNeed(["high contrast"], "High Contrast"), true);
    assert.equal(hasAccessibilityNeed(["SCREEN READER"], "Screen reader"), true);
    assert.equal(hasAccessibilityNeed({ accessibility_needs: ["Larger text"] }, "larger text"), true);
    assert.equal(hasAccessibilityNeed({ accessibilityNeeds: ["Text-to-speech"] }, "text-to-speech"), true);
  });

  it("hasAccessibilityNeed returns false for missing or non-matching inputs", () => {
    assert.equal(hasAccessibilityNeed(null, "High contrast"), false);
    assert.equal(hasAccessibilityNeed(undefined, "High contrast"), false);
    assert.equal(hasAccessibilityNeed([], "High contrast"), false);
    assert.equal(hasAccessibilityNeed({ accessibility_needs: ["None"] }, "High contrast"), false);
    assert.equal(hasAccessibilityNeed(["None"], ""), false);
  });

  it("getAccessibilityClasses returns correct CSS utility classes based on active needs", () => {
    assert.deepEqual(getAccessibilityClasses(["High contrast"]), ["high-contrast"]);
    assert.deepEqual(getAccessibilityClasses(["larger text"]), ["accessibility-large-text"]);
    assert.deepEqual(getAccessibilityClasses(["High Contrast", "Larger Text"]), ["high-contrast", "accessibility-large-text"]);
  });

  it("getAccessibilityClasses falls back safely when profile or needs is missing or has no class-triggering needs", () => {
    assert.deepEqual(getAccessibilityClasses(null), []);
    assert.deepEqual(getAccessibilityClasses(undefined), []);
    assert.deepEqual(getAccessibilityClasses([]), []);
    assert.deepEqual(getAccessibilityClasses(["None"]), []);
    assert.deepEqual(getAccessibilityClasses(["Screen reader", "Text-to-speech"]), []);
  });
});
