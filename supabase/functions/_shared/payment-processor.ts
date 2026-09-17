import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface ProcessPaymentParams {
  supabaseClient: ReturnType<typeof createClient>;
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
  const metadata = paystackData.metadata || {};
  const planId = metadata.planId || metadata.plan_id;
  const userId =
    metadata.userId ||
    metadata.user_id ||
    paystackData.customer?.metadata?.userId ||
    paystackData.customer?.metadata?.user_id;

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

  // 2. Re-verify transaction status and amount against server-side plan.price_kobo
  if (paystackData.status !== "success") {
    throw new Error(`Payment verification failed: status is ${paystackData.status}`);
  }

  if (paystackData.amount !== plan.price_kobo) {
    throw new Error(
      `Amount mismatch: expected ${plan.price_kobo} kobo, received ${paystackData.amount} kobo`
    );
  }

  // 3. Upsert into `payments` table keyed on unique reference (idempotent)
  const { data: paymentRow, error: paymentError } = await supabaseClient
    .from("payments")
    .upsert(
      {
        user_id: userId,
        reference: reference,
        amount: paystackData.amount,
        currency: paystackData.currency || "NGN",
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

  // 4. Calculate period start/end based on plan.billing_interval
  const now = new Date();
  const periodStart = now.toISOString();
  const periodEnd = new Date(now);

  if (plan.billing_interval === "year") {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    // Default to monthly billing
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  // 5. Upsert into `subscriptions` table (one active subscription per user)
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

  return { payment: paymentRow, subscription: subRow, plan };
}
