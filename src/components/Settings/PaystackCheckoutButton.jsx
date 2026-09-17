import { useState } from "react";
import { Loader2, CreditCard } from "lucide-react";
import supabase from "../../lib/supabase.js";

const PAYSTACK_INLINE_SCRIPT_URL = "https://js.paystack.co/v1/inline.js";
const SCRIPT_ID = "paystack-inline-v1-script";

function loadPaystackScript() {
  return new Promise((resolve, reject) => {
    if (typeof window.PaystackPop !== "undefined") {
      resolve(true);
      return;
    }
    const existingScript = document.getElementById(SCRIPT_ID);
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(true));
      existingScript.addEventListener("error", () =>
        reject(new Error("Failed to load Paystack SDK"))
      );
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = PAYSTACK_INLINE_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error("Failed to load Paystack SDK"));
    document.body.appendChild(script);
  });
}

export default function PaystackCheckoutButton({
  planId,
  planName = "Pro",
  userEmail,
  userId,
  onPaymentSuccess,
  className = "",
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (planId === "free") {
    return null;
  }

  const handleCheckout = async () => {
    setError("");
    setLoading(true);

    try {
      if (!userId || !userEmail) {
        throw new Error(
          "User account information is missing. Please sign in again."
        );
      }

      const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
      if (!publicKey) {
        throw new Error("Paystack public key is not configured.");
      }

      // 1. Load Paystack inline SDK
      await loadPaystackScript();

      if (typeof window.PaystackPop === "undefined" || !window.PaystackPop.setup) {
        throw new Error(
          "Paystack Inline SDK is not available. Please check network or ad-blocker settings."
        );
      }

      // 2. Fetch plan's price_kobo from `plans` table for amount calculation
      const { data: planData, error: planError } = await supabase
        .from("plans")
        .select("price_kobo, price_naira")
        .eq("id", planId)
        .single();

      if (planError || !planData) {
        throw new Error("Unable to fetch plan details for checkout.");
      }

      // Calculate amount in kobo (multiplying Naira amount by 100)
      const amountKobo = planData.price_kobo || planData.price_naira * 100;
      const reference = `pstk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // 3. Initialize Paystack Inline Popup via PaystackPop.setup()
      const handler = window.PaystackPop.setup({
        key: publicKey,
        email: userEmail,
        amount: amountKobo,
        ref: reference,
        currency: "NGN",
        metadata: {
          planId: planId,
          userId: userId,
        },
        callback: async (response) => {
          // onSuccess handler: receive reference from Paystack response
          setLoading(true);
          try {
            const returnedRef = response?.reference || reference;

            // POST response.reference to verify-payment Edge Function
            // Do NOT mark anything as "paid" in UI until server verify call returns success
            const { data, error: verifyError } = await supabase.functions.invoke(
              "verify-payment",
              {
                body: { reference: returnedRef },
              }
            );

            if (verifyError || !data?.success) {
              const message =
                verifyError?.message ||
                data?.error ||
                "Payment verification failed on server.";
              setError(message);
              setLoading(false);
              return;
            }

            // Server verification succeeded
            setLoading(false);
            if (typeof onPaymentSuccess === "function") {
              onPaymentSuccess(data);
            }
          } catch (err) {
            console.error("Error calling verify-payment Edge Function:", err);
            setError("Server error during payment verification.");
            setLoading(false);
          }
        },
        onClose: () => {
          setLoading(false);
        },
      });

      handler.openIframe();
    } catch (err) {
      console.error("Checkout initialization failed:", err);
      setError(err.message || "Failed to launch Paystack payment.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handleCheckout}
        disabled={loading}
        className={`inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50 ${className}`}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Verifying Payment...
          </>
        ) : (
          <>
            <CreditCard className="h-4 w-4" />
            Upgrade to {planName}
          </>
        )}
      </button>
      {error && (
        <p className="mt-2 text-xs font-semibold text-red-600 text-center">{error}</p>
      )}
    </div>
  );
}
