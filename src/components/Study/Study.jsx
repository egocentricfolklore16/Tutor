import React, { useState, useRef } from "react";
import {
  Clock,
  BookOpen,
  Play,
  MoreHorizontal,
  AlertCircle,
  X,
} from "lucide-react";

function Study() {
  const [session, setSession] = useState({
    subject: "",
    topic: "",
    status: "",
    date: "",
    hours: "",
  });
  const [sessions, setSessions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const formRef = useRef(null);

  const getTypeIcon = () => {
    return <BookOpen className="h-4 w-4" />;
  };

  const getPriorityColor = (status) => {
    switch (status) {
      case "Very Important":
        return "border-l-red-500 bg-red-50";
      case "Not so Important":
        return "border-l-green-500 bg-green-50";
      case "Medium":
        return "border-l-orange-500 bg-blue-50";
      default:
        return "border-l-gray-300 bg-gray-50";
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Very Important":
        return (
          <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Very Important
          </span>
        );
      case "Not so Important":
        return (
          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
            Not so Important
          </span>
        );
      case "Medium":
        return (
          <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-blue-700 rounded-full">
            Medium
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
            {status}
          </span>
        );
    }
  };

  const toggleShow = () => {
    setIsOpen(!isOpen);
  };

  const addSession = (e) => {
    e.preventDefault();
    if (
      session.subject &&
      session.topic &&
      session.status &&
      session.date &&
      session.hours
    ) {
      setSessions([...sessions, { ...session, id: Date.now() }]);
      setSession({
        subject: "",
        topic: "",
        status: "",
        date: "",
        hours: "",
      });
      setIsOpen(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSession((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="relative min-h-screen">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          Study Sessions
        </h1>

        {sessions.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-4">No study sessions yet</p>
            <p className="text-gray-400">
              Click the + button to create your first session
            </p>
          </div>
        ) : (
          <div className="grid gap-auto grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
            {sessions.map((sessionItem, index) => (
              <div
                key={sessionItem.id || index}
                className={`border-l-4 rounded-r-lg p-4 transition-all w-full lg:w-[335px] hover:shadow-md ${getPriorityColor(
                  sessionItem.status
                )}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-2 text-gray-600">
                        {getTypeIcon()}
                      </div>
                      {getStatusBadge(sessionItem.status)}
                    </div>

                    <h2 className="font-semibold text-gray-800 mb-1">
                      {sessionItem.subject}
                    </h2>
                    <h3 className="text-gray-600 mb-1">{sessionItem.topic}</h3>
                    <p className="text-sm text-gray-500 mb-1">
                      {sessionItem.date}
                    </p>
                    <p className="text-sm font-medium text-gray-700">
                      {sessionItem.hours} hour(s)
                    </p>
                  </div>

                  <div className="flex flex-col items-center gap-2 ml-4">
                   
                      <button className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                        <Play className="h-3 w-3" />
                        Start
                      </button>
                    
                    
                    <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fixed Overlay Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-gray-200 bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (formRef.current && !formRef.current.contains(e.target)) {
              setIsOpen(false);
            }
          }}
        >
          <div className="w-full max-w-md" ref={formRef}>
            <form
              className="bg-white p-6 rounded-lg shadow-xl"
              onSubmit={addSession}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">
                  Create Study Session
                </h2>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject *
                  </label>
                  <input
                    required
                    type="text"
                    name="subject"
                    value={session.subject}
                    onChange={handleChange}
                    placeholder="e.g., Mathematics, Biology"
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                  />
                </div>

                {/* Topic */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Topic *
                  </label>
                  <input
                    required
                    type="text"
                    name="topic"
                    value={session.topic}
                    onChange={handleChange}
                    placeholder="e.g., Calculus, Cell Division"
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status *
                  </label>
                  <select
                    required
                    name="status"
                    value={session.status}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                  >
                    <option value="">Select status</option>
                    <option value="Very Important">Very Important</option>
                    <option value="Medium">Medium</option>
                    <option value="Not so Important">Not so Important</option>
                  </select>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date *
                  </label>
                  <input
                    required
                    type="date"
                    name="date"
                    value={session.date}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                  />
                </div>

                {/* Hours */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Study Duration (hours) *
                  </label>
                  <input
                    required
                    type="number"
                    name="hours"
                    value={session.hours}
                    onChange={handleChange}
                    placeholder="1"
                    min="0.5"
                    step="0.5"
                    max="12"
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-medium mt-6"
              >
                Create Session
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={toggleShow}
        className="fixed bottom-6 right-6 bg-green-600 hover:bg-green-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out hover:scale-110 z-40"
        title="Create New Session"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
      </button>
    </div>
  );
}

export default Study;
