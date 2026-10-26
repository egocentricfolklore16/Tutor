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
        planId?: string;
        plan_id?: string;
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
  if (!reference || typeof reference !== "string" || !reference.trim()) {
    throw new Error("Missing or invalid payment reference");
  }

  const cleanReference = reference.trim();

  if (!paystackData || typeof paystackData !== "object") {
    throw new Error("Missing or invalid Paystack payment data");
  }

  let metadata: any = paystackData?.metadata || {};
  if (typeof metadata === "string") {
    try {
      metadata = JSON.parse(metadata);
    } catch {
      metadata = {};
    }
  }
  if (!metadata || typeof metadata !== "object") {
    metadata = {};
  }

  let customerMetadata: any = paystackData?.customer?.metadata || {};
  if (typeof customerMetadata === "string") {
    try {
      customerMetadata = JSON.parse(customerMetadata);
    } catch {
      customerMetadata = {};
    }
  }
  if (!customerMetadata || typeof customerMetadata !== "object") {
    customerMetadata = {};
  }

  const rawPlanId =
    metadata.planId ||
    metadata.plan_id ||
    customerMetadata.planId ||
    customerMetadata.plan_id;
  const rawUserId =
    metadata.userId ||
    metadata.user_id ||
    customerMetadata.userId ||
    customerMetadata.user_id;

  const planId =
    rawPlanId !== null && rawPlanId !== undefined ? String(rawPlanId).trim() : "";
  const userId =
    rawUserId !== null && rawUserId !== undefined ? String(rawUserId).trim() : "";

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

  let rawAmount = paystackData?.amount;
  let receivedAmountKobo = 0;
  if (typeof rawAmount === "number" && Number.isFinite(rawAmount)) {
    receivedAmountKobo = Math.round(rawAmount);
  } else if (typeof rawAmount === "string" && rawAmount.trim() !== "") {
    const parsed = Number(rawAmount);
    if (Number.isFinite(parsed)) {
      receivedAmountKobo = Math.round(parsed);
    }
  }

  const receivedCurrency = (paystackData?.currency || "NGN").toUpperCase();
  const expectedCurrency = "NGN";
  const expectedAmountKobo =
    typeof plan.price_kobo === "number" && Number.isFinite(plan.price_kobo)
      ? Math.round(plan.price_kobo)
      : Math.round((plan.price_naira || 0) * 100);

  // 2. Idempotency check: validate user ownership on existing reference & return existing record if already successful
  const { data: existingPayment } = await supabaseClient
    .from("payments")
    .select("*")
    .eq("reference", cleanReference)
    .maybeSingle();

  if (existingPayment) {
    if (existingPayment.user_id !== userId) {
      throw new Error("Payment reference belongs to another user");
    }

    if (existingPayment.status === "success") {
      const { data: existingSub } = await supabaseClient
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      const isSubPayment = (existingPayment.purpose || "").startsWith("subscription:");

      if (!isSubPayment || (existingSub && existingSub.payment_id === existingPayment.id)) {
        return {
          payment: existingPayment,
          subscription: existingSub,
          plan,
          alreadyProcessed: true,
        };
      }

      if (isSubPayment && existingSub && existingPayment.created_at) {
        const { data: newerPayments } = await supabaseClient
          .from("payments")
          .select("id, created_at")
          .eq("user_id", userId)
          .eq("status", "success")
          .neq("id", existingPayment.id)
          .gt("created_at", existingPayment.created_at)
          .limit(1);

        if (newerPayments && newerPayments.length > 0) {
          return {
            payment: existingPayment,
            subscription: existingSub,
            plan,
            alreadyProcessed: true,
          };
        }
      }
    }
  }

  // 3. Audit non-success or mismatched payment attempts in `payments` table without granting subscriptions
  if (
    paystackData.status !== "success" ||
    receivedCurrency !== expectedCurrency ||
    receivedAmountKobo !== expectedAmountKobo
  ) {
    // Prevent overwriting an already successful payment status with failed state on out-of-order payloads
    if (!existingPayment || existingPayment.status !== "success") {
      await supabaseClient.from("payments").upsert(
        {
          user_id: userId,
          reference: cleanReference,
          amount: receivedAmountKobo,
          currency: receivedCurrency,
          status: "failed",
          purpose: `subscription:${planId}`,
          verified_at: new Date().toISOString(),
        },
        { onConflict: "reference" }
      );
    }

    if (paystackData.status !== "success") {
      throw new Error(`Payment verification failed: status is ${paystackData.status}`);
    }

    if (receivedCurrency !== expectedCurrency) {
      throw new Error(
        `Currency mismatch: expected ${expectedCurrency}, received ${receivedCurrency}`
      );
    }

    if (receivedAmountKobo !== expectedAmountKobo) {
      throw new Error(
        `Amount mismatch: expected ${expectedAmountKobo} kobo, received ${receivedAmountKobo} kobo`
      );
    }
  }

  // 4. Upsert into `payments` table keyed on unique reference (idempotent)
  const { data: paymentRow, error: paymentError } = await supabaseClient
    .from("payments")
    .upsert(
      {
        user_id: userId,
        reference: cleanReference,
        amount: receivedAmountKobo,
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
