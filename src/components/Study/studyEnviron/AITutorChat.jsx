import React from "react";
import { BookOpen, Bot, Eraser, Send, Sparkles, X } from "lucide-react";

const AITutorChat = ({
  isOpen,
  onClose,
  messages,
  currentMessage,
  onMessageChange,
  onSendMessage,
  onClear,
  width,
  theme,
  isTyping,
}) => {
  const MessageBubble = ({ message }) => {
    if (message.sender === "ai") {
      return (
        <div className="flex gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${theme?.accentButton || "bg-green-600"}`}>
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <div className="mb-1 text-xs font-semibold text-gray-500">AI Tutor</div>
            <div className="rounded-2xl rounded-tl-sm bg-gray-100 p-3 text-sm leading-6 text-gray-900">
              {message.text}
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="flex gap-3 justify-end">
          <div className="flex-1 text-right">
            <div className="mb-1 text-xs font-semibold text-gray-500">You</div>
            <div className={`inline-block rounded-2xl rounded-tr-sm p-3 text-left text-sm leading-6 text-white ${theme?.accentButton || "bg-green-600"}`}>
              {message.text}
            </div>
          </div>
          <div className="h-8 w-8 flex-shrink-0 rounded-full bg-gray-200 flex items-center justify-center"><Bot className="h-4 w-4 text-gray-500" /></div>
        </div>
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="flex h-full w-[min(92vw,390px)] flex-col border-l border-gray-200 bg-white shadow-2xl"
      style={{ width: `${width}px`, maxWidth: "92vw" }}
    >
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center gap-3"><div className={`flex h-10 w-10 items-center justify-center rounded-xl text-white ${theme?.accentButton || "bg-green-600"}`}><Sparkles className="h-5 w-5" /></div><div><h2 className="font-bold text-gray-900">AI Tutor</h2><p className="text-xs text-gray-500">Your study companion</p></div></div>
        <div className="flex items-center gap-1"><button title="Clear conversation" onClick={onClear} className="rounded-lg p-2 text-gray-400 hover:bg-white hover:text-gray-700"><Eraser className="h-4 w-4" /></button><button title="Close AI tutor" onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-white hover:text-gray-700"><X className="h-5 w-5" /></button></div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4 lg:p-5">
        {messages.length === 0 && <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4"><div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900"><BookOpen className="h-4 w-4 text-gray-500" />Ready to help</div><p className="text-sm leading-6 text-gray-500">Ask for an explanation, a study plan, or a practice question for this session.</p></div>}
        {messages.map((msg, idx) => (
          <MessageBubble key={idx} message={msg} />
        ))}
        {isTyping && <div className="flex items-center gap-2 text-sm text-gray-500"><span className={`h-2 w-2 animate-pulse rounded-full ${theme?.accentBg || "bg-gray-200"}`}></span>Thinking...</div>}
      </div>

      <div className="border-t border-gray-200 bg-gray-50 p-4">
        <div className="mb-3 flex gap-2 overflow-x-auto"><button onClick={() => onMessageChange("Help me make a study plan")} className="whitespace-nowrap rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 hover:border-gray-300">Make a study plan</button><button onClick={() => onMessageChange("Explain this topic")} className="whitespace-nowrap rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 hover:border-gray-300">Explain topic</button></div>
        <div className="flex items-end gap-2 rounded-xl border border-gray-200 bg-white p-2 focus-within:ring-2 focus-within:ring-gray-200">
          <input
            type="text"
            value={currentMessage}
            onChange={(e) => onMessageChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), onSendMessage())}
            placeholder="Type your message..."
            className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm outline-none"
          />
          <button
            onClick={onSendMessage}
            disabled={!currentMessage.trim() || isTyping}
            className={`rounded-lg p-2 text-white disabled:cursor-not-allowed disabled:opacity-40 ${theme?.accentButton || "bg-green-600"}`}
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AITutorChat;
