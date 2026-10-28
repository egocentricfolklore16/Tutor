import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Snowflake,
  ShieldCheck,
  Palette,
  Sparkles,
  Clock,
  Bot,
  CheckCircle2,
  Lock,
  AlertCircle,
  ShoppingBag,
  History,
  Check,
  RefreshCw,
  Info,
  Crown,
  Zap,
} from "lucide-react";
import { useGamification, gamificationService } from "../../features/gamification";
import supabase from "../../lib/supabase";
import PageContainer from "../common/PageContainer";
import PaystackCheckoutButton from "../Settings/PaystackCheckoutButton";
import { Card, Button, Badge } from "../common/UIKit";

function GemIcon({ className = "h-5 w-5 text-cyan-500" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6.5 3h11L21 9l-9 12L3 9l3.5-6Z" fill="currentColor" />
      <path d="M6.5 3 12 9l5.5-6M3 9h18M9.5 9 12 21l2.5-12" stroke="white" strokeOpacity="0.45" strokeWidth="0.6" strokeLinejoin="round" />
    </svg>
  );
}

export default function Shop() {
  const navigate = useNavigate();
  const { streak, gems } = useGamification();
  const { freezeTokens, refreshStreak } = streak;
  const { balance: gemsBalance } = gems;

  const [activeTab, setActiveTab] = useState("pricing"); // 'pricing' | 'gems' | 'history'
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [buyingFreeze, setBuyingFreeze] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(null);
  const [purchaseError, setPurchaseError] = useState(null);

  const [transactionsState, setTransactionsState] = useState({ data: [], available: false, message: "" });

  useEffect(() => {
    async function loadTransactions() {
      const { data: { user } } = await supabase.auth.getUser();
      const res = await gamificationService.getTransactions(user?.id);
      setTransactionsState(res);
    }
    loadTransactions();
  }, []);

  const categories = [
    { id: "all", label: "All Items" },
    { id: "protection", label: "Streak Protection" },
    { id: "cosmetics", label: "Avatar Frames" },
    { id: "timer", label: "Timer Skins" },
    { id: "ai", label: "AI Tutor" },
  ];

  const handleBuyStreakFreeze = async () => {
    if (gemsBalance < 50) {
      setPurchaseError("Insufficient gems! You need 50 gems to purchase a Streak Freeze.");
      return;
    }
    if (freezeTokens >= 2) {
      setPurchaseError("Maximum capacity reached! You can hold at most 2 Streak Freeze tokens at a time.");
      return;
    }

    setBuyingFreeze(true);
    setPurchaseError(null);
    setPurchaseSuccess(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthenticated");
      const res = await gamificationService.purchaseStreakFreeze(user.id);
      if (!res.success) {
        throw new Error(res.error);
      }
      await refreshStreak();
      setPurchaseSuccess("Streak Freeze purchased successfully! Your streak is protected.");
    } catch (err) {
      setPurchaseError(err.message || "Failed to purchase Streak Freeze. Please try again.");
    } finally {
      setBuyingFreeze(false);
    }
  };

  const shopItems = [
    {
      id: "streak-freeze",
      category: "protection",
      title: "Streak Freeze Token",
      description: "Equip to automatically protect your streak if you miss a single study day. Holds up to 2.",
      price: 50,
      icon: Snowflake,
      iconColor: "text-cyan-500",
      bgColor: "bg-cyan-100 dark:bg-cyan-950/40",
      actionable: true,
      ownedCount: freezeTokens,
      maxCount: 2,
    },
    {
      id: "streak-repair",
      category: "protection",
      title: "Streak Repair Pass",
      description: "Repair a broken streak within 48 hours of missing a study day. Limited to 1 per month.",
      price: 100,
      icon: ShieldCheck,
      iconColor: "text-amber-500",
      bgColor: "bg-amber-100 dark:bg-amber-950/40",
      actionable: false,
      badge: "Preview",
    },
    {
      id: "emerald-frame",
      category: "cosmetics",
      title: "Emerald Scholar Frame",
      description: "A glowing emerald avatar border showcasing your commitment to learning.",
      price: 75,
      icon: Palette,
      iconColor: "text-emerald-500",
      bgColor: "bg-emerald-100 dark:bg-emerald-950/40",
      actionable: false,
      badge: "Coming Soon",
    },
    {
      id: "gold-frame",
      category: "cosmetics",
      title: "Gold Champion Frame",
      description: "An opulent golden halo border unlocked by top community scholars.",
      price: 150,
      icon: Sparkles,
      iconColor: "text-amber-500",
      bgColor: "bg-amber-100 dark:bg-amber-950/40",
      actionable: false,
      badge: "Coming Soon",
    },
    {
      id: "forest-timer",
      category: "timer",
      title: "Forest Zen Timer Skin",
      description: "Calming ambient forest sounds and a soothing visual progress pulse during focus sessions.",
      price: 40,
      icon: Clock,
      iconColor: "text-emerald-500",
      bgColor: "bg-emerald-100 dark:bg-emerald-950/40",
      actionable: false,
      badge: "Coming Soon",
    },
    {
      id: "ai-hints",
      category: "ai",
      title: "AI Tutor Instant Hint Pack",
      description: "Get 5 bonus instant explanatory hints when working through tough practice problems.",
      price: 30,
      icon: Bot,
      iconColor: "text-violet-500",
      bgColor: "bg-violet-100 dark:bg-violet-950/40",
      actionable: false,
      badge: "Coming Soon",
    },
  ];

  const filteredItems = shopItems.filter((item) => {
    if (selectedCategory === "all") return true;
    return item.category === selectedCategory;
  });

  return (
    <PageContainer maxWidth="max-w-5xl">
      {/* Back Button */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1.5 rounded-2xl bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Header Banner */}
      <Card variant="gradient" padding="p-6 md:p-8" className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-2xl bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
              <ShoppingBag className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Hyper Tutor Shop
            </div>
            <h1 className="text-2xl font-black text-white sm:text-3xl">
              Membership & Gem Rewards
            </h1>
            <p className="mt-1 text-xs text-emerald-100">
              Upgrade your subscription or redeem study gems for streak freezes and power-ups!
            </p>
          </div>

          {/* Wallet Summary Card */}
          <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 p-4 shadow-surface backdrop-blur-xs shrink-0 text-white">
            <GemIcon className="h-9 w-9 text-cyan-300" />
            <div>
              <span className="block text-2xl font-black tabular-nums">
                {gemsBalance}
              </span>
              <span className="text-xs font-bold text-emerald-100">
                Gems Available
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs (Pricing vs Gem Shop vs History) */}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-white/20 pt-4">
          <button
            type="button"
            onClick={() => setActiveTab("pricing")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === "pricing"
                ? "bg-white text-emerald-900 shadow-surface"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            <Crown className="h-4 w-4" /> Pro & Elite Plans
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("gems")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === "gems"
                ? "bg-white text-emerald-900 shadow-surface"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            <ShoppingBag className="h-4 w-4" /> Gem Rewards Shop
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === "history"
                ? "bg-white text-emerald-900 shadow-surface"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            <History className="h-4 w-4" /> Transaction History
          </button>
        </div>
      </Card>

      {/* Notifications / Feedback Alerts */}
      {purchaseSuccess && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{purchaseSuccess}</span>
        </div>
      )}
      {purchaseError && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{purchaseError}</span>
        </div>
      )}

      {/* Main Tab Content */}
      {activeTab === "pricing" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* PRO TIER */}
          <Card className="flex flex-col justify-between border-2 border-amber-500/80 dark:border-amber-500 relative">
            <div className="absolute -top-3 right-6">
              <Badge variant="amber" size="sm" icon={Crown}>
                RECOMMENDED
              </Badge>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Pro Plan</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Ideal for daily focused students</p>
                </div>
              </div>

              <div className="flex items-baseline gap-1 my-2">
                <span className="text-3xl font-black tabular-nums text-slate-900 dark:text-white">NGN 2,500</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">/ month</span>
              </div>

              <ul className="flex flex-col gap-2.5 my-2">
                {[
                  "Unlimited AI Tutor chat & Socratic guidance",
                  "Unlimited AI practice question generation",
                  "Full flashcard deck creation & review tracking",
                  "Full weekly analytics & weakness gap breakdown",
                  "Standard response speed & 2x gem multiplier",
                ].map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <PaystackCheckoutButton
                plan="pro"
                className="w-full font-extrabold bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-3 shadow-button-cta"
              >
                Subscribe to Pro
              </PaystackCheckoutButton>
            </div>
          </Card>

          {/* ELITE TIER */}
          <Card className="flex flex-col justify-between border border-emerald-500/40 relative">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  <Crown className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Elite Plan</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">For serious scholars & exam candidates</p>
                </div>
              </div>

              <div className="flex items-baseline gap-1 my-2">
                <span className="text-3xl font-black tabular-nums text-slate-900 dark:text-white">NGN 5,000</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">/ month</span>
              </div>

              <ul className="flex flex-col gap-2.5 my-2">
                {[
                  "Everything in Pro Plan included",
                  "Priority ultra-fast AI Tutor streaming answers",
                  "Unlimited mock exam simulation & full explanations",
                  "Exclusive Elite badge shelf & avatar frame",
                  "Priority peer tutor match in study rooms",
                ].map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <PaystackCheckoutButton
                plan="elite"
                className="w-full font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3 shadow-button-primary"
              >
                Subscribe to Elite
              </PaystackCheckoutButton>
            </div>
          </Card>
        </div>
      )}

      {activeTab === "gems" && (
        <div className="space-y-6">
          <div className="flex w-full gap-1.5 overflow-x-auto no-scrollbar rounded-2xl bg-slate-100 p-1 dark:bg-[#14171c]">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                  selectedCategory === cat.id
                    ? "bg-emerald-600 text-white shadow-surface"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {filteredItems.map((item) => {
              const Icon = item.icon;
              const canAfford = gemsBalance >= item.price;
              const isMaxedOut = item.actionable && item.ownedCount >= item.maxCount;

              return (
                <div
                  key={item.id}
                  className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-5 shadow-surface dark:border-slate-800 dark:bg-[#14171c]"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.bgColor}`}>
                        <Icon className={`h-6 w-6 ${item.iconColor}`} />
                      </div>

                      {item.badge ? (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          {item.badge}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-sm font-black text-cyan-600 dark:text-cyan-400 tabular-nums">
                          <GemIcon className="h-4 w-4" /> {item.price}
                        </span>
                      )}
                    </div>

                    <h3 className="mt-3 text-sm font-black text-slate-900 dark:text-white">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {item.description}
                    </p>
                  </div>

                  <div className="mt-5 border-t border-slate-100 pt-3 dark:border-slate-800">
                    {item.actionable ? (
                      <button
                        type="button"
                        disabled={buyingFreeze || !canAfford || isMaxedOut}
                        onClick={handleBuyStreakFreeze}
                        className={`flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition shadow-surface ${
                          isMaxedOut
                            ? "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300 cursor-default"
                            : !canAfford
                            ? "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed"
                            : "bg-cyan-600 text-white hover:bg-cyan-700 active:scale-98"
                        }`}
                      >
                        {buyingFreeze ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : isMaxedOut ? (
                          <>
                            <Check className="h-4 w-4 text-cyan-500" /> Maximum Held ({freezeTokens}/{item.maxCount})
                          </>
                        ) : !canAfford ? (
                          <>
                            <Lock className="h-4 w-4" /> Needs {item.price} Gems
                          </>
                        ) : (
                          <>
                            <GemIcon className="h-4 w-4" /> Buy for {item.price} Gems
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="flex min-h-[44px] items-center justify-center rounded-2xl bg-slate-50 px-3 py-2 text-center text-xs font-bold text-slate-400 dark:bg-slate-800/40 dark:text-slate-500">
                        <Lock className="mr-1.5 h-3.5 w-3.5" /> Coming Soon
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-surface dark:border-slate-800 dark:bg-[#14171c]">
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Recent Gem Transactions</h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Append-only ledger history of earned and spent study gems.</p>

          {!transactionsState.available ? (
            <div className="mt-6 flex flex-col items-center justify-center rounded-2xl bg-slate-50 p-6 text-center dark:bg-slate-800/40">
              <Info className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              <p className="mt-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                {transactionsState.message || "Gem transaction ledger pending backend view."}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Your total balance is verified and updated in real-time.
              </p>
            </div>
          ) : (
            <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
              {transactionsState.data.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full ${tx.type === "earn" ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400" : "bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"}`}>
                      <GemIcon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{tx.reason}</p>
                      <p className="text-[11px] text-slate-400">{tx.date}</p>
                    </div>
                  </div>

                  <span className={`text-xs font-black tabular-nums ${tx.type === "earn" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                    {tx.type === "earn" ? "+" : "-"}{tx.amount} Gems
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
}
