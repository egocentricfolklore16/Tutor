"use client";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../../lib/supabase.js";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("verifying");
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const handleAuthCallback = async () => {
      try {
        setStatus("verifying");

        // Get the current session to see if user is authenticated
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (sessionError) {
          console.error("Session error:", sessionError);
          setError("Authentication failed. Please try again.");
          setStatus("error");
          return;
        }

        if (session?.user) {
          setStatus("success");

          // Small delay to show success state
          setTimeout(() => {
            navigate("/Dashboard");
          }, 1500);
        } else {
          // No session found, redirect to login
          setError("No valid session found. Please try logging in again.");
          setStatus("error");

          setTimeout(() => {
            navigate("/login");
          }, 2000);
        }
      } catch (err) {
        if (!mounted) return;

        console.error("Callback error:", err);
        setError("Something went wrong during authentication.");
        setStatus("error");

        setTimeout(() => {
          navigate("/login");
        }, 2000);
      }
    };

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === "SIGNED_IN" && session) {
        setStatus("success");
        setTimeout(() => {
          navigate("/Dashboard");
        }, 1500);
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

  const getStatusContent = () => {
    switch (status) {
      case "verifying":
        return {
          icon: (
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          ),
          title: "Completing Sign In...",
          description: "Please wait while we verify your email confirmation.",
          bgColor: "bg-blue-50",
          textColor: "text-blue-900",
        };

      case "success":
        return {
          icon: (
            <div className="rounded-full h-12 w-12 bg-green-100 flex items-center justify-center">
              <svg
                className="h-6 w-6 text-green-600"
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
            "Welcome to Hyper Tutor. Redirecting you to your dashboard...",
          bgColor: "bg-green-50",
          textColor: "text-green-900",
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
          title: "Authentication Failed",
          description:
            error || "Something went wrong. Redirecting you to login...",
          bgColor: "bg-red-50",
          textColor: "text-red-900",
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
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 text-white font-bold text-xl mb-4">
            HT
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Hyper Tutor</h1>
          <p className="text-gray-600 text-sm">
            Your Intelligent Learning Companion
          </p>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="flex justify-center mb-6">{icon}</div>

          <h2 className={`text-xl font-semibold mb-3 ${textColor}`}>{title}</h2>

          <p className="text-gray-600 mb-6">{description}</p>

          {/* Progress indicators */}
          {status === "verifying" && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full animate-pulse"
                style={{ width: "60%" }}
              ></div>
            </div>
          )}

          {status === "error" && (
            <div className="mt-4">
              <button
                onClick={() => navigate("/login")}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
                Return to Login
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            Having trouble?{" "}
            <button className="text-blue-600 hover:text-blue-800 underline">
              Contact support
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
