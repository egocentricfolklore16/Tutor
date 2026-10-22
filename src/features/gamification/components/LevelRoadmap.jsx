import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Zap,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Compass,
  ArrowUp,
  TrendingUp,
} from "lucide-react";
import { generateMapNodes, MAP_ZONES } from "../utils/levelMilestones.js";
import { RoadmapNode } from "./RoadmapNode.jsx";
import { RoadmapPath } from "./RoadmapPath.jsx";
import { NodeDetailSheet } from "./NodeDetailSheet.jsx";
import { useLevelProgress } from "../hooks/useLevelProgress.js";
import Modal from "../../../components/common/ResponsiveSheet";

/**
 * Rebuilt LevelRoadmap v2: Candy Crush-style level map powered ONLY by real Supabase data.
 */
export function LevelRoadmap({
  level: rawLevel,
  totalXp: rawTotalXp,
  xpInLevel: rawXpInLevel,
  xpForLevel: rawXpForLevel,
  loading = false,
  isLoading = false,
  error = null,
  onRetry,
}) {
  // Use real Supabase hook or fall back to props if explicitly passed
  const realProgress = useLevelProgress();

  const level = Number.isFinite(Number(rawLevel)) ? Number(rawLevel) : realProgress.level;
  const totalXp = Number.isFinite(Number(rawTotalXp)) ? Number(rawTotalXp) : realProgress.totalXp;
  const xpInLevel = Number.isFinite(Number(rawXpInLevel)) ? Number(rawXpInLevel) : realProgress.xpInLevel;
  const xpForLevel = Number.isFinite(Number(rawXpForLevel)) ? Number(rawXpForLevel) : realProgress.xpForLevel;
  const xpProgressPercent = realProgress.xpProgressPercent;

  const isSkeleton = Boolean(loading || isLoading || realProgress.isLoading);

  // Map state
  const [selectedNode, setSelectedNode] = useState(null);
  const [showScrollFab, setShowScrollFab] = useState(false);
  const [levelUpCelebration, setLevelUpCelebration] = useState(null);
  const [nodeCoords, setNodeCoords] = useState([]);

  // DOM Refs
  const containerRef = useRef(null);
  const currentNodeRef = useRef(null);
  const nodeRefs = useRef(new Map());
  const prevLevelRef = useRef(level);

  // Generate nodes in scope
  const nodes = useMemo(() => generateMapNodes(level), [level]);

  // Find next milestone node
  const nextMilestoneLevel = useMemo(() => {
    const nextM = nodes.find((n) => n.isMilestone && n.level > level);
    return nextM ? nextM.level : null;
  }, [nodes, level]);

  // Measure nodes with ResizeObserver in real pixel coordinates
  const measureNodes = useCallback(() => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();

    const coords = [];
    nodes.forEach((node) => {
      const el = nodeRefs.current.get(node.level);
      if (el) {
        const rect = el.getBoundingClientRect();
        const x = rect.left + rect.width / 2 - containerRect.left;
        const y = rect.top + rect.height / 2 - containerRect.top;
        coords.push({ level: node.level, x, y });
      }
    });
    setNodeCoords(coords);
  }, [nodes]);

  useEffect(() => {
    measureNodes();
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      measureNodes();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [measureNodes]);

  // Auto-scroll anchor to current level node
  const scrollToCurrentLevel = useCallback((smooth = true) => {
    if (currentNodeRef.current) {
      currentNodeRef.current.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "center",
      });
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToCurrentLevel(false);
    }, 150);
    return () => clearTimeout(timer);
  }, [level, scrollToCurrentLevel]);

  // Scroll listener for "Jump to my level" floating action button
  useEffect(() => {
    const handleScroll = () => {
      if (!currentNodeRef.current || !containerRef.current) return;
      const rect = currentNodeRef.current.getBoundingClientRect();
      const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
      setShowScrollFab(!isVisible);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Level-up celebration animation detection
  useEffect(() => {
    if (prevLevelRef.current && level > prevLevelRef.current) {
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const newMilestone = nodes.find((n) => n.level === level && n.isMilestone);

      if (!prefersReducedMotion) {
        setLevelUpCelebration({
          oldLevel: prevLevelRef.current,
          newLevel: level,
          milestone: newMilestone,
        });

        setTimeout(() => {
          setLevelUpCelebration(null);
        }, 3500);
      }

      if (newMilestone) {
        setSelectedNode(newMilestone);
      }
    }
    prevLevelRef.current = level;
  }, [level, nodes]);

  // Keyboard navigation across nodes
  const handleNodeKeyDown = useCallback(
    (e, node) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setSelectedNode(node);
      } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        const next = nodes.find((n) => n.level === node.level + 1);
        if (next) {
          const el = nodeRefs.current.get(next.level);
          el?.focus();
        }
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        const prev = nodes.find((n) => n.level === node.level - 1);
        if (prev) {
          const el = nodeRefs.current.get(prev.level);
          el?.focus();
        }
      }
    },
    [nodes]
  );

  // Group rendered nodes by zone
  const nodesByZone = useMemo(() => {
    const zonesMap = new Map();
    MAP_ZONES.forEach((z) => zonesMap.set(z.id, { zone: z, nodes: [] }));

    nodes.forEach((node) => {
      const zoneObj = zonesMap.get(node.zone.id);
      if (zoneObj) {
        zoneObj.nodes.push(node);
      } else {
        const lastZone = MAP_ZONES[MAP_ZONES.length - 1];
        zonesMap.get(lastZone.id)?.nodes.push(node);
      }
    });

    return Array.from(zonesMap.values()).filter((z) => z.nodes.length > 0);
  }, [nodes]);

  // S-Curve sine offset calculator for Candy Crush path layout
  const getNodeXOffset = (index) => {
    const offsets = [0, 60, 100, 60, 0, -60, -100, -60];
    return offsets[index % offsets.length];
  };

  if (isSkeleton) {
    return (
      <section className="animate-pulse rounded-2xl border border-amber-200/80 bg-linear-to-br from-amber-50/70 via-white to-orange-50/50 p-6 shadow-surface dark:border-amber-900/40 dark:from-amber-950/20 dark:via-[#14171c] dark:to-orange-950/20">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-amber-200 dark:bg-amber-800/40" />
          <div className="space-y-2 flex-1">
            <div className="h-4 w-32 rounded bg-amber-200 dark:bg-amber-800/40" />
            <div className="h-5 w-48 rounded bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
        <div className="mt-6 h-28 rounded-xl bg-slate-200 dark:bg-slate-800" />
        <div className="mt-6 h-80 rounded-2xl bg-slate-200 dark:bg-slate-800" />
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50/80 p-5 shadow-surface dark:border-red-900/40 dark:bg-red-950/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-6 w-6 shrink-0 text-red-600 dark:text-red-400" />
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-red-900 dark:text-red-200">
              Unable to load Level Roadmap
            </h3>
            <p className="mt-1 text-xs text-red-700 dark:text-red-300">
              {typeof error === "string" ? error : error?.message || "A network error occurred while fetching your level progress."}
            </p>
            <button
              type="button"
              onClick={onRetry || realProgress.refreshAll}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </button>
          </div>
        </div>
      </section>
    );
  }

  const isBrandNewUser = level === 1 && totalXp === 0;

  return (
    <section className="relative rounded-3xl border border-amber-200/80 bg-linear-to-b from-amber-50/50 via-white to-orange-50/30 p-4 sm:p-6 shadow-xl dark:border-amber-900/30 dark:from-[#18211f] dark:via-[#14171c] dark:to-[#0f1216] transition-all">
      {/* Confetti / Level Up Modal Banner */}
      <Modal
        isOpen={Boolean(levelUpCelebration)}
        onClose={() => setLevelUpCelebration(null)}
        title=""
        maxWidth="max-w-sm"
        closeOnOverlayClick={true}
      >
        {levelUpCelebration && (
          <div className="text-center">
            <Sparkles className="mx-auto h-12 w-12 text-amber-500 animate-spin" />
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white">LEVEL UP!</h2>
            <p className="mt-1 text-lg font-bold text-amber-600 dark:text-amber-400">
              You reached Level {levelUpCelebration.newLevel}!
            </p>
            {levelUpCelebration.milestone && (
              <div className="mt-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 p-3">
                <p className="text-xs font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-200">New Perk Unlocked</p>
                <p className="text-base font-black text-slate-900 dark:text-white">{levelUpCelebration.milestone.title}</p>
              </div>
            )}
            <button
              type="button"
              onClick={() => setLevelUpCelebration(null)}
              className="mt-6 w-full rounded-2xl bg-amber-500 py-3 text-sm font-black text-white shadow-lg hover:bg-amber-600 transition"
            >
              Awesome!
            </button>
          </div>
        )}
      </Modal>

      {/* Header & Smart Stats Strip */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-amber-400 to-orange-500 text-white shadow-md">
              <Zap className="h-7 w-7 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Level {level}
                </span>
                <span className="rounded-full bg-amber-100 dark:bg-amber-950/60 px-2.5 py-0.5 text-xs font-extrabold text-amber-800 dark:text-amber-200">
                  {totalXp.toLocaleString()} Total XP
                </span>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Level Map Roadmap
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={realProgress.refreshAll}
            title="Refresh map"
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* Smart Stats Strip (Shown when activity exists) */}
        {realProgress.smartStats.hasHistory && (
          <div className="grid grid-cols-2 gap-3 rounded-2xl bg-amber-500/10 dark:bg-amber-500/5 p-3 border border-amber-200/60 dark:border-amber-900/30">
            <div className="flex items-center gap-2.5">
              <TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Recent Pace</p>
                <p className="text-xs font-black text-slate-900 dark:text-white">
                  +{realProgress.smartStats.weeklyXp} XP this week
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Compass className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Next Level Target</p>
                <p className="text-xs font-black text-slate-900 dark:text-white">
                  {realProgress.smartStats.daysToNextLevel
                    ? `~${realProgress.smartStats.daysToNextLevel} day${realProgress.smartStats.daysToNextLevel > 1 ? "s" : ""} to Level ${level + 1}`
                    : `${xpForLevel - xpInLevel} XP remaining`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Brand New User Hint */}
        {isBrandNewUser && (
          <div className="rounded-2xl bg-linear-to-r from-emerald-500 to-teal-600 p-4 text-white shadow-md">
            <p className="text-sm font-black">Welcome to Hyper Tutor!</p>
            <p className="mt-0.5 text-xs text-emerald-100">
              Earn your first XP by completing study sessions, flashcard reviews, or quizzes to start climbing!
            </p>
          </div>
        )}
      </div>

      {/* Main Candy Map Container */}
      <div
        ref={containerRef}
        className="relative mt-6 min-h-[600px] w-full rounded-2xl bg-slate-100/60 dark:bg-[#14171c]/60 p-4 sm:p-8 overflow-hidden select-none border border-slate-200/60 dark:border-slate-800/60"
      >
        {/* Dynamic Canvas SVG Roadmap Curves */}
        <RoadmapPath
          nodeCoordinates={nodeCoords}
          userLevel={level}
          xpProgressPercent={xpProgressPercent}
        />

        {/* Rendered Zones and Nodes */}
        <div className="relative z-10 space-y-12">
          {nodesByZone.map(({ zone, nodes: zoneNodes }) => (
            <div key={zone.id} className="space-y-8">
              {/* Zone Banner Header */}
              <div
                className={`flex flex-col sm:flex-row items-center justify-between gap-2 rounded-2xl p-3.5 shadow-md border border-white/20 ${zone.bannerBgLight} ${zone.bannerBgDark}`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 backdrop-blur-xs font-black">
                    {zone.startLevel}
                  </span>
                  <div>
                    <h3 className="text-sm font-black tracking-wide">{zone.name}</h3>
                    <p className="text-[11px] opacity-90 line-clamp-1">{zone.description}</p>
                  </div>
                </div>
                <span className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-black uppercase tracking-wider backdrop-blur-xs">
                  Levels {zone.startLevel} - {zone.endLevel === Infinity ? "20+" : zone.endLevel}
                </span>
              </div>

              {/* Nodes Stack */}
              <div className="flex flex-col items-center gap-8 py-2">
                {zoneNodes.map((node) => {
                  const xOffset = getNodeXOffset(node.level);
                  const isCurrent = node.level === level;
                  const isNextMilestone = node.level === nextMilestoneLevel;
                  const avatars = realProgress.avatarsByLevel.get(node.level) || [];

                  return (
                    <div
                      key={node.level}
                      style={{ transform: `translateX(${xOffset}px)` }}
                      className="relative transition-transform duration-300"
                    >
                      {/* Player Owl Mascot on Current Level Node */}
                      {isCurrent && (
                        <div
                          ref={currentNodeRef}
                          className="absolute -top-12 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-none animate-bounce-gentle"
                        >
                          <div className="relative">
                            <img
                              src="/logo3.png"
                              alt="Your Owl Mascot"
                              className="h-11 w-11 object-contain drop-shadow-md"
                            />
                            {/* XP Progress ring */}
                            <div className="absolute -inset-1 rounded-full border-2 border-amber-400 animate-ping opacity-75" />
                          </div>
                          <div className="mt-0.5 rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-black text-white shadow-xs dark:bg-amber-600">
                            You
                          </div>
                        </div>
                      )}

                      <RoadmapNode
                        node={node}
                        userLevel={level}
                        isSelected={selectedNode?.level === node.level}
                        isNextMilestone={isNextMilestone}
                        avatars={avatars}
                        onClick={(n) => setSelectedNode(n)}
                        onKeyDown={handleNodeKeyDown}
                        nodeRef={(el) => {
                          if (el) {
                            nodeRefs.current.set(node.level, el);
                          } else {
                            nodeRefs.current.delete(node.level);
                          }
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Jump to My Level Button */}
      {showScrollFab && (
        <button
          type="button"
          onClick={() => scrollToCurrentLevel(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2.5 text-xs font-black text-white shadow-2xl hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 transition animate-bounce-gentle"
        >
          <ArrowUp className="h-4 w-4" /> Jump to Level {level}
        </button>
      )}

      {/* Node Details Bottom Sheet / Popover Modal */}
      {selectedNode && (
        <NodeDetailSheet
          node={selectedNode}
          userLevel={level}
          xpInLevel={xpInLevel}
          xpForLevel={xpForLevel}
          totalXp={totalXp}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </section>
  );
}

export default LevelRoadmap;
