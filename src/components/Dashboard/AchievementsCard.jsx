import { ArrowRight, Award, Check, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";

function AchievementsCard() {
  const navigate = useNavigate();
  return <section className="accent-card-achievements rounded-lg border p-5 shadow-sm"><div className="flex items-start justify-between"><div className="flex items-center gap-2"><Award className="h-5 w-5" /><p className="text-xs font-bold uppercase tracking-[0.18em]">Achievements</p></div><Star className="h-5 w-5 fill-current" /></div><h2 className="mt-3 text-xl font-bold text-gray-900">Your wins are adding up</h2><div className="mt-4 grid grid-cols-3 gap-2">{["First focus", "7-day spark", "Note maker"].map((label) => <div key={label} className="rounded-lg border border-current/20 bg-white/70 p-3 text-center"><span className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-current/20"><Check className="h-4 w-4" /></span><p className="mt-2 text-[11px] font-semibold leading-4">{label}</p></div>)}</div><button type="button" onClick={() => navigate("/Progress")} className="mt-5 inline-flex items-center gap-2 text-sm font-bold hover:opacity-75">View achievements <ArrowRight className="h-4 w-4" /></button></section>;
}

export default AchievementsCard;