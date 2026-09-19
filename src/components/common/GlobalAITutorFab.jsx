import React from "react";
import { createPortal } from "react-dom";
import { Sparkles } from "lucide-react";
import { useProfile } from "../../app/ProfileContext";
import { useAITutor } from "../../app/AITutorContext";
import AITutorChat from "../Study/studyEnviron/AITutorChat";

const GlobalAITutorFab = ({ session }) => {
  const {
    isOpen,
    handleToggle,
    hasUnread,
    messages,
    currentMessage,
    setCurrentMessage,
    sendMessage,
    clearMessages,
    isTyping,
  } = useAITutor();

  const { profile } = useProfile();

  const handleSendMessage = () => {
    sendMessage();
  };

  return (
    <>
      {/* Floating Action Button (FAB) */}
      <div className="fixed bottom-6 right-6 z-[90] pb-[env(safe-area-inset-bottom)] pr-[env(safe-area-inset-right)]">
        <button
          type="button"
          onClick={handleToggle}
          aria-label="Open AI Tutor"
          title="Open AI Tutor"
          className="group relative inline-flex items-center gap-2.5 rounded-full bg-indigo-600 px-4 py-3 text-white shadow-xl transition-all duration-300 hover:bg-indigo-700 hover:scale-105 hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <div className="relative">
            <Sparkles className="h-5 w-5 transition-transform duration-300 group-hover:rotate-12" />
            {hasUnread && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
              </span>
            )}
          </div>
          <span className="text-sm font-semibold tracking-wide">AI Tutor</span>
        </button>
      </div>

      {/* Slide-over Overlay via createPortal */}
      {createPortal(
        <div
          className={`fixed inset-y-0 right-0 z-[100] transition-transform duration-300 ease-in-out ${
            isOpen ? "translate-x-0" : "translate-x-full pointer-events-none"
          }`}
        >
          <AITutorChat
            isOpen={isOpen}
            onClose={handleToggle}
            messages={messages}
            currentMessage={currentMessage}
            onMessageChange={setCurrentMessage}
            onSendMessage={handleSendMessage}
            onClear={clearMessages}
            isTyping={isTyping}
            width={380}
            theme={{ accentButton: "bg-indigo-600 hover:bg-indigo-700", accentBg: "bg-indigo-100" }}
          />
        </div>,
        document.body
      )}
    </>
  );
};

export default GlobalAITutorFab;
