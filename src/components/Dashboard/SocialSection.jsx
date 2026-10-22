import React from "react";
import Leaderboard from "./Leaderboard";
import CommunitySpotlight from "./CommunitySpotlight";

export default function SocialSection() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      {/* Leaderboard Card (lg: 7 cols) */}
      <div className="lg:col-span-7 flex flex-col">
        <Leaderboard />
      </div>

      {/* Community Spotlight (lg: 5 cols) */}
      <div className="lg:col-span-5 flex flex-col rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-[#18211f]">
        <CommunitySpotlight />
      </div>
    </div>
  );
}
