import { Lightbulb, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

const messages = [
  "Small steps still move the whole idea forward.",
  "Your future self is going to be glad you stayed with this.",
  "One clear explanation is worth more than ten rushed pages.",
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
    <aside className="self-start lg:sticky lg:top-6">
      <div className="overflow-hidden rounded-2xl border border-green-200 bg-gradient-to-b from-green-50 via-white to-amber-50 shadow-sm">
        <div className="relative flex justify-center px-5 pt-4">
          <div className="absolute right-5 top-5 rounded-full bg-white/80 p-2 text-amber-500 shadow-sm"><Sparkles className="h-4 w-4" /></div>
          <img src="/logo3.png" alt="Lumo, your study companion" className="lumo-float h-44 w-auto object-contain drop-shadow-md" />
        </div>
        <div className="px-5 pb-5">
          <p className={`text-xs font-bold uppercase tracking-[0.18em] ${theme?.accentText || "text-green-700"}`}>Lumo says</p>
          <p className="mt-2 min-h-14 text-lg font-bold leading-7 text-slate-900">{messages[messageIndex]}</p>
          <p className="mt-2 text-sm text-slate-600">Studying {topic} together, one idea at a time.</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-amber-800"><Lightbulb className="h-5 w-5" /><h2 className="font-bold">Quick riddle</h2></div>
          <button title="New riddle" onClick={nextRiddle} className="rounded-lg p-2 text-amber-700 hover:bg-amber-100"><RefreshCw className="h-4 w-4" /></button>
        </div>
        <p className="mt-4 text-sm font-semibold leading-6 text-slate-800">{riddle.question}</p>
        {showAnswer ? (
          <p className="mt-3 rounded-lg bg-white p-3 text-sm font-bold text-amber-900">Answer: {riddle.answer}</p>
        ) : (
          <button onClick={() => setShowAnswer(true)} className="mt-4 text-sm font-bold text-amber-800 underline decoration-amber-300 underline-offset-4 hover:text-amber-950">Reveal answer</button>
        )}
      </div>
    </aside>
  );
}

export default StudyCompanion;