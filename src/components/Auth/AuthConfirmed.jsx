import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../../lib/supabase.js";
import { Sparkles, CheckCircle } from "lucide-react";

export default function AuthConfirmed() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);

  const handleContinue = async () => {
    setChecking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        navigate("/onboarding", { replace: true });
      } else {
        navigate("/login", {
          replace: true,
          state: {
            message: "Email confirmed. Sign in to continue",
            redirectTo: "/onboarding",
          },
        });
      }
    } catch {
      navigate("/login", {
        replace: true,
        state: {
          message: "Email confirmed. Sign in to continue",
          redirectTo: "/onboarding",
        },
      });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 bg-slate-950 text-slate-100">
      {/* Full-screen / Card Container */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 text-center motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95">
        {/* Celebrating Owl Mascot */}
        <div className="relative mx-auto w-24 h-24 mb-6 flex items-center justify-center rounded-3xl bg-emerald-500/10 border border-emerald-500/20">
          <img
            src="/logo3.png"
            alt="Hyper Tutor Owl Mascot Celebrating"
            className="w-16 h-16 object-contain animate-bounce"
          />
          <div className="absolute -top-2 -right-2 bg-emerald-500 text-slate-950 p-1.5 rounded-full shadow-lg">
            <Sparkles className="w-4 h-4 fill-slate-950" />
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold mb-3">
          <CheckCircle className="w-3.5 h-3.5" /> Confirmed
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
          Your email is confirmed
        </h1>
        <p className="text-sm text-slate-300 mb-8 leading-relaxed">
          Welcome to Hyper Tutor! Your account is verified and ready. Let’s set up your personalized learning environment.
        </p>

        {/* ONE Primary Button */}
        <button
          type="button"
          disabled={checking}
          onClick={handleContinue}
          className="w-full bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-bold py-3.5 px-6 rounded-xl transition-colors text-base shadow-lg shadow-emerald-500/10 disabled:opacity-50"
        >
          {checking ? "Loading..." : "I have confirmed my email"}
        </button>
      </div>
    </div>
  );
}
