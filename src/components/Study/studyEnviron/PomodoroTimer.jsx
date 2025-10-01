import React from "react";

const PomodoroTimer = ({ timeLeft }) => {
  const TimeBox = ({ value, label }) => (
    <div className="bg-gray-50 rounded-lg p-4 lg:p-6 text-center">
      <div className="text-2xl lg:text-4xl font-bold text-gray-900 mb-2">
        {value}
      </div>
      <div className="text-xs lg:text-sm text-gray-500">{label}</div>
    </div>
  );

  return (
    <div className="grid grid-cols-3 gap-3 lg:gap-4 mb-8">
      <TimeBox
        value={timeLeft.hours.toString().padStart(2, "0")}
        label="Hours"
      />
      <TimeBox
        value={timeLeft.minutes.toString().padStart(2, "0")}
        label="Minutes"
      />
      <TimeBox
        value={timeLeft.seconds.toString().padStart(2, "0")}
        label="Seconds"
      />
    </div>
  );
};

export default PomodoroTimer;
