import React, { useEffect, useState } from "react";
import { ArrowLeft, FileText, Loader2, MessageCircle } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import supabase from "../../lib/supabase";
import AITutorChat from "./studyEnviron/AITutorChat";
import LoadingCompanion from "../common/LoadingCompanion";

function NoteDetail() {
  const { Studyid, noteId } = useParams();
  const navigate = useNavigate();
  const [note, setNote] = useState(null);
  const [sessionStatus, setSessionStatus] = useState("");
  const [status, setStatus] = useState("loading");
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState([]);
  const [aiMessage, setAiMessage] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);

  useEffect(() => {
    const loadNote = async () => {
      const [{ data, error }, { data: study }] = await Promise.all([
        supabase
          .from("notes")
          .select("id, session_id, title, content, created_at")
          .eq("id", noteId)
          .eq("session_id", Studyid)
          .single(),
        supabase.from("Study").select("Status").eq("id", Studyid).single(),
      ]);

      if (error) setStatus("error");
      else {
        setNote(data);
        setSessionStatus(study?.Status || "");
        setStatus("ready");
      }
    };

    loadNote();
  }, [Studyid, noteId]);

  const sendAiMessage = () => {
    const text = aiMessage.trim();
    if (!text || isAiTyping || !note) return;
    setAiMessages((messages) => [...messages, { sender: "user", text }]);
    setAiMessage("");
    setIsAiTyping(true);
    window.setTimeout(() => {
      setAiMessages((messages) => [...messages, {
        sender: "ai",
        text: `For your note "${note.title}", ${text.toLowerCase().includes("summar") ? "focus on the main idea, supporting points, and one practical example." : "use the note's key ideas to explain the topic in your own words, then test yourself with one example."}`,
      }]);
      setIsAiTyping(false);
    }, 700);
  };

  const theme = {
    "very important": { page: "bg-red-50", accent: "text-red-700", button: "bg-red-600 hover:bg-red-700", border: "border-red-200", soft: "border-red-100" },
    medium: { page: "bg-orange-50", accent: "text-orange-700", button: "bg-orange-600 hover:bg-orange-700", border: "border-orange-200", soft: "border-orange-100" },
    "not so important": { page: "bg-green-50", accent: "text-green-700", button: "bg-green-600 hover:bg-green-700", border: "border-green-200", soft: "border-green-100" },
    default: { page: "bg-slate-50", accent: "text-slate-700", button: "bg-slate-600 hover:bg-slate-700", border: "border-slate-200", soft: "border-slate-100" },
  }[sessionStatus.trim().toLowerCase()] || {
    page: "bg-slate-50", accent: "text-slate-700", button: "bg-slate-600 hover:bg-slate-700", border: "border-slate-200", soft: "border-slate-100",
  };

  if (status === "loading") return <LoadingCompanion message="Loading note..." />;
  if (status === "error") return <main className="min-h-screen bg-slate-50 p-8"><div className="mx-auto max-w-3xl rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">Unable to load this note.</div></main>;

  return (
    <div className={`min-h-screen ${theme.page}`}>
      <main className="px-5 py-8 md:px-10">
      <div className="mx-auto max-w-3xl">
        <button type="button" onClick={() => navigate(`/Study/${Studyid}`)} className={`mb-6 inline-flex items-center gap-2 text-sm font-semibold ${theme.accent}`}>
          <ArrowLeft className="h-4 w-4" /> Back to notes
        </button>
        <article className={`rounded-xl border ${theme.border} bg-white p-6 shadow-sm md:p-10`}>
          <div className={`mb-6 flex items-start gap-3 border-b ${theme.soft} pb-6`}>
            <FileText className={`mt-1 h-6 w-6 shrink-0 ${theme.accent}`} />
            <div className="min-w-0">
              <h1 className="break-words text-2xl font-bold text-slate-900 md:text-3xl">{note.title}</h1>
              <p className="mt-2 text-sm text-slate-400">{new Date(note.created_at).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="break-words whitespace-pre-wrap text-base leading-8 text-slate-700">{note.content}</div>
        </article>
      </div>
      </main>
      <button type="button" title="Open AI tutor" onClick={() => setIsAIOpen((open) => !open)} className={`fixed bottom-6 right-6 z-10 inline-flex items-center gap-2 rounded-full px-5 py-3 font-semibold text-white shadow-lg ${theme.button}`}><MessageCircle className="h-5 w-5" /> AI Tutor</button>
      <div className={`fixed inset-y-0 right-0 z-20 transition-transform ${isAIOpen ? "translate-x-0" : "translate-x-full"}`}>
        <AITutorChat isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} messages={aiMessages} currentMessage={aiMessage} onMessageChange={setAiMessage} onSendMessage={sendAiMessage} onClear={() => { setAiMessages([]); setAiMessage(""); }} isTyping={isAiTyping} width={360} theme={{ accentButton: theme.button, accentBg: theme.page }} />
      </div>
    </div>
  );
}

export default NoteDetail;