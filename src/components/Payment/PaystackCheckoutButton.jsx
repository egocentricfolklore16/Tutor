import React, { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import supabase from "../../lib/supabase";

const PAYSTACK_INLINE_URL = "https://js.paystack.co/v1/inline.js";

/**
 * PaystackCheckoutButton
 * @param {object} props
 * @param {string} props.email - User email
 * @param {number} props.amountNaira - Amount in Naira (e.g. 5000 for ₦5,000)
 * @param {string} props.userId - Current user ID
 * @param {string} [props.purpose] - Optional purpose of payment (e.g., 'subscription', 'gems')
 * @param {function} [props.onPaymentSuccess] - Callback fired AFTER server-side verification succeeds
 * @param {function} [props.onPaymentError] - Callback fired on error or verification failure
 * @param {string} [props.buttonText] - Label for button
 * @param {string} [props.className] - Optional custom CSS classes for button
 */
export default function PaystackCheckoutButton({
  email,
  amountNaira = 1000,
  userId,
  purpose = "general",
  onPaymentSuccess,
  onPaymentError,
  buttonText = "Pay with Paystack",
  className = "",
}) {
  const [loadingScript, setLoadingScript] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Load Paystack inline script
  useEffect(() => {
    if (window.PaystackPop) {
      setLoadingScript(false);
      return;
    }

    const script = document.createElement("script");
    script.src = PAYSTACK_INLINE_URL;
    script.async = true;
    script.onload = () => setLoadingScript(false);
    script.onerror = () => {
      setLoadingScript(false);
      setError("Failed to load Paystack payment library.");
    };
    document.body.appendChild(script);
  }, []);

  const handlePaystackCheckout = () => {
    setError("");
    setSuccess(false);

    if (!window.PaystackPop) {
      setError("Paystack inline library is not available.");
      return;
    }

    const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
    if (!publicKey) {
      setError("Public key (VITE_PAYSTACK_PUBLIC_KEY) is missing.");
      return;
    }

    if (!email || !userId) {
      setError("User email and ID are required to initiate payment.");
      return;
    }

    // Convert Naira to Kobo (multiply by 100)
    const amountInKobo = Math.round(Number(amountNaira) * 100);
    const reference = `ht_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const handler = window.PaystackPop.setup({
      key: publicKey,
      email: email,
      amount: amountInKobo,
      ref: reference,
      currency: "NGN",
      metadata: {
        user_id: userId,
        purpose: purpose,
        custom_fields: [
          {
            display_name: "User ID",
            variable_name: "user_id",
            value: userId,
          },
        ],
      },
      callback: function (response) {
        // onSuccess: POST reference to Edge Function for server-side verification
        setVerifying(true);
        verifyPaymentServerSide(response.reference);
      },
      onClose: function () {
        if (!verifying && !success) {
          setError("Payment window closed.");
        }
      },
    });

    handler.openIframe();
  };

  const verifyPaymentServerSide = async (reference) => {
    try {
      // Call verify-payment Edge Function using authenticated client
      const { data, error: fnError } = await supabase.functions.invoke("verify-payment", {
        body: { reference, purpose },
      });

      if (fnError) {
        throw new Error(fnError.message || "Failed to contact payment verification server.");
      }

      if (!data || !data.success) {
        throw new Error(data?.error || "Server payment verification failed.");
      }

      // ONLY mark as paid AFTER Edge Function returns success
      setVerifying(false);
      setSuccess(true);

      if (onPaymentSuccess) {
        onPaymentSuccess(data.payment);
      }
    } catch (err) {
      console.error("Payment verification error:", err);
      setVerifying(false);
      setError(err.message || "Payment verification failed.");
      if (onPaymentError) {
        onPaymentError(err);
      }
    }
  };

  return (
    <div className="inline-block">
      {error && (
        <p className="mb-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-700">
          {error}
        </p>
      )}
      {success && (
        <p className="mb-2 flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs font-semibold text-emerald-800">
          <ShieldCheck className="h-4 w-4" /> Payment verified and recorded successfully!
        </p>
      )}
      <button
        type="button"
        disabled={loadingScript || verifying}
        onClick={handlePaystackCheckout}
        className={
          className ||
          "inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60"
        }
      >
        {verifying ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Verifying payment...
          </>
        ) : loadingScript ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading Paystack...
          </>
        ) : (
          buttonText
        )}
      </button>
    </div>
  );
}
