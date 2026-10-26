import React from "react";
import { ArrowRight, Award, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BadgeGrid from "../../features/gamification/components/BadgeGrid";

function AchievementsCard() {
  const navigate = useNavigate();

  return (
    <section className="accent-card-achievements rounded-lg border p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          <p className="text-xs font-bold uppercase tracking-[0.18em]">Achievements</p>
        </div>
        <Star className="h-5 w-5 fill-current" />
      </div>

      <h2 className="mt-3 text-xl font-bold text-gray-900">Your wins are adding up</h2>

      <div className="mt-4">
        <BadgeGrid compact limit={3} onBadgeClick={() => navigate("/achievements")} />
      </div>

      <button
        type="button"
        onClick={() => navigate("/achievements")}
        className="mt-5 inline-flex items-center gap-2 text-sm font-bold hover:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current rounded-md"
      >
        View achievements <ArrowRight className="h-4 w-4" />
      </button>
    </section>
  );
}

export default AchievementsCard;
