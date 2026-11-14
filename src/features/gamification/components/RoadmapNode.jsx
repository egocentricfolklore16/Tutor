import React, { memo } from "react";
import { Check, LockKeyhole, Gift, ChevronRight, Sparkles } from "lucide-react";

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

  const statusLabel = isDone
    ? "completed"
    : isCurrent
    ? "current level"
    : "locked";

  const ariaLabel = isTeaser
    ? `${teaserText || "Keep climbing to Level 20"}, milestone preview`
    : `Level ${level}${milestoneTitle ? `, ${milestoneTitle}` : ""}, ${statusLabel}`;

  if (isTeaser) {
    return (
      <button
        type="button"
        ref={nodeRef}
        aria-label={ariaLabel}
        onClick={() => onClick(node)}
        onKeyDown={(e) => onKeyDown(e, node)}
        className="group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl p-2 transition-transform duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed border-amber-400/80 bg-linear-to-b from-amber-100 to-amber-200 shadow-md dark:border-amber-500/60 dark:from-amber-950/60 dark:to-amber-900/40">
          <Gift className="h-7 w-7 text-amber-600 dark:text-amber-400" />
        </div>
        {isNextMilestone && (
          <img
            src="/logo4-removebg-preview.png"
            alt=""
            aria-hidden="true"
            className="roadmap-ambient-float absolute -right-5 -top-3 h-9 w-9 object-contain"
          />
        )}
        <div className="mt-1.5 flex items-center gap-1 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-400/20 dark:text-amber-200">
          <span>Level 20 Teaser</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </div>
      </button>
    );
  }

  let nodeStyle = "";
  let iconContent = null;

  if (isDone) {
    nodeStyle =
      "roadmap-node-complete border border-emerald-500/80 bg-emerald-700 text-white shadow-[0_0_18px_rgba(16,185,129,0.22)] hover:bg-emerald-600";
    iconContent = isMilestone ? (
      <Gift className="h-5 w-5" />
    ) : (
      <Check className="h-6 w-6 stroke-[3]" />
    );
  } else if (isCurrent) {
    nodeStyle =
      "border-2 border-amber-500 bg-amber-300 text-amber-950 shadow-sm ring-4 ring-amber-400/20 dark:border-amber-300 dark:bg-amber-400";
    iconContent = (
      <span className="text-xl font-extrabold tracking-tight">{level}</span>
    );
  } else {
    nodeStyle =
      "border border-slate-300/80 bg-white/90 text-slate-500 shadow-sm hover:border-slate-400 hover:bg-slate-100 dark:border-slate-600/80 dark:bg-slate-800/90 dark:text-slate-400 dark:hover:bg-slate-700";
    iconContent = isMilestone ? (
      <LockKeyhole className="h-5 w-5 text-slate-400 dark:text-slate-500" />
    ) : (
      <span className="text-lg font-bold">{level}</span>
    );
  }

  return (
    <button
      type="button"
      ref={nodeRef}
      aria-label={ariaLabel}
      aria-current={isCurrent ? "step" : undefined}
      aria-pressed={isSelected}
      onClick={() => onClick(node)}
      onKeyDown={(e) => onKeyDown(e, node)}
      className={`group relative flex min-h-14 min-w-14 flex-col items-center justify-center rounded-full p-1.5 transition-transform duration-200 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
        isNextMilestone ? "scale-105" : ""
      }`}
    >
      {isNextMilestone && (
        <img
          src="/logo4-removebg-preview.png"
          alt=""
          aria-hidden="true"
          className="roadmap-ambient-float absolute -left-6 -top-3 z-20 h-9 w-9 object-contain"
        />
      )}
      <div
        className={`relative flex h-14 w-14 items-center justify-center rounded-full font-bold transition-all duration-150 select-none sm:h-16 sm:w-16 ${nodeStyle}`}
      >
        {isNextMilestone && (
          <span className="absolute -inset-2 -z-10 rounded-full border border-amber-400/70" aria-hidden="true" />
        )}

        <div className="relative z-10 flex items-center justify-center">
          {iconContent}
        </div>
        {isSelected && (
          <span className="absolute -inset-1.5 rounded-full border-2 border-emerald-500" aria-hidden="true" />
        )}
      </div>

      {(isMilestone || isCurrent) && (
        <div className="mt-2 max-w-[120px] text-center">
          <p
            className={`truncate rounded-full px-2 py-0.5 text-xs font-bold ${
              isCurrent
                ? "bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200"
                : isDone
                ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-200"
                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            {isDone && isMilestone && (
              <img src="/logo8-removebg-preview.png" alt="" aria-hidden="true" className="roadmap-mascot-float inline-block h-4 w-4 align-middle" />
            )}
            {isCurrent ? `Level ${level}` : milestoneTitle || `Level ${level}`}
          </p>
        </div>
      )}

      {isDone && isMilestone && (
        <Sparkles className="absolute -right-1 -top-1 h-4 w-4 text-amber-300 drop-shadow-sm" aria-hidden="true" />
      )}

      {displayedAvatars.length > 0 && (
        <div
          className="absolute -right-2 -top-2 flex items-center -space-x-1.5 rounded-full border border-slate-200 bg-white/90 p-0.5 shadow-sm dark:border-slate-700 dark:bg-slate-900/90"
          aria-hidden="true"
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
    </button>
  );
});

export default RoadmapNode;
