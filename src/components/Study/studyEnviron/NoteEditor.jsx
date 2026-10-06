import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Sparkles, Trash2, X } from "lucide-react";
import supabase from "../../../lib/supabase";
import invokeAiTutor from "../../../lib/aiTutor";

const NoteEditor = ({ studyId, userId, topic, onTimelineEvent }) => {
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;
    if (!studyId) {
      setNotes([]);
      setIsLoading(false);
      return () => {
        isCurrent = false;
      };
    }

    setIsLoading(true);
    supabase
      .from("session_notes")
      .select("id,session_id,user_id,title,content,source,created_at")
      .eq("session_id", studyId)
      .order("created_at", { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (!isCurrent) return;
        if (fetchError) setError(fetchError.message);
        else setNotes(data || []);
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [studyId]);

  const persistNote = async ({ title, content, source }) => {
    let activeUserId = userId;
    if (!activeUserId) {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      activeUserId = user?.id;
    }
    if (!activeUserId) throw new Error("Please sign in again to save notes.");

    const { data, error: saveError } = await supabase
      .from("session_notes")
      .insert({
        title: title.trim(),
        content: content.trim(),
        session_id: studyId,
        user_id: activeUserId,
        source,
      })
      .select()
      .single();

    if (saveError) throw saveError;
    setNotes((current) => [data, ...current]);
    if (onTimelineEvent) {
      onTimelineEvent({
        id: crypto.randomUUID(),
        type: "note",
        refId: String(data.id),
        title: data.title || "Note created",
        timestamp: new Date().toISOString(),
      });
    }
    return data;
  };

  const generateAiNote = async () => {
    if (!studyId || isGenerating) return;
    setIsGenerating(true);
    setError("");

    try {
      const result = await invokeAiTutor({
        sessionId: studyId,
        messages: [{
          role: "user",
          content: "Create beautifully organized study notes for this session using the session topic and any available notes or readable resources.",
        }],
        clientState: { intent: "generate_notes" },
      });

      if (result.error) throw new Error(result.error.message || "Unable to generate AI notes.");
      const content = result.reply?.trim();
      if (!content) throw new Error("The AI returned an empty note. Please try again.");

      const title = `${topic || "Study session"} — Study Notes`;
      await persistNote({ title, content, source: "ai" });
      setError("");
    } catch (generationError) {
      setError(generationError.message || "Unable to generate AI notes.");
    } finally {
      setIsGenerating(false);
    }
  };

  const removeNote = async (id) => {
    const { error: deleteError } = await supabase.from("session_notes").delete().eq("id", id);
    if (deleteError) setError(deleteError.message);
    else setNotes((current) => current.filter((note) => note.id !== id));
  };

  return (
    <div className="space-y-5">
      {error && (
        <div role="alert" className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button type="button" aria-label="Dismiss error" onClick={() => setError("")}><X className="h-4 w-4" /></button>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">Keep key ideas close while you study.</p>
        <button
          type="button"
          onClick={generateAiNote}
          disabled={!studyId || isGenerating}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Sparkles className={`h-4 w-4 ${isGenerating ? "animate-pulse" : ""}`} />
          {isGenerating ? "Creating notes..." : "Create AI notes"}
        </button>
      </div>
      {isLoading ? (
        <p className="py-8 text-center text-sm text-slate-500">Loading notes...</p>
      ) : notes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-800/40">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm dark:bg-slate-800 dark:text-slate-500">
            <FileText className="h-5 w-5" />
          </div>
          <p className="font-semibold text-slate-700 dark:text-slate-200">Your notes will live here</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Create a clear, organized set of notes with AI.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <article key={note.id} className="rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600">
              <div className="flex items-start justify-between gap-4">
                <button
                  type="button"
                  onClick={() => navigate(`/Study/${studyId}/notes/${note.id}`)}
                  className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
                >
                  <span className="block break-words font-semibold leading-6 text-slate-900 hover:text-violet-700 dark:text-slate-100 dark:hover:text-violet-300">
                    {note.title}
                  </span>
                  {note.source === "ai" && (
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
                      <Sparkles className="h-3 w-3" /> AI organized
                    </span>
                  )}
                  <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm leading-6 text-slate-600 dark:text-slate-400">
                    {note.content.replace(/[#*_>`~-]/g, "").trim()}
                  </p>
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${note.title}`}
                  onClick={() => removeNote(note.id)}
                  className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:hover:bg-red-950/40"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
                {new Date(note.created_at).toLocaleDateString()}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default NoteEditor;
