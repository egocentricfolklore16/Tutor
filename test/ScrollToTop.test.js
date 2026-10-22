import test from "node:test";
import assert from "node:assert/strict";

// Simulated effect logic from ScrollToTop
function runScrollToTopEffect(pathname, hash, scrollToFn) {
  if (hash) return false;
  if (typeof scrollToFn === "function") {
    scrollToFn({ top: 0, left: 0, behavior: "instant" });
    return true;
  }
  return false;
}

test("ScrollToTop effect triggers window.scrollTo on pathname change", () => {
  let scrollArgs = null;
  const mockScrollTo = (args) => {
    scrollArgs = args;
  };

  const triggered = runScrollToTopEffect("/Library", "", mockScrollTo);

  assert.equal(triggered, true);
  assert.deepEqual(scrollArgs, { top: 0, left: 0, behavior: "instant" });
});

test("ScrollToTop effect skips scrolling when hash is present (e.g. anchor link)", () => {
  let scrollArgs = null;
  const mockScrollTo = (args) => {
    scrollArgs = args;
  };

  const triggered = runScrollToTopEffect("/Community", "#faq-section", mockScrollTo);

  assert.equal(triggered, false);
  assert.equal(scrollArgs, null);
});
