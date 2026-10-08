/**
 * Compares two strings in constant time to prevent timing attacks on signatures/hashes.
 */
export function timingSafeEqualStrings(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") {
    return false;
  }
  const aLen = a.length;
  const bLen = b.length;

  let mismatch = aLen === bLen ? 0 : 1;
  const len = Math.min(aLen, bLen);

  for (let i = 0; i < len; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return mismatch === 0;
}

/**
 * Safely adds months to a Date object without day-of-month overflow (e.g., Jan 31 + 1 month -> Feb 28/29).
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const targetMonth = (result.getMonth() + months) % 12;
  result.setMonth(result.getMonth() + months);
  if (result.getMonth() !== targetMonth) {
    result.setDate(0);
  }
  return result;
}

export interface ProcessPaymentParams {
  supabaseClient: any;
  reference: string;
  paystackData: {
    amount: number;
    currency?: string;
    status: string;
    metadata?: {
      planId?: string;
      plan_id?: string;
      userId?: string;
      user_id?: string;
    };
    customer?: {
      email?: string;
      metadata?: {
        userId?: string;
        user_id?: string;
      };
    };
  };
}

export async function processVerifiedPayment({
  supabaseClient,
  reference,
  paystackData,
}: ProcessPaymentParams) {
  let metadata: any = paystackData.metadata || {};
  if (typeof metadata === "string") {
    try {
      metadata = JSON.parse(metadata);
    } catch (_e) {
      metadata = {};
    }
  }

  let customerMetadata: any = paystackData.customer?.metadata || {};
  if (typeof customerMetadata === "string") {
    try {
      customerMetadata = JSON.parse(customerMetadata);
    } catch (_e) {
      customerMetadata = {};
    }
  }

  const planId = metadata.planId || metadata.plan_id;
  const userId =
    metadata.userId ||
    metadata.user_id ||
    customerMetadata.userId ||
    customerMetadata.user_id;

  if (!planId) {
    throw new Error("Missing planId in Paystack metadata");
  }

  if (!userId) {
    throw new Error("Missing userId in Paystack metadata");
  }

  // 1. Fetch plan details server-side from `plans` table (trusted single source of truth)
  const { data: plan, error: planError } = await supabaseClient
    .from("plans")
    .select("*")
    .eq("id", planId)
    .single();

  if (planError || !plan) {
    throw new Error(`Plan not found: ${planId}`);
  }

  const recordFailedPayment = async (statusOverride?: string) => {
    if (userId && reference) {
      await supabaseClient.from("payments").upsert(
        {
          user_id: userId,
          reference: reference,
          amount: paystackData.amount || 0,
          currency: (paystackData.currency || "NGN").toUpperCase(),
          status: statusOverride || paystackData.status || "failed",
          purpose: `subscription:${planId}`,
          verified_at: new Date().toISOString(),
        },
        { onConflict: "reference" }
      );
    }
  };

  if (plan.is_active === false) {
    await recordFailedPayment("failed");
    throw new Error(`Plan is no longer active: ${planId}`);
  }

  // 2. Re-verify transaction status, currency, and amount against server-side plan.price_kobo
  if (paystackData.status !== "success") {
    await recordFailedPayment();
    throw new Error(`Payment verification failed: status is ${paystackData.status}`);
  }

  const receivedCurrency = (paystackData.currency || "NGN").toUpperCase();
  const expectedCurrency = "NGN";
  if (receivedCurrency !== expectedCurrency) {
    await recordFailedPayment("failed");
    throw new Error(
      `Currency mismatch: expected ${expectedCurrency}, received ${receivedCurrency}`
    );
  }

  const expectedAmountKobo =
    typeof plan.price_kobo === "number"
      ? plan.price_kobo
      : plan.price_naira * 100;

  if (paystackData.amount !== expectedAmountKobo) {
    await recordFailedPayment("failed");
    throw new Error(
      `Amount mismatch: expected ${expectedAmountKobo} kobo, received ${paystackData.amount} kobo`
    );
  }

  // 3. Idempotency check: return existing record if payment with this reference was already processed
  const { data: existingPayment } = await supabaseClient
    .from("payments")
    .select("*")
    .eq("reference", reference)
    .maybeSingle();

  if (existingPayment && existingPayment.status === "success") {
    const { data: existingSub } = await supabaseClient
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    // Verify value was actually granted on subscription; if subscription write previously failed or was missed, proceed to step 4-6 to complete entitlement recovery.
    if (existingSub && existingSub.payment_id === existingPayment.id) {
      return {
        payment: existingPayment,
        subscription: existingSub,
        plan,
        alreadyProcessed: true,
      };
    }
  }

  // 4. Upsert into `payments` table keyed on unique reference (idempotent)
  const { data: paymentRow, error: paymentError } = await supabaseClient
    .from("payments")
    .upsert(
      {
        user_id: userId,
        reference: reference,
        amount: paystackData.amount,
        currency: receivedCurrency,
        status: paystackData.status,
        purpose: `subscription:${planId}`,
        verified_at: new Date().toISOString(),
      },
      { onConflict: "reference" }
    )
    .select()
    .single();

  if (paymentError) {
    throw new Error(`Failed to record payment: ${paymentError.message}`);
  }

  // 5. Calculate period start/end based on plan.billing_interval
  const { data: existingSub } = await supabaseClient
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  // Concurrent race condition guard: if another thread/webhook updated subscriptions for this payment ID while step 4 was executing, do not double-grant.
  if (existingSub && existingSub.payment_id === paymentRow.id) {
    return {
      payment: paymentRow,
      subscription: existingSub,
      plan,
      alreadyProcessed: true,
    };
  }

  const now = new Date();
  let periodStart = now.toISOString();
  let baseDate = now;

  // If user has an active subscription for the same plan that hasn't expired, extend current_period_end
  if (
    existingSub &&
    existingSub.plan_id === planId &&
    existingSub.status === "active" &&
    existingSub.current_period_end
  ) {
    const existingEnd = new Date(existingSub.current_period_end);
    if (existingEnd > now) {
      baseDate = existingEnd;
      if (existingSub.current_period_start) {
        periodStart = existingSub.current_period_start;
      }
    }
  }

  let periodEnd: Date;

  if (plan.billing_interval === "year") {
    periodEnd = addMonths(baseDate, 12);
  } else {
    // Default to monthly billing
    periodEnd = addMonths(baseDate, 1);
  }

  // 6. Upsert into `subscriptions` table (one active subscription per user)
  const { data: subRow, error: subError } = await supabaseClient
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
        plan_id: planId,
        status: "active",
        current_period_start: periodStart,
        current_period_end: periodEnd.toISOString(),
        payment_id: paymentRow.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (subError) {
    throw new Error(`Failed to update subscription: ${subError.message}`);
  }

  return { payment: paymentRow, subscription: subRow, plan, alreadyProcessed: false };
}
