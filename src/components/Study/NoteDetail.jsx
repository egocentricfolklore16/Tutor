import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, Download, FileText, Pause, Play, Volume2, Square } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useNavigate, useParams } from "react-router-dom";
import supabase from "../../lib/supabase";
import LoadingCompanion from "../common/LoadingCompanion";

function stripNoteMarkup(content) {
  return String(content || "")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/```[\s\S]*?```/g, (code) => code.replace(/```[^\n]*\n?/g, " "))
    .replace(/[`*_~>#]/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitSpeechText(text, maxLength = 220) {
  const sentences = text.match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g) || [];
  const chunks = [];
  let current = "";

  sentences.forEach((sentence) => {
    let remaining = sentence.trim();
    while (remaining.length > maxLength) {
      const splitAt = remaining.lastIndexOf(" ", maxLength);
      const boundary = splitAt > 0 ? splitAt : maxLength;
      const part = remaining.slice(0, boundary).trim();
      if (part) chunks.push(part);
      remaining = remaining.slice(boundary).trim();
    }
    if (!remaining) return;
    if (current && `${current} ${remaining}`.length > maxLength) {
      chunks.push(current);
      current = remaining;
    } else {
      current = current ? `${current} ${remaining}` : remaining;
    }
  });
  if (current) chunks.push(current);
  return chunks;
}

function NoteDetail() {
  const { Studyid, noteId } = useParams();
  const navigate = useNavigate();
  const [note, setNote] = useState(null);
  const [sessionStatus, setSessionStatus] = useState("");
  const [status, setStatus] = useState("loading");
  const [voiceState, setVoiceState] = useState("idle");
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
  const speechChunksRef = useRef([]);
  const speechIndexRef = useRef(0);
  const playbackIdRef = useRef(0);
  const downloadMenuRef = useRef(null);
  const downloadTimeoutsRef = useRef(new Map());
  const speechSupported = typeof window !== "undefined"
    && "speechSynthesis" in window
    && "SpeechSynthesisUtterance" in window;

  const stopReading = () => {
    playbackIdRef.current += 1;
    if (speechSupported) window.speechSynthesis.cancel();
    speechChunksRef.current = [];
    speechIndexRef.current = 0;
    setVoiceState("idle");
  };

  const speakChunk = (index, playbackId) => {
    if (playbackId !== playbackIdRef.current) return;
    if (index >= speechChunksRef.current.length) {
      setVoiceState("idle");
      speechChunksRef.current = [];
      return;
    }

    speechIndexRef.current = index;
    const utterance = new window.SpeechSynthesisUtterance(speechChunksRef.current[index]);
    utterance.onend = () => {
      if (playbackId === playbackIdRef.current) speakChunk(index + 1, playbackId);
    };
    utterance.onerror = () => {
      if (playbackId === playbackIdRef.current) setVoiceState("idle");
    };
    window.speechSynthesis.speak(utterance);
  };

  const toggleReading = () => {
    if (!speechSupported) return;
    if (voiceState === "paused") {
      window.speechSynthesis.resume();
      setVoiceState("reading");
      return;
    }
    if (voiceState === "reading") {
      window.speechSynthesis.pause();
      setVoiceState("paused");
      return;
    }

    const chunks = splitSpeechText(stripNoteMarkup(note?.content));
    if (!chunks.length) return;
    window.speechSynthesis.cancel();
    speechChunksRef.current = chunks;
    const playbackId = playbackIdRef.current + 1;
    playbackIdRef.current = playbackId;
    setVoiceState("reading");
    speakChunk(0, playbackId);
  };

  const downloadNote = (format) => {
    if (!note) return;
    const isMarkdown = format === "md";
    const contents = isMarkdown ? note.content || "" : stripNoteMarkup(note.content);
    const safeTitle = String(note.title || "note").replace(/[\\/:*?"<>|\r\n]+/g, "-").trim() || "note";
    const blob = new Blob([contents], { type: `${isMarkdown ? "text/markdown" : "text/plain"};charset=utf-8` });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `${safeTitle}.${format}`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    const timeout = window.setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
      downloadTimeoutsRef.current.delete(timeout);
    }, 1000);
    downloadTimeoutsRef.current.set(timeout, objectUrl);
    setIsDownloadMenuOpen(false);
  };

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

  useEffect(() => {
    const downloadTimeouts = downloadTimeoutsRef.current;
    setVoiceState("idle");
    return () => {
      playbackIdRef.current += 1;
      if (speechSupported) window.speechSynthesis.cancel();
      downloadTimeouts.forEach((objectUrl, timeout) => {
        window.clearTimeout(timeout);
        URL.revokeObjectURL(objectUrl);
      });
      downloadTimeouts.clear();
    };
  }, [noteId, speechSupported]);

  useEffect(() => {
    if (!isDownloadMenuOpen) return undefined;
    const closeMenuOutside = (event) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target)) {
        setIsDownloadMenuOpen(false);
      }
    };
    const closeMenuOnEscape = (event) => {
      if (event.key === "Escape") setIsDownloadMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeMenuOutside);
    document.addEventListener("keydown", closeMenuOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMenuOutside);
      document.removeEventListener("keydown", closeMenuOnEscape);
    };
  }, [isDownloadMenuOpen]);

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
          <div className={`mb-6 flex items-start justify-between gap-3 border-b ${theme.soft} pb-6`}>
            <div className="flex min-w-0 items-start gap-3">
              <FileText className={`mt-1 h-6 w-6 shrink-0 ${theme.accent}`} />
              <div className="min-w-0">
                <h1 className="break-words text-2xl font-bold text-slate-900 dark:text-slate-100 md:text-3xl">{note.title}</h1>
                <p className="mt-2 text-sm text-slate-400 dark:text-slate-500">{new Date(note.created_at).toLocaleDateString()}</p>
                {voiceState !== "idle" && <p className="mt-1 text-xs font-semibold text-green-700 dark:text-green-400" role="status">Reading…</p>}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <details
                ref={downloadMenuRef}
                open={isDownloadMenuOpen}
                onToggle={(event) => setIsDownloadMenuOpen(event.currentTarget.open)}
                className="relative"
              >
                <summary
                  title="Download note"
                  aria-label="Download note"
                  className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:focus-visible:ring-green-400 [&::-webkit-details-marker]:hidden"
                >
                  <Download className="h-5 w-5" aria-hidden="true" />
                  <span className="sr-only md:not-sr-only md:ml-2">Download</span>
                </summary>
                <div className="absolute right-0 z-20 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-[#18211f]">
                  <button type="button" onClick={() => downloadNote("txt")} className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:ring-green-400">Download as .txt</button>
                  <button type="button" onClick={() => downloadNote("md")} className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:ring-green-400">Download as .md</button>
                </div>
              </details>
              <button
                type="button"
                onClick={toggleReading}
                disabled={!speechSupported}
                title={speechSupported ? (voiceState === "reading" ? "Pause reading" : voiceState === "paused" ? "Resume reading" : "Read note aloud") : "Speech synthesis is not supported in this browser"}
                aria-label={speechSupported ? (voiceState === "reading" ? "Pause reading" : voiceState === "paused" ? "Resume reading" : "Read note aloud") : "Speech synthesis is not supported in this browser"}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800 dark:focus-visible:ring-green-400"
              >
                {voiceState === "reading" ? <Pause className="h-5 w-5" aria-hidden="true" /> : voiceState === "paused" ? <Play className="h-5 w-5" aria-hidden="true" /> : <Volume2 className="h-5 w-5" aria-hidden="true" />}
                <span className="sr-only md:not-sr-only md:ml-2">{voiceState === "reading" ? "Pause" : voiceState === "paused" ? "Resume" : "Voice"}</span>
              </button>
              {voiceState !== "idle" && (
                <button
                  type="button"
                  onClick={stopReading}
                  title="Stop reading"
                  aria-label="Stop reading"
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:focus-visible:ring-green-400"
                >
                  <Square className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
          <div className="break-words text-sm font-normal leading-relaxed text-slate-700 dark:text-slate-300 md:text-base md:leading-8">
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h2 className="mb-3 mt-7 text-xl font-bold text-slate-900 first:mt-0 dark:text-slate-100 md:text-2xl **:font-bold">{children}</h2>,
                h2: ({ children }) => <h2 className="mb-3 mt-7 text-lg font-bold text-slate-900 first:mt-0 dark:text-slate-100 md:text-xl **:font-bold">{children}</h2>,
                h3: ({ children }) => <h3 className="mb-2 mt-5 text-base font-semibold text-slate-900 dark:text-slate-100 md:text-lg **:font-bold">{children}</h3>,
                p: ({ children }) => <p className="mb-4 text-sm font-normal leading-relaxed last:mb-0 md:text-base md:leading-8">{children}</p>,
                ul: ({ children }) => <ul className="mb-4 list-disc space-y-1 pl-6 text-sm font-normal leading-relaxed md:text-base md:leading-8">{children}</ul>,
                ol: ({ children }) => <ol className="mb-4 list-decimal space-y-1 pl-6 text-sm font-normal leading-relaxed md:text-base md:leading-8">{children}</ol>,
                li: ({ children }) => <li className="pl-1">{children}</li>,
                strong: ({ children }) => <strong className="font-normal text-slate-900 dark:text-slate-100 md:font-bold">{children}</strong>,
                blockquote: ({ children }) => <blockquote className="my-4 border-l-4 border-emerald-300 pl-4 text-slate-600 dark:border-emerald-700 dark:text-slate-400">{children}</blockquote>,
                code: ({ children }) => <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm dark:bg-slate-800">{children}</code>,
              }}
            >
              {note.content}
            </ReactMarkdown>
          </div>
        </article>
      </div>
      </main>
    </div>
  );
}

export default NoteDetail;
