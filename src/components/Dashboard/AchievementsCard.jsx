import React, { useState, useEffect, useCallback } from "react";
import { ArrowRight, Award, Check, Star, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import supabase from "../../lib/supabase";
import AchievementIcon from "../common/AchievementIcon";

function AchievementsCard() {
  const navigate = useNavigate();
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  const fetchAchievements = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setAchievements([]);
        return;
      }

      const { data, error } = await supabase.rpc("get_achievements", {
        p_user: user.id,
      });

      if (error) throw error;
      setAchievements(data || []);
    } catch (err) {
      console.error("Error fetching achievements in AchievementsCard:", err);
      setErrorMsg("Failed to load achievements.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  // Compute 3 displayed badges:
  // Earned ones first (newest unlocked_at first)
  // If fewer than 3 earned, fill remaining with closest-to-complete unearned ones
  const earnedBadges = achievements
    .filter((a) => a.earned)
    .sort((a, b) => new Date(b.unlocked_at || 0) - new Date(a.unlocked_at || 0));

  const unearnedBadges = achievements
    .filter((a) => !a.earned)
    .sort((a, b) => {
      const ratioA = (a.progress || 0) / (a.target || 1);
      const ratioB = (b.progress || 0) / (b.target || 1);
      return ratioB - ratioA;
    });

  const displayBadges = [...earnedBadges, ...unearnedBadges].slice(0, 3);
  const hasEarned = earnedBadges.length > 0;
  const headingText = hasEarned ? "Your wins are adding up" : "Start earning achievements";

  return (
    <section className="accent-card-achievements rounded-lg border p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          <p className="text-xs font-bold uppercase tracking-[0.18em]">Achievements</p>
        </div>
        <Star className="h-5 w-5 fill-current" />
      </div>

      <h2 className="mt-3 text-xl font-bold text-gray-900">{headingText}</h2>

      {loading ? (
        <div className="mt-4 flex h-24 items-center justify-center gap-2 rounded-lg bg-white/40">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-xs font-semibold">Loading badges...</span>
        </div>
      ) : errorMsg ? (
        <div className="mt-4 flex flex-col items-center justify-center rounded-lg bg-white/60 p-3 text-center">
          <p className="text-xs font-bold text-red-900">{errorMsg}</p>
          <button
            type="button"
            onClick={fetchAchievements}
            className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-gray-900 hover:underline"
          >
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
        </div>
      ) : displayBadges.length === 0 ? (
        <div className="mt-4 rounded-lg bg-white/60 p-4 text-center text-xs font-semibold">
          No achievements available yet.
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {displayBadges.map((badge) => {
            const isEarned = badge.earned;
            return (
              <div
                key={badge.id || badge.title}
                className={`flex flex-col items-center justify-between rounded-lg border border-current/20 p-2.5 text-center transition ${
                  isEarned
                    ? "bg-white/80"
                    : "bg-white/40 opacity-70"
                }`}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-current/15">
                  {isEarned ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <AchievementIcon icon={badge.icon} className="h-4 w-4" textClassName="text-xs font-bold" />
                  )}
                </span>
                <p className="mt-1.5 text-[11px] font-semibold leading-3.5 line-clamp-2">
                  {badge.title}
                </p>
                <div className="mt-1 text-[10px] font-bold opacity-80">
                  {isEarned ? (
                    <span className="text-emerald-800 dark:text-emerald-300">Earned</span>
                  ) : (
                    <span>
                      {badge.progress || 0}/{badge.target || 1}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

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
