import { useState, useEffect } from "react";
import { Loader2, CreditCard } from "lucide-react";
import supabase from "../../lib/supabase.js";

function loadPaystackScript() {
  return new Promise((resolve, reject) => {
    if (window.PaystackPop) {
      resolve(true);
      return;
    }
    const existingScript = document.getElementById("paystack-inline-script");
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(true));
      existingScript.addEventListener("error", () => reject(new Error("Failed to load Paystack SDK")));
      return;
    }

    const script = document.createElement("script");
    script.id = "paystack-inline-script";
    script.src = "https://js.paystack.co/v1/inline.js";
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
        throw new Error("User account information is missing. Please sign in again.");
      }

      const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
      if (!publicKey) {
        throw new Error("Paystack public key is not configured.");
      }

      // 1. Load Paystack inline SDK
      await loadPaystackScript();

      if (!window.PaystackPop) {
        throw new Error("Paystack SDK could not be initialized.");
      }

      // 2. Fetch plan's price_kobo from `plans` table for display in Paystack popup
      const { data: planData, error: planError } = await supabase
        .from("plans")
        .select("price_kobo")
        .eq("id", planId)
        .single();

      if (planError || !planData) {
        throw new Error("Unable to fetch plan details for checkout.");
      }

      const amountKobo = planData.price_kobo;
      const reference = `pstk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // 3. Trigger Paystack Inline Popup
      const handler = window.PaystackPop.setup({
        key: publicKey,
        email: userEmail,
        amount: amountKobo,
        ref: reference,
        metadata: {
          planId: planId,
          userId: userId,
        },
        callback: async function (response) {
          // onSuccess handler
          setLoading(true);
          try {
            // POST { reference } to verify-payment Edge Function
            const { data, error: verifyError } = await supabase.functions.invoke(
              "verify-payment",
              {
                body: { reference: response.reference || reference },
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

            // Server-side verification succeeded. Trigger parent refetch from DB.
            setLoading(false);
            if (onPaymentSuccess) {
              onPaymentSuccess(data);
            }
          } catch (err) {
            console.error("Error calling verify-payment:", err);
            setError("Server error during payment verification.");
            setLoading(false);
          }
        },
        onClose: function () {
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
