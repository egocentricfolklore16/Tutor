import { Lightbulb, Loader2 } from "lucide-react";
import { useState } from "react";

const riddles = [
  "I have keys but no locks, and space but no room. What am I?",
  "What has many pages but cannot tell a story on its own?",
  "I get smaller every time I help you learn. What am I?",
  "What can travel around the world while staying in one corner?",
  "I am full of holes, but I can still hold water. What am I?",
  "What has a head and a tail but no body?",
  "What gets wetter the more it dries?",
];

function LoadingCompanion({ message = "Getting your study space ready..." }) {
  const [riddle] = useState(() => riddles[Math.floor(Math.random() * riddles.length)]);

  return <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-xl bg-white px-6 py-10 text-center shadow-sm ring-1 ring-slate-200"><div className="relative"><img src="/logo3.png" alt="Lumo mascot" className="h-20 w-20 object-contain" /><div className="absolute left-16 top-[-18px] w-56 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-left text-xs font-semibold leading-5 text-amber-900 shadow-sm"><span className="mb-1 flex items-center gap-1 text-amber-700"><Lightbulb className="h-3.5 w-3.5" /> New riddles</span>{riddle}</div></div><Loader2 className="h-5 w-5 animate-spin text-emerald-600" /><p className="text-sm text-slate-500">{message}</p></div>;
}

export default LoadingCompanion;