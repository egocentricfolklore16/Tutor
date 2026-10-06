# Ledger Journal - Payments and Billing

## 2025-05-20 - Constant-time signature comparison and idempotency guards
**Learning:** Paystack webhooks and browser verification calls frequently arrive concurrently or with delay. Without checking existing successful payments before updating subscription start/end dates, late webhooks shift `current_period_start` and `current_period_end`. Additionally, string `===` comparison for HMAC webhook signatures introduces timing attack vulnerabilities.
**Action:** Always check existing `payments` table status for `success` before processing subscription updates, validate currency explicitly, and compare HMAC signatures using constant-time string comparison.

## 2025-05-21 - Subscription Payment ID Idempotency Check
**Learning:** Under high-concurrency race conditions where a client `verify-payment` invocation and `paystack-webhook` `charge.success` land simultaneously, the webhook step 3 lookup might run before step 4 upserts `payments`, but step 5 runs after `subscriptions.payment_id` has already been updated. Without an explicit check on `existingSub.payment_id === paymentRow.id`, the second request recalculates `periodEnd` from the newly extended date and double-credits subscription duration.
**Action:** In `processVerifiedPayment`, always check if `existingSub.payment_id === paymentRow.id` after fetching `existingSub` and return `alreadyProcessed: true` immediately.
