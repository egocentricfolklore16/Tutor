import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Utility function to convert ArrayBuffer to hex string
function bufToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  try {
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!paystackSecretKey) {
      return new Response("PAYSTACK_SECRET_KEY is not configured", { status: 500 });
    }

    const signature = req.headers.get("x-paystack-signature");
    if (!signature) {
      return new Response("Missing x-paystack-signature header", { status: 401 });
    }

    // Read RAW body as ArrayBuffer BEFORE parsing
    const rawBodyBuffer = await req.arrayBuffer();

    // Verify HMAC-SHA512 signature on raw body
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(paystackSecretKey),
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["sign"]
    );

    const calculatedSignatureBuffer = await crypto.subtle.sign("HMAC", key, rawBodyBuffer);
    const calculatedSignatureHex = bufToHex(calculatedSignatureBuffer);

    if (calculatedSignatureHex !== signature) {
      return new Response("Invalid signature", { status: 401 });
    }

    // Parse JSON after signature verification
    const bodyText = new TextDecoder().decode(rawBodyBuffer);
    const event = JSON.parse(bodyText);

    // On charge.success event: perform idempotent upsert
    if (event.event === "charge.success" && event.data) {
      const data = event.data;
      const reference = data.reference;
      const amount = data.amount; // in kobo
      const currency = data.currency || "NGN";
      const status = data.status; // "success"
      const metadata = data.metadata || {};
      const userId = metadata.user_id || metadata.custom_fields?.find((f: any) => f.variable_name === "user_id")?.value;
      const purpose = metadata.purpose || null;

      if (reference && userId && status === "success") {
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        const { error: dbError } = await supabaseAdmin
          .from("payments")
          .upsert(
            {
              user_id: userId,
              reference: reference,
              amount: amount,
              currency: currency,
              status: status,
              purpose: purpose,
              verified_at: new Date().toISOString(),
            },
            { onConflict: "reference" }
          );

        if (dbError) {
          console.error("Webhook DB upsert error:", dbError.message);
        }
      }
    }

    // Always respond 200 quickly once verified/processed
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Webhook processing error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
