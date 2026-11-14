import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  FileText,
  HelpCircle,
  Library,
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
import { useGamification } from "../../../features/gamification";
import Flashcards from "./Flashcards";
import NoteEditor from "./NoteEditor";
import PracticeQuestions from "./PracticeQuestions";
import ResourceAttachments from "./ResourceAttachments";
import LoadingCompanion from "../../common/LoadingCompanion";

const StudyEnvironment = ({ session: incomingSession, user: _incomingUser }) => {
  const {
    isOpen: _isAIOpen,
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

  const { streak } = useGamification();
  const { currentStreak } = streak;

  const [activeTool, setActiveTool] = useState("pomodoro");
  const [session, setSession] = useState(incomingSession || null);
  const [isLoading, setIsLoading] = useState(!incomingSession);
  const [error, setError] = useState("");
  const [_profile, setProfile] = useState(null);
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
        setError("Unable to load this course.");
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
    navigate("/courses");
  };

  const duration = session?.Duration || session?.hours || 0;

  if (isLoading) {
    return <LoadingCompanion message="Loading your study environment..." />;
  }

  if (error || !session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center dark:bg-[#18211f]">
        <p className="mb-4 text-sm leading-6 text-rose-600 dark:text-rose-400">{error || "Course not found."}</p>
        <button
          type="button"
          onClick={() => navigate("/courses")}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 motion-reduce:transition-none"
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
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-8 text-center text-slate-900 dark:bg-[#18211f] dark:text-slate-100">
        <div className="flex w-full max-w-xl flex-col items-center">
          <img src="/logo8-removebg-preview.png" alt="Lumo celebrating session completion" className="h-48 w-48 object-contain sm:h-64 sm:w-64" />
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">Session complete</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">Great work staying focused!</h1>

          <div className="mt-6 grid w-full max-w-md grid-cols-3 gap-2 sm:gap-3">
            <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/80">
              <Clock className="mx-auto h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Time Studied</p>
              <p className="mt-1 text-base font-bold">{elapsedMinutes} min</p>
            </div>
            <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/80">
              <Trophy className="mx-auto h-5 w-5 text-amber-500" />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">XP Gained</p>
              <p className="mt-1 text-base font-bold">+50 XP</p>
            </div>
            <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/80">
              <Flame className="mx-auto h-5 w-5 text-orange-500" />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Streak</p>
              <p className="mt-1 text-base font-bold">{currentStreak} Days</p>
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
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl transition hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:hover:bg-amber-950/40 motion-reduce:transition-none"
                >
                  <Star className={`h-7 w-7 ${star <= focusRating ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-700"}`} />
                </button>
              ))}
            </div>
          </div>

          {completionError && (
            <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
              {completionError}
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => navigate("/courses")} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:bg-emerald-500 dark:hover:bg-emerald-400 motion-reduce:transition-none">Back to Courses</button>
            <button type="button" onClick={() => navigate("/Dashboard")} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 motion-reduce:transition-none">Dashboard</button>
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

  const toolItems = [
    { id: "notes", label: "Notes", icon: FileText },
    { id: "pomodoro", label: "Pomodoro", icon: Clock },
    { id: "flashcards", label: "Flashcards", icon: Library },
    { id: "quizzicle", label: "Quizicle", icon: HelpCircle },
    { id: "resources", label: "Resources", icon: BookOpen },
  ];

  const renderTool = () => {
    if (activeTool === "notes") {
      return <NoteEditor studyId={Studyid || session.id} userId={userId} topic={topic} onTimelineEvent={handleTimelineEvent} />;
    }
    if (activeTool === "flashcards") {
      return <Flashcards studyId={Studyid || session.id} userId={userId} onTimelineEvent={handleTimelineEvent} />;
    }
    if (activeTool === "quizzicle") {
      return <PracticeQuestions studyId={Studyid || session.id} userId={userId} topic={topic} onTimelineEvent={handleTimelineEvent} requestedQuizId={requestedQuizId || requestedQuizIdFromRoute} onQuizOpened={handleQuizOpened} />;
    }
    if (activeTool === "resources") {
      return <ResourceAttachments studyId={Studyid || session.id} userId={userId} onTimelineEvent={handleTimelineEvent} />;
    }

    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <Coffee className="mt-1 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Pomodoro cycles</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Alternate 25 minutes of focused work with a 5-minute break.
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-label="Pomodoro mode"
          aria-checked={isPomodoroMode}
          onClick={() => setIsPomodoroMode(!isPomodoroMode)}
          className={`relative inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:border-slate-700 motion-reduce:transition-none ${isPomodoroMode ? "bg-emerald-600 dark:bg-emerald-500" : "bg-slate-100 dark:bg-slate-800"}`}
        >
          <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform motion-reduce:transition-none ${isPomodoroMode ? "translate-x-1" : "-translate-x-1"}`} />
        </button>
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          {isPomodoroMode ? "Pomodoro mode is on." : "Pomodoro mode is off."}
        </p>
      </div>
    );
  };

  const renderTimer = () => (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Focus session</p>
          <h1 className="mt-1 break-words text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">{subject}</h1>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{topic}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleLeaveSession}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" /> Leave (Pause)
          </button>
          <button
            type="button"
            aria-pressed={isFocusModeActive}
            onClick={() => setIsFocusModeActive((active) => !active)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {isFocusModeActive ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            {isFocusModeActive ? "Exit focus mode" : "Focus mode"}
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-col items-center border-t border-slate-200 pt-4 dark:border-slate-800">
        <div className="relative my-2 aspect-square w-[min(16rem,70vw)] sm:w-72">
          <svg className="absolute inset-0 h-full w-full -rotate-90 transform" viewBox="0 0 100 100" aria-hidden="true">
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
              className={`transition-all duration-500 motion-reduce:transition-none ${isPomodoroMode && pomodoroPhase === "break" ? "text-amber-500" : "text-emerald-500"}`}
              fill="transparent"
            />
          </svg>
          <div role="timer" aria-live="off" className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-4xl font-black tracking-tight text-slate-900 dark:text-slate-50 sm:text-5xl">
              {hoursDisplay > 0 ? `${formattedTime(hoursDisplay)}:` : ""}{formattedTime(minutesDisplay)}:{formattedTime(secondsDisplay)}
            </span>
            <span className="mt-1 text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              {isPomodoroMode ? (pomodoroPhase === "work" ? "Pomodoro focus" : "Pomodoro break") : "Remaining"}
            </span>
          </div>
        </div>
        <p role="status" className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          {isFocusModeActive ? "Focus mode is on" : isStudying ? "Session in progress" : "Session paused"}
          {isPomodoroMode ? ` · ${pomodoroPhase === "work" ? "Work phase" : "Break phase"}` : ""}
        </p>
        <div className="mt-4 flex w-full flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={isStudying ? pause : resume}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:bg-emerald-500 dark:hover:bg-emerald-400"
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
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
          <button
            type="button"
            onClick={handleExplicitFinish}
            disabled={isCompleting}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-400"
          >
            {isCompleting ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Finish session
          </button>
        </div>
      </div>

      {breakNotification && (
        <div role="status" className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-amber-50 p-3 dark:bg-amber-950/40">
          <span className="text-sm leading-6 text-amber-900 dark:text-amber-200">{breakNotification}</span>
          <button
            type="button"
            aria-label="Dismiss break notification"
            onClick={() => setBreakNotification("")}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-amber-800 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:text-amber-300 dark:hover:bg-amber-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {isGoalReached && (
        <div role="status" className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Goal reached</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">Target study time reached. Continue for 30 minutes or finish this session.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => { setIsGoalReached(false); setTimeLeft(1800); resume(); }}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Study 30m more
              </button>
              <button
                type="button"
                onClick={handleExplicitFinish}
                disabled={isCompleting}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-400"
              >
                {isCompleting ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Finish now
              </button>
            </div>
          </div>
        </div>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-200 pt-4 text-sm dark:border-slate-800 sm:grid-cols-4">
        <div><dt className="text-slate-500 dark:text-slate-400">Date</dt><dd className="mt-1 font-semibold text-slate-800 dark:text-slate-200">{date}</dd></div>
        <div><dt className="text-slate-500 dark:text-slate-400">Starts</dt><dd className="mt-1 font-semibold text-slate-800 dark:text-slate-200">{start}</dd></div>
        <div><dt className="text-slate-500 dark:text-slate-400">Duration</dt><dd className="mt-1 font-semibold text-slate-800 dark:text-slate-200">{duration} hr(s)</dd></div>
        <div><dt className="text-slate-500 dark:text-slate-400">Mode</dt><dd className="mt-1 font-semibold text-slate-800 dark:text-slate-200">Active Recall</dd></div>
      </dl>
    </section>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#18211f] dark:text-slate-100">
      <main className="min-w-0 px-3 py-4 sm:px-6 md:px-6 xl:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
          {renderTimer()}

          <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/80 sm:p-6" aria-labelledby="study-tools-title">
            <h2 id="study-tools-title" className="text-base font-bold text-slate-900 dark:text-slate-100 sm:text-lg">Study tools</h2>
            <div role="tablist" aria-label="Study tools" className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {toolItems.map((item, index) => {
                const isActive = activeTool === item.id;
                const handleTabKeyDown = (event) => {
                  let nextIndex = index;
                  if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (index + 1) % toolItems.length;
                  else if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (index - 1 + toolItems.length) % toolItems.length;
                  else if (event.key === "Home") nextIndex = 0;
                  else if (event.key === "End") nextIndex = toolItems.length - 1;
                  else return;
                  event.preventDefault();
                  setActiveTool(toolItems[nextIndex].id);
                  document.getElementById(`study-tool-tab-${toolItems[nextIndex].id}`)?.focus();
                };
                return (
                  <button
                    key={item.id}
                    id={`study-tool-tab-${item.id}`}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-controls="study-tool-panel"
                    tabIndex={isActive ? 0 : -1}
                    onKeyDown={handleTabKeyDown}
                    onClick={() => setActiveTool(item.id)}
                    className={`inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 motion-reduce:transition-none ${
                      isActive
                        ? "bg-emerald-600 text-white dark:bg-emerald-500"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    }`}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
            <div id="study-tool-panel" role="tabpanel" aria-labelledby={`study-tool-tab-${activeTool}`} className="mt-4 min-w-0">
              {renderTool()}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default StudyEnvironment;
