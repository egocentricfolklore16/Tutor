import React, { useState, useRef } from "react";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import supabase from "../../lib/supabase";
import { mapAuthError } from "../../lib/authErrors";

const LoginPage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const errorRef = useRef(null);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });

  const handleClick = () => {
    navigate("/signup"); // change this to your target route
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (loading) return;

    setError("");
    setErrorCode("");
    setSuccessMessage("");

    if (!formData.email || !formData.password) {
      setError("Please enter both email and password.");
      setTimeout(() => errorRef.current?.focus(), 50);
      return;
    }

    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (authError) {
        const mapped = mapAuthError(authError);
        setError(mapped.message);
        setErrorCode(mapped.code);
        setFormData((prev) => ({ ...prev, password: "" }));
        setTimeout(() => errorRef.current?.focus(), 50);
      } else {
        if (formData.rememberMe) {
          try {
            const currentSession = await supabase.auth.getSession();
            if (currentSession.data?.session) {
              await supabase.auth.setSession({
                access_token: currentSession.data.session.access_token,
                refresh_token: currentSession.data.session.refresh_token,
              });
            }
          } catch {
            // ignore
          }
        }
        navigate("/Dashboard");
      }
    } catch (err) {
      const mapped = mapAuthError(err);
      setError(mapped.message);
      setErrorCode(mapped.code);
      setFormData((prev) => ({ ...prev, password: "" }));
      setTimeout(() => errorRef.current?.focus(), 50);
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!formData.email) return;
    setResendLoading(true);
    setSuccessMessage("");
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: formData.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (resendError) {
        const mapped = mapAuthError(resendError);
        setError(mapped.message);
      } else {
        setSuccessMessage("Confirmation email resent! Please check your inbox.");
      }
    } catch (err) {
      const mapped = mapAuthError(err);
      setError(mapped.message);
    } finally {
      setResendLoading(false);
    }
  };

  const handleSocialLogin = async (provider) => {
    setError("");
    setErrorCode("");
    setSuccessMessage("");
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: provider.toLowerCase(),
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: "https://www.googleapis.com/auth/calendar.events",
        },
      });
      if (authError) {
        const mapped = mapAuthError(authError);
        setError(`Error signing in with ${provider}: ${mapped.message}`);
        setTimeout(() => errorRef.current?.focus(), 50);
      }
    } catch (err) {
      const mapped = mapAuthError(err);
      setError(`Error signing in with ${provider}: ${mapped.message}`);
      setTimeout(() => errorRef.current?.focus(), 50);
    }
  };

  const handleForgotPassword = async () => {
    setError("");
    setErrorCode("");
    setSuccessMessage("");
    if (!formData.email) {
      setError("Please enter your email address first.");
      setTimeout(() => errorRef.current?.focus(), 50);
      return;
    }

    try {
      const { error: authError } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });

      if (authError) {
        const mapped = mapAuthError(authError);
        setError(`Error sending reset email: ${mapped.message}`);
        setTimeout(() => errorRef.current?.focus(), 50);
      } else {
        setSuccessMessage("Password reset email sent! Please check your inbox.");
      }
    } catch (err) {
      const mapped = mapAuthError(err);
      setError(`Error sending reset email: ${mapped.message}`);
      setTimeout(() => errorRef.current?.focus(), 50);
    }
  };

  return (
    <div className="w-full">
        {/* Logo and Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><img src="/logo3.png" alt="" className="h-10 w-10 object-contain" /></div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-500">Sign in to continue your learning journey</p>
          {error && (
            <div
              ref={errorRef}
              tabIndex={-1}
              role="alert"
              className="mt-3 text-sm font-medium text-red-600 bg-red-50 p-3 rounded-lg border border-red-200 outline-none text-left"
            >
              <p>{error}</p>
              {errorCode === "email_not_confirmed" && formData.email && (
                <button
                  type="button"
                  disabled={resendLoading}
                  onClick={handleResendConfirmation}
                  className="mt-2 inline-flex items-center text-xs font-bold text-emerald-700 underline hover:text-emerald-800 disabled:opacity-50"
                >
                  {resendLoading ? "Resending..." : "Resend confirmation email"}
                </button>
              )}
            </div>
          )}
          {successMessage && <p className="mt-3 text-sm font-medium text-emerald-700 bg-emerald-50 p-3 rounded-lg border border-emerald-200">{successMessage}</p>}
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <button type="button" onClick={() => handleSocialLogin("Google")} className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50">
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h6.44a5.5 5.5 0 0 1-2.39 3.61v3h3.87c2.27-2.09 3.57-5.17 3.57-8.64Z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.87-3A7.18 7.18 0 0 1 5.36 14.3H1.36v3.1A12 12 0 0 0 12 24Z"/><path fill="#FBBC05" d="M5.36 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.36a12 12 0 0 0 0 10.8l4-3.1Z"/><path fill="#EA4335" d="M12 4.77a6.52 6.52 0 0 1 4.6 1.8l3.45-3.45A12 12 0 0 0 1.36 6.6l4 3.1A7.18 7.18 0 0 1 12 4.77Z"/></svg>
            Continue with Google
          </button>
          <div className="flex items-center gap-3 text-xs font-semibold text-slate-400"><span className="h-px flex-1 bg-slate-200" />or<span className="h-px flex-1 bg-slate-200" /></div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
            <div className="relative"><Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100" placeholder="you@example.com" required /></div>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between"><label className="text-sm font-semibold text-slate-700">Password</label><button type="button" className="text-xs font-bold text-emerald-700 hover:text-emerald-800" onClick={handleForgotPassword}>Forgot password?</button></div>
            <div className="relative"><Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleInputChange} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-12 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100" placeholder="Enter your password" required /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-500"><input type="checkbox" name="rememberMe" checked={formData.rememberMe} onChange={handleInputChange} className="h-4 w-4 rounded border-slate-300 accent-emerald-600" />Remember me</label>
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed">{loading ? "Signing in..." : "Continue"}</button>
          <p className="text-center text-xs leading-5 text-slate-400">By continuing you agree to <button type="button" className="font-semibold text-slate-600" onClick={() => alert("Terms of Service to be implemented!")}>Terms</button> and <button type="button" className="font-semibold text-slate-600" onClick={() => alert("Privacy Policy to be implemented!")}>Privacy Policy</button></p>
          <p className="pt-3 text-center text-sm text-slate-500">Don&apos;t have an account? <button type="button" onClick={handleClick} className="font-bold text-emerald-700 hover:text-emerald-800">Create Account</button></p>
        </form>
    </div>
  );
};

export default LoginPage;
