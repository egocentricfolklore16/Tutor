import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Award,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Zap,
  Sparkles,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react";
import supabase from "../../lib/supabase";
import PageContainer from "../common/PageContainer";

export default function AchievementsPage() {
  const navigate = useNavigate();

  const [_currentUserId, setCurrentUserId] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedBadge, setSelectedBadge] = useState(null);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  const loadAchievements = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Unauthenticated");

      // Trigger sync first
      try {
        await supabase.rpc("sync_my_achievements");
      } catch (_e) {
        // sync error ignore
      }

      // Fetch achievements
      const { data, error } = await supabase.rpc("get_achievements", {
        p_user_id: user.id,
      });

      if (error) throw error;
      setAchievements(data || []);
    } catch (err) {
      console.error("Error loading achievements:", err);
      setErrorMsg(err.message || "Failed to load achievement badges.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAchievements();
  }, [loadAchievements]);

  const earnedCount = achievements.filter((a) => a.earned).length;

  const categories = [
    { id: "all", label: "All Badges" },
    { id: "study", label: "Study" },
    { id: "streak", label: "Streak" },
    { id: "level", label: "Level" },
    { id: "social", label: "Social" },
    { id: "help", label: "Help Forum" },
    { id: "rooms", label: "Virtual Rooms" },
    { id: "tutoring", label: "Tutoring" },
  ];

  const filteredBadges = achievements.filter((b) => {
    if (activeCategory === "all") return true;
    return b.category?.toLowerCase() === activeCategory.toLowerCase();
  });

  return (
    <PageContainer maxWidth="max-w-5xl">
      {/* Top Navigation */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1.5 rounded-2xl bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#14171c] sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-2xl bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900 dark:bg-amber-950 dark:text-amber-300 mb-2">
              <Award className="h-4 w-4 text-amber-600" /> Achievement Badges
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
              Learning Milestones
            </h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Unlock badges as you study, maintain streaks, and help fellow community learners!
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/30 shrink-0">
            <Sparkles className="h-8 w-8 text-amber-500" />
            <div>
              <span className="text-2xl font-black text-amber-900 dark:text-amber-200 block">
                {earnedCount} of {achievements.length || 24}
              </span>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                Badges Earned
              </span>
            </div>
          </div>
        </div>

        {/* Category Tabs Bar */}
        <div className="mt-6 flex w-full gap-1 overflow-x-auto no-scrollbar rounded-2xl bg-slate-100 p-1 dark:bg-[#18211f]">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition shrink-0 ${
                activeCategory === cat.id
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Badges Grid */}
      {loading ? (
        <div className="mt-6 flex min-h-[300px] flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-[#14171c]">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="mt-3 text-xs text-slate-500">Loading achievements...</p>
        </div>
      ) : errorMsg ? (
        <div className="mt-6 flex min-h-[300px] flex-col items-center justify-center rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center dark:border-rose-900/40 dark:bg-rose-950/20">
          <AlertCircle className="h-8 w-8 text-rose-600" />
          <p className="mt-2 text-xs font-bold text-rose-800 dark:text-rose-200">{errorMsg}</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {filteredBadges.map((badge) => {
            const isEarned = badge.earned;
            const progress = badge.progress || 0;
            const target = badge.target || 1;
            const progressPct = Math.min(100, Math.round((progress / target) * 100));

            return (
              <div
                key={badge.id}
                onClick={() => setSelectedBadge(badge)}
                className={`relative flex flex-col justify-between rounded-3xl border p-4 cursor-pointer transition transform hover:scale-102 ${
                  isEarned
                    ? "border-amber-300 bg-gradient-to-b from-amber-50 to-white shadow-sm dark:border-amber-500/40 dark:from-amber-950/20 dark:to-[#14171c]"
                    : "border-slate-200 bg-slate-50/50 opacity-60 grayscale dark:border-slate-800 dark:bg-[#14171c]"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <span className="text-3xl">{badge.icon || "🏆"}</span>
                    {isEarned ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Lock className="h-4 w-4 text-slate-400" />
                    )}
                  </div>

                  <h3 className="mt-2 text-sm font-black text-slate-900 dark:text-white line-clamp-1">
                    {badge.title}
                  </h3>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                    {badge.description}
                  </p>
                </div>

                <div className="mt-4 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                  {isEarned ? (
                    <div className="flex items-center justify-between text-[10px] font-bold text-amber-600 dark:text-amber-400">
                      <span>Unlocked</span>
                      <span>+{badge.xp_reward || 0} XP</span>
                    </div>
                  ) : (
                    <div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                        <span>Progress</span>
                        <span>
                          {progress} / {target}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Badge Detail Modal */}
      {selectedBadge && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs"
          onClick={() => setSelectedBadge(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#14171c] text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-6xl">{selectedBadge.icon || "🏆"}</span>

            <h3 className="mt-3 text-lg font-black text-slate-900 dark:text-white">
              {selectedBadge.title}
            </h3>

            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              {selectedBadge.description}
            </p>

            <div className="mt-4 rounded-2xl bg-amber-50 p-3 dark:bg-amber-950/30 text-xs font-bold text-amber-900 dark:text-amber-200">
              {selectedBadge.earned ? (
                <span>Unlocked on {new Date(selectedBadge.unlocked_at || Date.now()).toLocaleDateString()} · +{selectedBadge.xp_reward || 0} XP Rewarded</span>
              ) : (
                <span>Requires {selectedBadge.progress || 0} / {selectedBadge.target || 1} to unlock (+{selectedBadge.xp_reward || 0} XP reward)</span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedBadge(null)}
              className="mt-5 w-full rounded-2xl bg-slate-900 py-2.5 text-xs font-bold text-white dark:bg-slate-800"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
