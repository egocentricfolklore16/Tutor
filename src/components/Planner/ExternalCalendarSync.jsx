import React, { useState } from 'react';
import { ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';

const ExternalCalendarSync = () => {
  const [syncStatus, setSyncStatus] = useState({
    google: false,
    outlook: false,
    apple: false
  });

  const [lastSync, setLastSync] = useState({
    google: 'Never',
    outlook: 'Never',
    apple: 'Never'
  });

  const handleSync = (provider) => {
    // Simulate sync process
    setSyncStatus(prev => ({ ...prev, [provider]: true }));
    setLastSync(prev => ({ ...prev, [provider]: new Date().toLocaleString() }));
    setTimeout(() => {
      setSyncStatus(prev => ({ ...prev, [provider]: false }));
    }, 2000);
  };

  const providers = [
    {
      name: "google",
      label: "Google Calendar",
      icon: <img className="w-10" src="goog.png" />,
    },
    {
      name: "outlook",
      label: "Outlook Calendar",
      icon: <img className="w-10" src="OIP.png" />,
    },
    {
      name: "apple",
      label: "Apple Calendar",
      icon: <img className="w-10"  src="apl.png" />,
    },
  ];

  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <div className="flex items-center space-x-2 mb-3">
        <ExternalLink className="w-5 h-5 text-gray-600" />
        <h3 className="font-medium text-gray-900">External Calendar Sync</h3>
      </div>
      <p className="text-sm text-gray-600 mb-4">
        Sync your study sessions with external calendars for better organization.
      </p>
      <div className="space-y-3">
        {providers.map(provider => (
          <div key={provider.name} className="flex justify-between items-center bg-white p-3 rounded shadow-sm">
            <div className="flex items-center space-x-3">
              <span className="text-lg">{provider.icon}</span>
              <div>
                <div className="font-medium">{provider.label}</div>
                <div className="text-xs text-gray-500">Last sync: {lastSync[provider.name]}</div>
              </div>
            </div>
            <button
              onClick={() => handleSync(provider.name)}
              disabled={syncStatus[provider.name]}
              className={`px-3 py-1 rounded text-sm flex items-center space-x-1 ${
                syncStatus[provider.name]
                  ? 'bg-green-100 text-green-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {syncStatus[provider.name] ? (
                <>
                  <CheckCircle className="w-3 h-3" />
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <ExternalLink className="w-3 h-3" />
                  <span>Sync</span>
                </>
              )}
            </button>
          </div>
        ))}
      </div>
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
        <div className="flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <strong>Note:</strong> Syncing requires authentication with the respective calendar service.
            Your study sessions will be added as events to your external calendar.
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExternalCalendarSync;
