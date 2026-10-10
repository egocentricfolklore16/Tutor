import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, FileText, Loader2, Mic, Sparkles, Trash2, X } from "lucide-react";
import supabase from "../../../lib/supabase";
import invokeAiTutor from "../../../lib/aiTutor";

const NoteEditor = ({ studyId, userId, topic, onTimelineEvent }) => {
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);
  const [resources, setResources] = useState([]);
  const [selectedResourceIds, setSelectedResourceIds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingResources, setIsLoadingResources] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showResourceOptions, setShowResourceOptions] = useState(false);
  const [useResources, setUseResources] = useState(true);
  const [error, setError] = useState("");
  const [isRecording, setIsRecording] = useState(false);

  const knownResourceIdsRef = useRef(null);
  const mediaRecorderRef = useRef(null);

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

  const fetchResources = useCallback(async () => {
    if (!studyId) {
      setResources([]);
      setSelectedResourceIds([]);
      setIsLoadingResources(false);
      return;
    }

    setIsLoadingResources(true);
    let query = supabase
      .from("session_resources")
      .select("id,session_id,user_id,title,kind,mime_type,file_path,url,created_at")
      .eq("session_id", studyId)
      .order("created_at", { ascending: false });
    if (userId) query = query.eq("user_id", userId);

    const { data, error: resourceError } = await query;
    if (resourceError) {
      setError(resourceError.message);
      setIsLoadingResources(false);
      return;
    }

    const loadedResources = data || [];
    const loadedIds = new Set(loadedResources.map((resource) => String(resource.id)));
    const previouslyKnownIds = knownResourceIdsRef.current;
    setSelectedResourceIds((currentIds) => [
      ...currentIds.filter((id) => loadedIds.has(id)),
      ...[...loadedIds].filter((id) => !previouslyKnownIds?.has(id)),
    ]);
    knownResourceIdsRef.current = loadedIds;
    setResources(loadedResources);
    setIsLoadingResources(false);
  }, [studyId, userId]);

  useEffect(() => {
    let isCurrent = true;
    const refreshResources = () => {
      if (isCurrent) void fetchResources();
    };

    refreshResources();
    if (!studyId) return () => { isCurrent = false; };

    const channel = supabase
      .channel(`note-resources-${studyId}-${userId || "current-user"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "session_resources", filter: `session_id=eq.${studyId}` },
        refreshResources
      )
      .subscribe();
    window.addEventListener("focus", refreshResources);

    return () => {
      isCurrent = false;
      window.removeEventListener("focus", refreshResources);
      supabase.removeChannel(channel);
    };
  }, [fetchResources, studyId, userId]);

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
    setShowResourceOptions(false);
    setIsGenerating(true);
    setError("");

    try {
      const result = await invokeAiTutor({
        sessionId: studyId,
        messages: [{
          role: "user",
          content: "Create beautifully organized study notes for this session using the session topic and any available notes or readable resources.",
        }],
        clientState: {
          intent: "generate_notes",
          use_resources: useResources,
          resource_ids: useResources ? selectedResourceIds : [],
        },
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

  const downloadAllNotes = () => {
    if (notes.length === 0) return;
    const compiledText = notes
      .map((note) => `=== ${note.title} ===\nDate: ${new Date(note.created_at).toLocaleString()}\n\n${note.content}\n\n`)
      .join("\n");
    const blob = new Blob([compiledText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(topic || "session").replace(/[^a-z0-9]/gi, "_").toLowerCase()}_notes.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const toggleMicDictation = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Audio recording is not supported in this browser environment.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        if (chunks.length > 0) {
          await persistNote({
            title: `Voice Note (${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })})`,
            content: "Audio dictation recorded during session.",
            source: "voice",
          });
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError("");
    } catch (err) {
      console.error("Microphone access error:", err);
      setError("Microphone access was denied or unavailable.");
      setIsRecording(false);
    }
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={downloadAllNotes}
            disabled={notes.length === 0}
            aria-label="Download notes as text file"
            title="Download notes as text file"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={toggleMicDictation}
            aria-label={isRecording ? "Stop voice dictation" : "Start voice dictation"}
            title={isRecording ? "Stop voice dictation" : "Start voice dictation"}
            className={`flex h-10 w-10 items-center justify-center rounded-xl border shadow-sm transition ${
              isRecording
                ? "border-rose-500 bg-rose-500 text-white animate-pulse"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <Mic className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setShowResourceOptions(true);
              void fetchResources();
            }}
            disabled={!studyId || isGenerating}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Sparkles className={`h-4 w-4 ${isGenerating ? "animate-pulse" : ""}`} />
            {isGenerating ? "Creating notes..." : "Create AI notes"}
          </button>
        </div>
      </div>

      {showResourceOptions && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-950/50 p-4" role="presentation">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="note-resource-options-title"
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="note-resource-options-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">Create AI notes</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Choose whether the tutor should use this session&apos;s uploaded resources.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowResourceOptions(false)}
                aria-label="Close resource options"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <fieldset className="mt-5 space-y-3">
              <legend className="sr-only">Use uploaded resources</legend>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <input
                  type="radio"
                  name="note-resource-mode"
                  checked={useResources}
                  onChange={() => setUseResources(true)}
                  className="mt-1 accent-violet-700"
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">Use uploaded resources</span>
                  <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">Choose specific files or include all readable files.</span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <input
                  type="radio"
                  name="note-resource-mode"
                  checked={!useResources}
                  onChange={() => setUseResources(false)}
                  className="mt-1 accent-violet-700"
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">Do not use uploaded resources</span>
                  <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">Create notes from the session topic and existing notes only.</span>
                </span>
              </label>
            </fieldset>

            {useResources && (
              <div className="mt-4 max-h-52 space-y-2 overflow-y-auto rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                {isLoadingResources ? (
                  <p className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin" /> Checking uploaded resources...
                  </p>
                ) : resources.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No uploaded resources in this session.</p>
                ) : resources.map((resource) => (
                  <label key={resource.id} className="flex cursor-pointer items-center gap-3 py-1 text-sm text-slate-700 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={selectedResourceIds.includes(String(resource.id))}
                      onChange={(event) => setSelectedResourceIds((current) => (
                        event.target.checked
                          ? [...current, String(resource.id)]
                          : current.filter((id) => id !== String(resource.id))
                      ))}
                      className="h-4 w-4 accent-violet-700"
                    />
                    <span className="min-w-0 truncate">{resource.title || "Untitled resource"}</span>
                  </label>
                ))}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowResourceOptions(false)}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={generateAiNote}
                disabled={isGenerating || isLoadingResources || (useResources && resources.length > 0 && selectedResourceIds.length === 0)}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" /> Create notes
              </button>
            </div>
          </section>
        </div>
      )}

      {isLoading ? (
        <p className="py-8 text-center text-sm text-slate-500">Loading notes...</p>
      ) : notes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-800/40">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm dark:bg-slate-800 dark:text-slate-500">
            <FileText className="h-5 w-5" />
          </div>
          <p className="font-semibold text-slate-700 dark:text-slate-200">Your notes will live here</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Create a clear, organized set of notes with AI or dictate via microphone.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <article key={note.id} className="rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                <button
                  type="button"
                  onClick={() => navigate(`/Study/${studyId}/notes/${note.id}`)}
                  className="min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
                >
                  <span className="block break-words font-semibold leading-6 text-slate-900 hover:text-violet-700 dark:text-slate-100 dark:hover:text-violet-300">
                    {note.title}
                  </span>
                  {note.source === "ai" && (
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
                      <Sparkles className="h-3 w-3" /> AI organized
                    </span>
                  )}
                  {note.source === "voice" && (
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                      <Mic className="h-3 w-3" /> Voice note
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