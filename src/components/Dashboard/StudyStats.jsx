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

const HyperTutorDashboard = () => {
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
    <div className="p-5 rounded-lg border border-gray-200 shadow-sm">
      <div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Progress Chart */}
          <div className="lg:col-span-2">
            {/* Progress Area Chart - Main Container */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-fit justify-center">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Weekly Progress
                </h2>
                <div className="text-sm text-gray-600">
                  Total: 25.3 hours this week
                </div>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={progressData}
                    margin={{
                      top: 10,
                      right: 30,
                      left: 0,
                      bottom: 0,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="day" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "6px",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
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
            <div className="bg-white border border-gray-200 p-4 mb-6">
              <div className="text-sm font-medium text-gray-900 mb-3">
                Performance Legend
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Bad</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Good</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Excellent</span>
                </div>
              </div>
            </div>

            {/* Subject Performance Cards */}
            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="text-lg font-medium text-gray-900 mb-4">
                  Subject Performance
                </div>

                {subjects.map((subject, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-4 h-4 ${subject.color} rounded-full`}
                      ></div>
                      <span className="text-gray-900 font-medium">
                        {subject.name}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 capitalize">
                      {subject.performance}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        {/* Bottom Stats Cards */}
        <div className="grid w-full grid-cols-3 gap-6 mt-6">
          {/* Study Time Card */}
          <div className="bg-white col-span-1 rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">20</div>
              <div className="text-sm text-gray-600">Study Time</div>
              <div className="text-xs text-gray-500 mt-1">HRS</div>
            </div>
          </div>

          {/* Focus Card */}
          <div className="bg-white col-span-1 rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">14</div>
              <div className="text-sm text-gray-600">Focus</div>
              <div className="text-xs text-gray-500 mt-1">HRS</div>
            </div>
          </div>

          {/* Test Score Card */}
          <div className="bg-white col-span-1 rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">78</div>
              <div className="text-sm text-gray-600">Test Score</div>
              <div className="text-xs text-gray-500 mt-1">AVG</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HyperTutorDashboard;
