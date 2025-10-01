import React from "react";

const SessionControls = ({ isStudying, onToggleStudying }) => (
  <div className="mb-8">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">
      Session Controls
    </h3>
    <div className="flex flex-col sm:flex-row gap-3">
      <button
        onClick={onToggleStudying}
        className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
      >
        {isStudying ? "Pause Session" : "Start Session"}
      </button>
      <button className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors">
        End Session
      </button>
    </div>
  </div>
);

export default SessionControls;
