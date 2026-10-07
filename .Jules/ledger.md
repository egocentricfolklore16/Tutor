# Ledger Journal - Payments and Billing

## 2025-05-20 - Constant-time signature comparison and idempotency guards
**Learning:** Paystack webhooks and browser verification calls frequently arrive concurrently or with delay. Without checking existing successful payments before updating subscription start/end dates, late webhooks shift `current_period_start` and `current_period_end`. Additionally, string `===` comparison for HMAC webhook signatures introduces timing attack vulnerabilities.
**Action:** Always check existing `payments` table status for `success` before processing subscription updates, validate currency explicitly, and compare HMAC signatures using constant-time string comparison.

## 2025-05-21 - Subscription Month Rollover Clamping and Failed Payment Database Auditing
**Learning:** Native JS `Date.prototype.setMonth()` causes day-of-month rollover bugs when adding months to end-of-month dates (e.g. Jan 31 + 1 month becomes Mar 3 in non-leap years, skipping February). Additionally, unhandled non-success Paystack statuses (`failed`, `abandoned`) throw unhandled errors causing HTTP 500 responses without recording audit logs in the `payments` table.
**Action:** Use an `addMonths` utility that clamps month overflow to the target month's last day, verify `plan.is_active`, record failed payment attempts in `payments` before erroring, and return HTTP 400 Bad Request on payment verification failure.
