import test from "node:test";
import assert from "node:assert/strict";

// Helper logic representing payment authorization checks in verify-payment
function verifyPaymentAuthorization(authHeader, user, paystackData) {
  if (!authHeader) {
    return { status: 401, error: "Missing Authorization header" };
  }

  if (!user) {
    return { status: 401, error: "Unauthorized: Invalid or expired session token" };
  }

  const metadata = paystackData?.data?.metadata || {};
  const metadataUserId =
    metadata.userId ||
    metadata.user_id ||
    paystackData?.data?.customer?.metadata?.userId ||
    paystackData?.data?.customer?.metadata?.user_id;

  if (metadataUserId && metadataUserId !== user.id) {
    return { status: 403, error: "Forbidden: Payment user ID mismatch" };
  }

  if (paystackData?.data?.status && paystackData.data.status !== "success") {
    return {
      status: 400,
      error: `Payment status is ${paystackData.data.status}. No subscription was granted.`,
    };
  }

  return { status: 200, authorized: true };
}

test("verifyPaymentAuthorization returns 401 if Authorization header is missing", () => {
  const result = verifyPaymentAuthorization(null, { id: "user_123" }, { data: {} });
  assert.strictEqual(result.status, 401);
  assert.strictEqual(result.error, "Missing Authorization header");
});

test("verifyPaymentAuthorization returns 401 if user is unauthenticated", () => {
  const result = verifyPaymentAuthorization("Bearer invalid_token", null, { data: {} });
  assert.strictEqual(result.status, 401);
  assert.strictEqual(result.error, "Unauthorized: Invalid or expired session token");
});

test("verifyPaymentAuthorization returns 403 if user.id does not match payment metadata user_id", () => {
  const paystackData = {
    data: {
      metadata: { userId: "user_owner_456" },
    },
  };
  const result = verifyPaymentAuthorization("Bearer valid_token", { id: "user_attacker_789" }, paystackData);
  assert.strictEqual(result.status, 403);
  assert.strictEqual(result.error, "Forbidden: Payment user ID mismatch");
});

test("verifyPaymentAuthorization succeeds when user.id matches payment metadata user_id", () => {
  const paystackData = {
    data: {
      status: "success",
      metadata: { userId: "user_owner_456" },
    },
  };
  const result = verifyPaymentAuthorization("Bearer valid_token", { id: "user_owner_456" }, paystackData);
  assert.strictEqual(result.status, 200);
  assert.strictEqual(result.authorized, true);
});

test("verifyPaymentAuthorization returns 400 if transaction status is non-success (failed or abandoned)", () => {
  const paystackData = {
    data: {
      status: "failed",
      metadata: { userId: "user_owner_456" },
    },
  };
  const result = verifyPaymentAuthorization("Bearer valid_token", { id: "user_owner_456" }, paystackData);
  assert.strictEqual(result.status, 400);
  assert.strictEqual(result.error, "Payment status is failed. No subscription was granted.");
});
