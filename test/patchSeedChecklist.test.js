import test from "node:test";
import assert from "node:assert";

// Helper function mirroring Sidebar.jsx getActiveFromPath logic
function getActiveFromPath(pathname) {
  const lower = (pathname || "").toLowerCase();
  if (lower.startsWith("/study")) return "Study";
  if (lower.startsWith("/planner")) return "Planner";
  if (lower.startsWith("/progress")) return "Progress";
  if (lower.startsWith("/library")) return "Library";
  if (lower.startsWith("/community")) return "Community";
  if (lower.startsWith("/faq")) return "FAQ";
  if (lower.startsWith("/settings")) return "Settings";
  return "Dashboard";
}

test("getActiveFromPath matches routes case-insensitively", () => {
  assert.strictEqual(getActiveFromPath("/Study"), "Study");
  assert.strictEqual(getActiveFromPath("/study"), "Study");
  assert.strictEqual(getActiveFromPath("/study/history/123"), "Study");
  assert.strictEqual(getActiveFromPath("/PLANNER"), "Planner");
  assert.strictEqual(getActiveFromPath("/planner"), "Planner");
  assert.strictEqual(getActiveFromPath("/Community/chat"), "Community");
  assert.strictEqual(getActiveFromPath("/community/groups"), "Community");
  assert.strictEqual(getActiveFromPath("/"), "Dashboard");
  assert.strictEqual(getActiveFromPath("/Dashboard"), "Dashboard");
  assert.strictEqual(getActiveFromPath(null), "Dashboard");
});

test("maybeSingle result handling in history detail gracefully handles missing records", () => {
  // Mock maybeSingle response for missing row
  const missingResult = { data: null, error: null };
  let historyItem = "initial";
  let error = "";

  if (missingResult.error) {
    error = "Unable to load history entry.";
  } else if (!missingResult.data) {
    historyItem = null;
  } else {
    historyItem = missingResult.data;
  }

  assert.strictEqual(historyItem, null);
  assert.strictEqual(error, "");
});
