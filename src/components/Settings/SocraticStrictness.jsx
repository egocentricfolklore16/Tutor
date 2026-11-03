import { Check, AlertCircle } from "lucide-react";
import { useAITutor } from "../../app/AITutorContext";

const STRICTNESS_OPTIONS = [
  {
    label: "Always Guide First",
    value: "always_guide",
    description: "The tutor asks questions and gives you steps to try. It won't hand over the answer.",
  },
  {
    label: "Hints Then Answer",
    value: "hints_then_answer",
    description: "You get hints first, and the full answer if you're still stuck.",
  },
  {
    label: "Direct Help",
    value: "direct_help",
    description: "You get the answer and explanation right away.",
  },
];

export default function SocraticStrictness() {
  const {
    strictness = "hints_then_answer",
    updateStrictness,
    strictnessSaveStatus,
    strictnessError,
  } = useAITutor();

  const activeOption =
    STRICTNESS_OPTIONS.find((opt) => opt.value === strictness) || STRICTNESS_OPTIONS[1];

  return (
    <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-sm text-white">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">Socratic Strictness</h3>
        {strictnessSaveStatus === "saved" && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 rounded-full px-2.5 py-1">
            <Check size={13} />
            Saved
          </span>
        )}
      </div>

      {/* Segmented pill control */}
      <div className="inline-flex w-full sm:w-auto items-center p-1 bg-zinc-900 rounded-full border border-zinc-800 gap-1">
        {STRICTNESS_OPTIONS.map((option) => {
          const isSelected = strictness === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => updateStrictness(option.value)}
              className={`flex-1 sm:flex-initial rounded-full px-4 py-2.5 text-sm font-semibold transition-colors duration-150 active:scale-95 ${
                isSelected
                  ? "bg-green-900/40 text-green-400 border border-green-700/50"
                  : "text-zinc-300 hover:text-white bg-transparent"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {/* Helper text describing the active mode in one sentence */}
      <p className="mt-3 text-xs text-zinc-400 min-h-[20px]">
        {activeOption.description}
      </p>

      {strictnessSaveStatus === "error" && (
        <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-rose-400 bg-rose-950/60 border border-rose-800/60 rounded-lg px-3 py-1.5">
          <AlertCircle size={14} />
          <span>{strictnessError || "Failed to save preference. Please try again."}</span>
        </div>
      )}
    </div>
  );
}
