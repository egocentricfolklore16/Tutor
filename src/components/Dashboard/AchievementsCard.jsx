import { ArrowRight, Award, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BadgeGrid } from "../../features/gamification";

function AchievementsCard() {
  const navigate = useNavigate();

  return (
    <section className="accent-card-achievements rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-xs dark:border-amber-900/40 dark:bg-amber-950/20">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
          <Award className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <p className="text-xs font-bold uppercase tracking-[0.18em]">Achievements</p>
        </div>
        <Star className="h-5 w-5 fill-current text-amber-500" />
      </div>

      <h2 className="mt-3 text-xl font-bold text-slate-900 dark:text-white">Your wins are adding up</h2>

      <div className="mt-4">
        <BadgeGrid compact limit={3} onSelectBadge={() => navigate("/achievements")} />
      </div>

      <button
        type="button"
        onClick={() => navigate("/achievements")}
        aria-label="View all achievements"
        className="mt-5 inline-flex min-h-[44px] items-center gap-2 text-sm font-bold text-amber-900 hover:opacity-80 dark:text-amber-200 cursor-pointer"
      >
        View achievements <ArrowRight className="h-4 w-4" />
      </button>
    </section>
  );
}

export default AchievementsCard;
