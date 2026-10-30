/**
 * Evaluates whether a user's subscription is currently active and valid.
 * A subscription is active if:
 * 1. Subscription object exists and is non-null.
 * 2. `status` is strictly 'active'.
 * 3. For non-free plans, `current_period_end` is either null/missing or in the future compared to `now`.
 *
 * @param {Object|null} subscription
 * @param {Date} [now=new Date()]
 * @returns {boolean}
 */
export function isSubscriptionActive(subscription, now = new Date()) {
  if (!subscription || typeof subscription !== "object") {
    return false;
  }

  if (subscription.status !== "active") {
    return false;
  }

  const planId = subscription.plan_id || "free";
  if (planId === "free") {
    return true;
  }

  if (subscription.current_period_end) {
    const endDate = new Date(subscription.current_period_end);
    if (!isNaN(endDate.getTime()) && endDate <= now) {
      return false;
    }
  }

  return true;
}

/**
 * Resolves the user's active plan ID based on subscription status and period validity.
 * Falls back safely to 'free' when the subscription is missing, inactive, cancelled, or expired.
 *
 * @param {Object|null} subscription
 * @param {Date} [now=new Date()]
 * @returns {string} Plan ID ('free' | 'pro' | 'elite' | string)
 */
export function getActivePlanId(subscription, now = new Date()) {
  if (isSubscriptionActive(subscription, now)) {
    return subscription.plan_id || "free";
  }
  return "free";
}

/**
 * Resolves a human-readable subscription status display string.
 * Accounts for explicit statuses ('cancelled', 'inactive') and expired period ends.
 *
 * @param {Object|null} subscription
 * @param {Date} [now=new Date()]
 * @returns {string} Status string (e.g. 'Active', 'Cancelled', 'Expired', 'Inactive')
 */
export function getSubscriptionStatusDisplay(subscription, now = new Date()) {
  if (!subscription || typeof subscription !== "object") {
    return "Active";
  }

  if (subscription.status === "cancelled") {
    return "Cancelled";
  }

  if (subscription.status === "inactive") {
    return "Inactive";
  }

  const planId = subscription.plan_id || "free";
  if (planId !== "free" && subscription.current_period_end) {
    const endDate = new Date(subscription.current_period_end);
    if (!isNaN(endDate.getTime()) && endDate <= now) {
      return "Expired";
    }
  }

  if (subscription.status) {
    return (
      subscription.status.charAt(0).toUpperCase() +
      subscription.status.slice(1).toLowerCase()
    );
  }

  return "Active";
}
