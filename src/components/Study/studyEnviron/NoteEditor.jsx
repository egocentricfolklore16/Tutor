import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { FileText, Pencil, Plus, Sparkles, Trash2, X } from "lucide-react";
import supabase from "../../../lib/supabase";
import invokeAiTutor from "../../../lib/aiTutor";

const NoteEditor = ({ studyId, userId, topic, theme, onTimelineEvent }) => {
  const noteThemes = ["accent-card-chat", "accent-card-plan", "accent-card-read", "accent-card-track"];
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);
  const [form, setForm] = useState({ title: "", content: "" });
  const [editingId, setEditingId] = useState(null);
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

  const saveNote = async (event) => {
    event.preventDefault();
    if (!studyId) {
      setError("Active study session required to save notes.");
      return;
    }
    if (!form.title.trim() || !form.content.trim()) return;

    try {
      let data;
      if (editingId) {
        const { data: updatedNote, error: saveError } = await supabase
          .from("session_notes")
          .update({ title: form.title.trim(), content: form.content.trim() })
          .eq("id", editingId)
          .select()
          .single();
        if (saveError) throw saveError;
        data = updatedNote;
        setNotes((current) => current.map((note) => note.id === editingId ? data : note));
      } else {
        data = await persistNote({
          title: form.title,
          content: form.content,
          source: "user",
        });
      }
      setError("");
      setForm({ title: "", content: "" });
      setEditingId(null);
    } catch (saveError) {
      setError(saveError.message || "Unable to save this note.");
    }
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
        <div className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <span>{error}</span>
          <button onClick={() => setError("")}><X className="h-4 w-4" /></button>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 to-indigo-50 p-4 dark:border-violet-900/50 dark:from-violet-950/30 dark:to-indigo-950/30">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-white p-2 text-violet-600 shadow-sm dark:bg-slate-900 dark:text-violet-300">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 dark:text-slate-100">Build organized notes with AI</p>
            <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">Creates a session note from your topic and available study materials.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={generateAiNote}
          disabled={!studyId || isGenerating}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Sparkles className={`h-4 w-4 ${isGenerating ? "animate-pulse" : ""}`} />
          {isGenerating ? "Creating notes..." : "Generate AI notes"}
        </button>
      </div>
      <form onSubmit={saveNote} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
        <input
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          placeholder="Note title"
          className="w-full rounded-lg border border-slate-200 bg-white p-3 outline-none focus:ring-2"
          disabled={!studyId}
        />
        <textarea
          value={form.content}
          onChange={(event) => setForm({ ...form, content: event.target.value })}
          placeholder="Write a note for this session..."
          className={`min-h-32 w-full rounded-lg border border-slate-200 bg-white p-4 outline-none focus:ring-2 ${theme?.focus || ""}`}
          disabled={!studyId}
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => { setForm({ title: "", content: "" }); setEditingId(null); }}
            className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-white"
          >
            Clear
          </button>
          <button
            disabled={!studyId}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${theme?.accentButton || "bg-emerald-600"}`}
          >
            <Plus className="mr-1 inline h-4 w-4" />
            {editingId ? "Update note" : "Save note"}
          </button>
        </div>
      </form>
      {isLoading ? (
        <p className="text-sm text-slate-500">Loading notes...</p>
      ) : notes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
          <FileText className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-500">No notes saved for this session.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {notes.map((note, index) => (
            <article key={note.id} className={`relative min-h-36 rounded-lg p-4 ${noteThemes[index % noteThemes.length]}`}>
              <span className="absolute right-3 top-3 text-xs font-bold opacity-60">{String(index + 1).padStart(2, "0")}</span>
              <button
                type="button"
                onClick={() => navigate(`/Study/${studyId}/notes/${note.id}`)}
                className="block max-w-full break-words pr-6 text-left font-bold text-gray-900 hover:underline"
              >
                {note.title}
              </button>
              <div className="mt-3 max-h-24 overflow-hidden text-sm leading-5 text-gray-800">
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => <h3 className="mb-1 font-bold">{children}</h3>,
                    h2: ({ children }) => <h3 className="mb-1 font-bold">{children}</h3>,
                    h3: ({ children }) => <h3 className="mb-1 font-semibold">{children}</h3>,
                    p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                    ul: ({ children }) => <ul className="mb-1 list-disc pl-4">{children}</ul>,
                    ol: ({ children }) => <ol className="mb-1 list-decimal pl-4">{children}</ol>,
                    li: ({ children }) => <li>{children}</li>,
                    strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                  }}
                >
                  {note.content}
                </ReactMarkdown>
              </div>
              {note.source === "ai" && (
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-violet-800">
                  <Sparkles className="h-3 w-3" /> AI organized
                </span>
              )}
              <div className="mt-4 flex gap-3 border-t border-black/10 pt-3">
                <button
                  onClick={() => { setEditingId(note.id); setForm({ title: note.title, content: note.content }); }}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-gray-900"
                >
                  <Pencil className="h-3 w-3" />Edit
                </button>
                <button onClick={() => removeNote(note.id)} className="inline-flex items-center gap-1 text-sm font-semibold text-red-800">
                  <Trash2 className="h-3 w-3" />Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default NoteEditor;
