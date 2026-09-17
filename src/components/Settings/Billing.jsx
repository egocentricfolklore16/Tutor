import { useState, useEffect, useCallback } from "react";
import { Check, ShieldCheck, Loader2, AlertCircle, History, Calendar, CreditCard } from "lucide-react";
import supabase from "../../lib/supabase.js";
import PaystackCheckoutButton from "./PaystackCheckoutButton";

export default function Billing({ user }) {
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downgradeMessage, setDowngradeMessage] = useState("");

  const fetchBillingData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError("");

    try {
      // 1. Fetch active plans from `plans` table
      const { data: plansData, error: plansError } = await supabase
        .from("plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (plansError) throw plansError;
      setPlans(plansData || []);

      // 2. Fetch user's subscription from `subscriptions` table
      const { data: subData, error: subError } = await supabase
        .from("subscriptions")
        .select("*, plans(*)")
        .eq("user_id", user.id)
        .maybeSingle();

      if (subError) throw subError;
      setSubscription(subData || null);

      // 3. Fetch user's payments from `payments` table (read-only via RLS)
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (paymentsError) throw paymentsError;
      setPayments(paymentsData || []);
    } catch (err) {
      console.error("Error loading billing details:", err);
      setError("Unable to load billing details. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchBillingData();
  }, [fetchBillingData]);

  // Callback passed to PaystackCheckoutButton -- refetches DB state after verified payment
  const handlePaymentSuccess = async () => {
    await fetchBillingData();
  };

  const handleDowngradeNotice = () => {
    setDowngradeMessage(
      "TODO: Downgrade request noted. Downgrade handling (handling remaining paid period, proration, and feature access) is pending business rule confirmation."
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-3" />
        <p className="text-sm font-medium">Loading subscription details...</p>
      </div>
    );
  }

  const currentPlanId = subscription?.plan_id || "free";
  const currentPlan = subscription?.plans || plans.find((p) => p.id === currentPlanId);

  const formatPrice = (priceNaira) => {
    if (!priceNaira || priceNaira === 0) return "₦0";
    return `₦${priceNaira.toLocaleString()}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Billing & Subscriptions</h2>
        <p className="mt-1 text-sm text-slate-500">
          Choose a plan that fits your study goals. Upgrade or manage your subscription anytime.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {downgradeMessage && (
        <div className="flex items-center gap-3 rounded-xl bg-amber-50 p-4 text-sm font-medium text-amber-800">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
          <span>{downgradeMessage}</span>
        </div>
      )}

      {/* Plans Tier Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = currentPlanId === plan.id;
          const isFreePlan = plan.id === "free";
          const isPaidPlan = plan.id === "pro" || plan.id === "elite";
          const features = Array.isArray(plan.features) ? plan.features : [];

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col justify-between rounded-2xl border p-6 shadow-sm transition-all ${
                isCurrent
                  ? "border-emerald-500 bg-emerald-50/20 ring-2 ring-emerald-500/20"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              {isCurrent && (
                <span className="absolute -top-3 right-6 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-sm">
                  Active Plan
                </span>
              )}

              <div>
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-black text-slate-900">
                      {formatPrice(plan.price_naira)}
                    </span>
                    <span className="text-sm font-medium text-slate-500">
                      /{plan.billing_interval || "month"}
                    </span>
                  </div>
                  {isPaidPlan && (
                    <p className="mt-1 text-xs text-amber-600 font-semibold">
                      * Placeholder price - subject to confirmation
                    </p>
                  )}
                </div>

                <div className="mb-6 space-y-3">
                  {features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-sm text-slate-700">
                      <Check className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                {isCurrent ? (
                  <button
                    type="button"
                    disabled
                    className="w-full rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-400 cursor-not-allowed"
                  >
                    Current Plan
                  </button>
                ) : isFreePlan && (currentPlanId === "pro" || currentPlanId === "elite") ? (
                  <button
                    type="button"
                    onClick={handleDowngradeNotice}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Downgrade to Free
                  </button>
                ) : (
                  <PaystackCheckoutButton
                    planId={plan.id}
                    planName={plan.name}
                    userEmail={user?.email}
                    userId={user?.id}
                    onPaymentSuccess={handlePaymentSuccess}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Subscription Details */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <ShieldCheck className="h-6 w-6 text-emerald-600" />
          <h3 className="text-lg font-bold text-slate-900">Current Subscription Details</h3>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Tier
            </span>
            <p className="mt-1 text-lg font-bold text-slate-900">
              {currentPlan?.name || "Free"} Plan
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Status
            </span>
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
              <p className="text-lg font-bold text-slate-900 capitalize">
                {subscription?.status || "Active"}
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {currentPlanId === "free" ? "Billing Cycle" : "Next Renewal / Expiry"}
            </span>
            <div className="mt-1 flex items-center gap-2 text-slate-900">
              <Calendar className="h-4 w-4 text-slate-500" />
              <p className="text-lg font-bold text-slate-900">
                {currentPlanId === "free"
                  ? "Lifetime Free"
                  : formatDate(subscription?.current_period_end)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment History List */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <History className="h-6 w-6 text-emerald-600" />
          <h3 className="text-lg font-bold text-slate-900">Payment History</h3>
        </div>

        {payments.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">
            No payment records found. Payments made for subscription upgrades will appear here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Purpose</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3.5 font-mono text-xs font-semibold text-slate-900">
                      {p.reference}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-800 capitalize">
                      {p.purpose?.replace("subscription:", "") || "Subscription"} Plan
                    </td>
                    <td className="px-4 py-3.5 font-bold text-slate-900">
                      ₦{(p.amount / 100).toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          p.status === "success"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-800"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500">{formatDate(p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
