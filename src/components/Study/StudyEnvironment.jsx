import React from "react";

const StudyEnvironment = ({ session, onClose }) => {
  if (!session) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full relative">
          <button
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl"
            onClick={onClose}
          >
            &times;
          </button>
          <div className="text-red-600 font-semibold text-center">
            No session data available.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full relative">
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl"
          onClick={onClose}
        >
          &times;
        </button>
        <h2 className="text-2xl font-bold mb-2 text-emerald-700">
          Study Environment
        </h2>
        <div className="mb-4 text-gray-700">
          <div>
            <span className="font-semibold">Subject:</span> {session.subject}
          </div>
          <div>
            <span className="font-semibold">Topic:</span> {session.topic}
          </div>
          <div>
            <span className="font-semibold">Date:</span> {session.date}
          </div>
          <div>
            <span className="font-semibold">Start Time:</span> {session.time}
          </div>
          <div>
            <span className="font-semibold">Duration:</span> {session.hours}{" "}
            hour(s)
          </div>
        </div>
        <div className="border-t pt-4 mt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 bg-gray-100 rounded-lg p-4 min-h-[120px]">
              <h3 className="font-semibold mb-2 text-gray-800">Notes</h3>
              <textarea
                className="w-full h-24 p-2 rounded border border-gray-300"
                placeholder="Write your study notes here..."
              />
            </div>
            <div className="flex-1 bg-gray-100 rounded-lg p-4 min-h-[120px]">
              <h3 className="font-semibold mb-2 text-gray-800">Resources</h3>
              <div className="text-gray-500">(Coming soon)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudyEnvironment;
