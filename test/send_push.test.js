import test from "node:test";
import assert from "node:assert/strict";

// Helper logic representing push notification authorization checks in send-push Edge Function
function verifySendPushAuthorization(authHeader, user, requestBody) {
  if (!authHeader) {
    return { status: 401, success: false, message: "Missing Authorization header" };
  }

  if (!user) {
    return { status: 401, success: false, message: "Unauthorized user" };
  }

  if (requestBody?.userId && requestBody.userId !== user.id) {
    return {
      status: 403,
      success: false,
      message: "Forbidden: Cannot send push notification to another user",
    };
  }

  return { status: 200, success: true, targetUserId: user.id };
}

test("verifySendPushAuthorization returns 401 if Authorization header is missing", () => {
  const result = verifySendPushAuthorization(null, { id: "user_123" }, {});
  assert.strictEqual(result.status, 401);
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.message, "Missing Authorization header");
});

test("verifySendPushAuthorization returns 401 if user is unauthenticated", () => {
  const result = verifySendPushAuthorization("Bearer invalid_token", null, {});
  assert.strictEqual(result.status, 401);
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.message, "Unauthorized user");
});

test("verifySendPushAuthorization returns 403 if requestBody.userId does not match user.id", () => {
  const result = verifySendPushAuthorization(
    "Bearer valid_token",
    { id: "user_attacker_123" },
    { userId: "user_victim_456", payload: { title: "Phishing" } }
  );
  assert.strictEqual(result.status, 403);
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.message, "Forbidden: Cannot send push notification to another user");
});

test("verifySendPushAuthorization succeeds when requestBody.userId matches user.id", () => {
  const result = verifySendPushAuthorization(
    "Bearer valid_token",
    { id: "user_legit_123" },
    { userId: "user_legit_123", payload: { title: "Study Reminder" } }
  );
  assert.strictEqual(result.status, 200);
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.targetUserId, "user_legit_123");
});

// Helper logic representing test notification authorization checks in send-test-notification Edge Function
function verifySendTestNotificationAuthorization(authHeader, user, requestBody) {
  if (!authHeader) {
    return { status: 401, success: false, message: "Missing Authorization header" };
  }

  if (!user) {
    return { status: 401, success: false, message: "Unauthorized user" };
  }

  if (requestBody?.userId && requestBody.userId !== user.id) {
    return {
      status: 403,
      success: false,
      message: "Forbidden: Cannot send test notification to another user",
    };
  }

  return { status: 200, success: true, targetUserId: user.id };
}

test("verifySendTestNotificationAuthorization returns 403 if requestBody.userId does not match user.id", () => {
  const result = verifySendTestNotificationAuthorization(
    "Bearer valid_token",
    { id: "user_attacker_123" },
    { userId: "user_victim_456" }
  );
  assert.strictEqual(result.status, 403);
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.message, "Forbidden: Cannot send test notification to another user");
});

test("verifySendTestNotificationAuthorization succeeds when requestBody.userId matches user.id or is omitted", () => {
  const resultWithMatchingId = verifySendTestNotificationAuthorization(
    "Bearer valid_token",
    { id: "user_legit_123" },
    { userId: "user_legit_123" }
  );
  assert.strictEqual(resultWithMatchingId.status, 200);
  assert.strictEqual(resultWithMatchingId.success, true);

  const resultOmitted = verifySendTestNotificationAuthorization(
    "Bearer valid_token",
    { id: "user_legit_123" },
    {}
  );
  assert.strictEqual(resultOmitted.status, 200);
  assert.strictEqual(resultOmitted.success, true);
});

test("verifySendPushAuthorization succeeds when requestBody.userId is omitted", () => {
  const result = verifySendPushAuthorization(
    "Bearer valid_token",
    { id: "user_legit_123" },
    { payload: { title: "Study Reminder" } }
  );
  assert.strictEqual(result.status, 200);
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.targetUserId, "user_legit_123");
});
