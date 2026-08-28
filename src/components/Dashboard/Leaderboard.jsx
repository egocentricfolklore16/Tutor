import { Flame, Medal, Sparkles, Trophy } from "lucide-react";

const leaderboard = [
  { rank: 1, name: "Maya Chen", initials: "MC", color: "bg-amber-200 text-amber-900", hours: "18.4h", streak: 12, points: "2,840", champion: true },
  { rank: 2, name: "Jordan Ellis", initials: "JE", color: "bg-sky-200 text-sky-900", hours: "16.8h", streak: 9, points: "2,510" },
  { rank: 3, name: "Sam Rivera", initials: "SR", color: "bg-rose-200 text-rose-900", hours: "14.2h", streak: 7, points: "2,180" },
  { rank: 4, name: "Avery Brooks", initials: "AB", color: "bg-emerald-100 text-emerald-800", hours: "12.6h", streak: 6, points: "1,940", you: true },
  { rank: 5, name: "Noah Williams", initials: "NW", color: "bg-violet-100 text-violet-800", hours: "10.9h", streak: 4, points: "1,720" },
];

function Leaderboard() {
  return (
    <section className="relative h-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm lg:p-6" aria-labelledby="leaderboard-title">
      <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-emerald-400/15 blur-3xl" />
      <div className="absolute -bottom-24 left-16 h-48 w-48 rounded-full bg-amber-300/10 blur-3xl" />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-emerald-300">
            <Trophy className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-[0.2em]">Leaderboard</span>
          </div>
          <h2 id="leaderboard-title" className="text-2xl font-bold tracking-tight">Climb the board</h2>
          <p className="mt-1 text-sm text-slate-400">A little momentum goes a long way.</p>
        </div>
        <button type="button" className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-slate-200 backdrop-blur transition hover:bg-white/15">This week</button>
      </div>

      <div className="relative mt-7 grid grid-cols-3 items-end gap-2 border-b border-white/10 px-1 pb-5">
        <PodiumEntry learner={leaderboard[1]} podiumClass="h-20 bg-sky-300/20" medalClass="bg-sky-200 text-sky-900" />
        <PodiumEntry learner={leaderboard[0]} podiumClass="h-28 bg-amber-300/20" medalClass="bg-amber-200 text-amber-900" />
        <PodiumEntry learner={leaderboard[2]} podiumClass="h-16 bg-rose-300/20" medalClass="bg-rose-200 text-rose-900" />
      </div>

      <div className="relative mt-4 space-y-2">
        {leaderboard.slice(3).map((learner) => (
          <div key={learner.rank} className={`flex items-center gap-3 rounded-xl border px-3 py-3 transition ${learner.you ? "border-emerald-400/50 bg-emerald-400/10" : "border-white/5 bg-white/[0.04] hover:bg-white/[0.08]"}`}>
            <span className="w-5 text-center text-sm font-bold text-slate-500">{learner.rank}</span>
            <span className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${learner.color}`}>{learner.initials}</span>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{learner.name}{learner.you && <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-emerald-300">You</span>}</p><p className="mt-0.5 text-xs text-slate-500">{learner.hours} studied</p></div>
            <div className="text-right"><p className="text-sm font-bold text-amber-200">{learner.points}</p><p className="mt-0.5 flex items-center justify-end gap-1 text-[11px] text-slate-500"><Flame className="h-3 w-3 text-orange-300" /> {learner.streak} day streak</p></div>
          </div>
        ))}
      </div>

      <div className="relative mt-5 flex items-center justify-between rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3">
        <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-emerald-300" /><span className="text-xs font-semibold text-emerald-100">Your next milestone</span></div>
        <span className="text-xs font-bold text-white">320 pts to go</span>
      </div>
    </section>
  );
}

function PodiumEntry({ learner, podiumClass, medalClass }) {
  return <div className="flex flex-col items-center justify-end gap-2"><div className={`relative flex h-12 w-12 items-center justify-center rounded-full text-xs font-bold ring-4 ring-slate-950 ${learner.color}`}><Medal className="absolute -right-2 -top-3 h-5 w-5 text-amber-300" />{learner.initials}</div><p className="max-w-full truncate text-center text-xs font-semibold text-slate-200">{learner.name}</p><div className={`flex w-full items-end justify-center rounded-t-xl ${podiumClass}`}><span className={`mb-2 flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${medalClass}`}>{learner.rank}</span></div></div>;
}

export default Leaderboard;