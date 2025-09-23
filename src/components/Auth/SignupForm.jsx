import React, { useState } from "react";
import { Eye, EyeOff, Mail, Lock, User, BookOpen, Check } from "lucide-react";
import supabase from "../../lib/supabase.js";
import { useNavigate } from "react-router-dom";
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
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    // Calculate password strength
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

  const handleSubmit = async () => {
    // Basic validation
    if (!formData.userName || !formData.email || !formData.password) {
      alert("Please fill in all required fields");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    if (!formData.agreeToTerms) {
      alert("Please agree to the Terms of Service and Privacy Policy");
      return;
    }

    console.log("Signup attempt:", formData);
    const { data, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          userName: formData.userName
        }
      }
    });
    if (error) {
      console.error("Error signing Up:", error.message);
      alert(error.message || "Signup failed.");
      return;
    }

    // Insert username into profiles table
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            user_id: data.user.id,
            username: formData.userName
          }
        ]);
      if (profileError) {
        console.error("Error saving profile:", profileError.message);
        alert("Account created but profile save failed: " + profileError.message);
        return;
      }
    }

    setShowConfirmDialog(true);
  };

  const handleSocialSignup = (provider) => {
    console.log(`Signup with ${provider}`);
    // Add your social signup logic here
    alert(`${provider} signup to be implemented!`);
  };

  const handleClick = () => {
    navigate("/login"); // change this to your target route
  };
  return (
    <>
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-sm w-full text-center">
            <h2 className="text-xl font-bold mb-4 text-emerald-700">Confirm your email</h2>
            <p className="mb-4 text-gray-700">A confirmation link has been sent to <span className="font-semibold">{formData.email}</span>.<br/>Please check your inbox and click the link to activate your account.</p>
            <button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-6 rounded-lg mt-2"
              onClick={() => window.location.reload()}
            >
              I have confirmed my email
            </button>
          </div>
        </div>
      )}
      <div className="w-auto flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo and Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center">
                <img src="logo.png" alt="" />
              </div>
              <h1 className="text-2xl font-bold text-white">Hyper Tutor</h1>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Create Account
            </h2>
            <p className="text-gray-400">
              Start your personalized learning journey today
            </p>
          </div>

          {/* Signup Form */}
          <div className="bg-[#1a2f1a] rounded-xl p-6 shadow-xl border border-emerald-900/20">
            <div className="space-y-4">
              {/* Name Fields */}
              <div className="w-full">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                  Username *
                </label>
                <div className="relative">
                  <svg
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5"
                    stroke="currentColor"
                    fill="currentColor"
                    stroke-width="0"
                    viewBox="0 0 1024 1024"
                    height="1em"
                    width="1em"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M858.5 763.6a374 374 0 0 0-80.6-119.5 375.63 375.63 0 0 0-119.5-80.6c-.4-.2-.8-.3-1.2-.5C719.5 518 760 444.7 760 362c0-137-111-248-248-248S264 225 264 362c0 82.7 40.5 156 102.8 201.1-.4.2-.8.3-1.2.5-44.8 18.9-85 46-119.5 80.6a375.63 375.63 0 0 0-80.6 119.5A371.7 371.7 0 0 0 136 901.8a8 8 0 0 0 8 8.2h60c4.4 0 7.9-3.5 8-7.8 2-77.2 33-149.5 87.8-204.3 56.7-56.7 132-87.9 212.2-87.9s155.5 31.2 212.2 87.9C779 752.7 810 825 812 902.2c.1 4.4 3.6 7.8 8 7.8h60a8 8 0 0 0 8-8.2c-1-47.8-10.9-94.3-29.5-138.2zM512 534c-45.9 0-89.1-17.9-121.6-50.4S340 407.9 340 362c0-45.9 17.9-89.1 50.4-121.6S466.1 190 512 190s89.1 17.9 121.6 50.4S684 316.1 684 362c0 45.9-17.9 89.1-50.4 121.6S557.9 534 512 534z"></path>
                  </svg>
                  <input
                    type="text"
                    name="userName"
                    value={formData.userName}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 bg-[#0f1f0f] border border-emerald-800/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    placeholder="Username"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address *
              </label>
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5"
                  stroke="currentColor"
                  fill="none"
                  stroke-width="2"
                  viewBox="0 0 24 24"
                  stroke-linecap="round"
                  stroke-linejoin="round"
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
                Password *
              </label>
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5"
                  stroke="currentColor"
                  fill="currentColor"
                  stroke-width="0"
                  viewBox="0 0 16 16"
                  height="1em"
                  width="1em"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect width="11" height="9" x="2.5" y="7" rx="2"></rect>
                  <path
                    fill-rule="evenodd"
                    d="M4.5 4a3.5 3.5 0 117 0v3h-1V4a2.5 2.5 0 00-5 0v3h-1V4z"
                    clip-rule="evenodd"
                  ></path>
                </svg>
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
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showPassword ? (
                    <svg
                      stroke="currentColor"
                      fill="currentColor"
                      stroke-width="0"
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
                      stroke-width="0"
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

              {/* Password Strength Indicator */}
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
                  <div className="text-xs text-gray-500 mt-1">
                    Use 8+ characters with uppercase, lowercase, numbers &
                    symbols
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Confirm Password *
              </label>
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5"
                  stroke="currentColor"
                  fill="currentColor"
                  stroke-width="0"
                  viewBox="0 0 16 16"
                  height="1em"
                  width="1em"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect width="11" height="9" x="2.5" y="7" rx="2"></rect>
                  <path
                    fill-rule="evenodd"
                    d="M4.5 4a3.5 3.5 0 117 0v3h-1V4a2.5 2.5 0 00-5 0v3h-1V4z"
                    clip-rule="evenodd"
                  ></path>
                </svg>
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
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showPassword ? (
                    <svg
                      stroke="currentColor"
                      fill="currentColor"
                      stroke-width="0"
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
                      stroke-width="0"
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
              {formData.confirmPassword &&
                formData.password !== formData.confirmPassword && (
                  <p className="text-red-400 text-xs mt-1">
                    Passwords do not match
                  </p>
                )}
              {formData.confirmPassword &&
                formData.password === formData.confirmPassword &&
                formData.password && (
                  <p className="text-green-400 text-xs mt-1 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Passwords match
                  </p>
                )}
            </div>

            {/* Terms Agreement */}
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
                  I agree to the{" "}
                  <button
                    type="button"
                    className="text-emerald-400 hover:text-emerald-300"
                    onClick={() => alert("Terms of Service to be implemented!")}
                  >
                    Terms of Service
                  </button>{" "}
                  and{" "}
                  <button
                    type="button"
                    className="text-emerald-400 hover:text-emerald-300"
                    onClick={() => alert("Privacy Policy to be implemented!")}
                  >
                    Privacy Policy
                  </button>
                </label>
              </div>

              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="newsletter"
                  name="subscribeNewsletter"
                  checked={formData.subscribeNewsletter}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-emerald-500 bg-[#0f1f0f] border-emerald-800 rounded focus:ring-emerald-500 focus:ring-2 mt-0.5"
                />
                <label
                  htmlFor="newsletter"
                  className="ml-2 text-sm text-gray-300"
                >
                  Subscribe to our newsletter for learning tips and updates
                </label>
              </div>
            </div>

            {/* Sign Up Button */}
            <button
              type="button"
              onClick={handleSubmit}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
            >
              Create Account
            </button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-emerald-800/30"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-[#1a2f1a] text-gray-400">
                  Or sign up with
                </span>
              </div>
            </div>

            {/* Social Signup Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleSocialSignup("Google")}
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
                onClick={() => handleSocialSignup("Facebook")}
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
          </div>

          {/* Sign In Link */}
          <div className="mt-6 text-center">
            <span className="text-gray-400">Already have an account? </span>
            <button
              type="button"
              onClick={handleClick}
              className="text-emerald-400 hover:text-emerald-300 font-medium"
            >
              Log in
            </button>
          </div>
        </div>

        {/* Additional Links */}
        <div className="mt-6 text-center">
          <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
            <button
              type="button"
              className="hover:text-emerald-400 transition-colors"
              onClick={() => alert("Privacy Policy to be implemented!")}
            >
              Privacy Policy
            </button>
            <span>•</span>
            <button
              type="button"
              className="hover:text-emerald-400 transition-colors"
              onClick={() => alert("Terms of Service to be implemented!")}
            >
              Terms of Service
            </button>
            <span>•</span>
            <button
              type="button"
              className="hover:text-emerald-400 transition-colors"
              onClick={() => alert("Help page to be implemented!")}
            >
              Help
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default SignupPage;
