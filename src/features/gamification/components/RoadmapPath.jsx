import React, { memo, useMemo } from "react";

/**
 * Dynamic SVG curve drawing using exact measured container pixel coordinates.
 * Renders:
 * 1. Dashed base path for all levels
 * 2. Solid gold path for completed (travelled) levels
 * 3. Partially filled animated path for the current level's XP progress segment
 */
export const RoadmapPath = memo(function RoadmapPath({
  nodeCoordinates = [],
  userLevel = 1,
  xpProgressPercent = 0,
}) {
  const pathData = useMemo(() => {
    if (!nodeCoordinates || nodeCoordinates.length < 2) return "";

    let d = `M ${nodeCoordinates[0].x} ${nodeCoordinates[0].y}`;
    for (let i = 0; i < nodeCoordinates.length - 1; i++) {
      const p1 = nodeCoordinates[i];
      const p2 = nodeCoordinates[i + 1];

      // Smooth S-curve control points in real pixel coordinates
      const cy1 = p1.y + (p2.y - p1.y) * 0.5;
      const cy2 = p1.y + (p2.y - p1.y) * 0.5;

      d += ` C ${p1.x} ${cy1}, ${p2.x} ${cy2}, ${p2.x} ${p2.y}`;
    }
    return d;
  }, [nodeCoordinates]);

  // Travelled path coordinates up to current level
  const travelledPathData = useMemo(() => {
    if (!nodeCoordinates || nodeCoordinates.length < 2) return "";

    const userIndex = nodeCoordinates.findIndex((n) => n.level === userLevel);
    const endIndex = userIndex >= 0 ? userIndex : nodeCoordinates.length - 1;

    const completedCoords = nodeCoordinates.slice(0, endIndex + 1);
    if (completedCoords.length < 2) return "";

    let d = `M ${completedCoords[0].x} ${completedCoords[0].y}`;
    for (let i = 0; i < completedCoords.length - 1; i++) {
      const p1 = completedCoords[i];
      const p2 = completedCoords[i + 1];

      const cy1 = p1.y + (p2.y - p1.y) * 0.5;
      const cy2 = p1.y + (p2.y - p1.y) * 0.5;

      d += ` C ${p1.x} ${cy1}, ${p2.x} ${cy2}, ${p2.x} ${p2.y}`;
    }
    return d;
  }, [nodeCoordinates, userLevel]);

  // Active progress segment path between current level and next level
  const activeSegmentData = useMemo(() => {
    if (!nodeCoordinates || nodeCoordinates.length < 2) return "";

    const currentIndex = nodeCoordinates.findIndex((n) => n.level === userLevel);
    if (currentIndex < 0 || currentIndex >= nodeCoordinates.length - 1) return "";

    const p1 = nodeCoordinates[currentIndex];
    const p2 = nodeCoordinates[currentIndex + 1];

    const cy1 = p1.y + (p2.y - p1.y) * 0.5;
    const cy2 = p1.y + (p2.y - p1.y) * 0.5;

    return `M ${p1.x} ${p1.y} C ${p1.x} ${cy1}, ${p2.x} ${cy2}, ${p2.x} ${p2.y}`;
  }, [nodeCoordinates, userLevel]);

  if (!pathData) return null;

  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
      <defs>
        {/* Solid Gold Travelled Path Gradient */}
        <linearGradient id="goldPathGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="50%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>

        {/* Active Segment Gradient */}
        <linearGradient id="activeSegmentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>

        {/* Drop shadow for 3D depth */}
        <filter id="pathShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="3" stdDeviation="2" floodOpacity="0.2" />
        </filter>
      </defs>

      {/* 1. Base Dotted/Dashed Path for remaining/all levels */}
      <path
        d={pathData}
        fill="none"
        stroke="currentColor"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray="6 10"
        className="text-slate-300 dark:text-slate-700/80 transition-all duration-300"
      />

      {/* 2. Solid Gold Completed Travelled Path */}
      {travelledPathData && (
        <path
          d={travelledPathData}
          fill="none"
          stroke="url(#goldPathGrad)"
          strokeWidth="10"
          strokeLinecap="round"
          filter="url(#pathShadow)"
          className="transition-all duration-500"
        />
      )}

      {/* 3. Active XP Progress Segment */}
      {activeSegmentData && (
        <path
          d={activeSegmentData}
          fill="none"
          stroke="url(#activeSegmentGrad)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray="100"
          strokeDashoffset={100 - Math.min(100, Math.max(0, xpProgressPercent))}
          className="transition-all duration-700 ease-out"
        />
      )}
    </svg>
  );
});

export default RoadmapPath;
