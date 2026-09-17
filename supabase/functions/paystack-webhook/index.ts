import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { processVerifiedPayment } from "../_shared/payment-processor.ts";

async function verifyPaystackSignature(
  rawBody: string,
  signature: string | null,
  secretKey: string
): Promise<boolean> {
  if (!signature) return false;

  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );

  const signatureBytes = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(rawBody)
  );

  const hashArray = Array.from(new Uint8Array(signatureBytes));
  const hexHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  return hexHash.toLowerCase() === signature.toLowerCase();
}

Deno.serve(async (req) => {
  try {
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecretKey) {
      console.error("Missing PAYSTACK_SECRET_KEY environment variable");
      return new Response("Server configuration error", { status: 500 });
    }

    const signature = req.headers.get("x-paystack-signature");
    const rawBody = await req.text();

    // Verify webhook signature on raw body BEFORE parsing JSON
    const isValidSignature = await verifyPaystackSignature(
      rawBody,
      signature,
      paystackSecretKey
    );

    if (!isValidSignature) {
      console.warn("Invalid Paystack webhook signature");
      return new Response("Unauthorized signature mismatch", { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;

    if (event === "charge.success") {
      const eventData = payload.data;
      const reference = eventData.reference;

      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

      if (supabaseUrl && supabaseServiceRoleKey) {
        const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);
        await processVerifiedPayment({
          supabaseClient,
          reference,
          paystackData: eventData,
        });
      }
    }

    return new Response(JSON.stringify({ status: "success" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error processing Paystack webhook:", error);
    // Respond with 200 to acknowledge webhook receipt even if error occurs, preventing infinite retries
    return new Response(JSON.stringify({ status: "error", message: error.message }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
});
