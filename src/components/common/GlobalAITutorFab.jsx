import React from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import LumoAvatar from "./LumoAvatar";
import { useProfile } from "../../app/ProfileContext";
import { useAITutor } from "../../app/AITutorContext";
import AITutorChat from "../Study/studyEnviron/AITutorChat";

const GlobalAITutorFab = ({ session: _session }) => {
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

  const location = useLocation();
  const { profile } = useProfile();
  const lumoState = isTyping ? "thinking" : messages.length > 0 ? "replied" : "thinking";

  const pathLower = location.pathname.toLowerCase();
  const isThreadPage = pathLower.includes("/chat/") && pathLower.split("/chat/")[1]?.trim().length > 0;
  if (isThreadPage) {
    return null;
  }

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
      <div className={`${mode === "fullpage" ? "hidden" : "flex"} w-full justify-end`}>
        <button
          type="button"
          onClick={handleToggle}
          data-guide="lumo-ai-fab"
          aria-label="Open Lumo"
          title="Open Lumo"
          className="group relative inline-flex min-h-11 items-center gap-2.5 rounded-xl bg-slate-900 px-4 py-2.5 text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:bg-slate-800 dark:focus-visible:ring-offset-slate-900 motion-reduce:transition-none"
        >
          <div className="relative flex items-center justify-center">
            <LumoAvatar size="sm" state={lumoState} className="motion-safe:transition-transform motion-safe:duration-300 group-hover:rotate-6" />
            {hasUnread && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
              </span>
            )}
          </div>
          <span className="text-sm font-semibold tracking-wide">Lumo</span>
        </button>
      </div>

      {createPortal(
        <div
          role={mode === "closed" ? undefined : "dialog"}
          aria-modal={mode === "closed" ? undefined : "true"}
          aria-label={mode === "closed" ? undefined : "Lumo AI tutor"}
          className={
            mode === "closed"
              ? "fixed inset-0 md:left-auto md:right-0 md:w-[380px] z-[60] pointer-events-none translate-x-full opacity-0 transition-all duration-200 ease-in-out motion-reduce:transition-none"
              : mode === "fullpage"
              ? "fixed isolate inset-0 h-[100dvh] w-screen z-[60] translate-x-0 opacity-100 transition-all duration-200 ease-in-out motion-reduce:transition-none"
              : "fixed isolate right-0 top-0 h-[100dvh] w-full min-w-0 z-[60] translate-x-0 opacity-100 transition-all duration-200 ease-in-out md:top-16 md:h-[calc(100dvh-4rem)] md:w-[clamp(380px,32vw,460px)] md:min-w-[360px] max-w-full motion-reduce:transition-none"
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
            user={{ name: profile?.full_name, avatar: profile?.user_img }}
            profile={profile}
            onActionExecute={handleActionExecute}
            width={mode === "fullpage" ? "100%" : 380}
          />
        </div>,
        document.body
      )}
    </>
  );
};

export default GlobalAITutorFab;
