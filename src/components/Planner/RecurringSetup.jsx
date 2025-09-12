import React from 'react';
import { Repeat } from 'lucide-react';

const RecurringSetup = ({ sessions, setSessions }) => {
  const recurringSessions = sessions.filter(session => session.recurring !== 'none');

  const handleEditRecurring = (sessionId, newRecurring) => {
    setSessions(prev => prev.map(session =>
      session.id === sessionId ? { ...session, recurring: newRecurring } : session
    ));
  };

  const handleDeleteRecurring = (sessionId) => {
    setSessions(prev => prev.map(session =>
      session.id === sessionId ? { ...session, recurring: 'none' } : session
    ));
  };

  return (
    <div className="bg-purple-50 p-4 rounded-lg">
      <div className="flex items-center space-x-2 mb-3">
        <Repeat className="w-5 h-5 text-purple-600" />
        <h3 className="font-medium text-gray-900">Recurring Sessions</h3>
      </div>
      {recurringSessions.length === 0 ? (
        <p className="text-gray-600 text-sm">No recurring sessions set up</p>
      ) : (
        <ul className="space-y-2">
          {recurringSessions.map(session => (
            <li key={session.id} className="flex justify-between items-center bg-white p-2 rounded shadow-sm">
              <div>
                <div className="font-semibold">{session.title}</div>
                <div className="text-xs text-gray-500 capitalize">{session.recurring}</div>
              </div>
              <div className="flex space-x-2">
                <select
                  value={session.recurring}
                  onChange={(e) => handleEditRecurring(session.id, e.target.value)}
                  className="text-xs border rounded px-1 py-1"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                <button
                  onClick={() => handleDeleteRecurring(session.id)}
                  className="text-red-500 hover:text-red-700 text-xs"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default RecurringSetup;
