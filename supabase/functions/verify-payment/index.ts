import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { processVerifiedPayment } from "../_shared/payment-processor.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecretKey) {
      throw new Error("Missing PAYSTACK_SECRET_KEY environment variable");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Missing Supabase configuration environment variables");
    }

    const body = await req.json();
    const { reference } = body || {};

    if (!reference) {
      return new Response(
        JSON.stringify({ error: "Missing reference in request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Fetch transaction status directly from Paystack API
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const paystackData = await paystackResponse.json();

    if (!paystackResponse.ok || !paystackData.status) {
      return new Response(
        JSON.stringify({
          error: paystackData.message || "Failed to verify transaction with Paystack",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Initialize Supabase Service Role client to bypass RLS for write actions
    const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 3. Process payment, ignoring client amount and re-verifying expected amount server-side
    const result = await processVerifiedPayment({
      supabaseClient,
      reference,
      paystackData: paystackData.data,
    });

    return new Response(
      JSON.stringify({
        success: true,
        payment: result.payment,
        subscription: result.subscription,
        plan: result.plan,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in verify-payment Edge Function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
