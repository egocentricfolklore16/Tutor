import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY") || "";

    if (!paystackSecretKey) {
      throw new Error("PAYSTACK_SECRET_KEY is not configured");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authenticate user via JWT
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized user session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { reference, purpose = null } = await req.json();

    if (!reference || typeof reference !== "string") {
      return new Response(JSON.stringify({ error: "Invalid payment reference" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call Paystack API to verify transaction
    const paystackResponse = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!paystackResponse.ok) {
      const errorText = await paystackResponse.text();
      return new Response(JSON.stringify({ error: `Paystack verification failed: ${errorText}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paystackData = await paystackResponse.json();

    if (!paystackData.status || paystackData.data?.status !== "success") {
      return new Response(JSON.stringify({ error: "Transaction verification status was not successful" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const transactionData = paystackData.data;
    const verifiedAmount = transactionData.amount; // amount in kobo from Paystack server
    const currency = transactionData.currency || "NGN";

    // Idempotent upsert into public.payments keyed on reference using service role client
    const { data: paymentRecord, error: dbError } = await supabaseAdmin
      .from("payments")
      .upsert(
        {
          user_id: user.id,
          reference: reference,
          amount: verifiedAmount,
          currency: currency,
          status: "success",
          purpose: purpose,
          verified_at: new Date().toISOString(),
        },
        { onConflict: "reference" }
      )
      .select()
      .single();

    if (dbError) {
      return new Response(JSON.stringify({ error: `Failed to record payment: ${dbError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment verified successfully",
        payment: paymentRecord,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
