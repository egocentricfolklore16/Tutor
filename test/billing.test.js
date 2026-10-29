import test from "node:test";
import assert from "node:assert/strict";
import {
  isSubscriptionActive,
  getActivePlanId,
  getSubscriptionStatusDisplay,
} from "../src/lib/billing.js";

test("isSubscriptionActive handles null or undefined subscriptions", () => {
  assert.strictEqual(isSubscriptionActive(null), false);
  assert.strictEqual(isSubscriptionActive(undefined), false);
});

test("isSubscriptionActive evaluates active free plan as active", () => {
  const sub = { plan_id: "free", status: "active" };
  assert.strictEqual(isSubscriptionActive(sub), true);
});

test("isSubscriptionActive requires status === 'active'", () => {
  const cancelledSub = {
    plan_id: "pro",
    status: "cancelled",
    current_period_end: "2099-01-01T00:00:00.000Z",
  };
  assert.strictEqual(isSubscriptionActive(cancelledSub), false);

  const expiredSub = {
    plan_id: "pro",
    status: "expired",
    current_period_end: "2099-01-01T00:00:00.000Z",
  };
  assert.strictEqual(isSubscriptionActive(expiredSub), false);
});

test("isSubscriptionActive checks current_period_end date boundary for paid plans", () => {
  const now = new Date("2025-05-30T12:00:00Z");

  const futureSub = {
    plan_id: "pro",
    status: "active",
    current_period_end: "2025-06-01T00:00:00.000Z",
  };
  assert.strictEqual(isSubscriptionActive(futureSub, now), true);

  const pastSub = {
    plan_id: "pro",
    status: "active",
    current_period_end: "2025-05-01T00:00:00.000Z",
  };
  assert.strictEqual(isSubscriptionActive(pastSub, now), false);
});

test("getActivePlanId returns free when subscription is missing, cancelled, or expired", () => {
  const now = new Date("2025-05-30T12:00:00Z");

  assert.strictEqual(getActivePlanId(null, now), "free");

  const cancelledSub = {
    plan_id: "pro",
    status: "cancelled",
    current_period_end: "2025-06-01T00:00:00.000Z",
  };
  assert.strictEqual(getActivePlanId(cancelledSub, now), "free");

  const expiredSub = {
    plan_id: "pro",
    status: "active",
    current_period_end: "2025-05-01T00:00:00.000Z",
  };
  assert.strictEqual(getActivePlanId(expiredSub, now), "free");

  const activePro = {
    plan_id: "pro",
    status: "active",
    current_period_end: "2025-06-01T00:00:00.000Z",
  };
  assert.strictEqual(getActivePlanId(activePro, now), "pro");
});

test("getSubscriptionStatusDisplay provides clear status label and dot color theme", () => {
  const now = new Date("2025-05-30T12:00:00Z");

  assert.deepStrictEqual(getSubscriptionStatusDisplay(null, now), {
    label: "Active",
    dotColor: "bg-emerald-500",
  });

  const activeSub = {
    plan_id: "pro",
    status: "active",
    current_period_end: "2025-06-01T00:00:00.000Z",
  };
  assert.deepStrictEqual(getSubscriptionStatusDisplay(activeSub, now), {
    label: "Active",
    dotColor: "bg-emerald-500",
  });

  const cancelledSub = {
    plan_id: "pro",
    status: "cancelled",
    current_period_end: "2025-06-01T00:00:00.000Z",
  };
  assert.deepStrictEqual(getSubscriptionStatusDisplay(cancelledSub, now), {
    label: "Cancelled",
    dotColor: "bg-rose-500",
  });

  const expiredByDateSub = {
    plan_id: "pro",
    status: "active",
    current_period_end: "2025-05-01T00:00:00.000Z",
  };
  assert.deepStrictEqual(getSubscriptionStatusDisplay(expiredByDateSub, now), {
    label: "Expired",
    dotColor: "bg-amber-500",
  });
});
