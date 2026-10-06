import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  FileText,
  HelpCircle,
  Library,
  ChevronDown,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import supabase from "../../../lib/supabase";
import { useAITutor } from "../../../app/AITutorContext";
import { useStudySession } from "../../../hooks/useStudySession";
import Flashcards from "./Flashcards";
import NoteEditor from "./NoteEditor";
import PracticeQuestions from "./PracticeQuestions";
import ResourceAttachments from "./ResourceAttachments";
import LoadingCompanion from "../../common/LoadingCompanion";

// StudyEnvironment: orchestrates the study workspace, tool navigation, and session timer.
const StudyEnvironment = ({ session: incomingSession, user: incomingUser }) => {
  const {
    isOpen: isAIOpen,
    sendTutorEvent,
    setActiveSessionId,
    setFocusMode,
    setPomodoroState,
    setMinutesRemaining,
    setPanel,
    panel,
    requestedQuizId,
    setRequestedQuizId,
  } = useAITutor();

  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [activeTool, setActiveTool] = useState("pomodoro");
  const [session, setSession] = useState(incomingSession || null);
  const [isLoading, setIsLoading] = useState(!incomingSession);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const [userId, setUserId] = useState(null);
  const [timeline, setTimeline] = useState([]);

  const handleTimelineEvent = (eventItem) => {
    if (!eventItem) return;
    setTimeline((prev) => [...prev, eventItem]);
  };

  const { Studyid } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
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

  // Hook handles pause, resume, heartbeat, beacon, and explicit finish/delete
  const {
    timeLeft,
    setTimeLeft,
    isStudying,
    isGoalReached,
    setIsGoalReached,
    isCompleting,
    completionError,
    isCompleted,
    durationSeconds,
    pause,
    resume,
    finishSession,
  } = useStudySession({
    session,
    userId,
    sendTutorEvent,
  });

  useEffect(() => {
    setMinutesRemaining(Math.max(0, Math.floor(timeLeft / 60)));
  }, [timeLeft, setMinutesRemaining]);

  useEffect(() => {
    setFocusMode("Deep work");
    setPomodoroState(isStudying ? "focus" : "idle");
  }, [isStudying, setFocusMode, setPomodoroState]);

  useEffect(() => {
    if (session?.id) setActiveSessionId(session.id);
  }, [session?.id, setActiveSessionId]);

  useEffect(() => {
    const mappedPanel = activeTool === "quizzicle" ? "quizzes" : activeTool;
    setPanel(mappedPanel);
  }, [activeTool, setPanel]);

  useEffect(() => {
    if (panel === "quizzes") setActiveTool("quizzicle");
  }, [panel]);

  useEffect(() => {
    if (searchParams.get("quizId")) setActiveTool("quizzicle");
  }, [searchParams]);

  const requestedQuizIdFromRoute = searchParams.get("quizId");
  const handleQuizOpened = useCallback(() => {
    setRequestedQuizId(null);
    if (requestedQuizIdFromRoute) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("quizId");
      setSearchParams(nextParams, { replace: true });
    }
  }, [requestedQuizIdFromRoute, searchParams, setRequestedQuizId, setSearchParams]);

  const handleExplicitFinish = async () => {
    await finishSession(timeline);
  };

  const handleLeaveSession = async () => {
    await pause();
    navigate("/Study");
  };

  const duration = session?.Duration || session?.hours || 0;

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

  if (isCompleted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-6 py-12 text-center text-slate-900">
        <div className="motion-dialog flex w-full max-w-xl flex-col items-center">
          <img src="/logo8-removebg-preview.png" alt="Lumo celebrating your completed study session" className="h-64 w-64 object-contain sm:h-80 sm:w-80" />
          <p className="mt-5 text-sm font-bold uppercase tracking-[0.2em] text-emerald-600">Session complete</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">You&apos;re done with this session!</h1>
          {completionError ? (
            <div className="mt-4 rounded-xl bg-red-50 px-5 py-3 border border-red-200">
              <span className="text-sm font-semibold text-red-700">{completionError}</span>
            </div>
          ) : (
            <div className="mt-4 flex items-center justify-center gap-3 rounded-full bg-emerald-50 px-5 py-2.5 border border-emerald-200">
              <span className="text-sm font-bold text-emerald-800"> You got 50 XP and 5 Gems!</span>
            </div>
          )}
          <p className="mt-3 max-w-md text-base leading-7 text-slate-500">Great work staying focused. Your streak starts today, so keep the momentum going.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => navigate("/Study")} className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700">Back to all sessions</button>
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

  const renderTool = () => {
    if (activeTool === "flashcards") return <Flashcards studyId={Studyid || session.id} userId={userId} theme={importanceTheme} onTimelineEvent={handleTimelineEvent} />;
    if (activeTool === "quizzicle") return <PracticeQuestions theme={importanceTheme} studyId={Studyid || session.id} userId={userId} topic={topic} onTimelineEvent={handleTimelineEvent} requestedQuizId={requestedQuizId || requestedQuizIdFromRoute} onQuizOpened={handleQuizOpened} />;
    if (activeTool === "resources") return <ResourceAttachments studyId={Studyid || session.id} userId={userId} theme={importanceTheme} onTimelineEvent={handleTimelineEvent} />;
    return (
      <div>
        <div className={`grid gap-3 ${isAIOpen ? "grid-cols-2" : "grid-cols-3"}`}>
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
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={isStudying ? pause : resume}
            className="inline-flex items-center gap-2 rounded-lg bg-black px-5 py-3 font-semibold text-white hover:bg-slate-900"
          >
            {isStudying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isStudying ? "Pause timer" : "Resume timer"}
          </button>
          <button
            onClick={() => {
              setTimeLeft(durationSeconds);
              resume();
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-5 py-3 font-semibold text-slate-600 hover:bg-slate-50"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
          <button
            type="button"
            onClick={handleExplicitFinish}
            disabled={isCompleting}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700 shadow-sm disabled:opacity-50"
          >
            {isCompleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Finish &amp; Complete Session
          </button>
        </div>
      </div>
    );
  };

  const toolItems = [
    { id: "pomodoro", label: "Pomodoro Timer", icon: Clock },
    { id: "flashcards", label: "Flashcards", icon: Library },
    { id: "quizzicle", label: "Quizicle", icon: HelpCircle },
    { id: "resources", label: "Resources", icon: BookOpen },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="min-w-0 px-3 py-4 sm:px-5 md:px-6 xl:px-10">
        <div className="w-full max-w-[1500px]">
          <div className="min-w-0 w-full">
            <div className="mb-6 flex flex-wrap min-h-12 items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <button
                onClick={handleLeaveSession}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-100"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to all sessions (Pause)
              </button>

              {/* Desktop Tools Bar */}
              <div className="hidden md:flex items-center gap-1.5 overflow-x-auto py-1">
                {toolItems.map((item) => {
                  const isActive = activeTool === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTool(item.id)}
                      className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                        isActive
                          ? `${importanceTheme.accentBg} ${importanceTheme.accentText} border ${importanceTheme.accentBorder || "border-red-200"}`
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Explicit Finish Button */}
              <button
                onClick={handleExplicitFinish}
                disabled={isCompleting}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
              >
                {isCompleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                <span>Finish Session</span>
              </button>

              {/* Mobile Tools Dropdown */}
              <div className="relative md:hidden">
                <button
                  onClick={() => setIsToolsOpen((prev) => !prev)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  {(() => {
                    const current = toolItems.find((t) => t.id === activeTool) || toolItems[0];
                    const ActiveIcon = current.icon;
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
                      {toolItems.map((item) => {
                        const isActive = activeTool === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              setActiveTool(item.id);
                              setIsToolsOpen(false);
                            }}
                            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                              isActive
                                ? `${importanceTheme.accentBg} ${importanceTheme.accentText}`
                                : "text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            <item.icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Goal Reached Dialog Prompt */}
            {isGoalReached && (
              <div className="mb-6 rounded-2xl bg-amber-50 border border-amber-300 p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-amber-900">Goal Reached! 🎉</h3>
                    <p className="text-sm text-amber-800 mt-1">You have completed your target study time. Would you like to finish and record this session?</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setIsGoalReached(false);
                        setTimeLeft(1800); // 30 extra minutes
                        resume();
                      }}
                      className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-300 hover:bg-slate-50"
                    >
                      Study 30m More
                    </button>
                    <button
                      onClick={handleExplicitFinish}
                      disabled={isCompleting}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                    >
                      {isCompleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Finish Session Now
                    </button>
                  </div>
                </div>
              </div>
            )}

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

            <div className="mt-6 grid grid-cols-1 items-start gap-6">
              <section className="min-w-0 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8">
                <div className="mb-5 flex items-center gap-3">
                  <BookOpen className={`h-5 w-5 ${importanceTheme.accent}`} />
                  <h2 className="text-xl font-bold">{activeTool === "pomodoro" ? "Focus timer" : toolItems.find((item) => item.id === activeTool)?.label}</h2>
                </div>
                {renderTool()}
              </section>
              <section id="session-notes" className="min-w-0 scroll-mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 md:p-6">
                <div className="mb-5 flex items-center gap-3">
                  <FileText className={`h-5 w-5 ${importanceTheme.accent}`} />
                  <div>
                    <h2 className="text-xl font-bold">Session notes</h2>
                    <p className="mt-1 text-sm text-slate-500">A clear space for ideas worth keeping.</p>
                  </div>
                </div>
                <NoteEditor
                  studyId={Studyid || session.id}
                  userId={userId}
                  topic={topic}
                  onTimelineEvent={handleTimelineEvent}
                />
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudyEnvironment;
