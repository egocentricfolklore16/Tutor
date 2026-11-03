import React, { useState } from "react";
import { X, Sparkles, Send, Clock } from "lucide-react";
import { FEEDBACK_TYPES } from "../../lib/feedback";

const EMOJI_OPTIONS = [
  { value: 1, emoji: "😖" },
  { value: 2, emoji: "🙁" },
  { value: 3, emoji: "😐" },
  { value: 4, emoji: "🙂" },
  { value: 5, emoji: "😍" },
];

export default function PromptBanner({ prompt, onSubmit, onSnooze, onDismiss }) {
  const [selectedRating, setSelectedRating] = useState(null);
  const [selectedNps, setSelectedNps] = useState(null);
  const [showTextStep, setShowTextStep] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [thankYou, setThankYou] = useState(false);

  if (!prompt) return null;

  const isNps = prompt.type === FEEDBACK_TYPES.NPS || prompt.key === "nps_day7";

  const handleRatingSelect = (ratingValue) => {
    setSelectedRating(ratingValue);
    setShowTextStep(true);
  };

  const handleNpsSelect = (npsValue) => {
    setSelectedNps(npsValue);
    setShowTextStep(true);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setSubmitting(true);

    const res = await onSubmit({
      rating: selectedRating,
      nps_score: selectedNps,
      message,
    });

    setSubmitting(false);
    if (res?.success) {
      setThankYou(true);
      setTimeout(() => {
        setThankYou(false);
      }, 2500);
    }
  };

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:max-w-md z-40 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="p-4 rounded-2xl bg-slate-900/95 border border-slate-800 backdrop-blur-md shadow-2xl text-slate-100">
        {thankYou ? (
          <div className="flex items-center gap-3 py-2 text-emerald-400">
            <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
            <span className="text-sm font-semibold">Thanks for your feedback! +10 XP</span>
          </div>
        ) : !showTextStep ? (
          /* One-tap First Step */
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-slate-100">{prompt.title || "Quick Feedback"}</h4>
                <p className="text-xs text-slate-400">{prompt.question || "How was your recent experience?"}</p>
              </div>
              <button
                onClick={onDismiss}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isNps ? (
              /* NPS 0-10 Scale */
              <div className="space-y-1.5">
                <div className="flex justify-between gap-1">
                  {Array.from({ length: 11 }, (_, i) => i).map((score) => (
                    <button
                      key={score}
                      onClick={() => handleNpsSelect(score)}
                      className="flex-1 py-1.5 text-xs font-bold rounded-lg bg-slate-800/80 hover:bg-emerald-500/30 hover:text-emerald-300 border border-slate-700/60 transition-all"
                    >
                      {score}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 px-1 font-medium">
                  <span>Not likely</span>
                  <span>Extremely likely</span>
                </div>
              </div>
            ) : (
              /* Emoji Rating */
              <div className="flex justify-between gap-2 pt-1">
                {EMOJI_OPTIONS.map((item) => (
                  <button
                    key={item.value}
                    onClick={() => handleRatingSelect(item.value)}
                    className="p-2 text-2xl rounded-xl bg-slate-800/60 hover:bg-emerald-500/20 hover:scale-110 border border-slate-700/50 transition-all"
                  >
                    {item.emoji}
                  </button>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-1 border-t border-slate-800/60 text-[11px]">
              <button
                onClick={onSnooze}
                className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <Clock className="w-3 h-3" />
                <span>Maybe later</span>
              </button>
            </div>
          </div>
        ) : (
          /* Step 2: Optional text followup ("What could be better?") */
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-400">What could be better?</span>
              <button
                type="button"
                onClick={onDismiss}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Tell us a bit more (optional)..."
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs resize-none"
            />

            <div className="flex justify-between items-center pt-1">
              <button
                type="button"
                onClick={onSnooze}
                className="text-[11px] text-slate-400 hover:text-slate-200"
              >
                Skip note
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1.5 disabled:opacity-50 transition-colors"
              >
                {submitting ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-3 h-3" />
                    <span>Send</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
