import React from "react";
import { ArrowRight, MessageCircle, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "../../app/ProfileContext";
import { getCommunitySpotlight } from "../../lib/collaboration";

const CommunitySpotlight = React.memo(function CommunitySpotlight() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const spotlight = getCommunitySpotlight(profile?.collaboration_interest);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-emerald-600 p-4 text-white shadow-surface hover:shadow-surface-hover transition dark:border-white/5 dark:bg-[#18211f] dark:bg-gradient-to-br dark:from-emerald-500/10 dark:via-transparent dark:to-transparent dark:hover:border-emerald-500/30">
      <div className="absolute -right-5 -top-8 text-white/20 dark:text-emerald-400/20 pointer-events-none">
        <Users size={120} />
      </div>
      <div className="relative">
        <div className="flex items-center gap-1.5">
          <MessageCircle className="h-4 w-4 text-white/90 dark:text-emerald-400" />
          <p className="text-xs font-bold uppercase tracking-wide text-white/90 dark:text-emerald-400">
            Community
          </p>
        </div>
        <h2 className="mt-2 text-base font-bold text-white dark:text-white">{spotlight.title}</h2>
        <p className="mt-1 max-w-sm text-xs text-emerald-100 dark:text-gray-400 leading-relaxed">
          {spotlight.description}
        </p>
        <button
          type="button"
          onClick={() => navigate("/Community")}
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-white dark:text-emerald-400 hover:underline transition"
        >
          Explore community <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
});

export default CommunitySpotlight;