import React from 'react';

const SessionScheduler = ({
  showCreateModal,
  setShowCreateModal,
  newSession,
  setNewSession,
  handleCreateSession,
  subjects,
  sessionTypes
}) => {
  if (!showCreateModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold mb-4">Create Study Session</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Session Title
            </label>
            <input
              type="text"
              value={newSession.title}
              onChange={(e) => setNewSession(prev => ({ ...prev, title: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="e.g., Calculus Review"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject
            </label>
            <select
              value={newSession.subject}
              onChange={(e) => setNewSession(prev => ({ ...prev, subject: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">Select Subject</option>
              {subjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={newSession.type}
                onChange={(e) => setNewSession(prev => ({ ...prev, type: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                {sessionTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (mins)
              </label>
              <input
                type="number"
                value={newSession.duration}
                onChange={(e) => setNewSession(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                min="15"
                step="15"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Time
            </label>
            <input
              type="time"
              value={newSession.startTime}
              onChange={(e) => setNewSession(prev => ({ ...prev, startTime: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recurring
            </label>
            <select
              value={newSession.recurring}
              onChange={(e) => setNewSession(prev => ({ ...prev, recurring: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="none">No Repeat</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>
        <div className="flex space-x-3 mt-6">
          <button
            onClick={handleCreateSession}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg"
          >
            Create Session
          </button>
          <button
            onClick={() => setShowCreateModal(false)}
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 rounded-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionScheduler;
