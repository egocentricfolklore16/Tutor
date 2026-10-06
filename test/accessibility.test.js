import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getAccessibilityFlags } from "../src/lib/accessibility.js";

describe("getAccessibilityFlags", () => {
  it("detects Larger text preference from onboarding choices", () => {
    const flags = getAccessibilityFlags(["Larger text", "Screen reader"]);
    assert.deepEqual(flags, {
      hasLargerText: true,
      hasHighContrast: false,
    });
  });

  it("detects High contrast preference with varied casing from settings", () => {
    const flags = getAccessibilityFlags(["High Contrast"]);
    assert.deepEqual(flags, {
      hasLargerText: false,
      hasHighContrast: true,
    });
  });

  it("detects both Larger text and High contrast when both selected", () => {
    const flags = getAccessibilityFlags(["Larger text", "High contrast"]);
    assert.deepEqual(flags, {
      hasLargerText: true,
      hasHighContrast: true,
    });
  });

  it("returns false for both when None or unrelated preferences are selected", () => {
    const flags = getAccessibilityFlags(["None", "Text-to-speech"]);
    assert.deepEqual(flags, {
      hasLargerText: false,
      hasHighContrast: false,
    });
  });

  it("handles empty arrays safely", () => {
    const flags = getAccessibilityFlags([]);
    assert.deepEqual(flags, {
      hasLargerText: false,
      hasHighContrast: false,
    });
  });

  it("handles null or undefined missing profile data safely without crashing", () => {
    assert.deepEqual(getAccessibilityFlags(null), {
      hasLargerText: false,
      hasHighContrast: false,
    });

    assert.deepEqual(getAccessibilityFlags(undefined), {
      hasLargerText: false,
      hasHighContrast: false,
    });
  });
});
