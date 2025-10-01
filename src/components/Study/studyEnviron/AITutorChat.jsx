import React from "react";
import { BookOpen, X, MessageSquare } from "lucide-react";

const AITutorChat = ({
  isOpen,
  onClose,
  messages,
  currentMessage,
  onMessageChange,
  onSendMessage,
}) => {
  const MessageBubble = ({ message }) => {
    if (message.sender === "ai") {
      return (
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
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
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
        onClick={onClose}
      />

      <div className="fixed lg:static inset-y-0 right-0 z-50 w-full sm:w-96 bg-white border-l border-gray-200 flex flex-col lg:max-w-96">
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
              className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AITutorChat;
