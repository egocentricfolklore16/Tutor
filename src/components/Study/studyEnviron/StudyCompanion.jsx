import { Lightbulb, RefreshCw, Sparkles, ChevronLeft, ChevronRight, HelpCircle, Eye, EyeOff, Quote } from "lucide-react";
import React, { useEffect, useState } from "react";

const messages = [
  "Small steps still move the whole idea forward.",
  "Your future self is going to be glad you stayed with this.",
  "Focus on progress, not perfection.",
  "Consistency transforms average efforts into extraordinary results.",
  "Every expert was once a beginner who refused to quit.",
  "The secret to getting ahead is simply getting started.",
  "Believing in your capacity to learn is the first step to mastery."
];

const riddles = [
  { question: "I have keys but no locks, and space but no room. What am I?", answer: "A keyboard." },
  { question: "What has many pages but cannot tell a story on its own?", answer: "A notebook." },
  { question: "I get smaller every time I help you learn. What am I?", answer: "A knowledge gap." },
  { question: "I am taken before you get me, and saved when you need me most. What am I?", answer: "A study break." },
  { question: "I fly without wings and cry without eyes. What am I?", answer: "A cloud." },
  { question: "The more you take from me, the larger I become. What am I?", answer: "A hole." },
  { question: "What has a head and a tail but no body?", answer: "A coin." }
];

function StudyCompanion({ theme, topic }) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [riddleIndex, setRiddleIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const interval = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % messages.length);
    }, 7000);
    return () => window.clearInterval(interval);
  }, [isPaused]);

  const nextMessage = () => {
    setMessageIndex((current) => (current + 1) % messages.length);
  };

  const prevMessage = () => {
    setMessageIndex((current) => (current - 1 + messages.length) % messages.length);
  };

  const nextRiddle = () => {
    setRiddleIndex((current) => (current + 1) % riddles.length);
    setShowAnswer(false);
  };

  const riddle = riddles[riddleIndex];

  return (
    <aside className="w-full self-start lg:sticky lg:top-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
        {/* Motivation Card */}
        <div
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          className="group relative flex min-h-[18rem] w-full flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
          {/* Subtle Accent Glow & Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className={`text-xs font-bold uppercase tracking-wider ${theme?.accentText || "text-emerald-700 dark:text-emerald-400"}`}>
                  Daily Motivation
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Lumo Companion
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <Quote className="h-3 w-3 text-slate-400" />
              <span>{messageIndex + 1}/{messages.length}</span>
            </div>
          </div>

          {/* Body Content */}
          <div className="my-4 flex flex-1 flex-col justify-center">
            <p className="text-base font-semibold leading-relaxed text-slate-800 dark:text-slate-100 sm:text-lg">
              "{messages[messageIndex]}"
            </p>
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Studying <span className="font-medium text-slate-700 dark:text-slate-300">{topic}</span> together.
            </p>
          </div>

          {/* Mascot & Controls Footer */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800/80">
            <div className="flex items-center gap-2">
              <img src="/logo3.png" alt="Lumo mascot" className="h-7 w-7 object-contain drop-shadow-sm" />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Lumo</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevMessage}
                title="Previous quote"
                aria-label="Previous quote"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={nextMessage}
                title="Next quote"
                aria-label="Next quote"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Riddle Card */}
        <div
          aria-live="polite"
          className="relative flex min-h-[18rem] w-full flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                <Lightbulb className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Quick Brain Teaser
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Brain warm-up
                </p>
              </div>
            </div>
            <button
              type="button"
              title="Next riddle"
              aria-label="Next riddle"
              onClick={nextRiddle}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {/* Riddle Body */}
          <div className="my-4 flex flex-1 flex-col justify-center">
            <p className="text-sm font-semibold leading-relaxed text-slate-800 dark:text-slate-200">
              {riddle.question}
            </p>

            <div className="mt-4">
              {showAnswer ? (
                <div className="animate-in fade-in flex items-start gap-2 rounded-xl bg-amber-50/80 p-3.5 text-xs font-bold text-amber-950 dark:bg-amber-950/40 dark:text-amber-200">
                  <HelpCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Answer</span>
                    <p className="mt-0.5 text-sm">{riddle.answer}</p>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAnswer(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200/80 bg-amber-50/50 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300 dark:hover:bg-amber-900/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Reveal Answer
                </button>
              )}
            </div>
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800/80">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Riddle {riddleIndex + 1} of {riddles.length}
            </span>
            {showAnswer && (
              <button
                type="button"
                onClick={() => setShowAnswer(false)}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <EyeOff className="h-3 w-3" /> Hide answer
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

export default React.memo(StudyCompanion);
