import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("StudyCompanion has proper accessibility markup", () => {
  const filePath = path.resolve(globalThis.process.cwd(), "src/components/Study/studyEnviron/StudyCompanion.jsx");
  const content = fs.readFileSync(filePath, "utf-8");

  // Check aria-label on New riddle button
  assert.ok(
    content.includes('aria-label="New riddle"'),
    'StudyCompanion must include aria-label="New riddle" on the refresh button'
  );

  // Check aria-live on riddle card container
  assert.ok(
    content.includes('aria-live="polite"'),
    'StudyCompanion must include aria-live="polite" on the riddle container'
  );

  // Check focus-visible rings
  assert.ok(
    content.includes("focus-visible:ring-2 focus-visible:ring-amber-500"),
    "StudyCompanion must include focus-visible focus ring styling"
  );
});
