import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Zap,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Compass,
  ArrowUp,
  TrendingUp,
  Check,
  LockKeyhole,
  BookOpen,
  GraduationCap,
  Lightbulb,
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
  const refreshProgress = realProgress.refreshAll;

  const level = Number.isFinite(Number(rawLevel)) ? Number(rawLevel) : realProgress.level;
  const totalXp = Number.isFinite(Number(rawTotalXp)) ? Number(rawTotalXp) : realProgress.totalXp;
  const xpInLevel = Number.isFinite(Number(rawXpInLevel)) ? Number(rawXpInLevel) : realProgress.xpInLevel;
  const xpForLevel = Number.isFinite(Number(rawXpForLevel)) ? Number(rawXpForLevel) : realProgress.xpForLevel;
  const xpProgressPercent = xpForLevel > 0
    ? Math.min(100, Math.max(0, (xpInLevel / xpForLevel) * 100))
    : 0;

  const isSkeleton = Boolean(loading || isLoading || realProgress.isLoading);

  // Map state
  const [selectedNode, setSelectedNode] = useState(null);
  const [showScrollFab, setShowScrollFab] = useState(false);
  const [levelUpCelebration, setLevelUpCelebration] = useState(null);
  const [nodeCoords, setNodeCoords] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // DOM Refs
  const containerRef = useRef(null);
  const currentNodeRef = useRef(null);
  const nodeRefs = useRef(new Map());
  const zoneRefs = useRef(new Map());
  const prevLevelRef = useRef(level);

  // Generate nodes in scope
  const nodes = useMemo(() => generateMapNodes(level), [level]);

  // Find next milestone node
  const nextMilestoneLevel = useMemo(() => {
    const nextM = nodes.find((n) => n.isMilestone && n.level > level);
    return nextM ? nextM.level : null;
  }, [nodes, level]);
  const currentZone = nodes.find((node) => node.level === level)?.zone;

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshProgress();
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshProgress]);

  const scrollToZone = (zoneId) => {
    zoneRefs.current.get(zoneId)?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  };

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
        behavior: smooth && !window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "smooth" : "auto",
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
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
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

  // Keep the winding path compact enough to fit narrow screens.
  const getNodeXOffset = (index) => {
    const offsets = [0, 22, 38, 22, 0, -22, -38, -22];
    return offsets[index % offsets.length];
  };

  if (isSkeleton) {
    return (
      <section className="roadmap-shell animate-pulse rounded-2xl border border-amber-200/80 bg-linear-to-br from-amber-50/70 via-white to-orange-50/50 p-6 shadow-surface dark:border-amber-900/40 dark:from-amber-950/20 dark:via-[#14171c] dark:to-orange-950/20">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-amber-200 dark:bg-amber-800/40" />
          <div className="space-y-2 flex-1">
            <div className="h-4 w-32 rounded bg-amber-200 dark:bg-amber-800/40" />
            <div className="h-5 w-48 rounded bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
        <div className="mt-6 h-28 rounded-xl bg-slate-200 dark:bg-slate-800" />
        <div className="roadmap-map-surface mt-6 h-80 rounded-2xl bg-slate-200 dark:bg-slate-800" />
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
    <section className="roadmap-shell relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-surface sm:p-6 dark:border-slate-800 dark:bg-[#14171c]">
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
            <div className="relative mx-auto mb-2 w-fit">
              <Sparkles className="absolute -right-3 top-0 h-5 w-5 text-amber-400" />
              <img src="/logo8-removebg-preview.png" alt="" className="roadmap-mascot-float h-20 w-20 object-contain" />
            </div>
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

      <div className="roadmap-hero relative overflow-hidden rounded-2xl bg-slate-950 p-4 text-white sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-slate-950">
              <Zap className="h-6 w-6 fill-current" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">Your learning roadmap</p>
              <h2 className="mt-0.5 text-lg font-bold text-white">Level {level} <span className="font-medium text-slate-300">· {currentZone?.name || "Your journey"}</span></h2>
            </div>
          </div>
          <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
            <div className="flex min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-white/5 py-1 pl-2 pr-3">
              <img src="/logo8-removebg-preview.png" alt="" className="roadmap-mascot-float h-11 w-11 shrink-0 object-contain sm:h-12 sm:w-12" />
              <p className="max-w-32 text-xs font-medium leading-4 text-emerald-100 sm:max-w-36">Ready to learn something new?</p>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              aria-label={isRefreshing ? "Refreshing roadmap" : "Refresh roadmap"}
              className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-white/15 px-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10 disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{isRefreshing ? "Refreshing" : "Refresh"}</span>
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <div className="mb-2 flex items-center justify-between gap-3 text-xs">
              <span className="font-semibold text-slate-200">Progress to Level {level + 1}</span>
              <span className="shrink-0 text-slate-300">{xpInLevel.toLocaleString()} / {xpForLevel.toLocaleString()} XP</span>
            </div>
            <div
              className="h-2.5 overflow-hidden rounded-full bg-white/15"
              role="progressbar"
              aria-label={`Progress to level ${level + 1}`}
              aria-valuemin={0}
              aria-valuemax={xpForLevel}
              aria-valuenow={Math.min(xpForLevel, Math.max(0, xpInLevel))}
            >
              <div className="roadmap-progress-fill h-full rounded-full bg-amber-400 transition-[width] duration-500" style={{ width: `${xpProgressPercent}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-400">{Math.max(0, xpForLevel - xpInLevel).toLocaleString()} XP to your next level · {totalXp.toLocaleString()} XP earned overall</p>
          </div>
          <button
            type="button"
            onClick={() => scrollToCurrentLevel(true)}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 text-sm font-bold text-slate-950 transition hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <ArrowUp className="h-4 w-4" /> Jump to my level
          </button>
        </div>
      </div>

      {realProgress.smartStats.hasHistory && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
            <TrendingUp className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">This week</p><p className="text-sm font-bold text-slate-900 dark:text-white">+{realProgress.smartStats.weeklyXp} XP</p></div>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
            <Compass className="h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
            <div><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Next level</p><p className="text-sm font-bold text-slate-900 dark:text-white">{realProgress.smartStats.daysToNextLevel ? `~${realProgress.smartStats.daysToNextLevel} days` : `${Math.max(0, xpForLevel - xpInLevel)} XP to go`}</p></div>
          </div>
        </div>
      )}

      {isBrandNewUser && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/30">
          <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">Your journey starts here</p>
          <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-300">Complete a study session, flashcard review, or quiz to earn your first XP.</p>
        </div>
      )}

      <nav className="mt-5" aria-label="Roadmap zones">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Explore zones</p>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {nodesByZone.map(({ zone }) => (
            <button
              key={zone.id}
              type="button"
              onClick={() => scrollToZone(zone.id)}
              aria-current={zone.id === currentZone?.id ? "location" : undefined}
              className={`min-h-10 shrink-0 rounded-full border px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                zone.id === currentZone?.id
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-emerald-400 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-emerald-300"
              }`}
            >
              {zone.name}
            </button>
          ))}
        </div>
      </nav>

      <div
        ref={containerRef}
        className="roadmap-map-surface relative mt-3 min-h-[320px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-950/40"
      >
        <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden" aria-hidden="true">
          <BookOpen className="roadmap-ambient-float absolute right-3 top-24 h-8 w-8 text-emerald-400/20 sm:right-6 sm:h-10 sm:w-10" strokeWidth={1.2} />
          <GraduationCap className="roadmap-ambient-float absolute bottom-28 left-3 h-8 w-8 text-amber-300/15 sm:left-6 sm:h-10 sm:w-10" strokeWidth={1.2} />
          <Lightbulb className="roadmap-ambient-float absolute right-4 bottom-8 h-6 w-6 text-teal-300/15 sm:right-8 sm:h-8 sm:w-8" strokeWidth={1.2} />
        </div>
        <RoadmapPath
          nodeCoordinates={nodeCoords}
          userLevel={level}
          xpProgressPercent={xpProgressPercent}
        />

        <div className="relative z-10 space-y-8">
          {nodesByZone.map(({ zone, nodes: zoneNodes }) => (
            <section
              key={zone.id}
              ref={(el) => {
                if (el) zoneRefs.current.set(zone.id, el);
                else zoneRefs.current.delete(zone.id);
              }}
              aria-labelledby={`roadmap-${zone.id}`}
              className="scroll-mt-24 space-y-5"
            >
              <div
                className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/20 px-4 py-3 text-white shadow-sm ${zone.bannerBgLight} ${zone.bannerBgDark}`}
              >
                <div className="flex items-center gap-2.5">
                  <div>
                    <h3 id={`roadmap-${zone.id}`} className="text-sm font-bold tracking-wide">{zone.name}</h3>
                    <p className="mt-0.5 text-xs opacity-90">{zone.description}</p>
                  </div>
                </div>
                <span className="rounded-full bg-black/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
                  Levels {zone.startLevel}–{zone.endLevel === Infinity ? "20+" : zone.endLevel}
                </span>
              </div>

              <div className="flex flex-col items-center gap-5 py-1">
                {zoneNodes.map((node) => {
                  const xOffset = getNodeXOffset(node.level);
                  const isCurrent = node.level === level;
                  const isNextMilestone = node.level === nextMilestoneLevel;
                  const avatars = realProgress.avatarsByLevel.get(node.level) || [];

                  return (
                    <div
                      key={node.level}
                      style={{ transform: `translateX(${xOffset}px)` }}
                      className="relative transition-transform duration-200"
                    >
                      {isCurrent && (
                        <div
                          ref={currentNodeRef}
                          className="absolute -top-12 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-none"
                        >
                          <div className="relative">
                            <img
                              src="/logo8-removebg-preview.png"
                              alt=""
                              className="roadmap-mascot-float h-9 w-9 object-contain drop-shadow-md"
                            />
                          </div>
                          <span className="mt-0.5 rounded-full bg-slate-950 px-2 py-0.5 text-[9px] font-bold text-white">YOU</span>
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
            </section>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-slate-500" aria-label="Roadmap legend">
        <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600" /> Completed</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full border-2 border-amber-500 bg-amber-300" /> Current level</span>
        <span className="inline-flex items-center gap-1.5"><LockKeyhole className="h-3.5 w-3.5 text-slate-400" /> Upcoming</span>
        <span className="text-slate-400">Select any level to view its reward</span>
      </div>

      {showScrollFab && (
        <div className="fixed bottom-20 right-4 z-40 pb-[env(safe-area-inset-bottom)] md:bottom-6 md:right-6">
          <button
            type="button"
            onClick={() => scrollToCurrentLevel(true)}
            className="flex min-h-11 max-w-[calc(100vw-2rem)] items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 motion-reduce:transition-none"
          >
            <ArrowUp className="h-4 w-4 shrink-0" /> Jump to Level {level}
          </button>
        </div>
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
