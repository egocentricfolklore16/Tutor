import React from "react";
import { CheckCircle2, Lock, Zap, Shield, BookOpen, Award, Crown, Gift, ArrowRight } from "lucide-react";
import Modal from "../../../components/common/ResponsiveSheet";

const ICON_MAP = {
  zap: Zap,
  shield: Shield,
  book: BookOpen,
  award: Award,
  crown: Crown,
  sprout: Zap,
  target: Shield,
};

/**
 * Viewport-centered Modal for inspecting roadmap node details on desktop and mobile.
 */
export function NodeDetailSheet({
  node,
  userLevel,
  xpInLevel = 0,
  xpForLevel = 100,
  totalXp = 0,
  onClose,
}) {
  if (!node) return null;

  const { level, milestoneTitle, milestoneDesc, milestoneIcon, xpRequired, zone, isTeaser, teaserText } = node;

  const isDone = level < userLevel;
  const isCurrent = level === userLevel;

  const IconComponent = ICON_MAP[milestoneIcon] || Gift;

  const xpRemaining = isCurrent
    ? Math.max(0, xpForLevel - xpInLevel)
    : Math.max(0, xpRequired - totalXp);

  return (
    <Modal
      isOpen={Boolean(node)}
      onClose={onClose}
      isSheet={true}
      title={
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${zone?.badgeBg || "bg-amber-100 text-amber-800"}`}>
            {zone?.name || "Level Roadmap"}
          </span>
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
            Level {level}
          </span>
        </div>
      }
      maxWidth="max-w-md"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-black text-white hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 shadow-md transition"
        >
          Got it <ArrowRight className="h-4 w-4" />
        </button>
      }
    >
      <div>
        {/* Title */}
        <div className="flex items-start gap-3">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-md ${
            isDone
              ? "bg-emerald-500 text-white"
              : isCurrent
              ? "bg-amber-500 text-white animate-bounce-gentle"
              : "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
          }`}>
            <IconComponent className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              {isTeaser ? "Keep Climbing!" : milestoneTitle || `Level ${level} Explorer`}
            </h3>
            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {isDone ? "Completed & Claimed" : isCurrent ? "Current Level Goal" : "Locked Milestone"}
            </p>
          </div>
        </div>

        {/* Description / Perk */}
        <div className="mt-4 rounded-xl bg-slate-50 p-4 border border-slate-100 dark:bg-slate-900/60 dark:border-slate-800">
          <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
            {isTeaser
              ? teaserText || "Reach Level 20 to unlock exclusive profile frames and legendary avatar badges!"
              : milestoneDesc || "Earn XP by completing study sessions and quizzes to level up!"}
          </p>
        </div>

        {/* Progress or Requirements */}
        <div className="mt-4 space-y-3">
          {isCurrent ? (
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                <span>Current Level Progress</span>
                <span>{xpInLevel} / {xpForLevel} XP</span>
              </div>
              <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, (xpInLevel / xpForLevel) * 100))}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-300 font-bold flex items-center gap-1">
                <Zap className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                {xpRemaining} XP needed for Level {level + 1}
              </p>
            </div>
          ) : isDone ? (
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/40">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
              <span>You have reached and unlocked this level reward!</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 p-3 rounded-xl">
              <Lock className="h-4 w-4 shrink-0 text-slate-400" />
              <span>Requires {xpRequired.toLocaleString()} Total XP ({xpRemaining.toLocaleString()} XP to go)</span>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default NodeDetailSheet;
