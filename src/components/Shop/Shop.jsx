import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Sparkles,
  Crown,
  CheckCircle2,
  Bot,
  Zap,
  Users,
  ShieldCheck,
} from "lucide-react";
import PageContainer from "../common/PageContainer";
import { Card, Button, Badge } from "../common/UIKit";
import PaystackCheckoutButton from "../Settings/PaystackCheckoutButton";

export default function Shop() {
  const navigate = useNavigate();

  return (
    <PageContainer maxWidth="max-w-5xl">
      {/* Back Button */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-violet-950/60 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Header Banner */}
      <Card variant="gradient" padding="p-6 md:p-8" className="mb-8">
        <div className="flex flex-col gap-2">
          <Badge variant="amber" size="sm" icon={Sparkles} className="w-fit">
            PREMIUM LEARNING TIER
          </Badge>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">
            Upgrade Your Hyper Tutor Experience
          </h1>
          <p className="text-sm text-violet-100 max-w-xl leading-relaxed">
            Get unlimited AI tutoring, AI mock exams, deep concept mastery, and priority answer support.
          </p>
        </div>
      </Card>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        {/* PRO TIER - NGN 2,500 */}
        <Card className="flex flex-col justify-between border-2 border-amber-500/80 dark:border-amber-500 relative">
          <div className="absolute -top-3 right-6">
            <Badge variant="amber" size="sm" icon={Crown}>
              MOST POPULAR
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
              <span className="text-3xl font-black text-slate-900 dark:text-white">NGN 2,500</span>
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

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-violet-950/50">
            <PaystackCheckoutButton
              plan="pro"
              className="w-full font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-3"
            >
              Subscribe to Pro
            </PaystackCheckoutButton>
          </div>
        </Card>

        {/* ELITE TIER - NGN 5,000 */}
        <Card className="flex flex-col justify-between border border-violet-500/40 relative">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400">
                <Crown className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Elite Plan</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">For serious scholars & exam candidates</p>
              </div>
            </div>

            <div className="flex items-baseline gap-1 my-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white">NGN 5,000</span>
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
                  <CheckCircle2 className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-violet-950/50">
            <PaystackCheckoutButton
              plan="elite"
              className="w-full font-bold bg-violet-600 hover:bg-violet-700 text-white rounded-xl py-3"
            >
              Subscribe to Elite
            </PaystackCheckoutButton>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
