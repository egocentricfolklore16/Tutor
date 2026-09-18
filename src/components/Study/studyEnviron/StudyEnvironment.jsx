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
import { sendAiTutorMessage } from "../../../lib/aiTutor";
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
        .select("full_name")
        .eq("user_id", authUser.id)
        .single();

      if (profileError) {
        console.error("Supabase profile fetch error:", profileError);
      }

      setProfile({
        name: data?.full_name || authUser.user_metadata?.full_name || authUser.user_metadata?.userName || "User",
        email: authUser.email || "",
        avatar: authUser.user_metadata?.avatar_url || "",
      });
    };

    fetchProfile();
  }, []);

  const duration = session?.Duration || session?.hours || 0;
  const durationSeconds = Math.max(1, Number.parseFloat(duration) * 60 * 60);

  // Initialize remaining time from session.time_left if valid and paused, else full duration
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
      if (document.visibilityState === "hidden") {
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
        activeUserId = authUser?.id || null;
      }

      if (activeUserId) {
        const historyEntry = {
          id: crypto.randomUUID(),
          user_id: activeUserId,
          subject: session.Subject || session.subject || "Untitled subject",
          topic: session.Topic || session.topic || "No topic provided",
          duration_minutes: Math.round(durationSeconds / 60),
          started_at: new Date(Date.now() - durationSeconds * 1000).toISOString(),
          completed_at: new Date().toISOString(),
          status: "completed",
          xp_earned: 50,
          timeline: timeline,
        };

        // Always update streak, award rewards, and save history entry
        try {
          await Promise.all([
            updateStreakForActivity(activeUserId),
            awardUserRewards(activeUserId, { xp: 50, gems: 5 }),
            supabase.from("study_history").insert(historyEntry),
          ]);
        } catch (err) {
          console.error("Error updating streak, rewards, or study history:", err);
        }

        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("hyper-tutor-session-completed", { detail: historyEntry }));
        }

        // Save pomodoro record
        const { error: pomodoroError } = await supabase
          .from("study_pomodoros")
          .insert({ session_id: session.id, user_id: activeUserId });

        if (pomodoroError) {
          throw new Error(`Pomodoro completion save error: ${pomodoroError.message}`);
        }
      }

      // Mark the study session as completed instead of deleting it
      setTimeout(async () => {
        const { error: updateError } = await supabase
          .from("Study")
          .update({
            session_status: "completed",
            time_left: 0,
          })
          .eq("id", session.id);

        if (updateError) {
          console.error("Session update error on completion:", updateError);
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
          name: session.host || "Guest User",
          email: session.ownerEmail || "guest@example.com",
          avatar: "",
        }
      : { name: "Guest User", email: "guest@example.com", avatar: "" });

  if (isLoading) {
    return <LoadingCompanion message="Loading your study environment..." />;
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-6 text-center">
        <p className="text-red-600 mb-4">{error || "Study session not found."}</p>
        <button
          onClick={() => navigate("/Study")}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sessions
        </button>
      </div>
    );
  }

  if (sessionComplete) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-6 py-12 text-center text-slate-900">
        <div className="motion-dialog flex w-full max-w-xl flex-col items-center">
          <img src="/logo8-removebg-preview.png" alt="Lumo celebrating your completed study session" className="h-64 w-64 object-contain sm:h-80 sm:w-80" />
          <p className="mt-5 text-sm font-bold uppercase tracking-[0.2em] text-emerald-600">Session complete</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">You&apos;re done with this session!</h1>
          <div className="mt-4 flex items-center justify-center gap-3 rounded-full bg-emerald-50 px-5 py-2.5 border border-emerald-200">
            <span className="text-sm font-bold text-emerald-800"> You got 50 XP and 5 Gems!</span>
          </div>
          <p className="mt-3 max-w-md text-base leading-7 text-slate-500">Great work staying focused. Your streak starts today, so keep the momentum going.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => { setTimeLeft(durationSeconds); setIsStudying(true); setSessionComplete(false); }} className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700">Start another focus session</button>
            <button type="button" onClick={() => navigate("/Dashboard")} className="rounded-full bg-slate-100 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-200">Back to dashboard</button>
          </div>
        </div>
      </main>
    );
  }

  const subject = toTitleCase(session.Subject || session.subject || "Untitled subject");
  const topic = toTitleCase(session.Topic || session.topic || "No topic provided");
  const date = session.Date || session.date || "Date not set";
  const start = session.Start || session.time || "Time not set";
  const status = session.Status || session.status || "Planned";
  const normalizedStatus = String(status).trim().toLowerCase();
  const importanceTheme = {
    "very important": {
      header: "bg-red-100 text-red-950",
      eyebrow: "text-red-700",
      topic: "text-red-900",
      divider: "border-red-200",
      detail: "text-red-800",
      pill: "bg-red-200 text-red-900",
      accent: "text-red-600",
      accentText: "text-red-700",
      accentBg: "bg-red-50",
      accentButton: "bg-red-600 hover:bg-red-700",
      focus: "focus:border-red-500 focus:ring-red-100",
      accentBorder: "hover:border-red-300",
    },
    medium: {
      header: "bg-orange-100 text-orange-950",
      eyebrow: "text-orange-700",
      topic: "text-orange-900",
      divider: "border-orange-200",
      detail: "text-orange-800",
      pill: "bg-orange-200 text-orange-900",
      accent: "text-orange-600",
      accentText: "text-orange-700",
      accentBg: "bg-orange-50",
      accentButton: "bg-orange-600 hover:bg-orange-700",
      focus: "focus:border-orange-500 focus:ring-orange-100",
      accentBorder: "hover:border-orange-300",
    },
    "not so important": {
      header: "bg-green-100 text-green-950",
      eyebrow: "text-green-700",
      topic: "text-green-900",
      divider: "border-green-200",
      detail: "text-green-800",
      pill: "bg-green-200 text-green-900",
      accent: "text-green-600",
      accentText: "text-green-700",
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

  const sendAiMessage = async () => {
    const text = aiMessage.trim();
    if (!text || isAiTyping) return;

    const userMsg = { sender: "user", text };
    const updatedMessages = [...aiMessages, userMsg];

    setAiMessages(updatedMessages);
    setAiMessage("");
    setIsAiTyping(true);

    try {
      const { reply, actions_taken } = await sendAiTutorMessage({
        message: text,
        history: updatedMessages,
        studentLevel: profile?.education_level || "High School",
        curriculumStandard: profile?.curriculum_standard || "None/General",
        knowledgeGaps: Array.isArray(profile?.knowledge_gaps) ? profile.knowledge_gaps : [],
        studentId: userId,
      });

      setAiMessages((msgs) => [
        ...msgs,
        {
          sender: "ai",
          text: reply,
          actions: actions_taken,
        },
      ]);
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

  const renderTool = () => {
    if (activeTool === "notes") {
      return <NoteEditor studyId={Studyid || session.id} userId={userId} theme={importanceTheme} onTimelineEvent={handleTimelineEvent} />;
    }
    if (activeTool === "flashcards") return <Flashcards studyId={Studyid || session.id} userId={userId} theme={importanceTheme} onTimelineEvent={handleTimelineEvent} />;
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
              onSendMessage={sendAiMessage}
              onClear={() => {
                setAiMessages([]);
                setAiMessage("");
              }}
              isTyping={isAiTyping}
              width={360}
              user={user}
              theme={importanceTheme}
            />
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

export default StudyEnvironment;
