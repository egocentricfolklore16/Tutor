# Ledger Journal - Payments and Billing

## 2025-05-20 - Constant-time signature comparison and idempotency guards
**Learning:** Paystack webhooks and browser verification calls frequently arrive concurrently or with delay. Without checking existing successful payments before updating subscription start/end dates, late webhooks shift `current_period_start` and `current_period_end`. Additionally, string `===` comparison for HMAC webhook signatures introduces timing attack vulnerabilities.
**Action:** Always check existing `payments` table status for `success` before processing subscription updates, validate currency explicitly, and compare HMAC signatures using constant-time string comparison.

## 2025-05-21 - Enforce payment-subscription link verification and race condition guards
**Learning:** Concurrent verify calls and webhooks can both pass step 3 before the initial `payments` record is written. If step 5 does not check whether `existingSub.payment_id` already equals `paymentRow.id`, the second request will double-extend the subscription period. Conversely, returning `alreadyProcessed: true` when `existingPayment` is present but `existingSub.payment_id` is missing/unlinked blocks users from recovering subscription entitlements after dropped database connections.
**Action:** Verify `existingSub.payment_id === existingPayment.id` in step 3 before short-circuiting, and check `existingSub.payment_id === paymentRow.id` in step 5 after upserting `payments` to prevent double-grants and ensure entitlement recovery.
