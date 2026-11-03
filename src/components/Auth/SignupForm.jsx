import React, { useState, useRef, useEffect } from "react";
import { Eye, EyeOff, Mail, Lock, User, Check, RefreshCw } from "lucide-react";
import supabase from "../../lib/supabase.js";
import { useNavigate } from "react-router-dom";
import { mapAuthError } from "../../lib/authErrors.js";

const SignupPage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    userName: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
    subscribeNewsletter: false,
  });

  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  // Resend cooldown & inline error state
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [resendError, setResendError] = useState("");

  const errorRef = useRef(null);
  const emailInputRef = useRef(null);
  const cooldownTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    };
  }, []);

  const startResendCooldown = (seconds = 60) => {
    setResendCooldown(seconds);
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    cooldownTimerRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownTimerRef.current);
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

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (name === "password") {
      calculatePasswordStrength(value);
    }
  };

  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    setPasswordStrength(strength);
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 1) return "bg-red-500";
    if (passwordStrength <= 2) return "bg-yellow-500";
    if (passwordStrength <= 3) return "bg-blue-500";
    return "bg-green-500";
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength <= 1) return "Weak";
    if (passwordStrength <= 2) return "Fair";
    if (passwordStrength <= 3) return "Good";
    return "Strong";
  };

  const handleResendEmail = async () => {
    if (!formData.email || resendCooldown > 0 || resendLoading) return;
    setResendLoading(true);
    setResendMessage("");
    setResendError("");

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: formData.email,
        options: {
          emailRedirectTo: getRedirectUrl(),
        },
      });

      if (error) {
        const mapped = mapAuthError(error);
        setResendError(mapped.message);
      } else {
        setResendMessage("Confirmation email has been resent successfully.");
        startResendCooldown(60);
      }
    } catch (err) {
      const mapped = mapAuthError(err);
      setResendError(mapped.message);
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (loading) return;
    setFormError("");

    if (!formData.userName || !formData.email || !formData.password) {
      setFormError("Please fill in all required fields.");
      setTimeout(() => errorRef.current?.focus(), 50);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setFormError("Passwords do not match.");
      setTimeout(() => errorRef.current?.focus(), 50);
      return;
    }

    if (!formData.agreeToTerms) {
      setFormError("Please agree to the Terms of Service and Privacy Policy.");
      setTimeout(() => errorRef.current?.focus(), 50);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.userName.trim(),
            userName: formData.userName.trim(),
          },
          emailRedirectTo: getRedirectUrl(),
        },
      });

      if (error) {
        const mapped = mapAuthError(error);
        setFormError(mapped.message);
        setFormData((prev) => ({ ...prev, password: "", confirmPassword: "" }));
        setTimeout(() => errorRef.current?.focus(), 50);
        return;
      }

      setResendMessage("");
      setResendError("");
      setShowConfirmModal(true);
      startResendCooldown(60);
    } catch (err) {
      const mapped = mapAuthError(err);
      setFormError(mapped.message);
      setFormData((prev) => ({ ...prev, password: "", confirmPassword: "" }));
      setTimeout(() => errorRef.current?.focus(), 50);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignup = async (provider) => {
    setFormError("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider.toLowerCase(),
        options: {
          redirectTo: getRedirectUrl(),
          scopes: "https://www.googleapis.com/auth/calendar.events",
        },
      });
      if (error) {
        const mapped = mapAuthError(error);
        setFormError(`Error signing up with ${provider}: ${mapped.message}`);
        setTimeout(() => errorRef.current?.focus(), 50);
      }
    } catch (err) {
      const mapped = mapAuthError(err);
      setFormError(`Error signing up with ${provider}: ${mapped.message}`);
      setTimeout(() => errorRef.current?.focus(), 50);
    }
  };

  const handleWrongEmail = () => {
    setShowConfirmModal(false);
    setTimeout(() => {
      emailInputRef.current?.focus();
      emailInputRef.current?.select();
    }, 100);
  };

  return (
    <>
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 text-center motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95">
            {/* Owl Mascot Illustration */}
            <div className="relative mx-auto w-20 h-20 mb-5 flex items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <img src="/logo3.png" alt="Hyper Tutor Owl Mascot" className="w-14 h-14 object-contain animate-bounce" />
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">Check your inbox</h2>
            <p className="text-sm text-slate-300 mb-4 leading-relaxed">
              We sent a confirmation link to <br />
              <strong className="text-emerald-400 font-semibold break-all">{formData.email}</strong>
            </p>

            <div className="bg-slate-800/60 rounded-xl p-3 mb-6 border border-slate-700/50 text-xs text-slate-300">
              <p className="font-medium">Open your email app and click the link to confirm.</p>
              <p className="text-slate-400 mt-1">If you don't see it, check your spam or junk folder.</p>
            </div>

            {resendMessage && (
              <p className="text-xs font-semibold text-emerald-400 mb-4 bg-emerald-950/60 p-3 rounded-xl border border-emerald-800/50">
                {resendMessage}
              </p>
            )}
            {resendError && (
              <p className="text-xs font-semibold text-red-400 mb-4 bg-red-950/60 p-3 rounded-xl border border-red-800/50">
                {resendError}
              </p>
            )}

            <div className="space-y-3">
              <button
                type="button"
                disabled={resendCooldown > 0 || resendLoading}
                onClick={handleResendEmail}
                className="w-full inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 px-5 rounded-xl transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resendLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Resending email...
                  </>
                ) : resendCooldown > 0 ? (
                  `Resend in ${resendCooldown}s`
                ) : (
                  "Resend confirmation email"
                )}
              </button>

              <button
                type="button"
                onClick={handleWrongEmail}
                className="w-full bg-slate-800/80 hover:bg-slate-800 text-slate-300 font-semibold py-2.5 px-5 rounded-xl transition-colors text-sm border border-slate-700/80"
              >
                Wrong email? Change it
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="auth-form w-full">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100">
                <img src="/logo3.png" alt="Hyper Tutor logo" className="h-10 w-10 object-contain" />
              </div>
              <h1 className="hidden text-2xl font-bold text-slate-950">Hyper Tutor</h1>
            </div>
            <h2 className="text-3xl font-black tracking-tight text-slate-950 mb-2">
              Create Account
            </h2>
            <p className="text-sm text-slate-500">
              Start your personalized learning journey today
            </p>
            {formError && (
              <div
                ref={errorRef}
                tabIndex={-1}
                role="alert"
                className="mt-4 rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm font-medium text-red-400 text-center outline-none"
              >
                {formError}
              </div>
            )}
          </div>

          {/* Form */}
          <div className="auth-form-content rounded-xl p-0">
            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    name="userName"
                    value={formData.userName}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 bg-[#0f1f0f] border border-emerald-800/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    placeholder="Full Name"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    ref={emailInputRef}
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 bg-[#0f1f0f] border border-emerald-800/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-12 py-3 bg-[#0f1f0f] border border-emerald-800/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    placeholder="Create a password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {formData.password && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-[#0f1f0f] rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                          style={{ width: `${(passwordStrength / 5) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-400">
                        {getPasswordStrengthText()}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-12 py-3 bg-[#0f1f0f] border border-emerald-800/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    placeholder="Confirm your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
                )}
                {formData.confirmPassword && formData.password === formData.confirmPassword && formData.password && (
                  <p className="text-green-400 text-xs mt-1 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Passwords match
                  </p>
                )}
              </div>

              {/* Terms */}
              <div className="space-y-3">
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="terms"
                    name="agreeToTerms"
                    checked={formData.agreeToTerms}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-emerald-500 bg-[#0f1f0f] border-emerald-800 rounded focus:ring-emerald-500 focus:ring-2 mt-0.5"
                    required
                  />
                  <label htmlFor="terms" className="ml-2 text-sm text-gray-300">
                    I agree to the Terms of Service and Privacy Policy
                  </label>
                </div>
              </div>

              {/* Submit */}
              <button
                type="button"
                disabled={loading}
                onClick={handleSubmit}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Creating Account..." : "Create Account"}
              </button>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-emerald-800/30"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-[#1a2f1a] text-gray-400">Or sign up with</span>
                </div>
              </div>

              {/* Social Signup */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleSocialSignup("Google")}
                  className="flex items-center justify-center px-4 py-2 border border-emerald-800/30 rounded-lg text-gray-300 hover:bg-[#0f1f0f] transition-colors"
                >
                  Google
                </button>
                <button
                  type="button"
                  onClick={() => handleSocialSignup("Facebook")}
                  className="flex items-center justify-center px-4 py-2 border border-emerald-800/30 rounded-lg text-gray-300 hover:bg-[#0f1f0f] transition-colors"
                >
                  Facebook
                </button>
              </div>
            </div>

            {/* Login link */}
            <div className="mt-6 text-center">
              <span className="text-gray-400">Already have an account? </span>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="text-emerald-400 hover:text-emerald-300 font-medium"
              >
                Log in
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SignupPage;
