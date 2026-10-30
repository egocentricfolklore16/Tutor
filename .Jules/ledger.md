# Ledger Journal - Payments and Billing

## 2025-05-20 - Constant-time signature comparison and idempotency guards
**Learning:** Paystack webhooks and browser verification calls frequently arrive concurrently or with delay. Without checking existing successful payments before updating subscription start/end dates, late webhooks shift `current_period_start` and `current_period_end`. Additionally, string `===` comparison for HMAC webhook signatures introduces timing attack vulnerabilities.
**Action:** Always check existing `payments` table status for `success` before processing subscription updates, validate currency explicitly, and compare HMAC signatures using constant-time string comparison.

## 2025-05-21 - Subscription Payment ID Idempotency Check
**Learning:** Under high-concurrency race conditions where a client `verify-payment` invocation and `paystack-webhook` `charge.success` land simultaneously, the webhook step 3 lookup might run before step 4 upserts `payments`, but step 5 runs after `subscriptions.payment_id` has already been updated. Without an explicit check on `existingSub.payment_id === paymentRow.id`, the second request recalculates `periodEnd` from the newly extended date and double-credits subscription duration.
**Action:** In `processVerifiedPayment`, always check if `existingSub.payment_id === paymentRow.id` after fetching `existingSub` and return `alreadyProcessed: true` immediately.

## 2025-05-22 - Cross-User Reference Isolation and Metadata Stringification
**Learning:** Paystack webhooks and API callbacks can deliver `metadata` as stringified JSON strings rather than objects. Additionally, without validating that `existingPayment.user_id === userId` on re-processed references, a user can attempt reference hijacking across accounts.
**Action:** Always parse `metadata` and `customer.metadata` defensively with `JSON.parse`, check `plan.is_active === false`, and ensure `existingPayment.user_id === userId` before returning processed subscription state.

## 2025-05-23 - Edge Function Metadata String Parsing and Strict IDOR Verification
**Learning:** In Edge Functions like `verify-payment`, checking `metadataUserId` without parsing stringified `paystackData.data.metadata` or `customer.metadata` results in `metadataUserId` evaluating to `undefined`. If the ownership check condition allows `undefined` through or fails to require `metadataUserId === user.id`, an attacker could verify payments belonging to other users or bypass authentication checks when Paystack passes stringified metadata.
**Action:** Always defensively parse stringified `metadata` and `customer.metadata` in verification Edge Functions before checking `!metadataUserId || metadataUserId !== user.id` to enforce strict ownership matching.

## 2025-05-24 - Cross-State Reference Ownership and Defensive Null Metadata Parsing
**Learning:** Checking user ownership on existing payment references only when `status === 'success'` allowed attackers to target payment references in `failed` or `pending` states and hijack them during upsert. Additionally, parsing stringified `"null"` metadata produced `null` values instead of objects, leading to unhandled `TypeError` exceptions during property access.
**Action:** Enforce `existingPayment.user_id === userId` ownership validation whenever `existingPayment` is present regardless of status, and normalize parsed metadata to non-null objects (`if (!metadata || typeof metadata !== "object") metadata = {};`).

## 2025-05-25 - Explicit Failure Status on Payment Mismatch Audit
**Learning:** When audit rows were recorded for currency or amount mismatches while `paystackData.status` was `"success"`, recording `paystackData.status` directly saved `status: "success"` into the `payments` table. On subsequent idempotency checks, step 2 would see `existingPayment.status === "success"` and return success without validating amount or currency, granting unearned subscriptions.
**Action:** Always explicitly set `status: "failed"` when upserting audit rows during currency or amount mismatch validation in `processVerifiedPayment`.

## 2025-05-26 - Floating-Point Multiplication Imprecision and Kobo Normalization
**Learning:** Multiplying Naira prices in floats (e.g., `25.99 * 100`) produces JavaScript floating-point inaccuracies like `2599.0000000000005`. Strict equality checks against Paystack's integer kobo payload (`2599`) cause legitimate payments to fail with `Amount mismatch`.
**Action:** Always wrap kobo amount calculations with `Math.round()` and parse stringified numeric amounts safely to integer kobo before comparison or persistence in Postgres integer columns.

## 2025-05-27 - Unlinked Subscription Payment Retry Idempotency
**Learning:** If a payment attempt creates a `payments` row with `status: "success"` but fails or crashes before upserting into `subscriptions`, returning `alreadyProcessed: true` solely based on `existingPayment.status === "success"` leaves the user un-granted. Differentiating subscription payments (`purpose.startsWith("subscription:")`) to require `existingSub && existingSub.payment_id === existingPayment.id` allows retries to complete subscription grants while returning `alreadyProcessed: true` immediately for non-subscription or already linked subscription payments.
**Action:** When performing step 2 idempotency checks in `processVerifiedPayment`, verify `existingSub && existingSub.payment_id === existingPayment.id` specifically for subscription payments while preserving immediate `alreadyProcessed: true` returns for non-subscription payments.

## 2025-05-28 - Superseded Subscription Payment Replay Guard
**Learning:** When a user processes a newer subscription payment (`ref_2`), `subscriptions.payment_id` is updated to `ref_2`. If an older successful payment (`ref_1`) is replayed later, `existingSub.payment_id === ref_1.id` evaluates to `false`. Without checking for strictly newer successful payments (`.gt("created_at", existingPayment.created_at)`), replaying `ref_1` bypasses step 2 idempotency and re-extends subscription period by adding an extra month.
**Action:** In `processVerifiedPayment`, if `existingSub.payment_id !== existingPayment.id`, check if a strictly newer successful payment exists for the user before proceeding, returning `alreadyProcessed: true` if superseded.

## 2025-05-29 - Refund Revocation and Re-verification Rejection Guard
**Learning:** Paystack webhooks deliver `charge.refunded` and `refund.processed` events when payments are refunded or chargebacks occur. Without marking payment status as `"refunded"` and revoking any linked subscription (`status: "cancelled"`), refunded users retain active subscription benefits indefinitely. Furthermore, without blocking re-verification of refunded references in `processVerifiedPayment`, a refunded reference can be replayed to regain active subscription access.
**Action:** Handle `charge.refunded` and `refund.processed` in the webhook handler via `processRefundedPayment` to set payment `status: "refunded"` and cancel linked subscriptions, while rejecting re-verification attempts on refunded references in `processVerifiedPayment`.

## 2025-05-30 - Expired and Cancelled Subscription Active Plan Fallback
**Learning:** Checking `subscription?.plan_id` directly in frontend components without validating `status === 'active'` and `current_period_end > now` treats expired, cancelled, or inactive subscriptions as active paid tiers. This locks users into disabled "Current Plan" button states and prevents them from renewing or upgrading.
**Action:** Use pure billing resolution utilities (`isSubscriptionActive`, `getActivePlanId`, `getSubscriptionStatusDisplay`) in frontend views to evaluate subscription status and period end dates before resolving the active plan ID, falling back safely to `'free'`.
