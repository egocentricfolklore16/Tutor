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
