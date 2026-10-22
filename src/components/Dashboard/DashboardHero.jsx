import React, { useEffect, useState } from "react";
import { ArrowRight, Bot, Flame, Sparkles, RefreshCw, BookOpen, Clock, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "../../app/ProfileContext";
import { useGamification, DailyGoalRing } from "../../features/gamification";
import useSlippingSessions from "../../hooks/useSlippingSessions";
import supabase from "../../lib/supabase";

export default function DashboardHero() {
  const navigate = useNavigate();
  const { profile, isLoading: isProfileLoading } = useProfile();
  const { streak, xp } = useGamification();
  const { currentStreak, loading: streakLoading, error: streakError, refreshStreak } = streak;
  const { slipping, loading: slippingLoading } = useSlippingSessions();

  const [todayMinutes, setTodayMinutes] = useState(0);
  const [stats, setStats] = useState({ sessionsCount: 0, totalPlannedHours: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  const knowledgeGaps = Array.isArray(profile?.knowledge_gaps) ? profile.knowledge_gaps : [];
  const targetMinutes = profile?.daily_goal_minutes || 30;

  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";
  const userName = profile?.full_name?.split(" ")[0] || profile?.username || "Learner";

  useEffect(() => {
    let isMounted = true;
    const fetchHeroData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (isMounted) setLoadingStats(false);
          return;
        }

        const todayStr = new Date().toISOString().slice(0, 10);

        const [trackingRes, studyRes] = await Promise.all([
          supabase
            .from("daily_session_tracking")
            .select("total_duration_seconds")
            .eq("user_id", user.id)
            .eq("activity_date", todayStr)
            .maybeSingle(),
          supabase
            .from("Study")
            .select("Duration, session_status")
            .eq("user_id", user.id),
        ]);

        if (!isMounted) return;

        if (trackingRes.data?.total_duration_seconds) {
          setTodayMinutes(Math.round(trackingRes.data.total_duration_seconds / 60));
        }

        const allSessions = studyRes.data || [];
        const activeOrPlanned = allSessions.filter((s) => s.session_status !== "completed");
        const hoursSum = activeOrPlanned.reduce((acc, s) => acc + (Number.parseFloat(s.Duration) || 0), 0);

        setStats({
          sessionsCount: activeOrPlanned.length,
          totalPlannedHours: hoursSum,
        });
      } catch (err) {
        console.error("Hero data load error:", err);
      } finally {
        if (isMounted) setLoadingStats(false);
      }
    };

    fetchHeroData();
    return () => { isMounted = false; };
  }, []);

  // Smart CTA decision tree based on real user data
  const getSmartCTA = () => {
    if (!slippingLoading && slipping.length > 0) {
      const topSlipping = slipping[0];
      const title = topSlipping.title || topSlipping.Topic || topSlipping.Subject || "Overdue Session";
      return {
        badge: "Needs Attention",
        badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300",
        heading: `Overdue: ${title}`,
        description: "This scheduled session got pushed back. Get back on track now.",
        actionText: "Resume now",
        onClick: () => navigate(`/Study/${encodeURIComponent(topSlipping.id)}`),
        icon: Clock,
      };
    }

    if (knowledgeGaps.length > 0) {
      const topGap = typeof knowledgeGaps[0] === "string" ? knowledgeGaps[0] : knowledgeGaps[0]?.topic || "Concept Review";
      return {
        badge: "Knowledge Gap",
        badgeColor: "bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300",
        heading: `Revisit: ${topGap}`,
        description: `You have ${knowledgeGaps.length} concept${knowledgeGaps.length === 1 ? "" : "s"} marked to strengthen.`,
        actionText: "Review concept",
        onClick: () => navigate("/Study"),
        icon: BookOpen,
      };
    }

    return {
      badge: "Keep Momentum",
      badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300",
      heading: "Ready for your next study session?",
      description: profile?.primary_goal ? `Focus area: ${profile.primary_goal}` : "Start a focused tutoring session with Lumo.",
      actionText: "Start studying",
      onClick: () => navigate("/Study"),
      icon: Bot,
    };
  };

  const smartCTA = getSmartCTA();

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 lg:p-7 dark:border-slate-800/80 dark:bg-[#18211f]">
      {/* Background Subtle Gradient Blobs */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-orange-500/10 blur-3xl dark:bg-orange-500/15" />
      <div className="pointer-events-none absolute -bottom-20 left-10 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl dark:bg-emerald-500/10" />

      {/* Top Banner Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-5 dark:border-slate-800">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-50 shadow-inner dark:from-emerald-950/60 dark:to-teal-950/40">
            <img src="/logo3.png" alt="Lumo Owl Mascot" className="h-9 w-9 object-contain" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Good {timeOfDay}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-extrabold text-orange-700 dark:bg-orange-950/80 dark:text-orange-300">
                <Flame className="h-3.5 w-3.5 text-orange-500" />
                {streakLoading ? "–" : streakError ? "–" : `${currentStreak}d Streak`}
              </span>
            </div>
            <h1 className="mt-0.5 truncate text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              {isProfileLoading ? "Welcome back!" : `${timeOfDay}, ${userName}!`}
            </h1>
          </div>
        </div>

        {/* Quick Ask AI Button */}
        <button
          type="button"
          onClick={() => navigate("/Study")}
          className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-2xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400"
        >
          <Bot className="h-4 w-4" />
          <span>Ask AI Tutor</span>
        </button>
      </div>

      {/* Hero Body Grid: Ring + Smart CTA + Mini Stats */}
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Ring Card */}
        <div className="lg:col-span-4 flex flex-col justify-center rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800/60 dark:bg-slate-900/40">
          <DailyGoalRing currentMinutes={todayMinutes} targetMinutes={targetMinutes} />
        </div>

        {/* Smart Primary CTA Card */}
        <div className="lg:col-span-8 flex flex-col justify-between rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-50/80 via-white to-sky-50/50 p-5 dark:border-emerald-500/30 dark:from-emerald-950/30 dark:via-[#18211f] dark:to-sky-950/20">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${smartCTA.badgeColor}`}>
                <smartCTA.icon className="h-3.5 w-3.5" />
                {smartCTA.badge}
              </span>
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                Primary Action
              </span>
            </div>

            <h2 className="mt-3 text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
              {smartCTA.heading}
            </h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 sm:text-sm">
              {smartCTA.description}
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
              <span>Level {xp.level} Learner ({xp.total} XP)</span>
            </div>

            <button
              type="button"
              onClick={smartCTA.onClick}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400"
            >
              <span>{smartCTA.actionText}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Hero Stats Row */}
      <div className="mt-5 grid grid-cols-3 divide-x divide-slate-100 rounded-2xl border border-slate-100 bg-slate-50/50 dark:divide-slate-800 dark:border-slate-800/80 dark:bg-slate-900/30">
        <div className="p-3 text-center sm:p-4">
          <p className="text-xl font-extrabold text-slate-900 dark:text-white sm:text-2xl">
            {loadingStats ? "–" : stats.sessionsCount}
          </p>
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 sm:text-xs">
            study sessions
          </p>
        </div>

        <div className="p-3 text-center sm:p-4">
          <p className="text-xl font-extrabold text-slate-900 dark:text-white sm:text-2xl">
            {loadingStats ? "–" : `${stats.totalPlannedHours.toFixed(1)}h`}
          </p>
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 sm:text-xs">
            planned study time
          </p>
        </div>

        <div className="p-3 text-center sm:p-4">
          <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400 sm:text-2xl">
            {knowledgeGaps.length}
          </p>
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 sm:text-xs">
            concepts to revisit
          </p>
        </div>
      </div>
    </section>
  );
}
