import React, { useState } from "react";
import Sidepane from "./Sidepane";
import AITutorChat from "./AITutorChat";

// StudyEnvironment: orchestrates the study workspace, sidepane and AI pane.
const StudyEnvironment = ({ session, onClose, user: incomingUser }) => {
  const [isSideOpen, setIsSideOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);

  const user =
    incomingUser ||
    (session
      ? {
          name: session.host || "Guest User",
          email: session.ownerEmail || "guest@example.com",
          avatar: "",
        }
      : { name: "Guest User", email: "guest@example.com", avatar: "" });

  return (
    <div className="fixed inset-0 z-50 flex">
      <Sidepane
        isOpen={isSideOpen}
        onClose={() => setIsSideOpen(false)}
        width={300}
        user={user}
      />

      <div className="flex-1 flex items-center justify-center bg-black bg-opacity-40">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-3xl w-full relative m-6">
          <button
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl"
            onClick={onClose}
          >
            &times;
          </button>

          <div className="absolute left-4 top-4">
            <button
              title="Menu"
              onClick={() => setIsSideOpen((s) => !s)}
              className="bg-white p-2 rounded-lg shadow hover:bg-gray-50"
            >
              ☰
            </button>
          </div>

          <div className="absolute right-4 bottom-4">
            <button
              title="AI Tutor"
              onClick={() => setIsAIOpen((s) => !s)}
              className="bg-green-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-green-700"
            >
              AI Tutor
            </button>
          </div>

          <h2 className="text-2xl font-bold mb-2 text-emerald-700">
            Study Environment
          </h2>

          <div className="mb-4 text-gray-700">
            <div>
              <span className="font-semibold">Subject:</span>{" "}
              {session?.subject || "-"}
            </div>
            <div>
              <span className="font-semibold">Topic:</span>{" "}
              {session?.topic || "-"}
            </div>
            <div>
              <span className="font-semibold">Date:</span>{" "}
              {session?.date || "-"}
            </div>
            <div>
              <span className="font-semibold">Start Time:</span>{" "}
              {session?.time || "-"}
            </div>
            <div>
              <span className="font-semibold">Duration:</span>{" "}
              {session?.hours || "-"} hour(s)
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

        <div
          className={`fixed inset-y-0 right-0 z-20 ${
            isAIOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <AITutorChat
            isOpen={isAIOpen}
            onClose={() => setIsAIOpen(false)}
            messages={[]}
            currentMessage={""}
            onMessageChange={() => {}}
            onSendMessage={() => {}}
            width={360}
            user={user}
          />
        </div>
      </div>
    </div>
  );
};

export default StudyEnvironment;
