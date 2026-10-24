import React, { memo } from "react";
import { Check, Lock, Gift, ChevronRight } from "lucide-react";

/**
 * Candy Crush-style chunky button node.
 */
export const RoadmapNode = memo(function RoadmapNode({
  node,
  userLevel,
  isSelected,
  isNextMilestone,
  avatars = [],
  onClick,
  onKeyDown,
  nodeRef,
}) {
  const { level, isMilestone, milestoneTitle, isTeaser, teaserText } = node;

  const isDone = level < userLevel;
  const isCurrent = level === userLevel;

  // Social avatars calculation (max 3 displayed + badge)
  const displayedAvatars = avatars.slice(0, 3);
  const extraAvatarsCount = Math.max(0, avatars.length - 3);

  // Status text for screen readers
  const statusLabel = isDone
    ? "completed"
    : isCurrent
    ? "current level"
    : "locked";

  const ariaLabel = isTeaser
    ? `${teaserText || "Keep climbing to Level 20"}`
    : `Level ${level}${milestoneTitle ? `, ${milestoneTitle}` : ""}, ${statusLabel}`;

  if (isTeaser) {
    return (
      <div
        ref={nodeRef}
        tabIndex={0}
        role="button"
        aria-label={ariaLabel}
        onClick={() => onClick(node)}
        onKeyDown={(e) => onKeyDown(e, node)}
        className="group relative flex flex-col items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded-2xl p-2 transition-transform duration-200 hover:scale-105"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed border-amber-400/80 bg-linear-to-b from-amber-100 to-amber-200 shadow-md dark:border-amber-500/60 dark:from-amber-950/60 dark:to-amber-900/40">
          <Gift className="h-7 w-7 text-amber-600 dark:text-amber-400 animate-pulse" />
        </div>
        <div className="mt-1.5 flex items-center gap-1 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-400/20 dark:text-amber-200">
          <span>Level 20 Teaser</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </div>
      </div>
    );
  }

  // Node styling states
  let nodeStyle = "";
  let iconContent = null;

  if (isDone) {
    // Completed state
    nodeStyle =
      "bg-linear-to-b from-emerald-400 via-emerald-500 to-emerald-600 text-white shadow-[0_6px_0_0_#047857] hover:shadow-[0_4px_0_0_#047857] hover:translate-y-[2px] active:translate-y-[6px] active:shadow-none border-t border-emerald-300/60";
    iconContent = isMilestone ? (
      <Gift className="h-5 w-5 text-emerald-100" />
    ) : (
      <Check className="h-6 w-6 stroke-[3]" />
    );
  } else if (isCurrent) {
    // Active current level node
    nodeStyle =
      "bg-linear-to-b from-amber-300 via-amber-400 to-amber-500 text-amber-950 shadow-[0_8px_0_0_#b45309] hover:shadow-[0_6px_0_0_#b45309] hover:translate-y-[2px] active:translate-y-[8px] active:shadow-none border-t-2 border-amber-100 ring-4 ring-amber-400/50 dark:ring-amber-300/40 animate-pulse-gentle";
    iconContent = (
      <span className="text-xl font-black tracking-tight">{level}</span>
    );
  } else {
    // Locked node
    nodeStyle =
      "bg-linear-to-b from-slate-200 via-slate-300 to-slate-400 dark:from-slate-700 dark:via-slate-800 dark:to-slate-900 text-slate-500 dark:text-slate-400 shadow-[0_6px_0_0_#64748b] dark:shadow-[0_6px_0_0_#1e293b] hover:shadow-[0_4px_0_0_#64748b] dark:hover:shadow-[0_4px_0_0_#1e293b] hover:translate-y-[2px] active:translate-y-[6px] active:shadow-none border-t border-slate-100/50 dark:border-slate-600/50";
    iconContent = isMilestone ? (
      <Lock className="h-5 w-5 text-slate-400 dark:text-slate-500" />
    ) : (
      <span className="text-lg font-bold">{level}</span>
    );
  }

  return (
    <div
      ref={nodeRef}
      tabIndex={0}
      role="button"
      aria-label={ariaLabel}
      onClick={() => onClick(node)}
      onKeyDown={(e) => onKeyDown(e, node)}
      className={`group relative flex flex-col items-center justify-center min-w-[56px] min-h-[56px] p-1.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded-full transition-all duration-200 ${
        isNextMilestone ? "animate-bounce-gentle" : ""
      }`}
    >
      {/* Node Button Base */}
      <div
        className={`relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full font-bold transition-all duration-150 select-none ${nodeStyle}`}
      >
        {/* Candy Gloss Highlight Refraction */}
        <div className="absolute top-1 left-2.5 right-2.5 h-3.5 rounded-full bg-white/35 blur-[0.5px] pointer-events-none" />

        {/* Next milestone glowing aura */}
        {isNextMilestone && (
          <div className="absolute -inset-2 -z-10 rounded-full bg-amber-400/40 blur-md dark:bg-amber-500/30 animate-pulse" />
        )}

        {/* Icon / Level Number */}
        <div className="relative z-10 flex items-center justify-center">
          {iconContent}
        </div>

        {/* Selected Ring Highlight */}
        {isSelected && (
          <div className="absolute -inset-2 rounded-full border-2 border-amber-400 dark:border-amber-300 animate-ping pointer-events-none" />
        )}
      </div>

      {/* Label under Milestone nodes or current node */}
      {(isMilestone || isCurrent) && (
        <div className="mt-2 max-w-[120px] text-center">
          <p
            className={`text-xs font-black truncate px-2 py-0.5 rounded-full shadow-xs ${
              isCurrent
                ? "bg-amber-500 text-white dark:bg-amber-600"
                : isDone
                ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-200"
                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            {isCurrent
              ? `Level ${level}`
              : milestoneTitle || `Level ${level}`}
          </p>
        </div>
      )}

      {/* Social Avatars Overlay (Max 3 + Badge) */}
      {displayedAvatars.length > 0 && (
        <div
          className="absolute -top-2 -right-2 flex items-center -space-x-1.5 bg-white/90 dark:bg-slate-900/90 p-0.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-md"
          title={`${avatars.length} friend${avatars.length > 1 ? "s" : ""} at this level`}
        >
          {displayedAvatars.map((av) => (
            <div
              key={av.id}
              className="h-5 w-5 rounded-full overflow-hidden border border-white dark:border-slate-800 bg-amber-200 dark:bg-amber-800 flex items-center justify-center text-[9px] font-bold text-amber-900 dark:text-amber-100"
            >
              {av.avatarUrl ? (
                <img
                  src={av.avatarUrl}
                  alt={av.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                av.name.charAt(0).toUpperCase()
              )}
            </div>
          ))}
          {extraAvatarsCount > 0 && (
            <div className="h-5 w-5 rounded-full bg-slate-200 dark:bg-slate-700 text-[9px] font-extrabold text-slate-700 dark:text-slate-200 flex items-center justify-center border border-white dark:border-slate-800">
              +{extraAvatarsCount}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default RoadmapNode;
