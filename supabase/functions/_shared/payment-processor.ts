/**
 * Adds months to a Date while safely handling month-end overflow (e.g. Jan 31 + 1 month -> Feb 28/29) in UTC.
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const targetMonth = (result.getUTCMonth() + months) % 12;
  const expectedMonth = targetMonth < 0 ? targetMonth + 12 : targetMonth;
  result.setUTCMonth(result.getUTCMonth() + months);
  if (result.getUTCMonth() !== expectedMonth) {
    result.setUTCDate(0);
  }
  return result;
}

/**
 * Adds years to a Date while safely handling leap-year overflow (e.g. Feb 29 + 1 year -> Feb 28) in UTC.
 */
export function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  const expectedMonth = result.getUTCMonth();
  result.setUTCFullYear(result.getUTCFullYear() + years);
  if (result.getUTCMonth() !== expectedMonth) {
    result.setUTCDate(0);
  }
  return result;
}

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
    } catch {
      metadata = {};
    }
  }

  let customerMetadata: any = paystackData.customer?.metadata || {};
  if (typeof customerMetadata === "string") {
    try {
      customerMetadata = JSON.parse(customerMetadata);
    } catch {
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

  if (plan.is_active === false) {
    throw new Error(`Plan is not active: ${planId}`);
  }

  // 2. Re-verify transaction status, currency, and amount against server-side plan.price_kobo
  if (paystackData.status !== "success") {
    throw new Error(`Payment verification failed: status is ${paystackData.status}`);
  }

  const receivedCurrency = (paystackData.currency || "NGN").toUpperCase();
  const expectedCurrency = "NGN";
  if (receivedCurrency !== expectedCurrency) {
    throw new Error(
      `Currency mismatch: expected ${expectedCurrency}, received ${receivedCurrency}`
    );
  }

  const expectedAmountKobo =
    typeof plan.price_kobo === "number"
      ? plan.price_kobo
      : plan.price_naira * 100;

  if (paystackData.amount !== expectedAmountKobo) {
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
    if (existingPayment.user_id !== userId) {
      throw new Error("Payment reference belongs to another user");
    }

    const { data: existingSub } = await supabaseClient
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    return {
      payment: existingPayment,
      subscription: existingSub,
      plan,
      alreadyProcessed: true,
    };
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

  // Concurrent idempotency check: if existingSub was already updated with this payment_id, return early
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

  const periodEnd =
    plan.billing_interval === "year"
      ? addYears(baseDate, 1)
      : addMonths(baseDate, 1);

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
