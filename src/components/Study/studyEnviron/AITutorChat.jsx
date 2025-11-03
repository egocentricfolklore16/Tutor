import React from "react";
import { BookOpen, X, MessageSquare } from "lucide-react";

const AITutorChat = ({
  isOpen,
  onClose,
  messages,
  currentMessage,
  onMessageChange,
  onSendMessage,
  width,
  user,
}) => {
  const MessageBubble = ({ message }) => {
    if (message.sender === "ai") {
      return (
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <div className="text-xs text-gray-500 mb-1">AI Tutor</div>
            <div className="bg-gray-100 rounded-lg p-3 text-gray-900">
              {message.text}
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="flex gap-3 justify-end">
          <div className="flex-1 text-right">
            <div className="text-xs text-gray-500 mb-1">Emily</div>
            <div className="bg-indigo-600 text-white rounded-lg p-3 inline-block">
              {message.text}
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex-shrink-0"></div>
        </div>
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="bg-white border-l border-gray-200 flex flex-col"
      style={{ width: `${width}px` }}
    >
      <div className="p-4 lg:p-6 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg lg:text-xl font-bold text-gray-900">
          AI Tutor Assistant
        </h2>
        <button
          onClick={onClose}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* optional centered user card */}
      {user && (
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt="avatar"
                  className="w-12 h-12 rounded-full"
                />
              ) : (
                <span className="font-semibold text-gray-700">
                  {(user.name || "?").charAt(0)}
                </span>
              )}
            </div>
            <div>
              <div className="font-semibold text-gray-900">{user.name}</div>
              <div className="text-xs text-gray-500">{user.email}</div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
        {messages.map((msg, idx) => (
          <MessageBubble key={idx} message={msg} />
        ))}
      </div>

      <div className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={currentMessage}
            onChange={(e) => onMessageChange(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && onSendMessage()}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={onSendMessage}
            className="p-2 bg-green-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <svg
              stroke="currentColor"
              fill="currentColor"
              stroke-width="0"
              viewBox="0 0 24 24"
              height="1.5em"
              width="1.5em"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M21.426,11.095l-17-8c-0.35-0.163-0.763-0.112-1.061,0.133C3.066,3.473,2.937,3.868,3.03,4.242L4.969,12L3.03,19.758	c-0.094,0.374,0.036,0.77,0.335,1.015C3.548,20.923,3.772,21,4,21c0.145,0,0.29-0.031,0.426-0.095l17-8	C21.776,12.74,22,12.388,22,12S21.776,11.26,21.426,11.095z M5.481,18.197L6.32,14.84L12,12L6.32,9.16L5.481,5.803L18.651,12	L5.481,18.197z"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AITutorChat;
