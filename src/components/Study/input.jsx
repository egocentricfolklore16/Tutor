import React, { useState, useRef, useEffect } from "react";
import { Send, Paperclip } from "lucide-react";

export default function ClaudeInput() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [message]);

  const handleSubmit = () => {
    if (message.trim()) {
      setMessages([...messages, message]);
      setMessage("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        {/* Messages Display */}
        <div className="mb-8 space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl p-4 shadow-sm border border-amber-100"
            >
              <p className="text-gray-800">{msg}</p>
            </div>
          ))}
        </div>

        {/* Input Container */}
        <div className="relative">
          <div className="bg-white rounded-3xl shadow-lg border border-gray-200 transition-all duration-200 hover:shadow-xl focus-within:shadow-xl focus-within:border-orange-300">
            <div className="flex items-end gap-2 p-3">
              {/* Attach Button */}
              <button className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200">
                <Paperclip size={20} />
              </button>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message Claude..."
                rows={1}
                className="flex-1 resize-none bg-transparent outline-none text-gray-800 placeholder-gray-400 max-h-64 py-2 px-2"
              />

              {/* Send Button */}
              <button
                onClick={handleSubmit}
                disabled={!message.trim()}
                className={`flex-shrink-0 p-2.5 rounded-xl transition-all duration-200 ${
                  message.trim()
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-md hover:shadow-lg"
                    : "bg-gray-100 text-gray-300 cursor-not-allowed"
                }`}
              >
                <Send size={20} />
              </button>
            </div>
          </div>

          {/* Helper Text */}
          <p className="text-center text-xs text-gray-500 mt-3">
            Press Enter to send, Shift + Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
