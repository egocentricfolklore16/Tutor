import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import invokeAiTutor, { refreshSessionMaterials } from "../lib/aiTutor";
import supabase from "../lib/supabase";

const AITutorContext = createContext(null);
const conversationCache = new Map();

function mapPathToScreen(pathname) {
  if (!pathname || pathname === "/" || pathname.startsWith("/Dashboard")) return "dashboard";
  if (pathname.startsWith("/courses")) return "study_session";
  if (pathname.startsWith("/Planner")) return "calendar";
  if (pathname.startsWith("/Library")) return "library";
  if (pathname.startsWith("/Progress")) return "progress";
  if (pathname.startsWith("/Community")) return "community";
  if (pathname.startsWith("/FAQ")) return "faq";
  if (pathname.startsWith("/Settings")) return "settings";
  if (pathname.startsWith("/onboarding")) return "onboarding";
  return "dashboard";
}

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia(query);
    const listener = (event) => setMatches(event.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [query]);
  return matches;
}

export function AITutorProvider({ children, session }) {
  const location = useLocation();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [mode, setModeState] = useState("closed");
  const previousDesktopModeRef = useRef("popout");
  const [hasUnread, setHasUnread] = useState(false);
  const isOpen = mode !== "closed";
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [conversationTitle, setConversationTitle] = useState("New chat");
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [conversationError, setConversationError] = useState("");
  const [offline, setOffline] = useState(typeof navigator !== "undefined" ? !navigator.onLine : false);
  const [historyRefreshVersion, setHistoryRefreshVersion] = useState(0);

  const [strictness, setStrictness] = useState("hints_then_answer");
  const [strictnessSaveStatus, setStrictnessSaveStatus] = useState("idle");
  const [strictnessError, setStrictnessError] = useState("");
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [focusMode, setFocusMode] = useState("Deep work");
  const [pomodoroState, setPomodoroState] = useState("idle");
  const [minutesRemaining, setMinutesRemaining] = useState(0);
  const [panel, setPanel] = useState("none");
  const [quizInProgress, setQuizInProgress] = useState(null);
  const [requestedQuizId, setRequestedQuizId] = useState(null);
  const lastEventTimeRef = useRef(0);
  const eventCountRef = useRef(0);
  const conversationIdRef = useRef(null);
  const openingKeyRef = useRef("");
  const kickoffKeyRef = useRef("");
  const user = session?.user || null;
  const previousUserIdRef = useRef(null);
  conversationIdRef.current = conversationId;

  const setMode = useCallback((newModeOrFn) => {
    setModeState((previous) => {
      const next = typeof newModeOrFn === "function" ? newModeOrFn(previous) : newModeOrFn;
      if (next !== "closed" && isDesktop) previousDesktopModeRef.current = next;
      return next;
    });
  }, [isDesktop]);

  const setIsOpen = useCallback((valueOrFn) => {
    setMode((previous) => {
      const nextOpen = typeof valueOrFn === "function" ? valueOrFn(previous !== "closed") : valueOrFn;
      if (!nextOpen) return "closed";
      if (previous !== "closed") return previous;
      return isDesktop ? (previousDesktopModeRef.current || "popout") : "fullpage";
    });
  }, [isDesktop, setMode]);

  const handleToggle = () => {
    setMode((previous) => {
      if (previous !== "closed") return "closed";
      setHasUnread(false);
      return isDesktop ? (previousDesktopModeRef.current || "popout") : "fullpage";
    });
  };

  useEffect(() => {
    const updateOnline = () => setOffline(!navigator.onLine);
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  useEffect(() => {
    eventCountRef.current = 0;
  }, [activeSessionId]);

  useEffect(() => {
    if (!user?.id) {
      if (previousUserIdRef.current) {
        localStorage.removeItem(lastOpenKey(previousUserIdRef.current));
      }
      conversationCache.clear();
      openingKeyRef.current = "";
      kickoffKeyRef.current = "";
      setConversationId(null);
      setConversationTitle("New chat");
      setMessages([]);
      setCurrentMessage("");
      return;
    }
    previousUserIdRef.current = user.id;
    let isMounted = true;
    supabase.from("user_preferences").select("socratic_strictness").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (isMounted && data?.socratic_strictness) setStrictness(data.socratic_strictness);
      });
    return () => { isMounted = false; };
  }, [user?.id]);

  const updateStrictness = async (newValue) => {
    if (!newValue || newValue === strictness) return;
    const previous = strictness;
    setStrictness(newValue);
    setStrictnessSaveStatus("saving");
    setStrictnessError("");
    const { error: rpcError } = await supabase.rpc("set_socratic_strictness", { p_strictness: newValue });
    let saveError = rpcError;
    if (saveError) {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id || user?.id;
      if (uid) {
        const { error } = await supabase.from("user_preferences").upsert(
          { user_id: uid, socratic_strictness: newValue, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );
        saveError = error;
      }
    }
    if (saveError) {
      setStrictness(previous);
      setStrictnessSaveStatus("error");
      setStrictnessError("Couldn't save your tutor mode.");
    } else {
      setStrictnessSaveStatus("saved");
      setTimeout(() => setStrictnessSaveStatus("idle"), 2000);
    }
  };

  const getTutorClientState = useCallback((customPath = location.pathname) => {
    const state = {
      screen: mapPathToScreen(customPath),
      focus_mode: focusMode || "Deep work",
      pomodoro_state: pomodoroState || "idle",
      minutes_remaining: typeof minutesRemaining === "number" ? Math.max(0, Math.floor(minutesRemaining)) : 0,
      panel: panel || "none",
    };
    if (quizInProgress?.quiz_id) {
      state.quiz_in_progress = {
        quiz_id: String(quizInProgress.quiz_id),
        title: quizInProgress.title || "Quiz",
        question_number: Number(quizInProgress.question_number || 1),
        total: Number(quizInProgress.total || 1),
      };
    }
    return state;
  }, [location.pathname, focusMode, pomodoroState, minutesRemaining, panel, quizInProgress]);

  const lastOpenKey = (uid) => `hyper-tutor:last-ai-conversation:${uid}`;

  const loadMessages = useCallback(async (id) => {
    if (!id || !user?.id) return;
    setConversationError("");
    setIsLoadingConversation(true);
    const cached = conversationCache.get(id);
    if (cached) setMessages(cached);

    const { data: conversation, error: conversationErrorResult } = await supabase
      .from("ai_conversations").select("*").eq("id", id).eq("archived", false).maybeSingle();
    if (conversationErrorResult || !conversation) {
      setIsLoadingConversation(false);
      setConversationId(null);
      conversationIdRef.current = null;
      setConversationTitle("New chat");
      setMessages([]);
      localStorage.removeItem(lastOpenKey(user.id));
      return;
    }

    const { data, error } = await supabase
      .from("ai_messages").select("*").eq("conversation_id", id)
      .order("created_at", { ascending: false }).limit(50);
    if (error) {
      setConversationError("Couldn't load this chat. Please try again.");
    } else {
      const loaded = (data || []).reverse().map((message) => ({
        id: message.id,
        sender: message.role === "user" ? "user" : "ai",
        text: message.content,
        actions: Array.isArray(message.actions) ? message.actions : [],
        isEvent: message.is_event,
        createdAt: message.created_at,
      }));
      conversationCache.set(id, loaded);
      setMessages(loaded);
    }
    setConversationId(id);
    conversationIdRef.current = id;
    setConversationTitle(conversation.title || "New chat");
    localStorage.setItem(lastOpenKey(user.id), id);
    setIsLoadingConversation(false);
  }, [user?.id]);

  const loadLatest = useCallback(async (sessionId = activeSessionId) => {
    if (!user?.id) return;
    setConversationError("");
    setIsLoadingConversation(true);
    let query = supabase.from("ai_conversations").select("*").eq("user_id", user.id).eq("archived", false);
    if (sessionId) query = query.eq("session_id", sessionId);
    const { data, error } = await query.order("last_message_at", { ascending: false }).limit(1).maybeSingle();
    setIsLoadingConversation(false);
    if (error) {
      setConversationError("Couldn't load your chats. Please try again.");
      return;
    }
    if (data?.id) {
      await loadMessages(data.id);
      return;
    }
    if (sessionId) {
      const { data: overall } = await supabase
        .from("ai_conversations").select("*").eq("user_id", user.id).eq("archived", false)
        .order("last_message_at", { ascending: false }).limit(1).maybeSingle();
      if (overall?.id) await loadMessages(overall.id);
    }
  }, [user?.id, activeSessionId, loadMessages]);

  const openRestore = useCallback(async () => {
    if (!user?.id) return;
    const savedId = localStorage.getItem(lastOpenKey(user.id));
    if (savedId) {
      const { data } = await supabase.from("ai_conversations").select("*").eq("id", savedId).eq("archived", false).maybeSingle();
      if (data?.id) {
        await loadMessages(savedId);
        return;
      }
      localStorage.removeItem(lastOpenKey(user.id));
    }
    await loadLatest(activeSessionId);
  }, [user?.id, activeSessionId, loadLatest, loadMessages]);

  useEffect(() => {
    if (!isOpen || !user?.id) return;
    const key = `${user.id}:${activeSessionId || "all"}`;
    if (openingKeyRef.current === key) return;
    openingKeyRef.current = key;
    openRestore();
  }, [isOpen, user?.id, activeSessionId, openRestore]);

  useEffect(() => {
    const refetch = () => {
      if (document.visibilityState === "visible" && user?.id) {
        if (conversationIdRef.current) loadMessages(conversationIdRef.current);
        else openRestore();
      }
    };
    window.addEventListener("focus", refetch);
    document.addEventListener("visibilitychange", refetch);
    return () => {
      window.removeEventListener("focus", refetch);
      document.removeEventListener("visibilitychange", refetch);
    };
  }, [user?.id, loadMessages, openRestore]);

  const appendToActive = useCallback((message) => {
    setMessages((previous) => [...previous, message]);
  }, []);

  const performSend = useCallback(async ({
    studentMessage,
    sourceConversationId,
    asEvent = false,
  }) => {
    if (offline) return { error: "offline" };
    if (!user) return { error: "auth" };
    setIsTyping(true);
    const state = getTutorClientState();
    if (asEvent) state.event = state.event || {};

    const res = await invokeAiTutor({
      studentMessage,
      conversationId: sourceConversationId || null,
      sessionId: activeSessionId,
      clientState: state,
    });
    setIsTyping(false);

    if (res.error) {
      if (res.error.status === 404) {
        if (conversationIdRef.current === sourceConversationId) {
          setConversationId(null);
          conversationIdRef.current = null;
          setConversationTitle("New chat");
          setMessages([]);
          localStorage.removeItem(lastOpenKey(user.id));
        }
        return res;
      }
      return res;
    }

    if (res.conversationId) {
      if (!sourceConversationId || conversationIdRef.current === sourceConversationId) {
        setConversationId(res.conversationId);
        conversationIdRef.current = res.conversationId;
        if (res.title) setConversationTitle(res.title);
        localStorage.setItem(lastOpenKey(user.id), res.conversationId);
      }
      conversationCache.set(res.conversationId, [
        ...(conversationCache.get(res.conversationId) || []),
        {
          id: `ai-${Date.now()}`,
          sender: "ai",
          text: res.reply,
          actions: res.actions,
          isEvent: asEvent,
        },
      ]);
    }

    if (conversationIdRef.current === (res.conversationId || sourceConversationId)) {
      appendToActive({
        id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        sender: "ai",
        text: res.reply,
        actions: res.actions,
        isEvent: asEvent,
      });
    }
    setHistoryRefreshVersion((version) => version + 1);
    if (activeSessionId && res.actions.length > 0) refreshSessionMaterials(activeSessionId);
    return res;
  }, [offline, user, getTutorClientState, activeSessionId, appendToActive]);

  const sendMessage = useCallback(async (customText = null) => {
    const text = (customText !== null ? customText : currentMessage).trim();
    if (!text || isTyping || !user || offline) return;
    const sourceConversationId = conversationIdRef.current;
    const userMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sender: "user",
      text,
    };
    setMessages((previous) => [...previous, userMessage]);
    if (customText === null) setCurrentMessage("");

    const res = await performSend({ studentMessage: text, sourceConversationId });
    if (res?.error) {
      const friendly = res.error === "offline"
        ? "You're offline. Your message will send when you're back online."
        : res.error?.status === 429
          ? "You've reached the request limit. Please take a short break."
          : res.error?.status === 503
            ? "Lumo is busy. Please try again shortly."
            : "Lumo couldn't answer right now. Please try again.";
      setMessages((previous) => [...previous, {
        id: `ai-error-${Date.now()}`,
        sender: "ai",
        text: friendly,
        actions: [],
        isError: true,
        retryText: text,
        retryConversationId: sourceConversationId,
      }]);
    }
  }, [currentMessage, isTyping, user, offline, performSend]);

  const retryFailed = useCallback(async (message) => {
    if (!message?.retryText || isTyping) return;
    setMessages((previous) => previous.filter((item) => item.id !== message.id));
    await performSend({
      studentMessage: message.retryText,
      sourceConversationId: message.retryConversationId,
    });
  }, [isTyping, performSend]);

  const sendKickoff = useCallback(async () => {
    if (!user?.id || kickoffKeyRef.current || isTyping) return;
    kickoffKeyRef.current = `${user.id}:kickoff:${activeSessionId || "all"}`;
    await performSend({
      studentMessage: "(The student just opened the tutor panel. Greet them briefly.)",
      sourceConversationId: null,
      asEvent: true,
    });
  }, [user?.id, activeSessionId, isTyping, performSend]);

  useEffect(() => {
    if (!isOpen || isLoadingConversation || conversationId || messages.length > 0) return;
    const key = `${user?.id || ""}:${activeSessionId || "all"}`;
    if (kickoffKeyRef.current.startsWith(`${user?.id}:kickoff:`) === false) sendKickoff();
    else if (!kickoffKeyRef.current.includes(key)) sendKickoff();
  }, [isOpen, isLoadingConversation, conversationId, messages.length, user?.id, activeSessionId, sendKickoff]);

  const newChat = useCallback(() => {
    setConversationId(null);
    conversationIdRef.current = null;
    setConversationTitle("New chat");
    setMessages([]);
    setCurrentMessage("");
    setConversationError("");
    if (user?.id) localStorage.removeItem(lastOpenKey(user.id));
  }, [user?.id]);

  const clearAllChats = useCallback(async () => {
    if (!user?.id) return { error: "auth" };
    const { error } = await supabase.from("ai_conversations").delete().eq("user_id", user.id);
    if (error) return { error };
    conversationCache.clear();
    localStorage.removeItem(lastOpenKey(user.id));
    newChat();
    setHistoryRefreshVersion((version) => version + 1);
    return { success: true };
  }, [user?.id, newChat]);

  const loadEarlierMessages = useCallback(async () => {
    if (!conversationIdRef.current || !messages.length) return [];
    const oldest = messages[0];
    if (!oldest?.createdAt) return [];
    const { data, error } = await supabase
      .from("ai_messages").select("*").eq("conversation_id", conversationIdRef.current)
      .lt("created_at", oldest.createdAt).order("created_at", { ascending: false }).limit(50);
    if (error) return [];
    const earlier = (data || []).reverse().map((message) => ({
      id: message.id,
      sender: message.role === "user" ? "user" : "ai",
      text: message.content,
      actions: Array.isArray(message.actions) ? message.actions : [],
      isEvent: message.is_event,
      createdAt: message.created_at,
    }));
    if (earlier.length) setMessages((previous) => [...earlier, ...previous]);
    return earlier;
  }, [messages]);

  const sendTutorEvent = useCallback(async (type, extra = {}) => {
    if (!user) return;
    if (focusMode === "Deep work" && ["break_started", "break_ended", "quiz_started"].includes(type)) return;
    const now = Date.now();
    if (now - lastEventTimeRef.current < 20000 || eventCountRef.current >= 10) return;
    lastEventTimeRef.current = now;
    eventCountRef.current += 1;
    const eventObj = {
      type,
      ...(extra.quiz_id ? { quiz_id: String(extra.quiz_id) } : {}),
      ...(extra.score !== undefined ? { score: Number(extra.score) } : {}),
      ...(extra.total !== undefined ? { total: Number(extra.total) } : {}),
      ...(extra.minutes !== undefined ? { minutes: Number(extra.minutes) } : {}),
    };
    const state = getTutorClientState();
    state.event = eventObj;
    const source = conversationIdRef.current;
    const res = await invokeAiTutor({
      studentMessage: "(app event)",
      conversationId: source,
      sessionId: activeSessionId || extra.session_id,
      clientState: state,
    });
    if (res.error) return;
    if (res.conversationId) {
      setConversationId(res.conversationId);
      conversationIdRef.current = res.conversationId;
      if (res.title) setConversationTitle(res.title);
      localStorage.setItem(lastOpenKey(user.id), res.conversationId);
    }
    if (conversationIdRef.current === (res.conversationId || source)) {
      appendToActive({ id: `ai-event-${Date.now()}`, sender: "ai", text: res.reply, actions: res.actions, eventType: type, isEvent: true });
    }
  }, [user, focusMode, getTutorClientState, activeSessionId, appendToActive]);

  useEffect(() => {
    if (mode === "fullpage") {
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = previous || ""; };
    }
  }, [mode]);

  useEffect(() => {
    if (mode === "closed") return;
    if (!isDesktop && mode !== "fullpage") setModeState("fullpage");
  }, [isDesktop, mode]);

  return (
    <AITutorContext.Provider value={{
      mode, setMode, isOpen, setIsOpen, hasUnread, setHasUnread, handleToggle,
      messages, currentMessage, setCurrentMessage, sendMessage, retryFailed, sendTutorEvent,
      clearMessages: newChat, newChat, clearAllChats, isTyping, getTutorClientState,
      setActiveSessionId, setFocusMode, setPomodoroState, setMinutesRemaining, setPanel,
      setQuizInProgress, setRequestedQuizId, activeSessionId, focusMode, pomodoroState,
      minutesRemaining, panel, quizInProgress, requestedQuizId,
      strictness, strictnessSaveStatus, strictnessError, updateStrictness,
      conversationId, conversationTitle, setConversationTitle,
      userId: user?.id || null,
      selectConversation: loadMessages, loadEarlierMessages, isLoadingConversation,
      conversationError, retryConversationLoad: openRestore, offline, historyRefreshVersion,
    }}>
      {children}
    </AITutorContext.Provider>
  );
}

export function useAITutor() {
  return useContext(AITutorContext) || {
    mode: "closed", setMode: () => {}, isOpen: false, setIsOpen: () => {},
    handleToggle: () => {}, hasUnread: false, setHasUnread: () => {},
    messages: [], currentMessage: "", setCurrentMessage: () => {}, sendMessage: () => {},
    retryFailed: () => {}, sendTutorEvent: () => {}, clearMessages: () => {}, newChat: () => {},
    clearAllChats: async () => ({ success: false }), isTyping: false,
    getTutorClientState: () => ({}), setActiveSessionId: () => {},
    setFocusMode: () => {}, setPomodoroState: () => {}, setMinutesRemaining: () => {},
    setPanel: () => {}, setQuizInProgress: () => {}, setRequestedQuizId: () => {},
    activeSessionId: null, requestedQuizId: null, panel: "none",
    strictness: "hints_then_answer", strictnessSaveStatus: "idle", strictnessError: "",
    updateStrictness: () => {}, conversationId: null, conversationTitle: "New chat",
    selectConversation: async () => {}, loadEarlierMessages: async () => [],
    isLoadingConversation: false, conversationError: "", retryConversationLoad: () => {},
    offline: false, historyRefreshVersion: 0,
  };
}
