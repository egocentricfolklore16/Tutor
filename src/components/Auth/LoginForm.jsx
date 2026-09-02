import React, { useState } from "react";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import supabase from "../../lib/supabase";

const LoginPage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
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
    setError("");
    if (!formData.email || !formData.password) {
      setError("Please enter both email and password.");
      return;
    }
    // Try to sign in with Supabase
    const { error } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    });
    if (error) {
      setError(error.message || "Login failed. Please try again.");
    } else {
      // Set session persistence based on "Remember me" checkbox
      if (formData.rememberMe) {
        await supabase.auth.setSession({
          access_token: (await supabase.auth.getSession()).data.session?.access_token,
          refresh_token: (await supabase.auth.getSession()).data.session?.refresh_token,
        });
      }
      navigate("/Dashboard");
    }
  };

  const handleSocialLogin = async (provider) => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider.toLowerCase(),
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: "https://www.googleapis.com/auth/calendar.events",
        },
      });
      if (error) {
        setError(`Error signing in with ${provider}: ${error.message}`);
      }
    } catch (err) {
      setError(`Error signing in with ${provider}: ${err.message}`);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      setError("Please enter your email address first.");
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });

      if (error) {
        setError(`Error sending reset email: ${error.message}`);
      } else {
        alert("Password reset email sent! Please check your inbox.");
      }
    } catch (err) {
      setError(`Error sending reset email: ${err.message}`);
    }
  };

  return (
    <div className="w-full">
        {/* Logo and Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><img src="/logo3.png" alt="" className="h-10 w-10 object-contain" /></div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-500">Sign in to continue your learning journey</p>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
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
          <button type="submit" className="w-full rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700">Continue</button>
          <p className="text-center text-xs leading-5 text-slate-400">By continuing you agree to <button type="button" className="font-semibold text-slate-600" onClick={() => alert("Terms of Service to be implemented!")}>Terms</button> and <button type="button" className="font-semibold text-slate-600" onClick={() => alert("Privacy Policy to be implemented!")}>Privacy Policy</button></p>
          <p className="pt-3 text-center text-sm text-slate-500">Don&apos;t have an account? <button type="button" onClick={handleClick} className="font-bold text-emerald-700 hover:text-emerald-800">Create Account</button></p>
        </form>
        {/* Legacy form content removed in favor of the split-screen form above. */}
        {false && <div className="space-y-4">
            {/* Username Field */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5"
                  stroke="currentColor"
                  fill="none"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  height="1em"
                  width="1em"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                <input
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

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5"
                  stroke="currentColor"
                  fill="currentColor"
                  strokeWidth="0"
                  viewBox="0 0 16 16"
                  height="1em"
                  width="1em"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect width="11" height="9" x="2.5" y="7" rx="2"></rect>
                  <path
                    fillRule="evenodd"
                    d="M4.5 4a3.5 3.5 0 117 0v3h-1V4a2.5 2.5 0 00-5 0v3h-1V4z"
                    clipRule="evenodd"
                  ></path>
                </svg>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-12 py-3 bg-[#0f1f0f] border border-emerald-800/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showPassword ? (
                    <svg
                      stroke="currentColor"
                      fill="currentColor"
                      strokeWidth="0"
                      viewBox="0 0 1024 1024"
                      height="1em"
                      width="1em"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M942.2 486.2Q889.47 375.11 816.7 305l-50.88 50.88C807.31 395.53 843.45 447.4 874.7 512 791.5 684.2 673.4 766 512 766q-72.67 0-133.87-22.38L323 798.75Q408 838 512 838q288.3 0 430.2-300.3a60.29 60.29 0 0 0 0-51.5zm-63.57-320.64L836 122.88a8 8 0 0 0-11.32 0L715.31 232.2Q624.86 186 512 186q-288.3 0-430.2 300.3a60.3 60.3 0 0 0 0 51.5q56.69 119.4 136.5 191.41L112.48 835a8 8 0 0 0 0 11.31L155.17 889a8 8 0 0 0 11.31 0l712.15-712.12a8 8 0 0 0 0-11.32zM149.3 512C232.6 339.8 350.7 258 512 258c54.54 0 104.13 9.36 149.12 28.39l-70.3 70.3a176 176 0 0 0-238.13 238.13l-83.42 83.42C223.1 637.49 183.3 582.28 149.3 512zm246.7 0a112.11 112.11 0 0 1 146.2-106.69L401.31 546.2A112 112 0 0 1 396 512z"></path>
                      <path d="M508 624c-3.46 0-6.87-.16-10.25-.47l-52.82 52.82a176.09 176.09 0 0 0 227.42-227.42l-52.82 52.82c.31 3.38.47 6.79.47 10.25a111.94 111.94 0 0 1-112 112z"></path>
                    </svg>
                  ) : (
                    <svg
                      stroke="currentColor"
                      fill="currentColor"
                      strokeWidth="0"
                      viewBox="0 0 1024 1024"
                      height="1em"
                      width="1em"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M942.2 486.2C847.4 286.5 704.1 186 512 186c-192.2 0-335.4 100.5-430.2 300.3a60.3 60.3 0 0 0 0 51.5C176.6 737.5 319.9 838 512 838c192.2 0 335.4-100.5 430.2-300.3 7.7-16.2 7.7-35 0-51.5zM512 766c-161.3 0-279.4-81.8-362.7-254C232.6 339.8 350.7 258 512 258c161.3 0 279.4 81.8 362.7 254C791.5 684.2 673.4 766 512 766zm-4-430c-97.2 0-176 78.8-176 176s78.8 176 176 176 176-78.8 176-176-78.8-176-176-176zm0 288c-61.9 0-112-50.1-112-112s50.1-112 112-112 112 50.1 112 112-50.1 112-112 112z"></path>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-emerald-500 bg-[#0f1f0f] border-emerald-800 rounded focus:ring-emerald-500 focus:ring-2"
                />
                <span className="ml-2 text-sm text-gray-300">Remember me</span>
              </label>
              <button
                type="button"
                className="text-sm text-emerald-400 hover:text-emerald-300"
                onClick={handleForgotPassword}
              >
                Forgot password?
              </button>
            </div>

            {/* Login Button */}
            <button
              type="button"
              onClick={handleSubmit}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
            >
              Sign In
            </button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-emerald-800/30"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-[#1a2f1a] text-gray-400">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Social Login Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleSocialLogin("Google")}
                className="flex items-center justify-center px-4 py-2 border border-emerald-800/30 rounded-lg text-gray-300 hover:bg-[#0f1f0f] transition-colors"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google
              </button>
              <button
                type="button"
                onClick={() => handleSocialLogin("Facebook")}
                className="flex items-center justify-center px-4 py-2 border border-emerald-800/30 rounded-lg text-gray-300 hover:bg-[#0f1f0f] transition-colors"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Facebook
              </button>
            </div>
          </div>}
    </div>
  );
};

export default LoginPage;
