import { Lightbulb, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

const messages = [
  "Small steps still move the whole idea forward.",
  "Your future self is going to be glad you stayed with this.",
  "Motivation is key for a strong study rhythm.",
];

const riddles = [
  { question: "I have keys but no locks, and space but no room. What am I?", answer: "A keyboard." },
  { question: "What has many pages but cannot tell a story on its own?", answer: "A notebook." },
  { question: "I get smaller every time I help you learn. What am I?", answer: "A knowledge gap." },
];

function StudyCompanion({ theme, topic }) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [riddleIndex, setRiddleIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % messages.length);
    }, 7000);
    return () => window.clearInterval(interval);
  }, []);

  const nextRiddle = () => {
    setRiddleIndex((current) => (current + 1) % riddles.length);
    setShowAnswer(false);
  };

  const riddle = riddles[riddleIndex];

  return (
    <aside className="w-full self-start lg:sticky lg:top-6">
      <div className="flex flex-col gap-4 lg:items-stretch">
        <div className="mt-[30px] flex min-h-[17rem] w-full flex-col overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50 via-white to-amber-50 p-4 shadow-sm dark:border-slate-700 dark:from-emerald-950/40 dark:via-slate-900 dark:to-amber-950/20">
          <div className="flex items-center justify-between gap-3">
            <p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${theme?.accentText || "text-emerald-700 dark:text-emerald-300"}`}>
              Lumo says
            </p>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-amber-500 shadow-sm dark:bg-slate-800/80">
              <Sparkles className="h-4 w-4" />
            </span>
          </div>

          <div className="mt-3 flex justify-center">
            <img src="/logo3.png" alt="Lumo, your study companion" className="lumo-float h-32 w-auto object-contain drop-shadow-md" />
          </div>

          <div className="mt-2 flex flex-1 flex-col">
            <p className="text-lg font-black leading-7 text-slate-900 dark:text-slate-100">{messages[messageIndex]}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Studying {topic} together, one idea at a time.</p>
          </div>
        </div>

        <div className="flex w-full flex-col rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/30" aria-live="polite">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
              <Lightbulb className="h-5 w-5" />
              <h2 className="text-sm font-bold">Quick riddle</h2>
            </div>
            <button
              type="button"
              title="New riddle"
              aria-label="Show a new riddle"
              onClick={nextRiddle}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-amber-700 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-amber-300 dark:hover:bg-amber-900/40"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          <p className="mt-4 text-sm font-semibold leading-6 text-slate-800 dark:text-slate-200">{riddle.question}</p>
          {showAnswer ? (
            <p className="mt-3 rounded-xl bg-white p-3 text-sm font-bold text-amber-900 dark:bg-slate-800 dark:text-amber-300">
              Answer: {riddle.answer}
            </p>
          ) : (
            <button
              type="button"
              onClick={() => setShowAnswer(true)}
              className="mt-4 inline-flex w-fit items-center rounded-lg px-2 py-1 text-sm font-bold text-amber-800 underline decoration-amber-300 underline-offset-4 transition hover:text-amber-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-amber-300 dark:decoration-amber-600 dark:hover:text-amber-200"
            >
              Reveal answer
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

export default StudyCompanion;