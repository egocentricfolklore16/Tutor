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
  Maximize2,
  Minimize2,
  Coffee,
  Star,
  Flame,
  Trophy,
} from "lucide-react";
import supabase from "../../../lib/supabase";
import { useAITutor } from "../../../app/AITutorContext";
import { useStudySession } from "../../../hooks/useStudySession";
import { useStreak } from "../../../hooks/useStreak";
import Flashcards from "./Flashcards";
import NoteEditor from "./NoteEditor";
import PracticeQuestions from "./PracticeQuestions";
import ResourceAttachments from "./ResourceAttachments";
import LoadingCompanion from "../../common/LoadingCompanion";

const StudyEnvironment = ({ session: incomingSession, user: incomingUser }) => {
  const {
    isOpen: isAIOpen,
    sendTutorEvent,
    setActiveSessionId,
    setFocusMode: setContextFocusMode,
    setPomodoroState,
    setMinutesRemaining,
    setPanel,
    panel,
    requestedQuizId,
    setRequestedQuizId,
  } = useAITutor();

  const { currentStreak } = useStreak();

  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [activeTool, setActiveTool] = useState("pomodoro");
  const [session, setSession] = useState(incomingSession || null);
  const [isLoading, setIsLoading] = useState(!incomingSession);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const [userId, setUserId] = useState(null);
  const [timeline, setTimeline] = useState([]);

  // Focus mode & Break reminder state
  const [isFocusModeActive, setIsFocusModeActive] = useState(false);
  const [isPomodoroMode, setIsPomodoroMode] = useState(false); // 25/5 off by default
  const [pomodoroPhase, setPomodoroPhase] = useState("work"); // 'work' | 'break'
  const [pomodoroPhaseSeconds, setPomodoroPhaseSeconds] = useState(25 * 60);
  const [breakNotification, setBreakNotification] = useState("");
  const [focusRating, setFocusRating] = useState(5);

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
    setContextFocusMode("Deep work");
    setPomodoroState(isStudying ? "focus" : "idle");
  }, [isStudying, setContextFocusMode, setPomodoroState]);

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

  // Pomodoro & Break reminder interval logic
  useEffect(() => {
    if (!isStudying || !isPomodoroMode) return undefined;

    const interval = setInterval(() => {
      setPomodoroPhaseSeconds((prev) => {
        if (prev <= 1) {
          if (pomodoroPhase === "work") {
            setPomodoroPhase("break");
            setBreakNotification("Time for a 5-minute break! Step away and refresh your mind.");
            return 5 * 60;
          } else {
            setPomodoroPhase("work");
            setBreakNotification("Break finished! Let's get back into focus mode.");
            return 25 * 60;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isStudying, isPomodoroMode, pomodoroPhase]);

  const handleExplicitFinish = async () => {
    const ratedTimeline = [
      ...timeline,
      {
        id: crypto.randomUUID(),
        type: "focus_rating",
        rating: focusRating,
        timestamp: new Date().toISOString(),
      },
    ];
    await finishSession(ratedTimeline);
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 px-6 text-center">
        <p className="text-rose-600 mb-4">{error || "Study session not found."}</p>
        <button
          onClick={() => navigate("/Study")}
          className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sessions
        </button>
      </div>
    );
  }

  if (isCompleted) {
    const elapsedMinutes = Math.round((durationSeconds - timeLeft) / 60) || Math.round((session?.elapsed_seconds || 0) / 60) || 1;
    return (
      <main className="flex min-h-screen items-center justify-center bg-white dark:bg-slate-950 px-6 py-12 text-center text-slate-900 dark:text-slate-100">
        <div className="flex w-full max-w-xl flex-col items-center">
          <img src="/logo8-removebg-preview.png" alt="Lumo celebrating session completion" className="h-48 w-48 object-contain sm:h-64 sm:w-64" />
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">Session complete</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Great work staying focused!</h1>

          <div className="mt-6 grid grid-cols-3 gap-3 w-full max-w-md">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
              <Clock className="mx-auto h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Time Studied</p>
              <p className="mt-0.5 text-base font-bold">{elapsedMinutes} min</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
              <Trophy className="mx-auto h-5 w-5 text-amber-500" />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">XP Gained</p>
              <p className="mt-0.5 text-base font-bold">+50 XP</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
              <Flame className="mx-auto h-5 w-5 text-orange-500" />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Streak</p>
              <p className="mt-0.5 text-base font-bold">{currentStreak} Days</p>
            </div>
          </div>

          <div className="mt-6 w-full max-w-md rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-bold">How focused were you?</p>
            <div className="mt-3 flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setFocusRating(star)}
                  aria-label={`Rate focus ${star} out of 5`}
                  className="p-1 transition hover:scale-110"
                >
                  <Star className={`h-7 w-7 ${star <= focusRating ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-700"}`} />
                </button>
              ))}
            </div>
          </div>

          {completionError && (
            <div className="mt-4 rounded-xl bg-rose-50 p-3 border border-rose-200 text-xs font-semibold text-rose-700">
              {completionError}
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => navigate("/Study")} className="rounded-full bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-lg hover:bg-emerald-700">Back to Sessions</button>
            <button type="button" onClick={() => navigate("/Dashboard")} className="rounded-full bg-slate-100 dark:bg-slate-800 px-6 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 transition hover:bg-slate-200 dark:hover:bg-slate-700">Dashboard</button>
          </div>
        </div>
      </main>
    );
  }

  const subject = toTitleCase(session.Subject || session.subject || "Untitled subject");
  const topic = toTitleCase(session.Topic || session.topic || "No topic provided");
  const date = session.Date || session.date || "Date not set";
  const start = session.Start || session.time || "Time not set";

  const formattedTime = (value) => String(value).padStart(2, "0");
  const totalSeconds = durationSeconds || 3600;
  const currentTimerSeconds = isPomodoroMode ? pomodoroPhaseSeconds : timeLeft;
  const timerMaxSeconds = isPomodoroMode ? (pomodoroPhase === "work" ? 25 * 60 : 5 * 60) : totalSeconds;
  const progressPercent = Math.min(100, Math.max(0, Math.round((currentTimerSeconds / timerMaxSeconds) * 100)));

  const hoursDisplay = Math.floor(currentTimerSeconds / 3600);
  const minutesDisplay = Math.floor((currentTimerSeconds % 3600) / 60);
  const secondsDisplay = currentTimerSeconds % 60;

  const renderTool = () => {
    if (activeTool === "flashcards") return <Flashcards studyId={Studyid || session.id} userId={userId} onTimelineEvent={handleTimelineEvent} />;
    if (activeTool === "quizzicle") return <PracticeQuestions studyId={Studyid || session.id} userId={userId} topic={topic} onTimelineEvent={handleTimelineEvent} requestedQuizId={requestedQuizId || requestedQuizIdFromRoute} onQuizOpened={handleQuizOpened} />;
    if (activeTool === "resources") return <ResourceAttachments studyId={Studyid || session.id} userId={userId} onTimelineEvent={handleTimelineEvent} />;

    return (
      <div className="flex flex-col items-center">
        {/* Large Centered Circular Timer */}
        <div className="relative my-4 flex h-64 w-64 items-center justify-center sm:h-72 sm:w-72">
          <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="8" className="text-slate-200 dark:text-slate-800" fill="transparent" />
            <circle
              cx="50"
              cy="50"
              r="42"
              stroke="currentColor"
              strokeWidth="8"
              strokeDasharray={264}
              strokeDashoffset={264 - (264 * progressPercent) / 100}
              strokeLinecap="round"
              className={`transition-all duration-500 ${isPomodoroMode && pomodoroPhase === "break" ? "text-amber-500" : "text-emerald-500"}`}
              fill="transparent"
            />
          </svg>
          <div className="absolute flex flex-col items-center text-center">
            <span className="text-4xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl">
              {hoursDisplay > 0 ? `${formattedTime(hoursDisplay)}:` : ""}{formattedTime(minutesDisplay)}:{formattedTime(secondsDisplay)}
            </span>
            <span className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {isPomodoroMode ? (pomodoroPhase === "work" ? "Pomodoro Focus" : "Pomodoro Break") : "Remaining"}
            </span>
          </div>
        </div>

        {/* Timer Control Actions */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={isStudying ? pause : resume}
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-white shadow-sm transition ${isStudying ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
          >
            {isStudying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isStudying ? "Pause" : "Resume"}
          </button>
          <button
            type="button"
            onClick={() => {
              setTimeLeft(durationSeconds);
              setPomodoroPhaseSeconds(25 * 60);
              resume();
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
          <button
            type="button"
            onClick={handleExplicitFinish}
            disabled={isCompleting}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-700"
          >
            {isCompleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Finish Session
          </button>
        </div>

        {/* Pomodoro Mode Toggle */}
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60">
          <Coffee className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Pomodoro Mode (25m work / 5m break)</span>
          <button
            type="button"
            role="switch"
            aria-checked={isPomodoroMode}
            onClick={() => setIsPomodoroMode(!isPomodoroMode)}
            className={`relative ml-auto inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${isPomodoroMode ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-700"}`}
          >
            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isPomodoroMode ? "translate-x-5" : "translate-x-0"}`} />
          </button>
        </div>
      </div>
    );
  };

  const toolItems = [
    { id: "pomodoro", label: "Focus Timer", icon: Clock },
    { id: "flashcards", label: "Flashcards", icon: Library },
    { id: "quizzicle", label: "Quizicle", icon: HelpCircle },
    { id: "resources", label: "Resources", icon: BookOpen },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <main className="min-w-0 px-3 py-4 sm:px-5 md:px-6 xl:px-10">
        <div className="mx-auto w-full max-w-7xl">
          {/* Top Control Bar */}
          {!isFocusModeActive && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <button
                type="button"
                onClick={handleLeaveSession}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <ArrowLeft className="h-4 w-4" /> Leave (Pause)
              </button>

              {/* Desktop Tools Bar */}
              <div className="hidden md:flex items-center gap-1.5">
                {toolItems.map((item) => {
                  const isActive = activeTool === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTool(item.id)}
                      className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                        isActive
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                          : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsFocusModeActive(!isFocusModeActive)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {isFocusModeActive ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  <span>Focus mode</span>
                </button>

                <button
                  type="button"
                  onClick={handleExplicitFinish}
                  disabled={isCompleting}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isCompleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  <span>Finish</span>
                </button>
              </div>

              {/* Mobile Tools Dropdown */}
              <div className="relative md:hidden w-full pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsToolsOpen((prev) => !prev)}
                  className="inline-flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  {(() => {
                    const current = toolItems.find((t) => t.id === activeTool) || toolItems[0];
                    const ActiveIcon = current.icon;
                    return (
                      <>
                        <span className="flex items-center gap-2">
                          <ActiveIcon className="h-4 w-4" />
                          <span>{current.label}</span>
                        </span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${isToolsOpen ? "rotate-180" : ""}`} />
                      </>
                    );
                  })()}
                </button>

                {isToolsOpen && (
                  <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex flex-col gap-1">
                      {toolItems.map((item) => {
                        const isActive = activeTool === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setActiveTool(item.id);
                              setIsToolsOpen(false);
                            }}
                            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition ${
                              isActive
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
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
          )}

          {/* Break / Goal Notification Banner */}
          {breakNotification && (
            <div role="status" className="mb-6 flex items-center justify-between rounded-xl bg-amber-50 p-4 border border-amber-300 dark:bg-amber-950/40 dark:border-amber-900">
              <span className="text-sm font-bold text-amber-900 dark:text-amber-200">{breakNotification}</span>
              <button type="button" onClick={() => setBreakNotification("")} className="rounded p-1 text-amber-800 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900"><X className="h-4 w-4" /></button>
            </div>
          )}

          {isGoalReached && (
            <div className="mb-6 rounded-2xl bg-emerald-50 border border-emerald-300 p-5 shadow-sm dark:bg-emerald-950/40 dark:border-emerald-900">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-200">Goal Reached! 🎉</h3>
                  <p className="text-sm text-emerald-800 dark:text-emerald-300 mt-1">Target study time reached. Would you like to finish and record this session?</p>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => { setIsGoalReached(false); setTimeLeft(1800); resume(); }} className="rounded-lg bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50">Study 30m More</button>
                  <button type="button" onClick={handleExplicitFinish} disabled={isCompleting} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">{isCompleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Finish Now</button>
                </div>
              </div>
            </div>
          )}

          {/* Header Banner */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Study session header</p>
                <h1 className="mt-1 text-2xl font-black sm:text-3xl text-slate-900 dark:text-white">{subject}</h1>
                <p className="mt-1 text-base text-slate-600 dark:text-slate-300">{topic}</p>
              </div>
              {isFocusModeActive && (
                <button
                  type="button"
                  onClick={() => setIsFocusModeActive(false)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <Minimize2 className="h-3.5 w-3.5" /> Exit focus mode
                </button>
              )}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-xs text-slate-500 sm:grid-cols-4 dark:border-slate-800 dark:text-slate-400">
              <div><span>Date</span><p className="mt-0.5 font-semibold text-slate-800 dark:text-slate-200">{date}</p></div>
              <div><span>Starts</span><p className="mt-0.5 font-semibold text-slate-800 dark:text-slate-200">{start}</p></div>
              <div><span>Duration</span><p className="mt-0.5 font-semibold text-slate-800 dark:text-slate-200">{duration} hr(s)</p></div>
              <div><span>Mode</span><p className="mt-0.5 font-semibold text-slate-800 dark:text-slate-200">Active Recall</p></div>
            </div>
          </section>

          {/* Workspace Body */}
          <div className="mt-6 grid grid-cols-1 items-start gap-6">
            <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-lg font-bold">{toolItems.find((item) => item.id === activeTool)?.label}</h2>
              </div>
              {renderTool()}
            </section>

            <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-lg font-bold">Quick notes</h2>
              </div>
              <NoteEditor studyId={Studyid || session.id} userId={userId} topic={topic} onTimelineEvent={handleTimelineEvent} />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudyEnvironment;
