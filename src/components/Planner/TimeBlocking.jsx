import React, { useState } from 'react';
import { Clock } from 'lucide-react';

const TimeBlocking = () => {
  const [blockedTimes, setBlockedTimes] = useState([
    { id: 1, day: 'Monday', start: '08:00', end: '10:00', purpose: 'Study Block' },
    { id: 2, day: 'Wednesday', start: '14:00', end: '16:00', purpose: 'Review Session' }
  ]);

  const [newBlock, setNewBlock] = useState({
    day: 'Monday',
    start: '09:00',
    end: '11:00',
    purpose: ''
  });

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const handleAddBlock = () => {
    if (newBlock.purpose) {
      setBlockedTimes(prev => [...prev, { ...newBlock, id: Date.now() }]);
      setNewBlock({ day: 'Monday', start: '09:00', end: '11:00', purpose: '' });
    }
  };

  const handleDeleteBlock = (id) => {
    setBlockedTimes(prev => prev.filter(block => block.id !== id));
  };

  return (
    <div className="bg-blue-50 p-4 rounded-lg">
      <div className="flex items-center space-x-2 mb-3">
        <Clock className="w-5 h-5 text-blue-600" />
        <h3 className="font-medium text-gray-900">Time Blocking</h3>
      </div>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <select
            value={newBlock.day}
            onChange={(e) => setNewBlock(prev => ({ ...prev, day: e.target.value }))}
            className="border rounded px-2 py-1 text-sm"
          >
            {days.map(day => <option key={day} value={day}>{day}</option>)}
          </select>
          <input
            type="text"
            placeholder="Purpose"
            value={newBlock.purpose}
            onChange={(e) => setNewBlock(prev => ({ ...prev, purpose: e.target.value }))}
            className="border rounded px-2 py-1 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="time"
            value={newBlock.start}
            onChange={(e) => setNewBlock(prev => ({ ...prev, start: e.target.value }))}
            className="border rounded px-2 py-1 text-sm"
          />
          <input
            type="time"
            value={newBlock.end}
            onChange={(e) => setNewBlock(prev => ({ ...prev, end: e.target.value }))}
            className="border rounded px-2 py-1 text-sm"
          />
        </div>
        <button
          onClick={handleAddBlock}
          className="w-full bg-blue-600 text-white py-1 rounded text-sm hover:bg-blue-700"
        >
          Add Time Block
        </button>
      </div>
      <div className="mt-4 space-y-2">
        {blockedTimes.map(block => (
          <div key={block.id} className="flex justify-between items-center bg-white p-2 rounded shadow-sm">
            <div>
              <div className="font-semibold text-sm">{block.purpose}</div>
              <div className="text-xs text-gray-500">{block.day} {block.start} - {block.end}</div>
            </div>
            <button
              onClick={() => handleDeleteBlock(block.id)}
              className="text-red-500 hover:text-red-700 text-xs"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TimeBlocking;
