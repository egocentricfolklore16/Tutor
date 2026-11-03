import test from "node:test";
import assert from "node:assert/strict";

test("cooldown timer countdown logic", () => {
  let cooldown = 60;
  const decrement = () => {
    if (cooldown > 0) cooldown -= 1;
    return cooldown;
  };

  assert.equal(decrement(), 59);
  assert.equal(decrement(), 58);
  cooldown = 1;
  assert.equal(decrement(), 0);
  assert.equal(decrement(), 0);
});

test("redirect URL construction respects site URL or origin", () => {
  const buildRedirectUrl = (siteUrl, fallbackOrigin) => {
    const base = (siteUrl || fallbackOrigin).replace(/\/$/, "");
    return `${base}/auth/confirm`;
  };

  assert.equal(
    buildRedirectUrl("https://hypertutor.vercel.app/", "http://localhost:3000"),
    "https://hypertutor.vercel.app/auth/confirm"
  );
  assert.equal(
    buildRedirectUrl("", "http://localhost:5173"),
    "http://localhost:5173/auth/confirm"
  );
});

test("verification error status mapping", () => {
  const mapVerificationErrorToStatus = (errorMsg, errorCode) => {
    const msg = (errorMsg || "").toLowerCase();
    const code = errorCode || "";

    if (msg.includes("already") || code === "email_already_confirmed") {
      return "already_confirmed";
    }
    if (msg.includes("network") || msg.includes("fetch")) {
      return "network_error";
    }
    return "expired";
  };

  assert.equal(
    mapVerificationErrorToStatus("Email is already confirmed", "email_already_confirmed"),
    "already_confirmed"
  );
  assert.equal(
    mapVerificationErrorToStatus("Failed to fetch", ""),
    "network_error"
  );
  assert.equal(
    mapVerificationErrorToStatus("Token has expired", "otp_expired"),
    "expired"
  );
});
