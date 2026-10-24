import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import supabase from "../../lib/supabase.js";
import { mapAuthError } from "../../lib/authErrors.js";
import { RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";

export default function AuthConfirm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("verifying"); // 'verifying' | 'success' | 'expired' | 'already_confirmed' | 'network_error'
  const [errorMessage, setErrorMessage] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [resendError, setResendError] = useState("");

  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startResendCooldown = (seconds = 60) => {
    setResendCooldown(seconds);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const getRedirectUrl = () => {
    const baseUrl = (import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/$/, "");
    return `${baseUrl}/auth/confirm`;
  };

  const verifyToken = useCallback(async () => {
    setStatus("verifying");
    setErrorMessage("");
    setResendError("");
    setResendMessage("");

    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type") || "signup";
    const errorParam = searchParams.get("error");
    const errorCode = searchParams.get("error_code");

    if (errorParam || errorCode === "otp_expired") {
      setStatus("expired");
      setErrorMessage("This confirmation link has expired or is invalid.");
      return;
    }

    if (!tokenHash) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setStatus("already_confirmed");
        return;
      }
      setStatus("expired");
      setErrorMessage("No confirmation token found in the request.");
      return;
    }

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type,
      });

      if (error) {
        const errMsg = error.message?.toLowerCase() || "";
        const errCode = error.code || "";

        if (errMsg.includes("already") || errCode === "email_already_confirmed") {
          setStatus("already_confirmed");
        } else if (errMsg.includes("network") || errMsg.includes("fetch")) {
          setStatus("network_error");
          setErrorMessage("Network connection error. Please check your internet connection.");
        } else {
          setStatus("expired");
          setErrorMessage(error.message || "This confirmation link has expired or is invalid.");
        }
        return;
      }

      if (data?.session) {
        navigate("/auth/confirmed", { replace: true });
      } else {
        setStatus("already_confirmed");
      }
    } catch (err) {
      const mapped = mapAuthError(err);
      if (err?.message?.toLowerCase().includes("network") || err?.message?.toLowerCase().includes("fetch")) {
        setStatus("network_error");
        setErrorMessage("Network error during verification. Please try again.");
      } else {
        setStatus("expired");
        setErrorMessage(mapped.message || "Unable to verify email confirmation link.");
      }
    }
  }, [searchParams, navigate]);

  useEffect(() => {
    verifyToken();
  }, [verifyToken]);

  const handleResend = async (e) => {
    e?.preventDefault?.();
    if (!resendEmail.trim() || resendCooldown > 0 || resendLoading) return;

    setResendLoading(true);
    setResendMessage("");
    setResendError("");

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: resendEmail.trim(),
        options: {
          emailRedirectTo: getRedirectUrl(),
        },
      });

      if (error) {
        const mapped = mapAuthError(error);
        setResendError(mapped.message);
      } else {
        setResendMessage("A new confirmation email has been sent.");
        startResendCooldown(60);
      }
    } catch (err) {
      const mapped = mapAuthError(err);
      setResendError(mapped.message);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 bg-slate-950 text-slate-100">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 text-center">
        {/* Owl Mascot Header */}
        <div className="relative mx-auto w-20 h-20 mb-5 flex items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
          <img src="/logo3.png" alt="Hyper Tutor Owl Mascot" className="w-14 h-14 object-contain" />
        </div>

        {status === "verifying" && (
          <div className="space-y-4 py-4">
            <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
            <h2 className="text-xl font-bold text-white">Verifying your email...</h2>
            <p className="text-sm text-slate-400">Please wait while we confirm your email address.</p>
          </div>
        )}

        {status === "already_confirmed" && (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-white">You're already confirmed</h2>
            <p className="text-sm text-slate-300">Your email address has already been verified.</p>
            <button
              type="button"
              onClick={() => navigate("/auth/confirmed")}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 px-5 rounded-xl transition-colors text-sm mt-4"
            >
              Continue
            </button>
          </div>
        )}

        {status === "expired" && (
          <div className="space-y-4 text-left">
            <div className="flex items-center gap-3 text-red-400 mb-2">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h2 className="text-xl font-bold text-white">This link has expired</h2>
            </div>
            <p className="text-sm text-slate-300 mb-4">{errorMessage || "Confirmation links expire for security reasons."}</p>

            {resendMessage && (
              <p className="text-xs font-semibold text-emerald-400 bg-emerald-950/60 p-3 rounded-xl border border-emerald-800/50">
                {resendMessage}
              </p>
            )}
            {resendError && (
              <p className="text-xs font-semibold text-red-400 bg-red-950/60 p-3 rounded-xl border border-red-800/50">
                {resendError}
              </p>
            )}

            <form onSubmit={handleResend} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Enter your email to get a new link</label>
                <input
                  type="email"
                  required
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={resendCooldown > 0 || resendLoading || !resendEmail.trim()}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 px-5 rounded-xl transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {resendLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Resending...
                  </>
                ) : resendCooldown > 0 ? (
                  `Resend in ${resendCooldown}s`
                ) : (
                  "Resend confirmation link"
                )}
              </button>
            </form>

            <button
              type="button"
              onClick={() => navigate("/login")}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 px-5 rounded-xl transition-colors text-sm border border-slate-700 text-center block"
            >
              Back to sign in
            </button>
          </div>
        )}

        {status === "network_error" && (
          <div className="space-y-4">
            <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
            <h2 className="text-xl font-bold text-white">Connection error</h2>
            <p className="text-sm text-slate-300">{errorMessage}</p>
            <button
              type="button"
              onClick={verifyToken}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 px-5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
