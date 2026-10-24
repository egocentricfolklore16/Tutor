import test from "node:test";
import assert from "node:assert/strict";

import {
  processVerifiedPayment,
  timingSafeEqualStrings,
  addMonths,
  addYears,
} from "../supabase/functions/_shared/payment-processor.ts";

test("addMonths handles standard and month-end date overflows accurately", () => {
  // Jan 31 -> Feb 28 (non-leap year)
  const jan31 = new Date("2025-01-31T12:00:00Z");
  assert.strictEqual(
    addMonths(jan31, 1).toISOString(),
    "2025-02-28T12:00:00.000Z"
  );

  // Jan 31 -> Feb 29 (leap year 2024)
  const jan31Leap = new Date("2024-01-31T12:00:00Z");
  assert.strictEqual(
    addMonths(jan31Leap, 1).toISOString(),
    "2024-02-29T12:00:00.000Z"
  );

  // Aug 31 -> Sep 30
  const aug31 = new Date("2025-08-31T12:00:00Z");
  assert.strictEqual(
    addMonths(aug31, 1).toISOString(),
    "2025-09-30T12:00:00.000Z"
  );

  // Jan 15 -> Feb 15 (no overflow)
  const jan15 = new Date("2025-01-15T12:00:00Z");
  assert.strictEqual(
    addMonths(jan15, 1).toISOString(),
    "2025-02-15T12:00:00.000Z"
  );
});

test("addYears handles leap-year February 29 overflow accurately", () => {
  // Feb 29 2024 -> Feb 28 2025
  const feb29Leap = new Date("2024-02-29T12:00:00Z");
  assert.strictEqual(
    addYears(feb29Leap, 1).toISOString(),
    "2025-02-28T12:00:00.000Z"
  );

  // Jan 15 2025 -> Jan 15 2026
  const jan15 = new Date("2025-01-15T12:00:00Z");
  assert.strictEqual(
    addYears(jan15, 1).toISOString(),
    "2026-01-15T12:00:00.000Z"
  );
});

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
            const existingIdx = paymentsStore.findIndex((p) => p.reference === payload.reference);
            const newRow = { id: `payment-uuid-${payload.reference}`, ...payload };
            if (existingIdx >= 0) {
              paymentsStore[existingIdx] = { ...paymentsStore[existingIdx], ...newRow };
            } else {
              paymentsStore.push(newRow);
            }
            return {
              select() {
                return {
                  async single() {
                    return { data: newRow, error: null };
                  },
                };
              },
              then(resolve) {
                return Promise.resolve({ data: newRow, error: null }).then(resolve);
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

test("processVerifiedPayment records failed or abandoned payment in database before rejecting", async () => {
  const mockClient = createMockSupabaseClient();
  await assert.rejects(
    async () => {
      await processVerifiedPayment({
        supabaseClient: mockClient,
        reference: "ref_failed_1002",
        paystackData: {
          amount: 250000,
          currency: "NGN",
          status: "failed",
          metadata: {
            planId: "pro",
            userId: "user-uuid-111",
          },
        },
      });
    },
    {
      name: "Error",
      message: "Payment verification failed: status is failed",
    }
  );

  const { data: recordedPayment } = await mockClient
    .from("payments")
    .select()
    .eq("reference", "ref_failed_1002")
    .maybeSingle();

  assert.ok(recordedPayment);
  assert.strictEqual(recordedPayment.status, "failed");
  assert.strictEqual(recordedPayment.user_id, "user-uuid-111");
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

test("processVerifiedPayment converts numeric and whitespace-padded metadata IDs correctly", async () => {
  const mockClient = createMockSupabaseClient({
    plan: { id: "101", price_kobo: 250000, price_naira: 2500, billing_interval: "month" },
  });

  const result = await processVerifiedPayment({
    supabaseClient: mockClient,
    reference: "ref_numeric_meta_9003",
    paystackData: {
      amount: 250000,
      currency: "NGN",
      status: "success",
      metadata: {
        planId: 101,
        userId: "  user-uuid-padded-444  ",
      },
    },
  });

  assert.strictEqual(result.alreadyProcessed, false);
  assert.strictEqual(result.payment.user_id, "user-uuid-padded-444");
  assert.strictEqual(result.subscription.plan_id, "101");
});

test("processVerifiedPayment trims whitespace from reference", async () => {
  const mockClient = createMockSupabaseClient();
  const result = await processVerifiedPayment({
    supabaseClient: mockClient,
    reference: "  ref_padded_1001  ",
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
  assert.strictEqual(result.payment.reference, "ref_padded_1001");
});

test("processVerifiedPayment throws clean error when paystackData is null or invalid", async () => {
  const mockClient = createMockSupabaseClient();

  for (const invalidData of [null, undefined, "invalid", 123]) {
    await assert.rejects(
      async () => {
        await processVerifiedPayment({
          supabaseClient: mockClient,
          reference: "ref_valid_1002",
          paystackData: invalidData,
        });
      },
      {
        name: "Error",
        message: "Missing or invalid Paystack payment data",
      }
    );
  }
});

test("processVerifiedPayment does not overwrite existing success payment status with failed on out-of-order unlinked failure", async () => {
  const existingPayment = {
    id: "payment-uuid-unlinked-success",
    user_id: "user-uuid-111",
    reference: "ref_unlinked_out_of_order",
    amount: 250000,
    currency: "NGN",
    status: "success",
    purpose: "subscription:pro",
    created_at: "2025-05-01T00:00:00.000Z",
    verified_at: "2025-05-01T00:00:05.000Z",
  };

  const mockClient = createMockSupabaseClient({ existingPayment, existingSub: null });

  await assert.rejects(
    async () => {
      await processVerifiedPayment({
        supabaseClient: mockClient,
        reference: "ref_unlinked_out_of_order",
        paystackData: {
          amount: 250000,
          currency: "NGN",
          status: "failed",
          metadata: {
            planId: "pro",
            userId: "user-uuid-111",
          },
        },
      });
    },
    {
      name: "Error",
      message: "Payment verification failed: status is failed",
    }
  );

  const { data: recordedPayment } = await mockClient
    .from("payments")
    .select()
    .eq("reference", "ref_unlinked_out_of_order")
    .maybeSingle();

  assert.ok(recordedPayment);
  assert.strictEqual(recordedPayment.status, "success");
});

test("processVerifiedPayment returns alreadyProcessed for non-subscription payments when replayed", async () => {
  const existingPayment = {
    id: "payment-uuid-gems-1002",
    user_id: "user-uuid-111",
    reference: "ref_gems_pack_1002",
    amount: 50000,
    currency: "NGN",
    status: "success",
    purpose: "gems_500",
    created_at: "2025-05-01T00:00:00.000Z",
    verified_at: "2025-05-01T00:00:05.000Z",
  };

  const mockClient = createMockSupabaseClient({ existingPayment });

  const result = await processVerifiedPayment({
    supabaseClient: mockClient,
    reference: "ref_gems_pack_1002",
    paystackData: {
      amount: 50000,
      currency: "NGN",
      status: "success",
      metadata: {
        planId: "pro",
        userId: "user-uuid-111",
      },
    },
  });

  assert.strictEqual(result.alreadyProcessed, true);
  assert.strictEqual(result.payment.reference, "ref_gems_pack_1002");
});

test("processVerifiedPayment rejects missing or invalid payment reference", async () => {
  const mockClient = createMockSupabaseClient();

  for (const invalidRef of ["", "   ", null, undefined]) {
    await assert.rejects(
      async () => {
        await processVerifiedPayment({
          supabaseClient: mockClient,
          reference: invalidRef,
          paystackData: {
            amount: 250000,
            currency: "NGN",
            status: "success",
            metadata: { planId: "pro", userId: "user-uuid-111" },
          },
        });
      },
      {
        name: "Error",
        message: "Missing or invalid payment reference",
      }
    );
  }
});

test("processVerifiedPayment handles stringified numeric amounts and floating-point imprecision safely", async () => {
  const mockClient = createMockSupabaseClient({
    plan: { id: "pro", price_kobo: null, price_naira: 25.99, billing_interval: "month" },
  });

  // 25.99 * 100 is 2599.0000000000005 in JS float math. Paystack sends 2599 kobo.
  const resultFloat = await processVerifiedPayment({
    supabaseClient: mockClient,
    reference: "ref_float_amount_9003",
    paystackData: {
      amount: 2599,
      currency: "NGN",
      status: "success",
      metadata: { planId: "pro", userId: "user-uuid-111" },
    },
  });

  assert.strictEqual(resultFloat.alreadyProcessed, false);
  assert.strictEqual(resultFloat.payment.amount, 2599);

  // Test stringified numeric amount e.g. "2599"
  const resultString = await processVerifiedPayment({
    supabaseClient: mockClient,
    reference: "ref_string_amount_9004",
    paystackData: {
      amount: "2599",
      currency: "NGN",
      status: "success",
      metadata: { planId: "pro", userId: "user-uuid-111" },
    },
  });

  assert.strictEqual(resultString.alreadyProcessed, false);
  assert.strictEqual(resultString.payment.amount, 2599);
});

test("processVerifiedPayment rejects amount mismatch and records status as failed in payments table", async () => {
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

  const { data: recordedPayment } = await mockClient
    .from("payments")
    .select()
    .eq("reference", "ref_test_1003")
    .maybeSingle();

  assert.ok(recordedPayment);
  assert.strictEqual(recordedPayment.status, "failed");
  assert.strictEqual(recordedPayment.amount, 100000);
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
    payment_id: "payment-uuid-999",
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

test("processVerifiedPayment handles month-end renewal without overflowing into subsequent month", async () => {
  // Renewal for a subscription expiring in the future on Jan 31 of next year
  const nextYear = new Date().getUTCFullYear() + 1;
  const futureJan31End = new Date(Date.UTC(nextYear, 0, 31, 12, 0, 0));

  const existingSub = {
    id: "sub-uuid-jan31",
    user_id: "user-uuid-111",
    plan_id: "pro",
    status: "active",
    current_period_start: new Date(Date.UTC(nextYear - 1, 11, 31, 12, 0, 0)).toISOString(),
    current_period_end: futureJan31End.toISOString(),
  };

  const mockClient = createMockSupabaseClient({ existingSub });

  const result = await processVerifiedPayment({
    supabaseClient: mockClient,
    reference: "ref_month_end_renewal",
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
  // Expect target month to be February (month index 1)
  const actualEnd = new Date(result.subscription.current_period_end);
  assert.strictEqual(actualEnd.getUTCMonth(), 1);
  // Expect date to be clamped to month end (28th or 29th)
  assert.ok(actualEnd.getUTCDate() === 28 || actualEnd.getUTCDate() === 29);
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

  const expectedEnd = addMonths(new Date(futureEnd), 1);
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

test("processVerifiedPayment is idempotent when existing subscription already references current payment_id", async () => {
  const existingSub = {
    id: "sub-uuid-111",
    user_id: "user-uuid-111",
    plan_id: "pro",
    status: "active",
    payment_id: "payment-uuid-ref_concurrent_race_4001",
    current_period_start: "2025-05-01T00:00:00.000Z",
    current_period_end: "2025-06-01T00:00:00.000Z",
  };

  const mockClient = createMockSupabaseClient({ existingSub });

  const result = await processVerifiedPayment({
    supabaseClient: mockClient,
    reference: "ref_concurrent_race_4001",
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
  assert.strictEqual(result.subscription.payment_id, "payment-uuid-ref_concurrent_race_4001");
  assert.strictEqual(result.subscription.current_period_end, "2025-06-01T00:00:00.000Z");
});

test("processVerifiedPayment rejects inactive plans", async () => {
  const mockClient = createMockSupabaseClient({
    plan: { id: "pro_retired", price_kobo: 250000, price_naira: 2500, billing_interval: "month", is_active: false },
  });

  await assert.rejects(
    async () => {
      await processVerifiedPayment({
        supabaseClient: mockClient,
        reference: "ref_inactive_plan_5001",
        paystackData: {
          amount: 250000,
          currency: "NGN",
          status: "success",
          metadata: {
            planId: "pro_retired",
            userId: "user-uuid-111",
          },
        },
      });
    },
    {
      name: "Error",
      message: "Plan is not active: pro_retired",
    }
  );
});

test("processVerifiedPayment rejects cross-user payment reference hijacking", async () => {
  const existingPayment = {
    id: "payment-uuid-888",
    user_id: "user-original-owner-111",
    reference: "ref_stolen_payment_6001",
    amount: 250000,
    currency: "NGN",
    status: "success",
    purpose: "subscription:pro",
    created_at: "2025-05-01T00:00:00.000Z",
    verified_at: "2025-05-01T00:00:05.000Z",
  };

  const mockClient = createMockSupabaseClient({ existingPayment });

  await assert.rejects(
    async () => {
      await processVerifiedPayment({
        supabaseClient: mockClient,
        reference: "ref_stolen_payment_6001",
        paystackData: {
          amount: 250000,
          currency: "NGN",
          status: "success",
          metadata: {
            planId: "pro",
            userId: "user-attacker-222",
          },
        },
      });
    },
    {
      name: "Error",
      message: "Payment reference belongs to another user",
    }
  );
});

test("processVerifiedPayment correctly parses stringified JSON metadata", async () => {
  const mockClient = createMockSupabaseClient();
  const result = await processVerifiedPayment({
    supabaseClient: mockClient,
    reference: "ref_stringified_meta_7001",
    paystackData: {
      amount: 250000,
      currency: "NGN",
      status: "success",
      metadata: JSON.stringify({
        planId: "pro",
        userId: "user-uuid-333",
      }),
    },
  });

  assert.strictEqual(result.alreadyProcessed, false);
  assert.strictEqual(result.payment.user_id, "user-uuid-333");
  assert.strictEqual(result.subscription.plan_id, "pro");
});

test("processVerifiedPayment completes subscription grant when retried after payment row exists but subscription is unlinked", async () => {
  const existingPayment = {
    id: "payment-uuid-unlinked-1001",
    user_id: "user-uuid-111",
    reference: "ref_unlinked_sub_1001",
    amount: 250000,
    currency: "NGN",
    status: "success",
    purpose: "subscription:pro",
    created_at: "2025-05-01T00:00:00.000Z",
    verified_at: "2025-05-01T00:00:05.000Z",
  };

  // No linked subscription existing yet (e.g. prior attempt recorded payment but failed before updating subscription)
  const mockClient = createMockSupabaseClient({ existingPayment, existingSub: null });

  const result = await processVerifiedPayment({
    supabaseClient: mockClient,
    reference: "ref_unlinked_sub_1001",
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
  assert.strictEqual(result.payment.reference, "ref_unlinked_sub_1001");
  assert.strictEqual(result.subscription.payment_id, "payment-uuid-ref_unlinked_sub_1001");
  assert.strictEqual(result.subscription.status, "active");
});

test("processVerifiedPayment returns alreadyProcessed when out-of-order charge.failed arrives after success", async () => {
  const existingPayment = {
    id: "payment-uuid-111",
    user_id: "user-uuid-111",
    reference: "ref_out_of_order_failed_8001",
    amount: 250000,
    currency: "NGN",
    status: "success",
    purpose: "subscription:pro",
    created_at: "2025-05-01T00:00:00.000Z",
    verified_at: "2025-05-01T00:00:05.000Z",
  };

  const existingSub = {
    id: "sub-uuid-111",
    user_id: "user-uuid-111",
    plan_id: "pro",
    status: "active",
    payment_id: "payment-uuid-111",
    current_period_start: "2025-05-01T00:00:05.000Z",
    current_period_end: "2025-06-01T00:00:05.000Z",
  };

  const mockClient = createMockSupabaseClient({ existingPayment, existingSub });

  // Simulate an out-of-order webhook or retry sending status: "failed" for an already successful payment
  const result = await processVerifiedPayment({
    supabaseClient: mockClient,
    reference: "ref_out_of_order_failed_8001",
    paystackData: {
      amount: 250000,
      currency: "NGN",
      status: "failed",
      metadata: {
        planId: "pro",
        userId: "user-uuid-111",
      },
    },
  });

  assert.strictEqual(result.alreadyProcessed, true);
  assert.strictEqual(result.payment.status, "success");
  assert.strictEqual(result.subscription.status, "active");
});

test("processVerifiedPayment rejects cross-user reference hijacking on failed or pending payments", async () => {
  const existingFailedPayment = {
    id: "payment-uuid-999",
    user_id: "user-original-owner-111",
    reference: "ref_failed_hijack_9001",
    amount: 250000,
    currency: "NGN",
    status: "failed",
    purpose: "subscription:pro",
    created_at: "2025-05-01T00:00:00.000Z",
  };

  const mockClient = createMockSupabaseClient({ existingPayment: existingFailedPayment });

  await assert.rejects(
    async () => {
      await processVerifiedPayment({
        supabaseClient: mockClient,
        reference: "ref_failed_hijack_9001",
        paystackData: {
          amount: 250000,
          currency: "NGN",
          status: "success",
          metadata: {
            planId: "pro",
            userId: "user-attacker-222",
          },
        },
      });
    },
    {
      name: "Error",
      message: "Payment reference belongs to another user",
    }
  );
});

test("processVerifiedPayment handles stringified null metadata without TypeError", async () => {
  const mockClient = createMockSupabaseClient();

  await assert.rejects(
    async () => {
      await processVerifiedPayment({
        supabaseClient: mockClient,
        reference: "ref_null_metadata_9002",
        paystackData: {
          amount: 250000,
          currency: "NGN",
          status: "success",
          metadata: "null",
        },
      });
    },
    {
      name: "Error",
      message: "Missing planId in Paystack metadata",
    }
  );
});
