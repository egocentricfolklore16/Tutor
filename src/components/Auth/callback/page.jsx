"use client";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../../../lib/supabase.js";

import { mapAuthError } from "../../../lib/authErrors.js";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("verifying");
  const [error, setError] = useState(null);
  const [emailInput, setEmailInput] = useState("");
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendStatusMessage, setResendStatusMessage] = useState("");
  const [resendErrorMessage, setResendErrorMessage] = useState("");

  const redirectAfterAuth = async (session) => {
    if (!session?.user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("user_id", session.user.id)
      .maybeSingle();

    navigate(profile?.onboarding_completed ? "/Dashboard" : "/onboarding", { replace: true });
  };

  useEffect(() => {
    let mounted = true;

    const handleAuthCallback = async () => {
      try {
        setStatus("verifying");

        // Check for error parameters in URL hash or search
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const searchParams = new URLSearchParams(window.location.search);
        const errorCode = hashParams.get("error_code") || searchParams.get("error_code") || hashParams.get("error") || searchParams.get("error");
        const errorDescription = hashParams.get("error_description") || searchParams.get("error_description");
        const detectedEmail = hashParams.get("email") || searchParams.get("email") || "";

        if (detectedEmail) {
          setEmailInput(detectedEmail);
        }

        if (errorCode === "otp_expired" || errorCode === "access_denied" || errorDescription) {
          if (!mounted) return;
          setError("This link has expired or was already used.");
          setStatus("error");
          return;
        }

        // Handle access_token and refresh_token in hash if present
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        if (accessToken && refreshToken) {
          const { data, error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (!mounted) return;

          if (setSessionError) {
            setError("This link has expired or was already used.");
            setStatus("error");
            return;
          }

          if (data?.session) {
            setStatus("success");
            await redirectAfterAuth(data.session);
            return;
          }
        }

        // Get current session
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (sessionError) {
          setError("This link has expired or was already used.");
          setStatus("error");
          return;
        }

        if (session?.user) {
          setStatus("success");
          await redirectAfterAuth(session);
        } else {
          setError("This link has expired or was already used.");
          setStatus("error");
        }
      } catch (err) {
        if (!mounted) return;
        setError("This link has expired or was already used.");
        setStatus("error");
      }
    };

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === "SIGNED_IN" && session) {
        setStatus("success");
        redirectAfterAuth(session);
      } else if (event === "SIGNED_OUT") {
        navigate("/login");
      }
    });

    handleAuthCallback();

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [navigate]);

  const handleResendConfirmation = async (e) => {
    e?.preventDefault?.();
    if (!emailInput.trim()) {
      setShowEmailInput(true);
      return;
    }

    setResendLoading(true);
    setResendStatusMessage("");
    setResendErrorMessage("");

    try {
      const { error: resendErr } = await supabase.auth.resend({
        type: "signup",
        email: emailInput.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (resendErr) {
        const mapped = mapAuthError(resendErr);
        setResendErrorMessage(mapped.message);
      } else {
        setResendStatusMessage("Confirmation email has been resent successfully!");
      }
    } catch (err) {
      const mapped = mapAuthError(err);
      setResendErrorMessage(mapped.message);
    } finally {
      setResendLoading(false);
    }
  };

  const getStatusContent = () => {
    switch (status) {
      case "verifying":
        return {
          icon: (
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
          ),
          title: "Completing Sign In...",
          description: "Please wait while we verify your email confirmation.",
          bgColor: "bg-emerald-50",
          textColor: "text-emerald-950",
        };

      case "success":
        return {
          icon: (
            <div className="rounded-full h-12 w-12 bg-emerald-100 flex items-center justify-center">
              <svg
                className="h-6 w-6 text-emerald-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          ),
          title: "Email Confirmed!",
          description:
            "Welcome to Hyper Tutor. Redirecting you to setup...",
          bgColor: "bg-emerald-50",
          textColor: "text-emerald-950",
        };

      case "error":
        return {
          icon: (
            <div className="rounded-full h-12 w-12 bg-red-100 flex items-center justify-center">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          ),
          title: "Link Expired",
          description: error || "This link has expired or was already used.",
          bgColor: "bg-slate-50",
          textColor: "text-slate-900",
        };

      default:
        return {
          icon: (
            <div className="animate-pulse rounded-full h-12 w-12 bg-gray-200"></div>
          ),
          title: "Processing...",
          description: "Please wait",
          bgColor: "bg-gray-50",
          textColor: "text-gray-900",
        };
    }
  };

  const { icon, title, description, bgColor, textColor } = getStatusContent();

  return (
    <div
      className={`min-h-screen flex items-center justify-center ${bgColor} px-4`}
    >
      <div className="max-w-md w-full">
        {/* Hyper Tutor Logo/Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 mb-4">
            <img src="/logo3.png" alt="Hyper Tutor logo" className="h-10 w-10 object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Hyper Tutor</h1>
          <p className="text-slate-500 text-sm">
            Your Intelligent Learning Companion
          </p>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-xl shadow-lg p-8 text-center border border-slate-100">
          <div className="flex justify-center mb-6">{icon}</div>

          <h2 className={`text-xl font-bold mb-3 ${textColor}`}>{title}</h2>

          <p className="text-slate-600 mb-6 text-sm">{description}</p>

          {/* Progress indicators */}
          {status === "verifying" && (
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div
                className="bg-emerald-600 h-2 rounded-full animate-pulse"
                style={{ width: "60%" }}
              ></div>
            </div>
          )}

          {status === "error" && (
            <div className="mt-6 space-y-3">
              {resendStatusMessage && (
                <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                  {resendStatusMessage}
                </p>
              )}
              {resendErrorMessage && (
                <p className="text-xs font-semibold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                  {resendErrorMessage}
                </p>
              )}

              {showEmailInput && (
                <form onSubmit={handleResendConfirmation} className="mb-3 text-left">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Enter your email</label>
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </form>
              )}

              <button
                type="button"
                disabled={resendLoading}
                onClick={handleResendConfirmation}
                className="w-full inline-flex items-center justify-center px-4 py-3 border border-emerald-600/30 text-sm font-bold rounded-xl text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors disabled:opacity-50"
              >
                {resendLoading ? "Resending..." : "Resend confirmation email"}
              </button>

              <button
                type="button"
                onClick={() => navigate("/login")}
                className="w-full inline-flex items-center justify-center px-4 py-3 text-sm font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors"
              >
                Back to login
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-400">
            Having trouble?{" "}
            <button type="button" onClick={() => navigate("/FAQ")} className="text-emerald-700 hover:underline font-semibold">
              Visit FAQ & Support
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
