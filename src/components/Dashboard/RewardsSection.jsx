import React from "react";
import AchievementsCard from "./AchievementsCard";
import { LevelRoadmap } from "../../features/gamification";

export default function RewardsSection() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      {/* Achievements Card (lg: 6 cols) */}
      <div className="lg:col-span-6 flex flex-col">
        <AchievementsCard />
      </div>

      {/* Level Roadmap (lg: 6 cols) */}
      <div className="lg:col-span-6 flex flex-col rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-[#18211f]">
        <LevelRoadmap />
      </div>
    </div>
  );
}
