import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Menu,
  MessageCircle,
  Loader2,
  Play,
  Pause,
  RotateCcw,
} from "lucide-react";
import supabase from "../../../lib/supabase";
import { updateStreakForActivity } from "../../../lib/streaks";
import Sidepane from "./Sidepane";
import AITutorChat from "./AITutorChat";
import Flashcards from "./Flashcards";
import NoteEditor from "./NoteEditor";
import PracticeQuestions from "./PracticeQuestions";
import ResourceAttachments from "./ResourceAttachments";
import LoadingCompanion from "../../common/LoadingCompanion";

// StudyEnvironment: orchestrates the study workspace, sidepane and AI pane.
const StudyEnvironment = ({ session: incomingSession, user: incomingUser }) => {
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(true);
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
        .select("username")
        .eq("user_id", authUser.id)
        .single();

      if (profileError) {
        console.error("Supabase profile fetch error:", profileError);
      }

      setProfile({
        name: data?.username || authUser.user_metadata?.userName || "User",
        email: authUser.email || "",
        avatar: authUser.user_metadata?.avatar_url || "",
      });
    };

    fetchProfile();
  }, []);

  const duration = session?.Duration || session?.hours || 0;
  const durationSeconds = Math.max(1, Number.parseFloat(duration) * 60 * 60);
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [isStudying, setIsStudying] = useState(true);
  const pomodoroRecorded = useRef(false);

  useEffect(() => {
    setTimeLeft(durationSeconds);
    pomodoroRecorded.current = false;
    setSessionComplete(false);
  }, [durationSeconds]);

  useEffect(() => {
    if (!isStudying || timeLeft <= 0) return undefined;
    const timer = window.setInterval(() => {
      setTimeLeft((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isStudying, timeLeft]);

  useEffect(() => {
    if (timeLeft !== 0 || pomodoroRecorded.current || !userId || !session?.id) return;
    pomodoroRecorded.current = true;
    supabase.from("study_pomodoros").insert({ session_id: session.id, user_id: userId }).then(async ({ error: pomodoroError }) => {
      if (pomodoroError) console.error("Pomodoro completion save error:", pomodoroError);
      else await updateStreakForActivity(userId);
    });
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

  const sendAiMessage = () => {
    const text = aiMessage.trim();
    if (!text || isAiTyping) return;
    setAiMessages((messages) => [...messages, { sender: "user", text }]);
    setAiMessage("");
    setIsAiTyping(true);
    window.setTimeout(() => {
      setAiMessages((messages) => [
        ...messages,
        {
          sender: "ai",
          text: `For ${subject} - ${topic}, ${text.toLowerCase().includes("plan") ? "try a focused cycle: review the concept, practise one example, then explain it in your own words." : "break that question into one small step at a time and write down what you already know before solving it."}`,
        },
      ]);
      setIsAiTyping(false);
    }, 700);
  };

  const renderTool = () => {
    if (activeTool === "notes") {
      return <NoteEditor studyId={Studyid || session.id} userId={userId} theme={importanceTheme} />;
    }
    if (activeTool === "flashcards") return <Flashcards studyId={Studyid || session.id} userId={userId} theme={importanceTheme} />;
    if (activeTool === "quizzicle") return <PracticeQuestions theme={importanceTheme} studyId={Studyid || session.id} userId={userId} topic={topic} />;
    if (activeTool === "resources") return <ResourceAttachments studyId={Studyid || session.id} userId={userId} theme={importanceTheme} />;
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Sidepane
        isOpen={isToolsOpen}
        onToggle={() => setIsToolsOpen((open) => !open)}
        onClose={() => setIsToolsOpen(false)}
        width={300}
        user={profile || user}
        theme={importanceTheme}
        activeTool={activeTool}
        onToolSelect={setActiveTool}
      />

      <main
        className={`min-w-0 px-3 py-4 sm:px-5 md:px-6 xl:px-10 ${
          isToolsOpen ? "xl:ml-[calc(var(--app-sidebar-width)+300px)]" : "xl:ml-[calc(var(--app-sidebar-width)+64px)]"
        }`}
      >
        <div className="mx-auto w-full max-w-[1500px]">
          <div className="min-w-0 w-full">
          <div className="mb-6 flex min-h-12 items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <button
              title="Open study menu"
              onClick={() => setIsToolsOpen((isOpen) => !isOpen)}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm hover:bg-slate-100"
            >
              <Menu className="h-5 w-5" />
              <span className="hidden text-sm font-semibold sm:inline">Study tools</span>
            </button>
            <button
              onClick={() => navigate("/Study")}
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-red-700"
            >
              <ArrowLeft className="h-4 w-4" />
              All sessions
            </button>
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

      <button
        title="Open AI tutor"
        onClick={() => setIsAIOpen((isOpen) => !isOpen)}
        className={`fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-[60] inline-flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-105 sm:right-6 sm:px-5 sm:text-base ${importanceTheme.accentButton}`}
      >
        <MessageCircle className="h-5 w-5" />
        AI Tutor
      </button>
      <div
        className={`fixed inset-y-0 right-0 z-20 ${
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
    </div>
  );
};

export default StudyEnvironment;
