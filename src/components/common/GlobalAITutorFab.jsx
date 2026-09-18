import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router";
import { MessageCircle, Sparkles } from "lucide-react";
import supabase from "../../lib/supabase";
import { useProfile } from "../../app/ProfileContext";
import AITutorChat from "../Study/studyEnviron/AITutorChat";

const GlobalAITutorFab = ({ session }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [hasNudge, setHasNudge] = useState(true);

  const { profile } = useProfile();
  const location = useLocation();

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
    if (hasNudge) setHasNudge(false);
  };

  const handleSendMessage = async () => {
    const text = currentMessage.trim();
    if (!text || isTyping) return;

    const userMsg = { sender: "user", text };
    const updatedMessages = [...messages, userMsg];

    setMessages(updatedMessages);
    setCurrentMessage("");
    setIsTyping(true);

    const studentLevel = profile?.education_level || "High School";
    const curriculumStandard = profile?.curriculum_standard || "None/General";
    const knowledgeGaps = Array.isArray(profile?.knowledge_gaps) ? profile.knowledge_gaps : [];
    const userId = session?.user?.id || profile?.user_id;

    try {
      const { data, error } = await supabase.functions.invoke("ai-tutor-chat", {
        body: {
          student_id: userId,
          student_message: text,
          student_level: studentLevel,
          curriculum_standard: curriculumStandard,
          knowledge_gaps: knowledgeGaps,
          conversation_history: updatedMessages,
        },
      });

      if (error || !data?.success) {
        console.warn("Edge function response error/fallback:", error || data?.error);
        // Fallback response if Edge Function is unavailable
        const topic = profile?.current_topic || location.pathname.replace("/", "") || "your current subject";
        const fallbackReply = `Let's work through this together for ${topic}! What specific part of this question would you like to start with?`;
        setMessages((msgs) => [...msgs, { sender: "ai", text: data?.reply || fallbackReply, actions: data?.actions_taken || [] }]);
      } else {
        setMessages((msgs) => [
          ...msgs,
          {
            sender: "ai",
            text: data.reply || "I'm here to help you study!",
            actions: data.actions_taken || [],
          },
        ]);
      }
    } catch (err) {
      console.error("Failed to communicate with AI Tutor:", err);
      setMessages((msgs) => [
        ...msgs,
        {
          sender: "ai",
          text: "I experienced a temporary connection issue. Let's try breaking that down again!",
          actions: [],
        },
      ]);
    } finally {
      setIsTyping(false);
    }
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
            {hasNudge && (
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
            onClose={() => setIsOpen(false)}
            messages={messages}
            currentMessage={currentMessage}
            onMessageChange={setCurrentMessage}
            onSendMessage={handleSendMessage}
            onClear={() => {
              setMessages([]);
              setCurrentMessage("");
            }}
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
