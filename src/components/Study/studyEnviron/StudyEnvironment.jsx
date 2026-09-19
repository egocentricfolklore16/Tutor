import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  FileText,
  HelpCircle,
  Library,
  ChevronDown,
  MessageCircle,
  Loader2,
  Play,
  Pause,
  RotateCcw,
} from "lucide-react";
import supabase from "../../../lib/supabase";
import { updateStreakForActivity } from "../../../lib/streaks";
import { awardUserRewards } from "../../../lib/gamification";
import { invokeAiTutor } from "../../../lib/aiTutor";
import AITutorChat from "./AITutorChat";
import Flashcards from "./Flashcards";
import NoteEditor from "./NoteEditor";
import PracticeQuestions from "./PracticeQuestions";
import ResourceAttachments from "./ResourceAttachments";
import LoadingCompanion from "../../common/LoadingCompanion";

// StudyEnvironment: orchestrates the study workspace, tool navigation and AI pane.
const StudyEnvironment = ({ session: incomingSession, user: incomingUser }) => {
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [activeTool, setActiveTool] = useState("pomodoro");
  const [session, setSession] = useState(incomingSession || null);
  const [isLoading, setIsLoading] = useState(!incomingSession);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const [userId, setUserId] = useState(null);
  const [aiMessages, setAiMessages] = useState([]);
  const [aiMessage, setAiMessage] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [timeline, setTimeline] = useState([]);
  const [flashcardRefreshKey, setFlashcardRefreshKey] = useState(0);

  const initialGreetingFetched = useRef(false);

  const handleTimelineEvent = (eventItem) => {
    if (!eventItem) return;
    setTimeline((prev) => [...prev, eventItem]);
  };
  const { Studyid } = useParams();
  const navigate = useNavigate();

  const toTitleCase = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/\b\w/g, (character) => character.toUpperCase());

  useEffect(() => {
    if (incomingSession || !Studyid) return;

    const fetchSession = async () => {
      setIsLoading(true);
      const { data, error: fetchError } = await supabase
        .from("Study")
        .select("*")
        .eq("id", Studyid)
        .single();

      if (fetchError) {
        setError("Unable to load this study session.");
        console.error("Supabase session fetch error:", fetchError);
      } else {
        setSession(data);
      }
      setIsLoading(false);
    };

    fetchSession();
  }, [Studyid, incomingSession]);

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) return;
      setUserId(authUser.id);

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", authUser.id)
        .single();

      if (profileError) {
        console.error("Supabase profile fetch error:", profileError);
      }

      setProfile(data || {});
    };

    fetchProfile();
  }, []);

  const currentSessionId = session?.id || Studyid;

  // Restore chat messages from sessionStorage for this session
  useEffect(() => {
    if (!currentSessionId) return;
    try {
      const stored = sessionStorage.getItem(`ai_chat_${currentSessionId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAiMessages(parsed);
          initialGreetingFetched.current = true;
        }
      }
    } catch (e) {
      console.error("Failed to restore AI chat session storage:", e);
    }
  }, [currentSessionId]);

  // Save chat messages to sessionStorage on update
  useEffect(() => {
    if (!currentSessionId || aiMessages.length === 0) return;
    try {
      sessionStorage.setItem(`ai_chat_${currentSessionId}`, JSON.stringify(aiMessages));
    } catch (e) {
      console.error("Failed to save AI chat session storage:", e);
    }
  }, [currentSessionId, aiMessages]);

  const durationHours = session?.Duration ? Number(session.Duration) : 1;
  const durationSeconds = Math.round(durationHours * 3600);

  const initialTimeLeft =
    session?.time_left !== undefined && session?.time_left !== null && Number(session.time_left) > 0
      ? Number(session.time_left)
      : durationSeconds;

  const [timeLeft, setTimeLeft] = useState(initialTimeLeft);
  const [isStudying, setIsStudying] = useState(true);
  const pomodoroRecorded = useRef(false);
  const timeLeftRef = useRef(timeLeft);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  useEffect(() => {
    const nextTime =
      session?.time_left !== undefined && session?.time_left !== null && Number(session.time_left) > 0
        ? Number(session.time_left)
        : durationSeconds;
    setTimeLeft(nextTime);
    pomodoroRecorded.current = false;
    setSessionComplete(false);
  }, [durationSeconds, session?.time_left]);

  // Persist paused state on navigation away, tab close, or unmount
  const savePausedState = async () => {
    if (!session?.id || pomodoroRecorded.current || timeLeftRef.current <= 0) return;
    try {
      await supabase
        .from("Study")
        .update({
          session_status: "paused",
          time_left: timeLeftRef.current,
        })
        .eq("id", session.id);
    } catch (err) {
      console.error("Error saving paused study state:", err);
    }
  };

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (session?.id && !pomodoroRecorded.current && timeLeftRef.current > 0) {
        savePausedState();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && session?.id && !pomodoroRecorded.current && timeLeftRef.current > 0) {
        savePausedState();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      savePausedState();
    };
  }, [session?.id]);

  useEffect(() => {
    if (!isStudying || timeLeft <= 0) return undefined;
    const timer = window.setInterval(() => {
      setTimeLeft((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isStudying, timeLeft]);

  useEffect(() => {
    if (timeLeft !== 0 || pomodoroRecorded.current || !session?.id) return;
    pomodoroRecorded.current = true;
    
    const completeSession = async () => {
      let activeUserId = userId;
      if (!activeUserId) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        activeUserId = authUser?.id;
      }

      if (!activeUserId) return;

      try {
        await supabase
          .from("Study")
          .update({ completed: true, session_status: "completed", time_left: 0 })
          .eq("id", session.id);

        await awardUserRewards(activeUserId, 50, 10, "Completed study session");

        const streakResult = await updateStreakForActivity(activeUserId);

        const currentSubject = session.Subject || "General";
        const currentTopic = session.Topic || "Study Session";
        const currentDuration = session.Duration ? Number(session.Duration) : 1;

        await supabase.from("study_history").insert({
          user_id: activeUserId,
          session_id: session.id,
          subject: currentSubject,
          topic: currentTopic,
          duration_hours: currentDuration,
          xp_earned: 50,
          gems_earned: 10,
          completed_at: new Date().toISOString(),
          notes_count: 0,
          flashcards_count: 0,
          timeline: timeline,
        });

      } catch (err) {
        console.error("Error completing session in StudyEnvironment:", err);
      }

      setTimeout(() => {
        if (window.confirm("Congratulations! You completed your study session. Return to study dashboard?")) {
          navigate("/Study");
        }
      }, 2000);
    };
    
    completeSession();
  }, [timeLeft, userId, session]);

  useEffect(() => {
    if (timeLeft === 0) setSessionComplete(true);
  }, [timeLeft]);

  const user =
    incomingUser ||
    (session
      ? {
          name: profile?.full_name || "User",
          avatar: profile?.user_img || "",
        }
      : null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingCompanion message="Preparing your study workspace..." />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 flex flex-col items-center justify-center">
        <p className="text-red-600 font-semibold mb-4">{error || "Session not found."}</p>
        <button
          onClick={() => navigate("/Study")}
          className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Study
        </button>
      </div>
    );
  }

  const subject = session.Subject || "General Subject";
  const topic = session.Topic || "General Topic";
  const date = session.Date || "Today";
  const start = session.Start ? session.Start.slice(0, 5) : "Flexible";
  const duration = session.Duration || 1;
  const status = toTitleCase(session.Status || "Important");
  const normalizedStatus = status.toLowerCase();

  const importanceTheme = {
    "very important": {
      header: "accent-card-plan text-white",
      eyebrow: "text-red-100",
      topic: "text-red-50",
      divider: "border-red-400/30",
      detail: "text-red-100",
      pill: "bg-white/20 text-white",
      accent: "text-red-600",
      accentText: "text-red-800",
      accentBg: "bg-red-50",
      accentButton: "bg-red-600 hover:bg-red-700",
      focus: "focus:border-red-500 focus:ring-red-100",
      accentBorder: "hover:border-red-300",
    },
    important: {
      header: "accent-card-chat text-white",
      eyebrow: "text-amber-100",
      topic: "text-amber-50",
      divider: "border-amber-400/30",
      detail: "text-amber-100",
      pill: "bg-white/20 text-white",
      accent: "text-amber-600",
      accentText: "text-amber-800",
      accentBg: "bg-amber-50",
      accentButton: "bg-amber-600 hover:bg-amber-700",
      focus: "focus:border-amber-500 focus:ring-amber-100",
      accentBorder: "hover:border-amber-300",
    },
    "not so important": {
      header: "accent-card-track text-white",
      eyebrow: "text-green-100",
      topic: "text-green-50",
      divider: "border-green-400/30",
      detail: "text-green-100",
      pill: "bg-white/20 text-white",
      accent: "text-green-600",
      accentText: "text-green-800",
      accentBg: "bg-green-50",
      accentButton: "bg-green-600 hover:bg-green-700",
      focus: "focus:border-green-500 focus:ring-green-100",
      accentBorder: "hover:border-green-300",
    },
  }[normalizedStatus] || {
    header: "bg-slate-100 text-slate-950",
    eyebrow: "text-slate-700",
    topic: "text-slate-900",
    divider: "border-slate-200",
    detail: "text-slate-800",
    pill: "bg-slate-200 text-slate-900",
    accent: "text-slate-600",
    accentText: "text-slate-700",
    accentBg: "bg-slate-50",
    accentButton: "bg-slate-600 hover:bg-slate-700",
    focus: "focus:border-slate-500 focus:ring-slate-100",
    accentBorder: "hover:border-slate-300",
  };

  const formattedTime = (value) => String(value).padStart(2, "0");
  const hoursLeft = Math.floor(timeLeft / 3600);
  const minutesLeft = Math.floor((timeLeft % 3600) / 60);
  const secondsLeft = timeLeft % 60;

  const getClientState = () => ({
    focus_mode: "Deep work",
    pomodoro_state: isStudying ? "focus" : "idle",
    minutes_remaining: Math.ceil(timeLeft / 60),
  });

  // Fetch initial greeting on first AI drawer open
  useEffect(() => {
    if (!isAIOpen || initialGreetingFetched.current || !session?.id) return;
    initialGreetingFetched.current = true;

    const fetchGreeting = async () => {
      setIsAiTyping(true);
      const res = await invokeAiTutor({
        sessionId: session.id,
        messages: [],
        clientState: getClientState(),
      });
      setIsAiTyping(false);

      if (res.error) {
        setAiMessages([
          {
            sender: "ai",
            text: res.error.message || "Failed to initialize AI Tutor.",
            isError: true,
          },
        ]);
      } else if (res.reply) {
        setAiMessages([
          {
            sender: "ai",
            text: res.reply,
            actions: res.actions,
          },
        ]);
      }
    };

    fetchGreeting();
  }, [isAIOpen, session?.id]);

  const sendAiMessage = async (customText) => {
    const text = (customText !== undefined ? customText : aiMessage).trim();
    if (!text || isAiTyping || !session?.id) return;

    const userMsg = { sender: "user", text };
    const updatedMessages = [...aiMessages, userMsg];

    setAiMessages(updatedMessages);
    if (customText === undefined) setAiMessage("");
    setIsAiTyping(true);

    try {
      const formattedHistory = updatedMessages.map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text,
      }));

      const res = await invokeAiTutor({
        sessionId: session.id,
        messages: formattedHistory,
        clientState: getClientState(),
      });

      if (res.error) {
        setAiMessages((msgs) => [
          ...msgs,
          {
            sender: "ai",
            text: res.error.message || "Failed to reach AI Tutor.",
            actions: [],
            isError: true,
          },
        ]);
      } else {
        setAiMessages((msgs) => [
          ...msgs,
          {
            sender: "ai",
            text: res.reply,
            actions: res.actions,
          },
        ]);

        // Process tool side-effects on the UI
        if (Array.isArray(res.actions)) {
          for (const act of res.actions) {
            if (act.status === "success") {
              if (act.type === "flashcards") {
                setFlashcardRefreshKey((k) => k + 1);
              } else if (act.type === "quiz") {
                setActiveTool("quizzicle");
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("Error calling AI tutor in StudyEnvironment:", err);
      setAiMessages((msgs) => [
        ...msgs,
        {
          sender: "ai",
          text: `Error: ${err.message || "Failed to reach AI Tutor. Please try again."}`,
          actions: [],
          isError: true,
        },
      ]);
    } finally {
      setIsAiTyping(false);
    }
  };

  const handleActionExecute = (actionEvent) => {
    if (actionEvent.type === "open_flashcards") {
      setActiveTool("flashcards");
    } else if (actionEvent.type === "open_quiz") {
      setActiveTool("quizzicle");
    }
  };

  const renderTool = () => {
    if (activeTool === "notes") {
      return <NoteEditor studyId={Studyid || session.id} userId={userId} theme={importanceTheme} onTimelineEvent={handleTimelineEvent} />;
    }
    if (activeTool === "flashcards") return <Flashcards key={flashcardRefreshKey} studyId={Studyid || session.id} userId={userId} theme={importanceTheme} onTimelineEvent={handleTimelineEvent} />;
    if (activeTool === "quizzicle") return <PracticeQuestions theme={importanceTheme} studyId={Studyid || session.id} userId={userId} topic={topic} onTimelineEvent={handleTimelineEvent} />;
    if (activeTool === "resources") return <ResourceAttachments studyId={Studyid || session.id} userId={userId} theme={importanceTheme} onTimelineEvent={handleTimelineEvent} />;
    return (
      <div>
        <div className="grid grid-cols-3 gap-3">
          {[
            [formattedTime(hoursLeft), "Hours", "accent-card-chat"],
            [formattedTime(minutesLeft), "Minutes", "accent-card-plan"],
            [formattedTime(secondsLeft), "Seconds", "accent-card-track"],
          ].map(([value, label, cardClass]) => (
            <div key={label} className={`rounded-xl p-5 text-center ${cardClass}`}>
              <div className="text-3xl font-bold text-white md:text-5xl">{value}</div>
              <div className="mt-2 text-xs font-medium uppercase tracking-wide text-white/85">{label}</div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => setIsStudying((studying) => !studying)}
            className="inline-flex items-center gap-2 rounded-lg bg-black px-5 py-3 font-semibold text-white hover:bg-slate-900"
          >
            {isStudying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isStudying ? "Pause timer" : "Resume timer"}
          </button>
          <button
            onClick={() => {
              setTimeLeft(durationSeconds);
              setIsStudying(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-5 py-3 font-semibold text-slate-600 hover:bg-slate-50"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        </div>
      </div>
    );
  };

  const toolsList = [
    { id: "pomodoro", label: "Pomodoro Timer", Icon: Clock },
    { id: "notes", label: "Notes", Icon: FileText },
    { id: "flashcards", label: "Flashcards", Icon: Library },
    { id: "quizzicle", label: "Quizicle", Icon: HelpCircle },
    { id: "resources", label: "Resources", Icon: BookOpen },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main
        className={`min-w-0 px-3 py-4 sm:px-5 md:px-6 xl:px-10 transition-all duration-300 ${
          isAIOpen ? "xl:mr-[370px]" : "mr-0"
        }`}
      >
        <div className="w-full max-w-[1500px]">
          <div className="min-w-0 w-full">
          <div className="mb-6 flex flex-wrap min-h-12 items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <button
              onClick={() => navigate("/Study")}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to all sessions
            </button>

            {/* Desktop Tools Bar */}
            <div className="hidden md:flex items-center gap-1.5 overflow-x-auto py-1">
              {toolsList.map(({ id, label, Icon }) => {
                const isActive = activeTool === id;
                return (
                  <button
                    key={id}
                    onClick={() => setActiveTool(id)}
                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                      isActive
                        ? `${importanceTheme.accentBg} ${importanceTheme.accentText} border ${importanceTheme.accentBorder || "border-red-200"}`
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            {/* Mobile Tools Dropdown */}
            <div className="relative md:hidden">
              <button
                onClick={() => setIsToolsOpen((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                {(() => {
                  const current = toolsList.find((t) => t.id === activeTool) || toolsList[0];
                  const ActiveIcon = current.Icon;
                  return (
                    <>
                      <ActiveIcon className="h-4 w-4" />
                      <span>{current.label}</span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${isToolsOpen ? "rotate-180" : ""}`} />
                    </>
                  );
                })()}
              </button>

              {isToolsOpen && (
                <div className="absolute right-0 top-full mt-2 z-50 min-w-[200px] rounded-xl border border-slate-200 bg-white p-2 shadow-xl animate-in fade-in slide-in-from-top-2">
                  <div className="flex flex-col gap-1">
                    {toolsList.map(({ id, label, Icon }) => {
                      const isActive = activeTool === id;
                      return (
                        <button
                          key={id}
                          onClick={() => {
                            setActiveTool(id);
                            setIsToolsOpen(false);
                          }}
                          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                            isActive
                              ? `${importanceTheme.accentBg} ${importanceTheme.accentText}`
                              : "text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <section className={`rounded-2xl p-6 shadow-lg md:p-10 ${importanceTheme.header}`}>
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div>
                <p className={`mb-3 text-sm font-semibold uppercase tracking-widest ${importanceTheme.eyebrow}`}>
                  Study session
                </p>
                <h1 className="text-3xl font-bold md:text-5xl">{subject}</h1>
                <p className={`mt-3 text-lg ${importanceTheme.topic}`}>{topic}</p>
              </div>
              <span className={`rounded-full px-4 py-2 text-sm font-semibold ${importanceTheme.pill}`}>
                {status}
              </span>
            </div>
            <div className={`mt-8 grid grid-cols-2 gap-5 border-t pt-6 md:grid-cols-4 ${importanceTheme.divider}`}>
              <div><p className={`text-sm ${importanceTheme.detail}`}>Date</p><p className="mt-1 font-semibold">{date}</p></div>
              <div><p className={`text-sm ${importanceTheme.detail}`}>Starts</p><p className="mt-1 font-semibold">{start}</p></div>
              <div><p className={`text-sm ${importanceTheme.detail}`}>Duration</p><p className="mt-1 font-semibold">{duration} hour(s)</p></div>
              <div><p className={`text-sm ${importanceTheme.detail}`}>Focus</p><p className="mt-1 font-semibold">Deep work</p></div>
            </div>
          </section>

          <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8">
            <div className="mb-5 flex items-center gap-3">
              <BookOpen className={`h-5 w-5 ${importanceTheme.accent}`} />
              <h2 className="text-xl font-bold">{activeTool === "pomodoro" ? "Focus timer" : activeTool}</h2>
            </div>
            {renderTool()}
          </section>
          </div>
        </div>
      </main>

      {createPortal(
        <>
          <button
            title="Open AI tutor"
            onClick={() => setIsAIOpen((isOpen) => !isOpen)}
            className={`fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full p-4 text-white shadow-lg transition-all duration-300 ease-in-out hover:scale-110 hover:shadow-xl sm:bottom-8 sm:right-8 sm:px-5 sm:py-3.5 sm:text-base ${importanceTheme.accentButton}`}
          >
            <MessageCircle className="h-5 w-5" />
            <span className="hidden sm:inline">AI Tutor</span>
          </button>
          <div
            className={`fixed inset-y-0 right-0 z-[100] transition-transform duration-300 ${
              isAIOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <AITutorChat
              isOpen={isAIOpen}
              onClose={() => setIsAIOpen(false)}
              messages={aiMessages}
              currentMessage={aiMessage}
              onMessageChange={setAiMessage}
              onSendMessage={() => sendAiMessage()}
              onClear={() => {
                setAiMessages([]);
                setAiMessage("");
                if (currentSessionId) {
                  sessionStorage.removeItem(`ai_chat_${currentSessionId}`);
                }
              }}
              onRetry={() => {
                const lastUserMsg = [...aiMessages].reverse().find((m) => m.sender === "user");
                if (lastUserMsg) {
                  sendAiMessage(lastUserMsg.text);
                }
              }}
              onActionExecute={handleActionExecute}
              isTyping={isAiTyping}
              width={360}
              user={user}
              theme={importanceTheme}
              reducedMotion={profile?.reduced_motion}
            />
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

export default StudyEnvironment;
