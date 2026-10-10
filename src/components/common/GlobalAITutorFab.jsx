import React from "react";
import { createPortal } from "react-dom";
import LumoAvatar from "./LumoAvatar";
import { useProfile } from "../../app/ProfileContext";
import { useAITutor } from "../../app/AITutorContext";
import AITutorChat from "../Study/studyEnviron/AITutorChat";

const GlobalAITutorFab = ({ session }) => {
  const {
    mode,
    setMode,
    isOpen,
    handleToggle,
    hasUnread,
    messages,
    currentMessage,
    setCurrentMessage,
    sendMessage,
    clearMessages,
    isTyping,
    setPanel,
    setRequestedQuizId,
  } = useAITutor();

  const { profile } = useProfile();

  const handleSendMessage = () => {
    sendMessage();
  };

  const handleActionExecute = (action) => {
    if (action?.type !== "open_quiz" || !action.data?.quiz_id) return;
    setRequestedQuizId(action.data.quiz_id);
    setPanel("quizzes");
    handleToggle();
  };

  return (
    <>
      <div className="fixed bottom-20 right-4 z-[90] pb-[env(safe-area-inset-bottom)] pr-[env(safe-area-inset-right)] md:bottom-6 md:right-6">
        <button
          type="button"
          onClick={handleToggle}
          aria-label="Open Lumo"
          title="Open Lumo"
          className="group relative inline-flex items-center gap-2.5 rounded-full bg-slate-900 px-4 py-2.5 text-white shadow-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:bg-slate-800 dark:focus:ring-offset-slate-900"
        >
          <div className="relative flex items-center justify-center">
            <LumoAvatar size="sm" className="transition-transform duration-300 group-hover:rotate-6" />
            {hasUnread && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
              </span>
            )}
          </div>
          <span className="text-sm font-semibold tracking-wide">Lumo</span>
        </button>
      </div>

      {createPortal(
        <div
          className={
            mode === "closed"
              ? "fixed inset-0 md:left-auto md:right-0 md:w-[380px] z-[100] pointer-events-none translate-x-full opacity-0 transition-all duration-200 ease-in-out"
              : mode === "fullpage"
              ? "fixed inset-0 h-[100dvh] md:h-screen w-screen z-[100] translate-x-0 opacity-100 transition-all duration-200 ease-in-out"
              : "fixed inset-y-0 right-0 h-full w-full md:w-[380px] max-w-full z-[100] translate-x-0 opacity-100 transition-all duration-200 ease-in-out"
          }
        >
          <AITutorChat
            isOpen={isOpen}
            mode={mode}
            setMode={setMode}
            onClose={handleToggle}
            messages={messages}
            currentMessage={currentMessage}
            onMessageChange={setCurrentMessage}
            onSendMessage={handleSendMessage}
            onClear={clearMessages}
            isTyping={isTyping}
            onActionExecute={handleActionExecute}
            width={mode === "fullpage" ? "100%" : 380}
            theme={{ accentButton: "bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600", accentBg: "bg-violet-100 dark:bg-violet-900/40" }}
          />
        </div>,
        document.body
      )}
    </>
  );
};

export default GlobalAITutorFab;
