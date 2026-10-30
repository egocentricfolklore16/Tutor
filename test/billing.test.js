import test from "node:test";
import assert from "node:assert/strict";

import {
  isSubscriptionActive,
  getActivePlanId,
  getSubscriptionStatusDisplay,
} from "../src/lib/billing.js";

test("isSubscriptionActive evaluates active and valid subscriptions correctly", () => {
  const now = new Date("2025-05-15T12:00:00Z");

  // Null, undefined, or invalid inputs
  assert.strictEqual(isSubscriptionActive(null, now), false);
  assert.strictEqual(isSubscriptionActive(undefined, now), false);
  assert.strictEqual(isSubscriptionActive("not-an-object", now), false);

  // Free plan is always active if status === 'active'
  assert.strictEqual(
    isSubscriptionActive({ plan_id: "free", status: "active" }, now),
    true
  );

  // Active Pro plan with future period end
  assert.strictEqual(
    isSubscriptionActive(
      {
        plan_id: "pro",
        status: "active",
        current_period_end: "2025-06-01T00:00:00Z",
      },
      now
    ),
    true
  );

  // Cancelled or inactive status
  assert.strictEqual(
    isSubscriptionActive(
      {
        plan_id: "pro",
        status: "cancelled",
        current_period_end: "2025-06-01T00:00:00Z",
      },
      now
    ),
    false
  );

  assert.strictEqual(
    isSubscriptionActive(
      {
        plan_id: "pro",
        status: "inactive",
        current_period_end: "2025-06-01T00:00:00Z",
      },
      now
    ),
    false
  );

  // Expired Pro plan (period end in the past)
  assert.strictEqual(
    isSubscriptionActive(
      {
        plan_id: "pro",
        status: "active",
        current_period_end: "2025-05-01T00:00:00Z",
      },
      now
    ),
    false
  );
});

test("getActivePlanId resolves current active plan or falls back safely to 'free'", () => {
  const now = new Date("2025-05-15T12:00:00Z");

  // Active Pro subscription -> 'pro'
  assert.strictEqual(
    getActivePlanId(
      {
        plan_id: "pro",
        status: "active",
        current_period_end: "2025-06-01T00:00:00Z",
      },
      now
    ),
    "pro"
  );

  // Active Elite subscription -> 'elite'
  assert.strictEqual(
    getActivePlanId(
      {
        plan_id: "elite",
        status: "active",
        current_period_end: "2025-06-01T00:00:00Z",
      },
      now
    ),
    "elite"
  );

  // Cancelled Pro subscription -> falls back to 'free'
  assert.strictEqual(
    getActivePlanId(
      {
        plan_id: "pro",
        status: "cancelled",
        current_period_end: "2025-06-01T00:00:00Z",
      },
      now
    ),
    "free"
  );

  // Expired Pro subscription -> falls back to 'free'
  assert.strictEqual(
    getActivePlanId(
      {
        plan_id: "pro",
        status: "active",
        current_period_end: "2025-05-01T00:00:00Z",
      },
      now
    ),
    "free"
  );

  // Null subscription -> falls back to 'free'
  assert.strictEqual(getActivePlanId(null, now), "free");
});

test("getSubscriptionStatusDisplay provides readable status indicators", () => {
  const now = new Date("2025-05-15T12:00:00Z");

  // Null subscription -> 'Active' (default free)
  assert.strictEqual(getSubscriptionStatusDisplay(null, now), "Active");

  // Explicit cancelled status -> 'Cancelled'
  assert.strictEqual(
    getSubscriptionStatusDisplay(
      { plan_id: "pro", status: "cancelled", current_period_end: "2025-06-01T00:00:00Z" },
      now
    ),
    "Cancelled"
  );

  // Explicit inactive status -> 'Inactive'
  assert.strictEqual(
    getSubscriptionStatusDisplay(
      { plan_id: "pro", status: "inactive" },
      now
    ),
    "Inactive"
  );

  // Expired paid subscription -> 'Expired'
  assert.strictEqual(
    getSubscriptionStatusDisplay(
      { plan_id: "pro", status: "active", current_period_end: "2025-05-01T00:00:00Z" },
      now
    ),
    "Expired"
  );

  // Valid active subscription -> 'Active'
  assert.strictEqual(
    getSubscriptionStatusDisplay(
      { plan_id: "pro", status: "active", current_period_end: "2025-06-01T00:00:00Z" },
      now
    ),
    "Active"
  );
});
