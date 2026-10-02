import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const PerformanceDashboard = () => {
  // Mock data for the area chart (weekly progress)
  const progressData = [
    { day: "Mon", hours: 2.5 },
    { day: "Tue", hours: 3.2 },
    { day: "Wed", hours: 1.8 },
    { day: "Thu", hours: 4.1 },
    { day: "Fri", hours: 3.7 },
    { day: "Sat", hours: 5.2 },
    { day: "Sun", hours: 4.8 },
  ];

  // Subject performance data
  const subjects = [
    { name: "Commerce", performance: "excellent", color: "bg-green-500" },
    { name: "Accounting", performance: "good", color: "bg-yellow-500" },
    { name: "Marketing", performance: "bad", color: "bg-red-500" },
  ];

  return (
    <div className="p-2 lg:p-5 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-colors">
      <div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Progress Chart */}
          <div className="lg:col-span-2">
            {/* Progress Area Chart - Main Container */}
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 p-6 h-fit justify-center">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
                  Weekly Progress
                </h2>
                <div className="text-sm text-gray-600 dark:text-slate-400">
                  Total: 25.3 hours this week
                </div>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={progressData}
                    margin={{
                      top: 10,
                      right: 0,
                      left: -55,
                      bottom: 0,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-slate-800" />
                    <XAxis dataKey="day" className="text-gray-500 dark:text-slate-400" stroke="currentColor" fontSize={12} />
                    <YAxis className="text-gray-500 dark:text-slate-400" stroke="currentColor" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--color-tooltip-bg, #1e293b)",
                        borderColor: "var(--color-tooltip-border, #334155)",
                        borderRadius: "8px",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                        color: "#f8fafc",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="hours"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fill="url(#colorGradient)"
                    />
                    <defs>
                      <linearGradient
                        id="colorGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#3b82f6"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#3b82f6"
                          stopOpacity={0.05}
                        />
                      </linearGradient>
                    </defs>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Right Column - Subject Performance */}
          <div className="lg:col-span-1">
            {/* Performance Legend */}
            <div className="rounded-lg bg-slate-900 dark:bg-slate-950 border border-slate-800 p-4 mb-6">
              <div className="text-sm font-medium text-slate-100 mb-3">
                Performance Legend
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm text-slate-300">Bad</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm text-slate-300">Good</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-slate-300">Excellent</span>
                </div>
              </div>
            </div>

            {/* Subject Performance Cards */}
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 p-4">
                <div className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-4">
                  Subject Performance
                </div>

                {subjects.map((subject, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-slate-800/60 last:border-b-0"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-4 h-4 ${subject.color} rounded-full`}
                      ></div>
                      <span className="text-gray-900 dark:text-slate-200 font-medium">
                        {subject.name}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-slate-400 capitalize">
                      {subject.performance}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        {/* Bottom Stats Cards */}
        <div className="grid w-full grid-cols-3 gap-2 mt-6">
          {/* Study Time Card */}
          <div className="bg-white dark:bg-slate-900 col-span-1 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-1">20</div>
              <div className="text-sm text-gray-600 dark:text-slate-400">Study Time</div>
              <div className="text-xs text-gray-500 dark:text-slate-500 mt-1">HRS</div>
            </div>
          </div>

          {/* Focus Card */}
          <div className="bg-white dark:bg-slate-900 col-span-1 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-1">14</div>
              <div className="text-sm text-gray-600 dark:text-slate-400">Focus</div>
              <div className="text-xs text-gray-500 dark:text-slate-500 mt-1">HRS</div>
            </div>
          </div>

          {/* Test Score Card */}
          <div className="bg-white dark:bg-slate-900 col-span-1 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-1">78</div>
              <div className="text-sm text-gray-600 dark:text-slate-400">Test Score</div>
              <div className="text-xs text-gray-500 dark:text-slate-500 mt-1">AVG</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;
