import React from 'react';

const DeadlineManager = ({ sessions }) => {
  // Filter sessions with deadlines
  const deadlines = sessions.filter(session => session.deadline);

  // Sort by nearest deadline
  deadlines.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

  return (
    <div className="bg-green-50 p-4 rounded-lg">
      <h3 className="font-medium text-gray-900 mb-3">Upcoming Deadlines</h3>
      {deadlines.length === 0 ? (
        <p className="text-gray-600 text-sm">No upcoming deadlines</p>
      ) : (
        <ul className="space-y-2">
          {deadlines.map(deadline => (
            <li key={deadline.id} className="flex justify-between items-center bg-white p-2 rounded shadow-sm">
              <div>
                <div className="font-semibold">{deadline.title}</div>
                <div className="text-xs text-gray-500">{deadline.subject}</div>
              </div>
              <div className="text-sm font-medium text-red-600">
                {new Date(deadline.deadline).toLocaleDateString()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default DeadlineManager;
