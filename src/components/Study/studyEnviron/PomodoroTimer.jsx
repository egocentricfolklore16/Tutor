import React from "react";
import { ProgressRing } from "../../common/UIKit";

const PomodoroTimer = ({ timeLeft, isRunning, totalSeconds = 1500 }) => {
  const currentTotalSeconds =
    timeLeft.hours * 3600 + timeLeft.minutes * 60 + timeLeft.seconds;
  const progressPercent = Math.min(
    100,
    Math.max(0, ((totalSeconds - currentTotalSeconds) / totalSeconds) * 100)
  );

  const formattedHours = timeLeft.hours.toString().padStart(2, "0");
  const formattedMinutes = timeLeft.minutes.toString().padStart(2, "0");
  const formattedSeconds = timeLeft.seconds.toString().padStart(2, "0");

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-[#120F24] rounded-2xl border border-slate-200/80 dark:border-violet-900/30 shadow-sm mb-6">
      <ProgressRing
        size={180}
        strokeWidth={10}
        progress={progressPercent}
        variant="violet"
        className="my-2"
      >
        <div className="flex flex-col items-center justify-center">
          <div className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {timeLeft.hours > 0 ? `${formattedHours}:` : ""}
            {formattedMinutes}:{formattedSeconds}
          </div>
          <span className="text-xs font-semibold text-slate-500 dark:text-violet-300/70 mt-1 uppercase tracking-wider">
            {isRunning ? "Focus Session" : "Paused"}
          </span>
        </div>
      </ProgressRing>
    </div>
  );
};

export default PomodoroTimer;
