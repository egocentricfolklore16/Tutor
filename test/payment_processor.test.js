import test from "node:test";
import assert from "node:assert/strict";

import {
  processVerifiedPayment,
  timingSafeEqualStrings,
} from "../supabase/functions/_shared/payment-processor.ts";

test("timingSafeEqualStrings compares strings in constant time", () => {
  assert.strictEqual(timingSafeEqualStrings("abc", "abc"), true);
  assert.strictEqual(timingSafeEqualStrings("abc", "abd"), false);
  assert.strictEqual(timingSafeEqualStrings("abc", "abcd"), false);
  assert.strictEqual(timingSafeEqualStrings("abcd", "abc"), false);
  assert.strictEqual(timingSafeEqualStrings("", ""), true);
  assert.strictEqual(timingSafeEqualStrings("hash123456", "hash123456"), true);
  assert.strictEqual(timingSafeEqualStrings("hash123456", "HASH123456"), false);
  assert.strictEqual(timingSafeEqualStrings(null, "abc"), false);
  assert.strictEqual(timingSafeEqualStrings("abc", undefined), false);
});

function createMockSupabaseClient({
  plan = { id: "pro", price_kobo: 250000, price_naira: 2500, billing_interval: "month" },
  existingPayment = null,
  existingSub = null,
} = {}) {
  const paymentsStore = existingPayment ? [existingPayment] : [];
  const subsStore = existingSub ? [existingSub] : [];

  return {
    from(tableName) {
      if (tableName === "plans") {
        return {
          select() {
            return {
              eq(col, val) {
                return {
                  async single() {
                    if (val === plan.id) {
                      return { data: plan, error: null };
                    }
                    return { data: null, error: { message: "Plan not found" } };
                  },
                };
              },
            };
          },
        };
      }

      if (tableName === "payments") {
        return {
          select() {
            return {
              eq(col, val) {
                return {
                  async maybeSingle() {
                    const row = paymentsStore.find((p) => p[col] === val);
                    return { data: row || null, error: null };
                  },
                };
              },
            };
          },
          upsert(payload) {
            return {
              select() {
                return {
                  async single() {
                    const newRow = { id: "payment-uuid-123", ...payload };
                    paymentsStore.push(newRow);
                    return { data: newRow, error: null };
                  },
                };
              },
            };
          },
        };
      }

      if (tableName === "subscriptions") {
        return {
          select() {
            return {
              eq(col, val) {
                return {
                  async maybeSingle() {
                    const row = subsStore.find((s) => s[col] === val);
                    return { data: row || null, error: null };
                  },
                };
              },
            };
          },
          upsert(payload) {
            return {
              select() {
                return {
                  async single() {
                    const newRow = { id: "sub-uuid-456", ...payload };
                    subsStore.push(newRow);
                    return { data: newRow, error: null };
                  },
                };
              },
            };
          },
        };
      }

      throw new Error(`Unexpected table: ${tableName}`);
    },
  };
}

test("processVerifiedPayment processes a valid payment and updates subscription", async () => {
  const mockClient = createMockSupabaseClient();
  const result = await processVerifiedPayment({
    supabaseClient: mockClient,
    reference: "ref_test_1001",
    paystackData: {
      amount: 250000,
      currency: "NGN",
      status: "success",
      metadata: {
        planId: "pro",
        userId: "user-uuid-111",
      },
    },
  });

  assert.strictEqual(result.alreadyProcessed, false);
  assert.strictEqual(result.payment.reference, "ref_test_1001");
  assert.strictEqual(result.payment.amount, 250000);
  assert.strictEqual(result.payment.currency, "NGN");
  assert.strictEqual(result.subscription.plan_id, "pro");
  assert.strictEqual(result.subscription.status, "active");
});

test("processVerifiedPayment rejects currency mismatch", async () => {
  const mockClient = createMockSupabaseClient();
  await assert.rejects(
    async () => {
      await processVerifiedPayment({
        supabaseClient: mockClient,
        reference: "ref_test_1002",
        paystackData: {
          amount: 250000,
          currency: "USD",
          status: "success",
          metadata: {
            planId: "pro",
            userId: "user-uuid-111",
          },
        },
      });
    },
    {
      name: "Error",
      message: "Currency mismatch: expected NGN, received USD",
    }
  );
});

test("processVerifiedPayment rejects amount mismatch", async () => {
  const mockClient = createMockSupabaseClient();
  await assert.rejects(
    async () => {
      await processVerifiedPayment({
        supabaseClient: mockClient,
        reference: "ref_test_1003",
        paystackData: {
          amount: 100000,
          currency: "NGN",
          status: "success",
          metadata: {
            planId: "pro",
            userId: "user-uuid-111",
          },
        },
      });
    },
    {
      name: "Error",
      message: "Amount mismatch: expected 250000 kobo, received 100000 kobo",
    }
  );
});

test("processVerifiedPayment is idempotent when replaying duplicate reference", async () => {
  const existingPayment = {
    id: "payment-uuid-999",
    user_id: "user-uuid-111",
    reference: "ref_already_processed",
    amount: 250000,
    currency: "NGN",
    status: "success",
    purpose: "subscription:pro",
    created_at: "2025-05-01T00:00:00.000Z",
    verified_at: "2025-05-01T00:00:05.000Z",
  };

  const existingSub = {
    id: "sub-uuid-888",
    user_id: "user-uuid-111",
    plan_id: "pro",
    status: "active",
    current_period_start: "2025-05-01T00:00:05.000Z",
    current_period_end: "2025-06-01T00:00:05.000Z",
  };

  const mockClient = createMockSupabaseClient({ existingPayment, existingSub });

  const result = await processVerifiedPayment({
    supabaseClient: mockClient,
    reference: "ref_already_processed",
    paystackData: {
      amount: 250000,
      currency: "NGN",
      status: "success",
      metadata: {
        planId: "pro",
        userId: "user-uuid-111",
      },
    },
  });

  assert.strictEqual(result.alreadyProcessed, true);
  assert.strictEqual(result.payment.reference, "ref_already_processed");
  assert.strictEqual(result.subscription.current_period_start, "2025-05-01T00:00:05.000Z");
});

test("processVerifiedPayment extends current_period_end when renewing active same-plan subscription", async () => {
  const futureEnd = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();
  const existingSub = {
    id: "sub-uuid-111",
    user_id: "user-uuid-111",
    plan_id: "pro",
    status: "active",
    current_period_start: "2025-01-01T00:00:00.000Z",
    current_period_end: futureEnd,
  };

  const mockClient = createMockSupabaseClient({ existingSub });

  const result = await processVerifiedPayment({
    supabaseClient: mockClient,
    reference: "ref_renewal_2001",
    paystackData: {
      amount: 250000,
      currency: "NGN",
      status: "success",
      metadata: {
        planId: "pro",
        userId: "user-uuid-111",
      },
    },
  });

  assert.strictEqual(result.alreadyProcessed, false);
  assert.strictEqual(result.subscription.current_period_start, "2025-01-01T00:00:00.000Z");

  const expectedEnd = new Date(futureEnd);
  expectedEnd.setMonth(expectedEnd.getMonth() + 1);
  assert.strictEqual(
    new Date(result.subscription.current_period_end).toISOString(),
    expectedEnd.toISOString()
  );
});

test("processVerifiedPayment resets period to now when upgrading plan", async () => {
  const futureEnd = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();
  const existingSub = {
    id: "sub-uuid-111",
    user_id: "user-uuid-111",
    plan_id: "free",
    status: "active",
    current_period_start: "2025-01-01T00:00:00.000Z",
    current_period_end: futureEnd,
  };

  const mockClient = createMockSupabaseClient({
    plan: { id: "pro", price_kobo: 250000, price_naira: 2500, billing_interval: "month" },
    existingSub,
  });

  const result = await processVerifiedPayment({
    supabaseClient: mockClient,
    reference: "ref_upgrade_3001",
    paystackData: {
      amount: 250000,
      currency: "NGN",
      status: "success",
      metadata: {
        planId: "pro",
        userId: "user-uuid-111",
      },
    },
  });

  assert.strictEqual(result.alreadyProcessed, false);
  assert.notStrictEqual(result.subscription.current_period_start, "2025-01-01T00:00:00.000Z");
});
