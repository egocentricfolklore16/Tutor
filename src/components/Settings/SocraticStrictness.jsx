import { Check, AlertCircle, Sparkles } from "lucide-react";
import { useAITutor } from "../../app/AITutorContext";
import { Card, Badge } from "../common/UIKit";

const STRICTNESS_OPTIONS = [
  {
    label: "Always Guide First",
    value: "always_guide",
    description: "The tutor asks guiding questions to help you derive the solution yourself without giving direct answers.",
  },
  {
    label: "Hints Then Answer",
    value: "hints_then_answer",
    description: "Provides helpful hints first, then reveals the complete answer if you are still stuck.",
  },
  {
    label: "Direct Help",
    value: "direct_help",
    description: "Gives clear, direct answers and step-by-step explanations immediately.",
  },
];

export default function SocraticStrictness() {
  const {
    strictness = "hints_then_answer",
    updateStrictness,
    strictnessSaveStatus,
    strictnessError,
  } = useAITutor();

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Socratic Strictness Mode
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Customize how your AI Tutor guides your learning process.
            </p>
          </div>
        </div>

        {strictnessSaveStatus === "saved" && (
          <Badge variant="mint" size="sm" icon={Check}>
            Saved
          </Badge>
        )}
      </div>

      {/* 3 Stacked Option Cards */}
      <div className="flex flex-col gap-3 mt-1">
        {STRICTNESS_OPTIONS.map((option) => {
          const isSelected = strictness === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => updateStrictness(option.value)}
              className={`flex items-start gap-3.5 p-4 rounded-2xl border text-left transition-all ${
                isSelected
                  ? "bg-violet-50/80 border-violet-500 dark:bg-violet-950/60 dark:border-violet-600 shadow-sm"
                  : "bg-slate-50/50 dark:bg-[#181432] border-slate-200/80 dark:border-violet-900/30 hover:border-slate-300 dark:hover:border-violet-800"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                  isSelected
                    ? "bg-violet-600 border-violet-600 text-white"
                    : "border-slate-300 dark:border-slate-600"
                }`}
              >
                {isSelected && <Check className="w-3 h-3" />}
              </div>

              <div>
                <h4
                  className={`text-sm font-bold ${
                    isSelected
                      ? "text-violet-900 dark:text-violet-200"
                      : "text-slate-900 dark:text-slate-100"
                  }`}
                >
                  {option.label}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  {option.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {strictnessSaveStatus === "error" && (
        <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/60 p-3 rounded-xl border border-rose-200 dark:border-rose-900">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{strictnessError || "Failed to save preference."}</span>
        </div>
      )}
    </Card>
  );
}
