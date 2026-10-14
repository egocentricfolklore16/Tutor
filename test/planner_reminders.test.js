import test from "node:test";
import assert from "node:assert/strict";

function timingSafeEqualStr(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function verifyPlannerRemindersAuth(reqHeaders, env) {
  const cronSecret = env.CRON_SECRET || "";
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || "";

  const headerCronSecret = reqHeaders["x-cron-secret"] || "";
  const authHeader = reqHeaders["authorization"] || "";
  const bearerToken = authHeader.replace(/^Bearer\s+/i, "").trim();

  const isAuthorizedByCronSecretHeader = Boolean(
    cronSecret && headerCronSecret && timingSafeEqualStr(cronSecret, headerCronSecret)
  );
  const isAuthorizedByCronSecretBearer = Boolean(
    cronSecret && bearerToken && timingSafeEqualStr(cronSecret, bearerToken)
  );
  const isAuthorizedByServiceRoleBearer = Boolean(
    supabaseServiceKey && bearerToken && timingSafeEqualStr(supabaseServiceKey, bearerToken)
  );

  if (
    !isAuthorizedByCronSecretHeader &&
    !isAuthorizedByCronSecretBearer &&
    !isAuthorizedByServiceRoleBearer
  ) {
    return { status: 401, error: "Unauthorized" };
  }

  return { status: 200, authorized: true };
}

test("verifyPlannerRemindersAuth returns 401 when auth headers are missing", () => {
  const result = verifyPlannerRemindersAuth({}, { CRON_SECRET: "my_cron_secret", SUPABASE_SERVICE_ROLE_KEY: "service_key_123" });
  assert.strictEqual(result.status, 401);
  assert.strictEqual(result.error, "Unauthorized");
});

test("verifyPlannerRemindersAuth returns 401 when x-cron-secret is wrong", () => {
  const result = verifyPlannerRemindersAuth(
    { "x-cron-secret": "wrong_secret" },
    { CRON_SECRET: "my_cron_secret", SUPABASE_SERVICE_ROLE_KEY: "service_key_123" }
  );
  assert.strictEqual(result.status, 401);
  assert.strictEqual(result.error, "Unauthorized");
});

test("verifyPlannerRemindersAuth returns 401 when Bearer token is invalid", () => {
  const result = verifyPlannerRemindersAuth(
    { authorization: "Bearer invalid_token" },
    { CRON_SECRET: "my_cron_secret", SUPABASE_SERVICE_ROLE_KEY: "service_key_123" }
  );
  assert.strictEqual(result.status, 401);
  assert.strictEqual(result.error, "Unauthorized");
});

test("verifyPlannerRemindersAuth succeeds with valid x-cron-secret header", () => {
  const result = verifyPlannerRemindersAuth(
    { "x-cron-secret": "my_cron_secret" },
    { CRON_SECRET: "my_cron_secret", SUPABASE_SERVICE_ROLE_KEY: "service_key_123" }
  );
  assert.strictEqual(result.status, 200);
  assert.strictEqual(result.authorized, true);
});

test("verifyPlannerRemindersAuth succeeds with valid Bearer token matching CRON_SECRET", () => {
  const result = verifyPlannerRemindersAuth(
    { authorization: "Bearer my_cron_secret" },
    { CRON_SECRET: "my_cron_secret", SUPABASE_SERVICE_ROLE_KEY: "service_key_123" }
  );
  assert.strictEqual(result.status, 200);
  assert.strictEqual(result.authorized, true);
});

test("verifyPlannerRemindersAuth succeeds with valid Bearer token matching SUPABASE_SERVICE_ROLE_KEY", () => {
  const result = verifyPlannerRemindersAuth(
    { authorization: "Bearer service_key_123" },
    { CRON_SECRET: "my_cron_secret", SUPABASE_SERVICE_ROLE_KEY: "service_key_123" }
  );
  assert.strictEqual(result.status, 200);
  assert.strictEqual(result.authorized, true);
});
