import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Check,
  CircleAlert,
  ExternalLink,
  FileText,
  FileUp,
  HelpCircle,
  Layers3,
  Library as LibraryIcon,
  LayoutGrid,
  List,
  Link2,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
  Youtube,
} from "lucide-react";
import supabase from "../../lib/supabase";
import { gamificationService } from "../../features/gamification";
import LoadingCompanion from "../common/LoadingCompanion";
import PageContainer from "../common/PageContainer";
import { sanitizeUrl } from "../../lib/communityChat";
import ResponsiveSheet from "../common/ResponsiveSheet";
import ResourcePreviewModal from "../common/ResourcePreviewModal";

const STORAGE_BUCKET = "resources";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
  "text/markdown",
  "text/csv",
];

const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx", "png", "jpg", "jpeg", "webp", "txt", "md", "csv"];

const getSafeFileName = (fileName) => fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
const getResourceDomain = (url) => {
  try {
    return url ? new URL(url).hostname : "";
  } catch {
    return "";
  }
};

function LibraryItem({
  variant,
  icon: Icon,
  iconClass,
  tileClass,
  title,
  date,
  category,
  preview,
  actions,
  children,
  onPreview,
}) {
  const handleCardKeyDown = (event) => {
    if (!onPreview || event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onPreview();
    }
  };

  if (variant === "list") {
    return (
      <article
        onClick={onPreview}
        onKeyDown={handleCardKeyDown}
        tabIndex={onPreview ? 0 : undefined}
        aria-label={onPreview ? `Preview ${title}` : undefined}
        className={`group relative flex min-h-[140px] w-full min-w-0 flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition dark:border-slate-800 dark:bg-slate-900/80 sm:flex-row sm:items-start ${onPreview ? "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70" : ""}`}
      >
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${tileClass}`}>
            {React.createElement(Icon, { className: `h-5 w-5 ${iconClass}`, "aria-hidden": true })}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-bold text-slate-900 dark:text-slate-100" title={title}>{title}</h3>
            <p className="truncate text-[10px] text-slate-400 dark:text-slate-500">{date}</p>
            <div className="mt-2 min-w-0">{category}</div>
            <p className="mt-2 line-clamp-3 min-w-0 break-words text-xs leading-5 text-slate-600 dark:text-slate-300" title={preview}>
              {preview}
            </p>
            {children && <div className="mt-3 min-w-0">{children}</div>}
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2 pt-2 sm:pt-0">{actions}</div>
      </article>
    );
  }

  return (
    <article
      onClick={onPreview}
      onKeyDown={handleCardKeyDown}
      tabIndex={onPreview ? 0 : undefined}
      aria-label={onPreview ? `Preview ${title}` : undefined}
      className={`flex h-full min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 transition dark:border-slate-800 dark:bg-slate-900/80 ${onPreview ? "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70" : ""}`}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tileClass}`}>
          {React.createElement(Icon, { className: `h-5 w-5 ${iconClass}`, "aria-hidden": true })}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-bold text-slate-900 dark:text-slate-100" title={title}>{title}</h3>
          <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">{date}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      </div>
      <div className="mt-3 min-w-0">{category}</div>
      <p className="mt-3 min-h-[3.75rem] min-w-0 line-clamp-3 break-words text-xs leading-5 text-slate-600 dark:text-slate-300">
        {preview}
      </p>
      {children && <div className="mt-auto min-w-0 pt-3">{children}</div>}
    </article>
  );
}

function Library({ session }) {
  const [activeTab, setActiveTab] = useState("all");
  const [libraryView, setLibraryView] = useState(() => {
    try {
      if (typeof window === "undefined") return "grid";
      const savedView = window.localStorage.getItem("hypertutor:library-view");
      return savedView === "list" ? "list" : "grid";
    } catch {
      return "grid";
    }
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [previewResource, setPreviewResource] = useState(null);
  const closeResourcePreview = useCallback(() => setPreviewResource(null), []);

  const [notes, setNotes] = useState([]);
  const [flashcards, setFlashcards] = useState([]);
  const [resources, setResources] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [studies, setStudies] = useState([]);

  const [creationType, setCreationType] = useState(null);

  const [noteForm, setNoteForm] = useState({ title: "", content: "" });

  const [flashcardForm, setFlashcardForm] = useState({ question: "", answer: "" });

  const [resourceMode, setResourceMode] = useState("file");
  const [selectedFile, setSelectedFile] = useState(null);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkKind] = useState("link");

  const [retakingQuizMap, setRetakingQuizMap] = useState({});
  const [quizSavingId, setQuizSavingId] = useState(null);

  const [flippedCards, setFlippedCards] = useState({});
  const reviewedCardIdsRef = useRef(new Set());

  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchLibraryData = useCallback(async () => {
    const userId = session?.user?.id;
    if (!userId) return;

    setIsLoading(true);
    setError("");

    try {
      const [
        { data: notesData, error: notesErr },
        { data: flashcardsData, error: flashcardsErr },
        { data: resourcesData, error: resourcesErr },
        { data: quizzesData, error: quizzesErr },
        { data: questionsData, error: questionsErr },
        { data: attemptsData, error: attemptsErr },
        { data: studyData, error: studyErr },
      ] = await Promise.all([
        supabase
          .from("session_notes")
          .select("id, session_id, user_id, title, content, source, created_at, updated_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("session_flashcards")
          .select("id, session_id, user_id, question, answer, source, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("session_resources")
          .select("id, session_id, user_id, title, kind, file_path, url, mime_type, extraction_status, extracted_text, source, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("session_quizzes")
          .select("id, session_id, user_id, title, source, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("session_quiz_questions")
          .select("id, quiz_id, position, question, options, correct_index, explanation")
          .eq("user_id", userId)
          .order("position", { ascending: true }),
        supabase
          .from("session_quiz_attempts")
          .select("id, quiz_id, score, total, answers, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("Study")
          .select("id, Subject, Topic")
          .eq("user_id", userId),
      ]);

      if (notesErr || flashcardsErr || resourcesErr || quizzesErr || questionsErr || attemptsErr || studyErr) {
        console.error("Library fetch errors:", {
          notesErr,
          flashcardsErr,
          resourcesErr,
          quizzesErr,
          questionsErr,
          attemptsErr,
          studyErr,
        });
        setError("Unable to load all library items right now.");
      }

      setNotes(notesData || []);
      setFlashcards(flashcardsData || []);
      setResources(resourcesData || []);
      setStudies(studyData || []);

      const questionsByQuiz = (questionsData || []).reduce((acc, q) => {
        if (!acc[q.quiz_id]) acc[q.quiz_id] = [];
        acc[q.quiz_id].push(q);
        return acc;
      }, {});

      const attemptsByQuiz = (attemptsData || []).reduce((acc, att) => {
        if (!acc[att.quiz_id]) acc[att.quiz_id] = [];
        acc[att.quiz_id].push(att);
        return acc;
      }, {});

      const fullQuizzes = (quizzesData || []).map((q) => ({
        ...q,
        questions: questionsByQuiz[q.id] || [],
        attempts: attemptsByQuiz[q.id] || [],
      }));

      setQuizzes(fullQuizzes);
    } catch (err) {
      console.error("Error fetching library data:", err);
      setError("An error occurred while fetching library data.");
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    fetchLibraryData();
  }, [session?.user?.id, fetchLibraryData]);

  useEffect(() => {
    try {
      window.localStorage.setItem("hypertutor:library-view", libraryView);
    } catch {
      // Ignore storage errors
    }
  }, [libraryView]);

  const studyById = useMemo(
    () => new Map(studies.map((study) => [study.id, study])),
    [studies]
  );

  const renderSessionBadge = (sessionId) => {
    if (!sessionId) {
      return (
        <span className="inline-flex max-w-full items-center gap-1 truncate rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          Standalone Library Item
        </span>
      );
    }

    const study = studyById.get(sessionId);
    const label = study
      ? `${study.Subject || "Untitled Subject"}${study.Topic ? ` - ${study.Topic}` : ""}`
      : "Course Material";

    return (
      <Link
        to={`/courses/${sessionId}`}
        onClick={(event) => event.stopPropagation()}
        className="inline-flex max-w-full items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/25 motion-reduce:transition-none"
        title="Open Course"
      >
        <span className="min-w-0 truncate" title={label}>{label}</span>
        <ArrowRight className="h-3 w-3" />
      </Link>
    );
  };

  const handleCreateNote = async (e) => {
    e.preventDefault();
    if (!noteForm.title.trim() || !noteForm.content.trim()) return;
    setIsSubmitting(true);
    setError("");

    const userId = session?.user?.id;
    const { data, error: insertErr } = await supabase
      .from("session_notes")
      .insert({
        user_id: userId,
        session_id: null,
        title: noteForm.title.trim(),
        content: noteForm.content.trim(),
        source: "user",
      })
      .select()
      .single();

    if (insertErr) {
      setError(`Failed to create note: ${insertErr.message}`);
    } else {
      setNotes((prev) => [data, ...prev]);
      setNoteForm({ title: "", content: "" });
      setCreationType(null);
    }
    setIsSubmitting(false);
  };

  const handleCreateFlashcard = async (e) => {
    e.preventDefault();
    if (!flashcardForm.question.trim() || !flashcardForm.answer.trim()) return;
    setIsSubmitting(true);
    setError("");

    const userId = session?.user?.id;
    const { data, error: insertErr } = await supabase
      .from("session_flashcards")
      .insert({
        user_id: userId,
        session_id: null,
        question: flashcardForm.question.trim(),
        answer: flashcardForm.answer.trim(),
        source: "user",
      })
      .select()
      .single();

    if (insertErr) {
      setError(`Failed to create flashcard: ${insertErr.message}`);
    } else {
      setFlashcards((prev) => [data, ...prev]);
      setFlashcardForm({ question: "", answer: "" });
      setCreationType(null);
    }
    setIsSubmitting(false);
  };

  const handleCreateResource = async (e) => {
    e.preventDefault();
    const userId = session?.user?.id;
    if (!userId) return;

    setIsSubmitting(true);
    setError("");

    if (resourceMode === "file") {
      if (!selectedFile) {
        setIsSubmitting(false);
        return;
      }

      if (selectedFile.size > MAX_FILE_SIZE) {
        setError("File size exceeds the 10 MB limit.");
        setIsSubmitting(false);
        return;
      }

      const ext = selectedFile.name.split(".").pop()?.toLowerCase() || "";
      const isAllowedExt = ALLOWED_EXTENSIONS.includes(ext);
      const isAllowedMime = selectedFile.type ? ALLOWED_MIME_TYPES.includes(selectedFile.type) : false;

      if (!isAllowedExt && !isAllowedMime) {
        setError("Unsupported file type. Allowed formats: PDF, Word (.doc, .docx), PNG, JPG, WEBP, TXT, MD, CSV (max 10 MB).");
        setIsSubmitting(false);
        return;
      }

      const filePath = `${userId}/library/${crypto.randomUUID()}-${getSafeFileName(selectedFile.name)}`;
      const { error: uploadErr } = await supabase.storage.from(STORAGE_BUCKET).upload(filePath, selectedFile);

      if (uploadErr) {
        setError(`Upload failed: ${uploadErr.message}`);
        setIsSubmitting(false);
        return;
      }

      const mimeType = selectedFile.type || "application/octet-stream";
      const { data, error: insertErr } = await supabase
        .from("session_resources")
        .insert({
          user_id: userId,
          session_id: null,
          title: selectedFile.name,
          kind: "file",
          file_path: filePath,
          url: null,
          mime_type: mimeType,
          source: "user",
        })
        .select()
        .single();

      if (insertErr) {
        await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);
        setError(`Failed to save resource record: ${insertErr.message}`);
      } else {
        setResources((prev) => [data, ...prev]);
        setSelectedFile(null);
        setCreationType(null);
      }
    } else {
      if (!linkTitle.trim() || !linkUrl.trim()) {
        setIsSubmitting(false);
        return;
      }

      let detectedKind = linkKind;
      if (linkUrl.includes("youtube.com") || linkUrl.includes("youtu.be")) {
        detectedKind = "youtube";
      }

      const { data, error: insertErr } = await supabase
        .from("session_resources")
        .insert({
          user_id: userId,
          session_id: null,
          title: linkTitle.trim(),
          kind: detectedKind,
          file_path: null,
          url: linkUrl.trim(),
          mime_type: null,
          source: "user",
        })
        .select()
        .single();

      if (insertErr) {
        setError(`Failed to save link resource: ${insertErr.message}`);
      } else {
        setResources((prev) => [data, ...prev]);
        setLinkTitle("");
        setLinkUrl("");
        setCreationType(null);
      }
    }
    setIsSubmitting(false);
  };

  const handleRecordAttempt = async (quiz, selectedIndex) => {
    const userId = session?.user?.id;
    if (!userId || quizSavingId) return;

    setQuizSavingId(quiz.id);
    setError("");

    const question = quiz.questions?.[0];
    if (!question) {
      setError("Quiz has no questions.");
      setQuizSavingId(null);
      return;
    }

    const isCorrect = selectedIndex === question.correct_index;
    const score = isCorrect ? 1 : 0;
    const total = 1;
    const answersPayload = [
      {
        question_id: question.id,
        selected_index: selectedIndex,
        correct: isCorrect,
      },
    ];

    const { data: attempt, error: attemptErr } = await supabase
      .from("session_quiz_attempts")
      .insert({
        quiz_id: quiz.id,
        user_id: userId,
        score,
        total,
        answers: answersPayload,
      })
      .select()
      .single();

    if (attemptErr) {
      setError(`Failed to save quiz attempt: ${attemptErr.message}`);
    } else {
      setQuizzes((prevQuizzes) =>
        prevQuizzes.map((q) => {
          if (q.id === quiz.id) {
            return {
              ...q,
              attempts: [attempt, ...(q.attempts || [])],
            };
          }
          return q;
        })
      );
      setRetakingQuizMap((prev) => ({ ...prev, [quiz.id]: false }));
      // Auto-claim quests after quiz attempt saved
      gamificationService.checkAndClaimQuests();
    }
    setQuizSavingId(null);
  };

  const handleFlipFlashcard = (card) => {
    const isWillBeFlipped = !flippedCards[card.id];
    setFlippedCards((prev) => ({ ...prev, [card.id]: isWillBeFlipped }));

    if (isWillBeFlipped && card.id && !reviewedCardIdsRef.current.has(card.id)) {
      reviewedCardIdsRef.current.add(card.id);
      gamificationService.recordFlashcardReview(card.id).then(({ error: reviewErr }) => {
        if (reviewErr) {
          console.error("Library flashcard review insert error:", reviewErr);
        }
        gamificationService.checkAndClaimQuests();
      });
    }
  };

  const handleDeleteNote = async (id) => {
    setDeletingId(id);
    const { error: err } = await supabase.from("session_notes").delete().eq("id", id);
    if (err) setError("Failed to delete note.");
    else setNotes((prev) => prev.filter((item) => item.id !== id));
    setDeletingId(null);
  };

  const handleDeleteFlashcard = async (id) => {
    setDeletingId(id);
    const { error: err } = await supabase.from("session_flashcards").delete().eq("id", id);
    if (err) setError("Failed to delete flashcard.");
    else setFlashcards((prev) => prev.filter((item) => item.id !== id));
    setDeletingId(null);
  };

  const handleDeleteResource = async (resource) => {
    setDeletingId(resource.id);
    const { error: err } = await supabase.from("session_resources").delete().eq("id", resource.id);
    if (err) setError("Failed to delete resource.");
    else {
      if (resource.file_path) {
        await supabase.storage.from(STORAGE_BUCKET).remove([resource.file_path]);
      }
      setResources((prev) => prev.filter((item) => item.id !== resource.id));
    }
    setDeletingId(null);
  };

  const handleDeleteQuiz = async (id) => {
    setDeletingId(id);
    const { error: err } = await supabase.from("session_quizzes").delete().eq("id", id);
    if (err) setError("Failed to delete quiz.");
    else setQuizzes((prev) => prev.filter((item) => item.id !== id));
    setDeletingId(null);
  };

  const handleOpenResource = async (resource) => {
    if (resource.kind === "file" && resource.file_path) {
      const { data, error: urlError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(resource.file_path, 3600);
      if (urlError || !data?.signedUrl) {
        setError("Unable to open resource file.");
        return;
      }
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } else if (resource.url) {
      const safeUrl = sanitizeUrl(resource.url);
      if (safeUrl !== "#") {
        window.open(safeUrl, "_blank", "noopener,noreferrer");
      } else {
        setError("Invalid or unsafe resource URL.");
      }
    }
  };

  const query = searchTerm.trim().toLowerCase();

  const filteredNotes = useMemo(() => {
    if (!query) return notes;
    return notes.filter(
      (n) => n.title?.toLowerCase().includes(query) || n.content?.toLowerCase().includes(query)
    );
  }, [notes, query]);

  const filteredFlashcards = useMemo(() => {
    if (!query) return flashcards;
    return flashcards.filter(
      (f) => f.question?.toLowerCase().includes(query) || f.answer?.toLowerCase().includes(query)
    );
  }, [flashcards, query]);

  const filteredResources = useMemo(() => {
    if (!query) return resources;
    return resources.filter(
      (r) => r.title?.toLowerCase().includes(query) || r.kind?.toLowerCase().includes(query)
    );
  }, [resources, query]);

  const filteredQuizzes = useMemo(() => {
    if (!query) return quizzes;
    return quizzes.filter((q) => q.title?.toLowerCase().includes(query));
  }, [quizzes, query]);

  const totalItemsCount = notes.length + flashcards.length + resources.length + quizzes.length;

  return (
    <PageContainer maxWidth="max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              <LibraryIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Personal Knowledge Base
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">My Library</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Your comprehensive repository of notes, flashcards, resources, and quizzes.
            </p>
          </div>

          <label className="relative block w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search all library items..."
              aria-label="Search all library items"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </label>
        </header>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
          <div className="flex flex-wrap gap-2">
            {[
              { id: "all", label: `All Items (${totalItemsCount})`, icon: LibraryIcon },
              { id: "notes", label: `Notes (${notes.length})`, icon: FileText },
              { id: "flashcards", label: `Flashcards (${flashcards.length})`, icon: Layers3 },
              { id: "resources", label: `Resources (${resources.length})`, icon: BookOpen },
              { id: "quizzes", label: `Quizzes (${quizzes.length})`, icon: HelpCircle },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 motion-reduce:transition-none ${
                    isActive
                      ? "bg-emerald-600 text-white dark:bg-emerald-500"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 mr-1 hidden sm:inline">Add standalone:</span>
            <button
              type="button"
              onClick={() => setCreationType(creationType === "note" ? null : "note")}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:bg-emerald-500 dark:hover:bg-emerald-400 motion-reduce:transition-none"
            >
              <Plus className="h-4 w-4" /> Note
            </button>
            <button
              type="button"
              onClick={() => setCreationType(creationType === "flashcard" ? null : "flashcard")}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:bg-amber-400 dark:hover:bg-amber-300 motion-reduce:transition-none"
            >
              <Plus className="h-4 w-4" /> Flashcard
            </button>
            <button
              type="button"
              onClick={() => setCreationType(creationType === "resource" ? null : "resource")}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:bg-sky-500 dark:hover:bg-sky-400 motion-reduce:transition-none"
            >
              <Plus className="h-4 w-4" /> Resource
            </button>
          </div>
        </div>

        {error && (
          <div role="alert" className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
            <span>{error}</span>
            <button type="button" onClick={() => setError("")} aria-label="Dismiss library error" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <ResponsiveSheet
          isOpen={Boolean(creationType)}
          onClose={() => setCreationType(null)}
          title={`Create Standalone ${creationType || ""}`}
        >
          {creationType === "note" && (
            <form onSubmit={handleCreateNote} className="space-y-4">
              <input
                type="text"
                value={noteForm.title}
                onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                placeholder="Note Title"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                required
              />
              <textarea
                value={noteForm.content}
                onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                placeholder="Write your note content here..."
                className="min-h-32 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                required
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreationType(null)}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-slate-200 dark:hover:bg-slate-800 motion-reduce:transition-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-400 motion-reduce:transition-none"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Save Note
                </button>
              </div>
            </form>
          )}

          {creationType === "flashcard" && (
            <form onSubmit={handleCreateFlashcard} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <textarea
                  value={flashcardForm.question}
                  onChange={(e) => setFlashcardForm({ ...flashcardForm, question: e.target.value })}
                  placeholder="Front / Question"
                  className="min-h-24 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                  required
                />
                <textarea
                  value={flashcardForm.answer}
                  onChange={(e) => setFlashcardForm({ ...flashcardForm, answer: e.target.value })}
                  placeholder="Back / Answer"
                  className="min-h-24 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreationType(null)}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-slate-200 dark:hover:bg-slate-800 motion-reduce:transition-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-amber-400 dark:hover:bg-amber-300 motion-reduce:transition-none"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Save Flashcard
                </button>
              </div>
            </form>
          )}

          {creationType === "resource" && (
            <form onSubmit={handleCreateResource} className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <button
                  type="button"
                  onClick={() => setResourceMode("file")}
                  className={`inline-flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 motion-reduce:transition-none ${
                    resourceMode === "file" ? "bg-emerald-600 text-white dark:bg-emerald-500" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setResourceMode("link")}
                  className={`inline-flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 motion-reduce:transition-none ${
                    resourceMode === "link" ? "bg-emerald-600 text-white dark:bg-emerald-500" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  Add Link / URL
                </button>
              </div>

              {resourceMode === "file" ? (
                <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 transition hover:bg-slate-100 focus-within:ring-2 focus-within:ring-emerald-500/70 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 motion-reduce:transition-none">
                  <FileUp className="h-5 w-5 shrink-0 text-slate-400" />
                  <span className="truncate">{selectedFile?.name || "Choose a file to upload (PDF, Word .doc/.docx, image, txt, md, csv - max 10MB)"}</span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.txt,.md,.csv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="sr-only"
                  />
                </label>
              ) : (
                <div className="grid gap-3 sm:grid-cols-3">
                  <input
                    type="text"
                    value={linkTitle}
                    onChange={(e) => setLinkTitle(e.target.value)}
                    placeholder="Resource Title"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                    required
                  />
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 sm:col-span-2"
                    required
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreationType(null)}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-slate-200 dark:hover:bg-slate-800 motion-reduce:transition-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-sky-500 dark:hover:bg-sky-400 motion-reduce:transition-none"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Save Resource
                </button>
              </div>
            </form>
          )}
        </ResponsiveSheet>

        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
            Your Materials ({totalItemsCount})
          </h2>
          <div
            role="group"
            aria-label="Library view"
            className="inline-flex shrink-0 items-center gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-slate-900"
          >
            {[
              { view: "grid", label: "Grid view", Icon: LayoutGrid },
              { view: "list", label: "List view", Icon: List },
            ].map(({ view, label, Icon }) => {
              const isActive = libraryView === view;
              return (
                <button
                  key={view}
                  type="button"
                  title={label}
                  aria-label={label}
                  aria-pressed={isActive}
                  onClick={() => setLibraryView(view)}
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 motion-reduce:transition-none ${
                    isActive
                      ? "bg-white text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  }`}
                >
                  {React.createElement(Icon, { className: "h-4 w-4", "aria-hidden": true })}
                </button>
              );
            })}
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/80">
            <LoadingCompanion message="Loading your library..." />
          </div>
        ) : totalItemsCount === 0 ? (
          <div className="flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-900/80">
            <BookOpen className="mb-3 h-6 w-6 text-slate-500 dark:text-slate-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 sm:text-lg">Your Library is Empty</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Create standalone materials or add courses to populate your library.
            </p>
          </div>
        ) : (
          <div key={libraryView} className="page-enter space-y-8">
            {/* 1. NOTES SECTION */}
            {(activeTab === "all" || activeTab === "notes") && filteredNotes.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between gap-3 pb-3 text-sm font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100 sm:text-lg">
                    <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /> Notes ({filteredNotes.length})
                  </h2>
                </div>
                <div className={libraryView === "grid" ? "grid auto-rows-fr grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" : "flex flex-col gap-2"}>
                  {filteredNotes.map((note) => (
                    <LibraryItem
                      key={note.id}
                      variant={libraryView}
                      icon={FileText}
                      iconClass="text-emerald-600 dark:text-emerald-400"
                      tileClass="bg-emerald-50 dark:bg-emerald-950/35"
                      title={note.title}
                      date={new Date(note.created_at).toLocaleDateString()}
                      category={renderSessionBadge(note.session_id)}
                      preview={note.content}
                      actions={(
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(note.id)}
                          disabled={deletingId === note.id}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-300 motion-reduce:transition-none"
                          title="Delete note"
                          aria-label="Delete note"
                        >
                          {deletingId === note.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                      )}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* 2. FLASHCARDS SECTION */}
            {(activeTab === "all" || activeTab === "flashcards") && filteredFlashcards.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between gap-3 pb-3 text-sm font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100 sm:text-lg">
                    <Layers3 className="h-5 w-5 text-amber-600 dark:text-amber-400" /> Flashcards ({filteredFlashcards.length})
                  </h2>
                </div>
                <div className={libraryView === "grid" ? "grid auto-rows-fr grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" : "flex flex-col gap-2"}>
                  {filteredFlashcards.map((card) => {
                    const isFlipped = flippedCards[card.id];
                    return (
                      <LibraryItem
                        key={card.id}
                        variant={libraryView}
                        icon={Layers3}
                        iconClass="text-amber-600 dark:text-amber-400"
                        tileClass="bg-amber-50 dark:bg-amber-950/35"
                        title={card.question}
                        date={new Date(card.created_at).toLocaleDateString()}
                        category={(
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                              {isFlipped ? "Answer" : "Question"}
                            </span>
                            {renderSessionBadge(card.session_id)}
                          </div>
                        )}
                        preview={isFlipped ? card.answer : card.question}
                        actions={(
                          <>
                            <button
                              type="button"
                              onClick={() => handleFlipFlashcard(card)}
                              className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:text-amber-200 dark:hover:bg-amber-950/40 motion-reduce:transition-none"
                              title={isFlipped ? "Show question" : "Show answer"}
                              aria-label={isFlipped ? "Show question" : "Show answer"}
                            >
                              <RotateCcw className="h-4 w-4" aria-hidden="true" />
                              <span className="hidden sm:inline">{isFlipped ? "Question" : "Answer"}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteFlashcard(card.id)}
                              disabled={deletingId === card.id}
                              className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-300 motion-reduce:transition-none"
                              title="Delete flashcard"
                              aria-label="Delete flashcard"
                            >
                              {deletingId === card.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </button>
                          </>
                        )}
                      />
                    );
                  })}
                </div>
              </section>
            )}

            {/* 3. RESOURCES SECTION */}
            {(activeTab === "all" || activeTab === "resources") && filteredResources.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between gap-3 pb-3 text-sm font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100 sm:text-lg">
                    <BookOpen className="h-5 w-5 text-sky-600 dark:text-sky-400" /> Resources ({filteredResources.length})
                  </h2>
                </div>
                <div className={libraryView === "grid" ? "grid auto-rows-fr grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" : "flex flex-col gap-2"}>
                  {filteredResources.map((res) => {
                    const ResourceIcon = res.kind === "youtube"
                      ? Youtube
                      : res.kind === "document"
                        ? FileText
                        : res.kind === "link"
                          ? Link2
                          : FileUp;
                    const resourceIconClass = res.kind === "youtube"
                      ? "text-rose-600 dark:text-rose-300"
                      : res.kind === "document"
                        ? "text-sky-600 dark:text-sky-400"
                        : res.kind === "link"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-emerald-600 dark:text-emerald-400";

                    return <LibraryItem
                      key={res.id}
                      variant={libraryView}
                      icon={ResourceIcon}
                      iconClass={resourceIconClass}
                      tileClass="bg-slate-50 dark:bg-slate-800/70"
                      title={res.title}
                      date={new Date(res.created_at).toLocaleDateString()}
                      category={(
                        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                          {renderSessionBadge(res.session_id)}
                          {getResourceDomain(res.url) && (
                            <span className="max-w-full truncate rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                              {getResourceDomain(res.url)}
                            </span>
                          )}
                          {res.extraction_status && (
                            <span className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase ${
                              res.extraction_status === "done"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                : res.extraction_status === "pending"
                                  ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                            }`}>
                              {res.extraction_status}
                            </span>
                          )}
                        </div>
                      )}
                      preview={res.extracted_text || res.mime_type || res.kind}
                      onPreview={() => setPreviewResource(res)}
                      actions={(
                        <>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleOpenResource(res);
                            }}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-sky-700 transition hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:text-sky-300 dark:hover:bg-sky-950/50 motion-reduce:transition-none"
                            title="Open resource"
                            aria-label="Open resource"
                          >
                            <ExternalLink className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDeleteResource(res);
                            }}
                            disabled={deletingId === res.id}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-300 motion-reduce:transition-none"
                            title="Delete resource"
                            aria-label="Delete resource"
                          >
                            {deletingId === res.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </button>
                        </>
                      )}
                    />;
                  })}
                </div>
              </section>
            )}

            {/* 4. QUIZZES SECTION */}
            {(activeTab === "all" || activeTab === "quizzes") && filteredQuizzes.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between gap-3 pb-3 text-sm font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100 sm:text-lg">
                    <HelpCircle className="h-5 w-5 text-amber-600 dark:text-amber-300" /> Quizzes ({filteredQuizzes.length})
                  </h2>
                </div>
                <div className={libraryView === "grid" ? "grid auto-rows-fr grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" : "flex flex-col gap-2"}>
                  {filteredQuizzes.map((quiz) => {
                    const question = quiz.questions?.[0];
                    const attemptsList = quiz.attempts || [];
                    const latestAttempt = attemptsList[0];
                    const isRetaking = retakingQuizMap[quiz.id];

                    return (
                      <LibraryItem
                        key={quiz.id}
                        variant={libraryView}
                        icon={HelpCircle}
                        iconClass="text-amber-600 dark:text-amber-300"
                        tileClass="bg-amber-50 dark:bg-amber-500/10"
                        title={quiz.title}
                        date={new Date(quiz.created_at).toLocaleDateString()}
                        category={(
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            {renderSessionBadge(quiz.session_id)}
                            {attemptsList.length > 0 && (
                              <span className="max-w-full truncate rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                {attemptsList.length} {attemptsList.length === 1 ? "attempt" : "attempts"} · {latestAttempt.score}/{latestAttempt.total}
                              </span>
                            )}
                          </div>
                        )}
                        preview={question?.question || "No questions available."}
                        actions={(
                          <>
                            {quiz.session_id ? (
                              <Link
                                to={`/courses/${quiz.session_id}?quizId=${encodeURIComponent(quiz.id)}`}
                                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:bg-emerald-500 dark:hover:bg-emerald-400 motion-reduce:transition-none"
                                title="Practice full quiz"
                                aria-label="Practice full quiz"
                              >
                                <span className="hidden sm:inline">Practice</span><ArrowRight className="h-4 w-4" />
                              </Link>
                            ) : latestAttempt && !isRetaking && (
                              <button
                                type="button"
                                onClick={() => setRetakingQuizMap((prev) => ({ ...prev, [quiz.id]: true }))}
                                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 motion-reduce:transition-none"
                              >
                                <RotateCcw className="h-4 w-4" /> Retake
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteQuiz(quiz.id)}
                              disabled={deletingId === quiz.id}
                              className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-300 motion-reduce:transition-none"
                              title="Delete quiz"
                              aria-label="Delete quiz"
                            >
                              {deletingId === quiz.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </button>
                          </>
                        )}
                      >
                        {question && (
                          <div className="min-w-0 space-y-2">
                            {quiz.session_id ? (
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {quiz.questions?.length || 0} questions · Open the course to take the complete practice set.
                              </p>
                            ) : latestAttempt && !isRetaking ? (
                              <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-900">
                                <p className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200">
                                  {latestAttempt.score === latestAttempt.total
                                    ? <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                    : <CircleAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
                                  Latest score: {latestAttempt.score}/{latestAttempt.total}
                                </p>
                                {Array.isArray(latestAttempt.answers) && latestAttempt.answers[0]?.selected_index !== undefined && (
                                  <p className="text-slate-600 dark:text-slate-300">
                                    Your answer: {question.options?.[latestAttempt.answers[0].selected_index]}
                                  </p>
                                )}
                                <p className="text-slate-600 dark:text-slate-300">
                                  Correct answer: {question.options?.[question.correct_index]}
                                </p>
                              </div>
                            ) : (
                              <div className="grid min-w-0 gap-2 sm:grid-cols-2">
                                {Array.isArray(question.options) && question.options.map((opt, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    disabled={quizSavingId === quiz.id}
                                    onClick={() => handleRecordAttempt(quiz, idx)}
                                    className="min-h-11 min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left text-sm font-medium text-slate-800 transition hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 motion-reduce:transition-none"
                                  >
                                    <strong>{String.fromCharCode(65 + idx)}.</strong> <span className="break-words">{opt}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </LibraryItem>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}
        {previewResource && (
          <ResourcePreviewModal resource={previewResource} onClose={closeResourcePreview} />
        )}
    </PageContainer>
  );
}

export default Library;
