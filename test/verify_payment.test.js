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

  let metadata = paystackData?.data?.metadata || {};
  if (typeof metadata === "string") {
    try {
      metadata = JSON.parse(metadata);
    } catch {
      metadata = {};
    }
  }
  if (!metadata || typeof metadata !== "object") {
    metadata = {};
  }

  let customerMetadata = paystackData?.data?.customer?.metadata || {};
  if (typeof customerMetadata === "string") {
    try {
      customerMetadata = JSON.parse(customerMetadata);
    } catch {
      customerMetadata = {};
    }
  }
  if (!customerMetadata || typeof customerMetadata !== "object") {
    customerMetadata = {};
  }

  const metadataUserId =
    metadata.userId ||
    metadata.user_id ||
    customerMetadata.userId ||
    customerMetadata.user_id;

  if (!metadataUserId || metadataUserId !== user.id) {
    return { status: 403, error: "Forbidden: Payment user ID mismatch" };
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
      metadata: { userId: "user_owner_456" },
    },
  };
  const result = verifyPaymentAuthorization("Bearer valid_token", { id: "user_owner_456" }, paystackData);
  assert.strictEqual(result.status, 200);
  assert.strictEqual(result.authorized, true);
});

test("verifyPaymentAuthorization correctly parses stringified JSON metadata and customer metadata", () => {
  const paystackDataStringified = {
    data: {
      metadata: JSON.stringify({ userId: "user_owner_456" }),
    },
  };
  const result1 = verifyPaymentAuthorization("Bearer valid_token", { id: "user_owner_456" }, paystackDataStringified);
  assert.strictEqual(result1.status, 200);
  assert.strictEqual(result1.authorized, true);

  const paystackCustomerStringified = {
    data: {
      customer: {
        metadata: JSON.stringify({ user_id: "user_owner_456" }),
      },
    },
  };
  const result2 = verifyPaymentAuthorization("Bearer valid_token", { id: "user_owner_456" }, paystackCustomerStringified);
  assert.strictEqual(result2.status, 200);
  assert.strictEqual(result2.authorized, true);
});

test("verifyPaymentAuthorization returns 403 if metadataUserId is missing or unparseable", () => {
  const missingMeta = { data: {} };
  const result1 = verifyPaymentAuthorization("Bearer valid_token", { id: "user_owner_456" }, missingMeta);
  assert.strictEqual(result1.status, 403);
  assert.strictEqual(result1.error, "Forbidden: Payment user ID mismatch");

  const unparseableMeta = { data: { metadata: "not-json" } };
  const result2 = verifyPaymentAuthorization("Bearer valid_token", { id: "user_owner_456" }, unparseableMeta);
  assert.strictEqual(result2.status, 403);
  assert.strictEqual(result2.error, "Forbidden: Payment user ID mismatch");

  const nullStringMeta = { data: { metadata: "null" } };
  const result3 = verifyPaymentAuthorization("Bearer valid_token", { id: "user_owner_456" }, nullStringMeta);
  assert.strictEqual(result3.status, 403);
  assert.strictEqual(result3.error, "Forbidden: Payment user ID mismatch");
});

test("processVerifiedPayment error mapping produces correct HTTP status codes", () => {
  function mapProcessErrorToResponse(error) {
    const msg = error.message || "Payment verification failed";
    if (msg.includes("Payment reference belongs to another user")) {
      return { status: 403, error: msg };
    }
    return { status: 400, error: msg };
  }

  const failedStatusError = new Error("Payment verification failed: status is failed");
  const amountMismatchError = new Error("Amount mismatch: expected 250000 kobo, received 100000 kobo");
  const crossUserError = new Error("Payment reference belongs to another user");

  assert.strictEqual(mapProcessErrorToResponse(failedStatusError).status, 400);
  assert.strictEqual(mapProcessErrorToResponse(amountMismatchError).status, 400);
  assert.strictEqual(mapProcessErrorToResponse(crossUserError).status, 403);
});

test("PaystackCheckoutButton error resolution prioritizes data?.error over verifyError?.message", () => {
  function resolveErrorMessage(verifyError, data) {
    return (
      data?.error ||
      verifyError?.message ||
      "Payment verification failed on server."
    );
  }

  const verifyError = { message: "Edge Function returned a 400 status code" };
  const dataWithError = { success: false, error: "Amount mismatch: expected 250000 kobo, received 100000 kobo" };

  // Prioritize server-provided data.error
  assert.strictEqual(
    resolveErrorMessage(verifyError, dataWithError),
    "Amount mismatch: expected 250000 kobo, received 100000 kobo"
  );

  // Fallback to verifyError.message when data.error is missing
  assert.strictEqual(
    resolveErrorMessage(verifyError, { success: false }),
    "Edge Function returned a 400 status code"
  );

  // Fallback to default message when both are missing
  assert.strictEqual(
    resolveErrorMessage(null, null),
    "Payment verification failed on server."
  );
});

test("verify-payment request body and reference validation rejects malformed JSON and invalid references with 400", () => {
  function validateVerifyPaymentRequestBody(rawJsonString) {
    let body;
    try {
      body = JSON.parse(rawJsonString);
    } catch {
      return { status: 400, error: "Invalid JSON in request body" };
    }

    const { reference } = body || {};
    if (!reference || typeof reference !== "string" || !reference.trim()) {
      return { status: 400, error: "Missing or invalid payment reference in request body" };
    }

    return { status: 200, reference: reference.trim() };
  }

  // Malformed JSON body
  const malformedResult = validateVerifyPaymentRequestBody("{ invalid json ");
  assert.strictEqual(malformedResult.status, 400);
  assert.strictEqual(malformedResult.error, "Invalid JSON in request body");

  // Missing or non-string or whitespace-only reference
  assert.strictEqual(validateVerifyPaymentRequestBody(JSON.stringify({})).status, 400);
  assert.strictEqual(validateVerifyPaymentRequestBody(JSON.stringify({ reference: "" })).status, 400);
  assert.strictEqual(validateVerifyPaymentRequestBody(JSON.stringify({ reference: "   " })).status, 400);
  assert.strictEqual(validateVerifyPaymentRequestBody(JSON.stringify({ reference: 12345 })).status, 400);
  assert.strictEqual(validateVerifyPaymentRequestBody(JSON.stringify({ reference: ["ref"] })).status, 400);

  // Valid reference
  const validResult = validateVerifyPaymentRequestBody(JSON.stringify({ reference: "  ref_123  " }));
  assert.strictEqual(validResult.status, 200);
  assert.strictEqual(validResult.reference, "ref_123");
});
