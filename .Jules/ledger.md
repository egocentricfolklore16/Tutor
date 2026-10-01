# Ledger Journal - Payments and Billing

## 2025-05-20 - Constant-time signature comparison and idempotency guards
**Learning:** Paystack webhooks and browser verification calls frequently arrive concurrently or with delay. Without checking existing successful payments before updating subscription start/end dates, late webhooks shift `current_period_start` and `current_period_end`. Additionally, string `===` comparison for HMAC webhook signatures introduces timing attack vulnerabilities.
**Action:** Always check existing `payments` table status for `success` before processing subscription updates, validate currency explicitly, and compare HMAC signatures using constant-time string comparison.
