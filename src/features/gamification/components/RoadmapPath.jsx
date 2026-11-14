import React, { memo, useMemo } from "react";

function buildPath(coordinates) {
  if (coordinates.length < 2) return "";

  return coordinates.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;

    const previous = coordinates[index - 1];
    const middleY = previous.y + (point.y - previous.y) / 2;
    return `${path} C ${previous.x} ${middleY}, ${point.x} ${middleY}, ${point.x} ${point.y}`;
  }, "");
}

export const RoadmapPath = memo(function RoadmapPath({
  nodeCoordinates = [],
  userLevel = 1,
  xpProgressPercent = 0,
}) {
  const pathData = useMemo(() => buildPath(nodeCoordinates), [nodeCoordinates]);

  const travelledPathData = useMemo(() => {
    const userIndex = nodeCoordinates.findIndex((node) => node.level === userLevel);
    const endIndex = userIndex >= 0 ? userIndex : nodeCoordinates.length - 1;
    return buildPath(nodeCoordinates.slice(0, endIndex + 1));
  }, [nodeCoordinates, userLevel]);

  const activeSegmentData = useMemo(() => {
    const currentIndex = nodeCoordinates.findIndex((node) => node.level === userLevel);
    if (currentIndex < 0 || currentIndex >= nodeCoordinates.length - 1) return "";
    return buildPath(nodeCoordinates.slice(currentIndex, currentIndex + 2));
  }, [nodeCoordinates, userLevel]);

  if (!pathData) return null;

  const progress = Math.min(100, Math.max(0, xpProgressPercent));

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible"
    >
      <defs>
        <filter id="road-shadow" x="-20%" y="-10%" width="140%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#0f172a" floodOpacity="0.22" />
        </filter>
      </defs>

      <path
        d={pathData}
        fill="none"
        stroke="#64748b"
        strokeWidth="34"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#road-shadow)"
      />
      <path
        d={pathData}
        fill="none"
        stroke="#334155"
        strokeWidth="27"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {travelledPathData && (
        <path
          d={travelledPathData}
          fill="none"
          stroke="#0f766e"
          strokeOpacity="0.72"
          strokeWidth="27"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {activeSegmentData && progress > 0 && (
        <path
          d={activeSegmentData}
          fill="none"
          stroke="#f59e0b"
          strokeWidth="27"
          strokeLinecap="round"
          pathLength="100"
          strokeDasharray="100"
          strokeDashoffset={100 - progress}
        />
      )}

      <path
        d={pathData}
        fill="none"
        stroke="#f8fafc"
        strokeOpacity="0.9"
        strokeWidth="2"
        strokeLinecap="butt"
        strokeDasharray="7 12"
      />
    </svg>
  );
});

export default RoadmapPath;
