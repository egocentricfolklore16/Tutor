import React, { createContext, useContext, useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import invokeAiTutor, { refreshSessionMaterials } from "../lib/aiTutor";
import supabase from "../lib/supabase";

const AITutorContext = createContext(null);

export function mapPathToScreen(pathname) {
  if (!pathname || pathname === "/" || pathname.startsWith("/Dashboard")) return "dashboard";
  if (pathname.startsWith("/Study")) return "study_session";
  if (pathname.startsWith("/Planner")) return "calendar";
  if (pathname.startsWith("/Library")) return "library";
  if (pathname.startsWith("/Progress")) return "progress";
  if (pathname.startsWith("/Community")) return "community";
  if (pathname.startsWith("/FAQ")) return "faq";
  if (pathname.startsWith("/Settings")) return "settings";
  if (pathname.startsWith("/onboarding")) return "onboarding";
  return "dashboard";
}

export function AITutorProvider({ children, session }) {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Live client state pieces
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [focusMode, setFocusMode] = useState("Deep work");
  const [pomodoroState, setPomodoroState] = useState("idle");
  const [minutesRemaining, setMinutesRemaining] = useState(0);
  const [panel, setPanel] = useState("none");
  const [quizInProgress, setQuizInProgress] = useState(null);

  // Throttle references
  const lastEventTimeRef = useRef(0);
  const eventCountRef = useRef(0);

  // Reset event count when active session changes
  useEffect(() => {
    eventCountRef.current = 0;
  }, [activeSessionId]);

  const user = session?.user || null;

  const getTutorClientState = (customPath = location.pathname) => {
    const clientState = {
      screen: mapPathToScreen(customPath),
      focus_mode: focusMode || "Deep work",
      pomodoro_state: pomodoroState || "idle",
      minutes_remaining: typeof minutesRemaining === "number" ? Math.max(0, Math.floor(minutesRemaining)) : 0,
      panel: panel || "none",
    };

    if (quizInProgress && quizInProgress.quiz_id) {
      clientState.quiz_in_progress = {
        quiz_id: String(quizInProgress.quiz_id),
        title: quizInProgress.title || "Quiz",
        question_number: Number(quizInProgress.question_number || 1),
        total: Number(quizInProgress.total || 1),
      };
    }

    return clientState;
  };

  const handleToggle = () => {
    setIsOpen((prev) => {
      const next = !prev;
      if (next) setHasUnread(false);
      return next;
    });
  };

  const sendMessage = async (customText = null) => {
    const text = (customText !== null ? customText : currentMessage).trim();
    if (!text || isTyping || !user) return;

    const userMsg = { sender: "user", text };
    const updatedMessages = [...messages, userMsg];

    setMessages(updatedMessages);
    if (customText === null) setCurrentMessage("");
    setIsTyping(true);

    const clientState = getTutorClientState();

    try {
      const res = await invokeAiTutor({
        sessionId: activeSessionId || 1,
        messages: updatedMessages,
        clientState,
      });

      if (res.error) {
        setMessages((msgs) => [
          ...msgs,
          {
            sender: "ai",
            text: res.error.message || "Failed to reach AI Tutor. Please try again.",
            actions: [],
            isError: true,
          },
        ]);
      } else {
        setMessages((msgs) => [
          ...msgs,
          {
            sender: "ai",
            text: res.reply || "",
            actions: res.actions || [],
          },
        ]);

        if (activeSessionId && Array.isArray(res.actions) && res.actions.length > 0) {
          refreshSessionMaterials(activeSessionId);
        }
      }
    } catch (err) {
      setMessages((msgs) => [
        ...msgs,
        {
          sender: "ai",
          text: `Error: ${err.message || "Failed to reach AI Tutor. Please try again."}`,
          actions: [],
          isError: true,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const sendTutorEvent = async (type, extra = {}) => {
    if (!user) return;

    // Skip break_started, break_ended, quiz_started in Deep work mode
    if (focusMode === "Deep work") {
      if (type === "break_started" || type === "break_ended" || type === "quiz_started") {
        return;
      }
    }

    // Throttle: max 1 per 20 seconds, max 10 per session
    const now = Date.now();
    if (now - lastEventTimeRef.current < 20000) return;
    if (eventCountRef.current >= 10) return;

    lastEventTimeRef.current = now;
    eventCountRef.current += 1;

    const eventObj = {
      type,
      ...(extra.quiz_id ? { quiz_id: String(extra.quiz_id) } : {}),
      ...(extra.score !== undefined ? { score: Number(extra.score) } : {}),
      ...(extra.total !== undefined ? { total: Number(extra.total) } : {}),
      ...(extra.minutes !== undefined ? { minutes: Number(extra.minutes) } : {}),
    };

    const clientState = getTutorClientState();
    clientState.event = eventObj;

    setIsTyping(true);
    try {
      const res = await invokeAiTutor({
        sessionId: activeSessionId || extra.session_id || 1,
        messages: messages, // existing history
        clientState,
      });

      if (res.reply) {
        setMessages((prev) => [
          ...prev,
          {
            sender: "ai",
            text: res.reply,
            actions: res.actions || [],
            eventType: type,
          },
        ]);

        if (!isOpen) {
          setHasUnread(true);
        }

        if (activeSessionId && Array.isArray(res.actions) && res.actions.length > 0) {
          refreshSessionMaterials(activeSessionId);
        }
      }
    } catch (err) {
      // Ignore failures silently without showing error toast/message
    } finally {
      setIsTyping(false);
    }
  };

  const clearMessages = () => {
    setMessages([]);
    setCurrentMessage("");
  };

  return (
    <AITutorContext.Provider
      value={{
        isOpen,
        setIsOpen,
        hasUnread,
        setHasUnread,
        handleToggle,
        messages,
        currentMessage,
        setCurrentMessage,
        sendMessage,
        sendTutorEvent,
        clearMessages,
        isTyping,
        getTutorClientState,
        // State setters for components to update live client state
        setActiveSessionId,
        setFocusMode,
        setPomodoroState,
        setMinutesRemaining,
        setPanel,
        setQuizInProgress,
        activeSessionId,
        focusMode,
        pomodoroState,
        minutesRemaining,
        panel,
        quizInProgress,
      }}
    >
      {children}
    </AITutorContext.Provider>
  );
}

export function useAITutor() {
  return (
    useContext(AITutorContext) || {
      isOpen: false,
      hasUnread: false,
      messages: [],
      currentMessage: "",
      setCurrentMessage: () => {},
      sendMessage: () => {},
      sendTutorEvent: () => {},
      clearMessages: () => {},
      isTyping: false,
      getTutorClientState: () => ({}),
      setActiveSessionId: () => {},
      setFocusMode: () => {},
      setPomodoroState: () => {},
      setMinutesRemaining: () => {},
      setPanel: () => {},
      setQuizInProgress: () => {},
    }
  );
}
