import React, { useEffect, useState } from "react";
import { ArrowLeft, FileText } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import supabase from "../../lib/supabase";
import LoadingCompanion from "../common/LoadingCompanion";

function NoteDetail() {
  const { Studyid, noteId } = useParams();
  const navigate = useNavigate();
  const [note, setNote] = useState(null);
  const [sessionStatus, setSessionStatus] = useState("");
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    const loadNote = async () => {
      const [{ data, error }, { data: study }] = await Promise.all([
        supabase
          .from("session_notes")
          .select("id, session_id, title, content, created_at")
          .eq("id", noteId)
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

  const theme = {
    "very important": { page: "bg-red-50 dark:bg-slate-950", accent: "text-red-700 dark:text-red-400", button: "bg-red-600 hover:bg-red-700", border: "border-red-200 dark:border-red-900/50", soft: "border-red-100 dark:border-slate-800" },
    medium: { page: "bg-orange-50 dark:bg-slate-950", accent: "text-orange-700 dark:text-orange-400", button: "bg-orange-600 hover:bg-orange-700", border: "border-orange-200 dark:border-orange-900/50", soft: "border-orange-100 dark:border-slate-800" },
    "not so important": { page: "bg-green-50 dark:bg-slate-950", accent: "text-green-700 dark:text-emerald-400", button: "bg-green-600 hover:bg-green-700", border: "border-green-200 dark:border-emerald-900/50", soft: "border-green-100 dark:border-slate-800" },
    default: { page: "bg-slate-50 dark:bg-slate-950", accent: "text-slate-700 dark:text-slate-300", button: "bg-slate-600 hover:bg-slate-700", border: "border-slate-200 dark:border-slate-800", soft: "border-slate-100 dark:border-slate-800" },
  }[sessionStatus.trim().toLowerCase()] || {
    page: "bg-slate-50 dark:bg-slate-950", accent: "text-slate-700 dark:text-slate-300", button: "bg-slate-600 hover:bg-slate-700", border: "border-slate-200 dark:border-slate-800", soft: "border-slate-100 dark:border-slate-800",
  };

  if (status === "loading") return <LoadingCompanion message="Loading note..." />;
  if (status === "error") return <main className="min-h-screen bg-slate-50 dark:bg-slate-950 p-8"><div className="mx-auto max-w-3xl rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 p-6 text-red-700 dark:text-red-300">Unable to load this note.</div></main>;

  return (
    <div className={`min-h-screen ${theme.page}`}>
      <main className="px-5 py-8 md:px-10">
      <div className="mx-auto max-w-3xl">
        <button type="button" onClick={() => navigate(`/Study/${Studyid}`)} className={`mb-6 inline-flex items-center gap-2 text-sm font-semibold ${theme.accent}`}>
          <ArrowLeft className="h-4 w-4" /> Back to notes
        </button>
        <article className={`rounded-xl border ${theme.border} bg-white dark:bg-slate-900 p-6 shadow-sm md:p-10`}>
          <div className={`mb-6 flex items-start gap-3 border-b ${theme.soft} pb-6`}>
            <FileText className={`mt-1 h-6 w-6 shrink-0 ${theme.accent}`} />
            <div className="min-w-0">
              <h1 className="break-words text-2xl font-bold text-slate-900 dark:text-slate-100 md:text-3xl">{note.title}</h1>
              <p className="mt-2 text-sm text-slate-400 dark:text-slate-500">{new Date(note.created_at).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="break-words whitespace-pre-wrap text-base leading-8 text-slate-700 dark:text-slate-300">{note.content}</div>
        </article>
      </div>
      </main>
    </div>
  );
}

export default NoteDetail;
