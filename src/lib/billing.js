/**
 * Resolves whether a subscription object is currently active based on status and period end date.
 * @param {Object|null} subscription
 * @param {Date} [now=new Date()]
 * @returns {boolean}
 */
export function isSubscriptionActive(subscription, now = new Date()) {
  if (!subscription) return false;
  if (subscription.status !== "active") return false;

  const planId = subscription.plan_id || "free";
  if (planId === "free") return true;

  if (!subscription.current_period_end) return false;

  const endDate = new Date(subscription.current_period_end);
  if (isNaN(endDate.getTime())) return false;

  return endDate.getTime() > now.getTime();
}

/**
 * Determines the effective active plan ID for a user based on their subscription state.
 * Returns 'free' if subscription is missing, inactive, cancelled, or expired.
 * @param {Object|null} subscription
 * @param {Date} [now=new Date()]
 * @returns {string}
 */
export function getActivePlanId(subscription, now = new Date()) {
  if (isSubscriptionActive(subscription, now)) {
    return subscription.plan_id || "free";
  }
  return "free";
}

/**
 * Formats status display label and color theme based on subscription state.
 * @param {Object|null} subscription
 * @param {Date} [now=new Date()]
 * @returns {{ label: string, dotColor: string }}
 */
export function getSubscriptionStatusDisplay(subscription, now = new Date()) {
  if (!subscription) {
    return { label: "Active", dotColor: "bg-emerald-500" };
  }

  const active = isSubscriptionActive(subscription, now);
  const rawStatus = (subscription.status || "active").toLowerCase();

  if (active) {
    return { label: "Active", dotColor: "bg-emerald-500" };
  }

  if (rawStatus === "cancelled") {
    return { label: "Cancelled", dotColor: "bg-rose-500" };
  }

  if (rawStatus === "expired") {
    return { label: "Expired", dotColor: "bg-amber-500" };
  }

  if (rawStatus === "inactive") {
    return { label: "Inactive", dotColor: "bg-slate-400" };
  }

  if (
    rawStatus === "active" &&
    subscription.current_period_end &&
    new Date(subscription.current_period_end).getTime() <= now.getTime()
  ) {
    return { label: "Expired", dotColor: "bg-amber-500" };
  }

  return {
    label: rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1),
    dotColor: "bg-slate-400",
  };
}
