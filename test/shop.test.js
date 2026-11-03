import test from "node:test";
import assert from "node:assert/strict";

function canAffordItem(balance, price) {
  if (typeof balance !== "number" || typeof price !== "number") return false;
  return balance >= price;
}

function canHoldMoreFreezes(currentTokens, maxTokens = 2) {
  if (typeof currentTokens !== "number") return false;
  return currentTokens < maxTokens;
}

function formatGemTransaction(amount, reason) {
  const isPositive = amount > 0;
  const sign = isPositive ? "+" : "";
  return {
    formattedAmount: `${sign}${amount} Gems`,
    reason: reason || "Unknown Transaction",
    isEarn: isPositive,
  };
}

test("canAffordItem correctly checks gem balance against price", () => {
  assert.equal(canAffordItem(50, 50), true);
  assert.equal(canAffordItem(100, 50), true);
  assert.equal(canAffordItem(30, 50), false);
  assert.equal(canAffordItem(null, 50), false);
});

test("canHoldMoreFreezes enforces maximum freeze token cap", () => {
  assert.equal(canHoldMoreFreezes(0, 2), true);
  assert.equal(canHoldMoreFreezes(1, 2), true);
  assert.equal(canHoldMoreFreezes(2, 2), false);
  assert.equal(canHoldMoreFreezes(3, 2), false);
});

test("formatGemTransaction formats earned and spent gem ledger entries accurately", () => {
  const earned = formatGemTransaction(20, "7-Day Streak Milestone");
  assert.equal(earned.formattedAmount, "+20 Gems");
  assert.equal(earned.reason, "7-Day Streak Milestone");
  assert.equal(earned.isEarn, true);

  const spent = formatGemTransaction(-50, "Streak Freeze Purchase");
  assert.equal(spent.formattedAmount, "-50 Gems");
  assert.equal(spent.reason, "Streak Freeze Purchase");
  assert.equal(spent.isEarn, false);
});
