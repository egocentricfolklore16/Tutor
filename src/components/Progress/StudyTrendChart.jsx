import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Customized,
} from "recharts";
import {
  buildDailyPoints,
  computeMovingAverage,
  computeTrendStats,
  formatYAxisTicks,
} from "./studyTrendUtils";

/**
 * Custom dot renderer for daily hours data points.
 * Renders filled circle with card ring ONLY when hours > 0.
 */
function CustomDailyDot(props) {
  const { cx, cy, payload } = props;
  if (!payload || payload.hours <= 0 || cx == null || cy == null) {
    return null;
  }
  return (
    <circle
      cx={cx}
      cy={cy}
      r={3}
      fill="var(--color-indigo-600, #6366f1)"
      stroke="var(--color-card-bg, #ffffff)"
      className="dark:stroke-[#14171c]"
      strokeWidth={2}
    />
  );
}

/**
 * Custom Tooltip Content with crosshairs & delta vs previous day computation
 */
function CustomTooltipContent({ active, payload, label, coordinate, containerWidth }) {
  if (!active || !payload || !payload.length) return null;

  const dataPoint = payload[0]?.payload;
  if (!dataPoint) return null;

  const hours = dataPoint.hours || 0;
  const avg7 = dataPoint.avg7 || 0;
  const deltaVsPrev = dataPoint.deltaVsPrevDay;

  // Determine side flip if close to right boundary
  const x = coordinate?.x || 0;
  const flipLeft = containerWidth && x > containerWidth - 180;

  let deltaLabel = "No prev day";
  let deltaClass = "text-slate-400 dark:text-slate-500";
  if (deltaVsPrev != null) {
    if (deltaVsPrev > 0) {
      deltaLabel = `+${deltaVsPrev.toFixed(1)}h vs prev day`;
      deltaClass = "text-emerald-600 dark:text-emerald-400 font-medium";
    } else if (deltaVsPrev < 0) {
      deltaLabel = `${deltaVsPrev.toFixed(1)}h vs prev day`;
      deltaClass = "text-rose-600 dark:text-rose-400 font-medium";
    } else {
      deltaLabel = "Same as prev day";
      deltaClass = "text-slate-500 dark:text-slate-400";
    }
  }

  return (
    <div
      tabIndex={-1}
      className={`pointer-events-none z-30 rounded-lg border border-slate-200/80 bg-white/95 p-3 text-xs shadow-xl backdrop-blur-md transition-all duration-75 dark:border-slate-800/80 dark:bg-[#181c23]/95 dark:shadow-2xl ${
        flipLeft ? "-translate-x-full -ml-3" : "ml-3"
      }`}
      style={{ minWidth: "160px" }}
    >
      <p className="font-semibold text-slate-900 dark:text-slate-100">{dataPoint.fullDate || label}</p>
      <div className="mt-2 space-y-1">
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-400 inline-block" />
            Daily Planned:
          </span>
          <strong className="font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
            {hours.toFixed(1)}h
          </strong>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-500 inline-block" />
            7-Day Avg:
          </span>
          <span className="font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
            {avg7.toFixed(1)}h
          </span>
        </div>
        <div className="mt-1 pt-1 border-t border-slate-100 dark:border-slate-800/60 text-[11px]">
          <span className={deltaClass}>{deltaLabel}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Peak day annotation pill overlay
 */
function PeakAnnotationOverlay({ peakPoint, chartData }) {
  if (!peakPoint || peakPoint.hours <= 0) return null;

  return (
    <Customized
      component={({ formattedGraphicalItems }) => {
        if (!formattedGraphicalItems || !formattedGraphicalItems[0]) return null;
        const areaItem = formattedGraphicalItems[0];
        const points = areaItem.props?.points;
        if (!points || !points.length) return null;

        const peakIdx = chartData.findIndex((p) => p.key === peakPoint.key);
        if (peakIdx === -1 || !points[peakIdx]) return null;

        const { x, y } = points[peakIdx];
        if (x == null || y == null) return null;

        // Position pill slightly above data point, preventing clipping
        const pillY = Math.max(16, y - 22);
        const pillText = `Peak · ${peakPoint.hours.toFixed(1)}h`;

        return (
          <g key="peak-annotation" className="pointer-events-none select-none">
            {/* Leader hairline */}
            {y - pillY > 8 && (
              <line
                x1={x}
                y1={pillY + 6}
                x2={x}
                y2={y - 4}
                stroke="var(--color-indigo-500, #6366f1)"
                strokeWidth={1}
                strokeDasharray="2 2"
                opacity={0.6}
              />
            )}
            {/* Peak Pill Label */}
            <g transform={`translate(${x}, ${pillY})`}>
              <rect
                x={-34}
                y={-10}
                width={68}
                height={18}
                rx={9}
                fill="var(--color-indigo-600, #6366f1)"
                className="shadow-sm"
              />
              <text
                x={0}
                y={2}
                textAnchor="middle"
                fill="#ffffff"
                fontSize={10}
                fontWeight={600}
                letterSpacing="-0.01em"
              >
                {pillText}
              </text>
            </g>
          </g>
        );
      }}
    />
  );
}

export function StudyTrendChart({
  sessions = [],
  dailyGoalHours = 0,
  loading = false,
  title = "30-day study trend",
  subtitle = "Planned hours across your recent schedule",
  _plannedHoursTotal = 0,
}) {
  const [rangeDays, setRangeDays] = useState(30);
  const [show7DayAvg, setShow7DayAvg] = useState(true);
  const [activeIndex, setActiveIndex] = useState(null);
  const chartRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(600);

  // ResizeObserver for responsive width measurements
  useEffect(() => {
    if (!chartRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0] && entries[0].contentRect) {
        setContainerWidth(entries[0].contentRect.width);
      }
    });
    observer.observe(chartRef.current);
    return () => observer.disconnect();
  }, []);

  // Compute daily data points for current range and previous period of equal length
  const { chartData, stats, yAxisDomain, yAxisTicks, todayKey, maxHours } = useMemo(() => {
    const rawCurrent = buildDailyPoints(sessions, rangeDays, new Date(), 0);
    const rawPrev = buildDailyPoints(sessions, rangeDays, new Date(), 1);

    const pointsWithAvg = computeMovingAverage(rawCurrent, 7);

    // Attach delta vs previous day to each point for custom tooltip
    const enrichedData = pointsWithAvg.map((p, idx) => {
      const prevDayHours = idx > 0 ? pointsWithAvg[idx - 1].hours : null;
      const deltaVsPrevDay = prevDayHours != null ? p.hours - prevDayHours : null;
      return {
        ...p,
        deltaVsPrevDay,
      };
    });

    const trendStats = computeTrendStats(rawCurrent, rawPrev);

    let maxH = 0;
    enrichedData.forEach((p) => {
      if (p.hours > maxH) maxH = p.hours;
      if (p.avg7 > maxH) maxH = p.avg7;
    });

    const { niceMax, ticks } = formatYAxisTicks(maxH);
    const lastPoint = enrichedData[enrichedData.length - 1];

    return {
      chartData: enrichedData,
      stats: trendStats,
      yAxisDomain: [0, niceMax],
      yAxisTicks: ticks,
      todayKey: lastPoint ? lastPoint.key : "",
      maxHours: maxH,
    };
  }, [sessions, rangeDays]);

  // Handle keyboard navigation for active data point inspection
  const handleKeyDown = useCallback(
    (e) => {
      if (!chartData || !chartData.length) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setActiveIndex((prev) => (prev == null || prev >= chartData.length - 1 ? 0 : prev + 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setActiveIndex((prev) => (prev == null || prev <= 0 ? chartData.length - 1 : prev - 1));
      } else if (e.key === "Escape") {
        setActiveIndex(null);
      }
    },
    [chartData]
  );

  // XAxis interval calculation based on range
  const xAxisInterval = useMemo(() => {
    if (rangeDays === 7) return 0; // Show every day for 7D
    if (rangeDays === 30) return 4; // Every 5th day for 30D
    return 13; // Weekly steps for 90D
  }, [rangeDays]);

  // Loading skeleton state
  if (loading) {
    return (
      <div className="rounded-xl bg-white p-5 shadow-surface dark:bg-[#14171c] animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-40 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="h-6 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
        </div>
        <div className="h-64 w-full bg-slate-100 dark:bg-slate-800/50 rounded-lg flex items-center justify-center">
          <span className="text-xs text-slate-400">Loading trend analysis...</span>
        </div>
      </div>
    );
  }

  const isEmpty = maxHours === 0;

  // Accessible summary text for role="img"
  const accessibleSummary = `Study trend chart for past ${rangeDays} days. Total planned time: ${stats.totalHours.toFixed(
    1
  )}h across ${stats.activeDays} active days. Peak day: ${
    stats.peakDate ? `${stats.peakDate} with ${stats.peakHours}h` : "None"
  }. Change vs previous period: ${stats.diffHours > 0 ? "+" : ""}${stats.diffHours.toFixed(1)}h.`;

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label={accessibleSummary}
      role="region"
      className="rounded-xl bg-white p-5 shadow-surface dark:bg-[#14171c] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
    >
      {/* HEADER ROW */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-white">{title}</h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>

        {/* TOP RIGHT: STAT SUMMARY & RANGE CONTROLS */}
        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
          {/* Delta Badge & Total Figure */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
              {stats.totalHours.toFixed(1)}h total
            </span>
            {stats.prevTotalHours > 0 || stats.totalHours > 0 ? (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
                  stats.isUp
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                    : stats.isDown
                    ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                }`}
                title={`Previous ${rangeDays}d total: ${stats.prevTotalHours.toFixed(1)}h`}
              >
                {stats.isUp ? "+" : ""}
                {stats.diffHours.toFixed(1)}h vs prev {rangeDays}d
              </span>
            ) : null}
          </div>

          {/* RANGE SEGMENTED CONTROL */}
          <div
            role="tablist"
            aria-label="Select date range"
            className="inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800/80"
          >
            {[7, 30, 90].map((days) => {
              const isActive = rangeDays === days;
              return (
                <button
                  key={days}
                  role="tab"
                  aria-selected={isActive}
                  type="button"
                  onClick={() => setRangeDays(days)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isActive
                      ? "bg-white text-indigo-600 shadow-sm dark:bg-[#1f242d] dark:text-indigo-400"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  {days}D
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* LEGEND CHIP ROW */}
      <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2 text-xs dark:border-slate-800/60">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
            <span className="h-2 w-3 rounded-sm bg-indigo-600 dark:bg-indigo-500 inline-block" />
            Daily Planned Hours
          </span>

          <button
            type="button"
            onClick={() => setShow7DayAvg((prev) => !prev)}
            aria-pressed={show7DayAvg}
            className={`flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
              show7DayAvg
                ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
            }`}
          >
            <span
              className={`h-0.5 w-3 border-b-2 border-dashed ${
                show7DayAvg ? "border-slate-500" : "border-slate-300 dark:border-slate-600"
              }`}
            />
            7-Day Moving Avg
          </button>
        </div>

        {dailyGoalHours > 0 && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
            <span className="h-0.5 w-3 border-b-2 border-dashed border-emerald-500" />
            Goal ({dailyGoalHours.toFixed(1)}h/day)
          </span>
        )}
      </div>

      {/* CHART CONTAINER */}
      <div
        ref={chartRef}
        className="relative h-64 w-full touch-pan-y"
        role="img"
        aria-label={accessibleSummary}
      >
        {isEmpty ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center dark:border-slate-800 dark:bg-slate-900/20">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No study time planned yet</p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              Schedule sessions in your planner to track your learning velocity over time.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 20, right: 12, left: -22, bottom: 0 }}
              onMouseMove={(state) => {
                if (state && state.activeTooltipIndex != null) {
                  setActiveIndex(state.activeTooltipIndex);
                }
              }}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <defs>
                {/* Vertical Area Gradient */}
                <linearGradient id="trendAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-indigo-600, #6366f1)" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="var(--color-indigo-600, #6366f1)" stopOpacity={0.0} />
                </linearGradient>

                {/* Line Gradient */}
                <linearGradient id="trendLineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="var(--color-indigo-600, #6366f1)" />
                  <stop offset="100%" stopColor="var(--color-indigo-400, #818cf8)" />
                </linearGradient>

                {/* Restrained Line Outer Glow Filter */}
                <filter id="trendLineGlow" x="-10%" y="-10%" width="120%" height="120%">
                  <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#6366f1" floodOpacity="0.25" />
                </filter>
              </defs>

              {/* Gridlines: Horizontal only */}
              <CartesianGrid vertical={false} stroke="#e2e8f0" strokeOpacity={0.12} strokeDasharray="3 3" />

              {/* X Axis */}
              <XAxis
                dataKey="day"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                interval={xAxisInterval}
                minTickGap={15}
                dy={6}
              />

              {/* Y Axis */}
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                domain={yAxisDomain}
                ticks={yAxisTicks}
                tickFormatter={(v) => `${v}h`}
              />

              {/* Custom Clamped Tooltip */}
              <Tooltip
                content={
                  <CustomTooltipContent
                    containerWidth={containerWidth}
                    activeIndex={activeIndex}
                  />
                }
                cursor={{
                  stroke: "var(--color-indigo-500, #6366f1)",
                  strokeWidth: 1,
                  strokeDasharray: "3 3",
                  strokeOpacity: 0.5,
                }}
              />

              {/* Faint Today Line Marker */}
              {todayKey && (
                <ReferenceLine
                  x={chartData[chartData.length - 1]?.day}
                  stroke="#94a3b8"
                  strokeDasharray="2 2"
                  strokeOpacity={0.35}
                />
              )}

              {/* Optional Daily Goal Line */}
              {dailyGoalHours > 0 && (
                <ReferenceLine
                  y={dailyGoalHours}
                  stroke="#10b981"
                  strokeDasharray="3 3"
                  strokeOpacity={0.6}
                  strokeWidth={1.5}
                />
              )}

              {/* Daily Hours Area with Monotone Cubic Interpolation */}
              <Area
                type="monotone"
                dataKey="hours"
                stroke="url(#trendLineGrad)"
                strokeWidth={2}
                fill="url(#trendAreaGrad)"
                filter="url(#trendLineGlow)"
                dot={<CustomDailyDot />}
                activeDot={{
                  r: 5,
                  fill: "var(--color-indigo-600, #6366f1)",
                  stroke: "#ffffff",
                  strokeWidth: 2,
                }}
                isAnimationActive={true}
                animationDuration={700}
                animationEasing="ease-out"
              />

              {/* 7-Day Moving Average Line */}
              {show7DayAvg && (
                <Line
                  type="monotone"
                  dataKey="avg7"
                  stroke="#94a3b8"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  strokeOpacity={0.65}
                  dot={false}
                  activeDot={{
                    r: 3.5,
                    fill: "#94a3b8",
                    stroke: "#ffffff",
                    strokeWidth: 1.5,
                  }}
                  isAnimationActive={true}
                  animationDuration={700}
                />
              )}

              {/* Peak Day Annotation Overlay */}
              {stats.peakKey && (
                <PeakAnnotationOverlay
                  peakPoint={{
                    key: stats.peakKey,
                    hours: stats.peakHours,
                    day: stats.peakDate,
                  }}
                  chartData={chartData}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* SLIM STATS ROW UNDER CHART */}
      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-3 text-xs dark:border-slate-800/60">
        <div>
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Active days
          </p>
          <p className="mt-0.5 text-sm font-bold text-slate-800 dark:text-slate-100 tabular-nums">
            {stats.activeDays} <span className="text-slate-400 font-normal">of {stats.totalDays}</span>
          </p>
        </div>
        <div>
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Avg / active day
          </p>
          <p className="mt-0.5 text-sm font-bold text-slate-800 dark:text-slate-100 tabular-nums">
            {stats.avgPerActiveDay.toFixed(1)}h
          </p>
        </div>
        <div>
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Best day
          </p>
          <p className="mt-0.5 text-sm font-bold text-slate-800 dark:text-slate-100 tabular-nums">
            {stats.peakDate ? `${stats.peakDate} (${stats.peakHours.toFixed(1)}h)` : "None"}
          </p>
        </div>
      </div>

      {/* ACCESSIBLE VISUALLY HIDDEN DATA TABLE FALLBACK */}
      <table className="sr-only" aria-label="Daily study trend data table">
        <caption>Daily planned study hours for the past {rangeDays} days</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Planned Hours</th>
            <th scope="col">7-Day Average</th>
          </tr>
        </thead>
        <tbody>
          {chartData.map((row) => (
            <tr key={row.key}>
              <td>{row.fullDate}</td>
              <td>{row.hours}h</td>
              <td>{row.avg7}h</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default StudyTrendChart;
