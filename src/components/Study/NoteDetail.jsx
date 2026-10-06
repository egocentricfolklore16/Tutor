import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
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
    "very important": {
      page: "bg-red-50",
      accent: "text-red-700",
      border: "border-red-200",
      soft: "border-red-100",
    },
    medium: {
      page: "bg-orange-50",
      accent: "text-orange-700",
      border: "border-orange-200",
      soft: "border-orange-100",
    },
    "not so important": {
      page: "bg-green-50",
      accent: "text-green-700",
      border: "border-green-200",
      soft: "border-green-100",
    },
    default: {
      page: "bg-slate-50",
      accent: "text-slate-700",
      border: "border-slate-200",
      soft: "border-slate-100",
    },
  }[String(sessionStatus || "default").trim().toLowerCase()] || {
    page: "bg-slate-50",
    accent: "text-slate-700",
    border: "border-slate-200",
    soft: "border-slate-100",
  };

  if (status === "loading") return <LoadingCompanion message="Loading note..." />;
  if (status === "error") {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-3xl rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
          Unable to load this note.
        </div>
      </main>
    );
  }

  return (
    <div className={`min-h-screen ${theme.page}`}>
      <main className="px-5 py-8 md:px-10">
        <div className="mx-auto max-w-3xl">
          <button
            type="button"
            onClick={() => navigate(`/Study/${Studyid}`)}
            className={`mb-6 inline-flex items-center gap-2 text-sm font-semibold ${theme.accent}`}
          >
            <ArrowLeft className="h-4 w-4" /> Back to notes
          </button>

          <article className={`rounded-xl border ${theme.border} bg-white p-6 shadow-sm md:p-10`}>
            <div className={`mb-6 flex items-start gap-3 border-b ${theme.soft} pb-6`}>
              <FileText className={`mt-1 h-6 w-6 shrink-0 ${theme.accent}`} />
              <div className="min-w-0">
                <h1 className="break-words text-2xl font-bold text-slate-900 md:text-3xl">{note.title}</h1>
                <p className="mt-2 text-sm text-slate-400">
                  {new Date(note.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="break-words text-sm font-normal leading-relaxed text-slate-700 dark:text-slate-300 md:text-base md:leading-8">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h2 className="mb-3 mt-7 text-xl font-bold text-slate-900 first:mt-0 dark:text-slate-100 md:text-2xl">
                      {children}
                    </h2>
                  ),
                  h2: ({ children }) => (
                    <h2 className="mb-3 mt-7 text-lg font-bold text-slate-900 first:mt-0 dark:text-slate-100 md:text-xl">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="mb-2 mt-5 text-base font-semibold text-slate-900 dark:text-slate-100 md:text-lg">
                      {children}
                    </h3>
                  ),
                  p: ({ children }) => (
                    <p className="mb-4 text-[15px] font-normal leading-7 text-slate-700 last:mb-0 dark:text-slate-300 md:text-base md:leading-8">
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul className="mb-4 list-disc space-y-1 pl-6 text-[15px] font-normal leading-7 text-slate-700 dark:text-slate-300 md:text-base md:leading-8">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="mb-4 list-decimal space-y-1 pl-6 text-[15px] font-normal leading-7 text-slate-700 dark:text-slate-300 md:text-base md:leading-8">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => <li className="pl-1">{children}</li>,
                  strong: ({ children }) => <strong className="font-semibold text-slate-900 dark:text-slate-100">{children}</strong>,
                  blockquote: ({ children }) => (
                    <blockquote className="my-4 border-l-4 border-emerald-300 pl-4 text-slate-600 dark:border-emerald-700 dark:text-slate-400">
                      {children}
                    </blockquote>
                  ),
                  code: ({ children }) => (
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm dark:bg-slate-800">
                      {children}
                    </code>
                  ),
                }}
              >
                {note.content || ""}
              </ReactMarkdown>
            </div>
          </article>
        </div>
      </main>
    </div>
  );
}

export default NoteDetail;
