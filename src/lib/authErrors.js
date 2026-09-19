export function mapAuthError(error) {
  if (!error) return { message: "", code: "" };

  // Network failure / fetch errors
  if (
    error instanceof TypeError ||
    error.name === "TypeError" ||
    error.message?.includes("Failed to fetch") ||
    error.message?.includes("network")
  ) {
    return {
      message: "You seem to be offline. Check your connection.",
      code: "network_error",
    };
  }

  const code = error.code || error.status || "";
  const rawMsg = error.message || "";

  if (
    code === "invalid_credentials" ||
    rawMsg.toLowerCase().includes("invalid login credentials")
  ) {
    return { message: "Wrong email or password.", code: "invalid_credentials" };
  }

  if (
    code === "email_not_confirmed" ||
    rawMsg.toLowerCase().includes("email not confirmed")
  ) {
    return {
      message: "Please confirm your email first. Check your inbox.",
      code: "email_not_confirmed",
    };
  }

  if (
    code === "over_request_rate_limit" ||
    code === "over_email_send_rate_limit" ||
    rawMsg.toLowerCase().includes("rate limit") ||
    rawMsg.toLowerCase().includes("too many requests")
  ) {
    return {
      message: "Too many attempts. Please wait a minute and try again.",
      code: "over_request_rate_limit",
    };
  }

  if (
    code === "user_already_exists" ||
    rawMsg.toLowerCase().includes("already registered") ||
    rawMsg.toLowerCase().includes("user already exists")
  ) {
    return {
      message: "An account with this email already exists. Try logging in.",
      code: "user_already_exists",
    };
  }

  if (
    code === "weak_password" ||
    rawMsg.toLowerCase().includes("password should be")
  ) {
    const reason = error.message || "Choose a stronger password.";
    return { message: reason, code: "weak_password" };
  }

  // Fallback: Log technical error to console only, show user friendly fallback
  console.error("Technical Auth Error:", error);
  return { message: "Something went wrong. Please try again.", code: "unknown" };
}
