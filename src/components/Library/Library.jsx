import React, { useEffect, useMemo, useState } from "react";
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
import LoadingCompanion from "../common/LoadingCompanion";
import ResponsiveSheet from "../common/ResponsiveSheet";

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

function Library({ session }) {
  const [activeTab, setActiveTab] = useState("all"); // "all" | "notes" | "flashcards" | "resources" | "quizzes"
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  // Data states
  const [notes, setNotes] = useState([]);
  const [flashcards, setFlashcards] = useState([]);
  const [resources, setResources] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [studies, setStudies] = useState([]);

  // Standalone creation form modals / toggles
  const [creationType, setCreationType] = useState(null); // null | "note" | "flashcard" | "resource" | "quiz"

  // Note creation form
  const [noteForm, setNoteForm] = useState({ title: "", content: "" });

  // Flashcard creation form
  const [flashcardForm, setFlashcardForm] = useState({ question: "", answer: "" });

  // Resource creation form
  const [resourceMode, setResourceMode] = useState("file"); // "file" | "link"
  const [selectedFile, setSelectedFile] = useState(null);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkKind, setLinkKind] = useState("link");

  // Quiz creation form
  const [quizForm, setQuizForm] = useState({
    title: "",
    question: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    correctIndex: 0,
    explanation: "",
  });

  // Quiz interactive taking/retaking state
  const [retakingQuizMap, setRetakingQuizMap] = useState({});
  const [quizSavingId, setQuizSavingId] = useState(null);

  // Flashcard flipping state
  const [flippedCards, setFlippedCards] = useState({});

  // Submitting state
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchLibraryData = async () => {
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
          .select("id, session_id, user_id, title, kind, file_path, url, mime_type, extraction_status, source, created_at")
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
  };

  useEffect(() => {
    fetchLibraryData();
  }, [session?.user?.id]);

  const studyById = useMemo(
    () => new Map(studies.map((study) => [study.id, study])),
    [studies]
  );

  // Render session badge or link
  const renderSessionBadge = (sessionId) => {
    if (!sessionId) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
          Standalone Library Item
        </span>
      );
    }

    const study = studyById.get(sessionId);
    const label = study
      ? `${study.Subject || "Untitled Subject"}${study.Topic ? ` - ${study.Topic}` : ""}`
      : "Session Material";

    return (
      <Link
        to={`/Study/${sessionId}`}
        className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100 transition"
        title="Open Session"
      >
        <span>{label}</span>
        <ArrowRight className="h-3 w-3" />
      </Link>
    );
  };

  // Standalone Creation Handlers
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

  const handleCreateQuiz = async (e) => {
    e.preventDefault();
    if (!quizForm.title.trim() || !quizForm.question.trim() || !quizForm.optionA.trim() || !quizForm.optionB.trim()) {
      setError("Please fill out quiz title, question, and at least Options A and B.");
      return;
    }

    const userId = session?.user?.id;
    if (!userId) return;

    setIsSubmitting(true);
    setError("");

    // 1. Insert quiz
    const { data: quiz, error: quizErr } = await supabase
      .from("session_quizzes")
      .insert({
        user_id: userId,
        session_id: null,
        title: quizForm.title.trim(),
        source: "user",
      })
      .select()
      .single();

    if (quizErr || !quiz) {
      setError(`Failed to create quiz: ${quizErr?.message}`);
      setIsSubmitting(false);
      return;
    }

    // 2. Insert question
    const optionsArray = [quizForm.optionA.trim(), quizForm.optionB.trim()];
    if (quizForm.optionC.trim()) optionsArray.push(quizForm.optionC.trim());
    if (quizForm.optionD.trim()) optionsArray.push(quizForm.optionD.trim());

    const { data: questionData, error: questionErr } = await supabase
      .from("session_quiz_questions")
      .insert({
        quiz_id: quiz.id,
        user_id: userId,
        position: 1,
        question: quizForm.question.trim(),
        options: optionsArray,
        correct_index: Number(quizForm.correctIndex),
        explanation: quizForm.explanation.trim() || null,
      })
      .select()
      .single();

    if (questionErr) {
      await supabase.from("session_quizzes").delete().eq("id", quiz.id);
      setError(`Failed to save quiz question: ${questionErr.message}`);
    } else {
      const fullQuiz = {
        ...quiz,
        questions: [questionData],
        attempts: [],
      };
      setQuizzes((prev) => [fullQuiz, ...prev]);
      setQuizForm({
        title: "",
        question: "",
        optionA: "",
        optionB: "",
        optionC: "",
        optionD: "",
        correctIndex: 0,
        explanation: "",
      });
      setCreationType(null);
    }
    setIsSubmitting(false);
  };

  // Record Quiz Attempt
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
    }
    setQuizSavingId(null);
  };

  // Delete Handlers
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

  // Resource Open URL
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
      window.open(resource.url, "_blank", "noopener,noreferrer");
    }
  };

  // Search filtering
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
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-10 pb-24 md:pb-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <header className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-indigo-600">
              <LibraryIcon className="h-4 w-4" /> Personal Knowledge Base
            </div>
            <h1 className="text-3xl font-black text-slate-900 md:text-4xl">My Library</h1>
            <p className="mt-2 text-slate-500">
              Your comprehensive repository of notes, flashcards, resources, and quizzes.
            </p>
          </div>

          {/* Search bar */}
          <label className="relative block w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search all library items..."
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
        </header>

        {/* Navigation Tabs and Create Action Bar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex flex-wrap gap-1.5">
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
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                    isActive
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Standalone Add Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 mr-1 hidden sm:inline">Add standalone:</span>
            <button
              onClick={() => setCreationType(creationType === "note" ? null : "note")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
            >
              <Plus className="h-3.5 w-3.5" /> Note
            </button>
            <button
              onClick={() => setCreationType(creationType === "flashcard" ? null : "flashcard")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-amber-700 transition"
            >
              <Plus className="h-3.5 w-3.5" /> Flashcard
            </button>
            <button
              onClick={() => setCreationType(creationType === "resource" ? null : "resource")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition"
            >
              <Plus className="h-3.5 w-3.5" /> Resource
            </button>
            <button
              onClick={() => setCreationType(creationType === "quiz" ? null : "quiz")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-purple-700 transition"
            >
              <Plus className="h-3.5 w-3.5" /> Quiz
            </button>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mb-6 flex items-center justify-between rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700 border border-red-200">
            <span>{error}</span>
            <button onClick={() => setError("")}>
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Creation Forms in Responsive Sheet */}
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
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200 dark:border-slate-800 dark:bg-slate-900"
                required
              />
              <textarea
                value={noteForm.content}
                onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                placeholder="Write your note content here..."
                className="min-h-32 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200 dark:border-slate-800 dark:bg-slate-900"
                required
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreationType(null)}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
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
                  className="min-h-24 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-800 dark:bg-slate-900"
                  required
                />
                <textarea
                  value={flashcardForm.answer}
                  onChange={(e) => setFlashcardForm({ ...flashcardForm, answer: e.target.value })}
                  placeholder="Back / Answer"
                  className="min-h-24 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-800 dark:bg-slate-900"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreationType(null)}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Save Flashcard
                </button>
              </div>
            </form>
          )}

          {creationType === "resource" && (
            <form onSubmit={handleCreateResource} className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setResourceMode("file")}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                    resourceMode === "file" ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setResourceMode("link")}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                    resourceMode === "link" ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  Add Link / URL
                </button>
              </div>

              {resourceMode === "file" ? (
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900">
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
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs outline-none dark:border-slate-800 dark:bg-slate-900"
                    required
                  />
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://..."
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs outline-none sm:col-span-2 dark:border-slate-800 dark:bg-slate-900"
                    required
                  />
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreationType(null)}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Save Resource
                </button>
              </div>
            </form>
          )}

          {creationType === "quiz" && (
            <form onSubmit={handleCreateQuiz} className="grid gap-3 text-xs">
              <input
                type="text"
                value={quizForm.title}
                onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                placeholder="Quiz Title / Topic"
                className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-purple-200 dark:border-slate-800 dark:bg-slate-900"
                required
              />
              <textarea
                value={quizForm.question}
                onChange={(e) => setQuizForm({ ...quizForm, question: e.target.value })}
                placeholder="Question text..."
                className="min-h-20 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs outline-none focus:ring-2 focus:ring-purple-200 dark:border-slate-800 dark:bg-slate-900"
                required
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  type="text"
                  value={quizForm.optionA}
                  onChange={(e) => setQuizForm({ ...quizForm, optionA: e.target.value })}
                  placeholder="Option A (required)"
                  className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 outline-none dark:border-slate-800 dark:bg-slate-900"
                  required
                />
                <input
                  type="text"
                  value={quizForm.optionB}
                  onChange={(e) => setQuizForm({ ...quizForm, optionB: e.target.value })}
                  placeholder="Option B (required)"
                  className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 outline-none dark:border-slate-800 dark:bg-slate-900"
                  required
                />
                <input
                  type="text"
                  value={quizForm.optionC}
                  onChange={(e) => setQuizForm({ ...quizForm, optionC: e.target.value })}
                  placeholder="Option C (optional)"
                  className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 outline-none dark:border-slate-800 dark:bg-slate-900"
                />
                <input
                  type="text"
                  value={quizForm.optionD}
                  onChange={(e) => setQuizForm({ ...quizForm, optionD: e.target.value })}
                  placeholder="Option D (optional)"
                  className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 outline-none dark:border-slate-800 dark:bg-slate-900"
                />
              </div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Correct Option
                <select
                  value={quizForm.correctIndex}
                  onChange={(e) => setQuizForm({ ...quizForm, correctIndex: Number(e.target.value) })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs dark:border-slate-800 dark:bg-slate-900"
                >
                  <option value={0}>Option A</option>
                  <option value={1}>Option B</option>
                  {quizForm.optionC.trim() && <option value={2}>Option C</option>}
                  {quizForm.optionD.trim() && <option value={3}>Option D</option>}
                </select>
              </label>
              <input
                type="text"
                value={quizForm.explanation}
                onChange={(e) => setQuizForm({ ...quizForm, explanation: e.target.value })}
                placeholder="Explanation (optional)"
                className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 outline-none dark:border-slate-800 dark:bg-slate-900"
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setCreationType(null)}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2 text-xs font-bold text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Save Quiz
                </button>
              </div>
            </form>
          )}
        </ResponsiveSheet>

        {/* Content Display */}
        {isLoading ? (
          <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-20">
            <LoadingCompanion message="Loading your library..." />
          </div>
        ) : totalItemsCount === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center">
            <BookOpen className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <h3 className="text-lg font-bold text-slate-800">Your Library is Empty</h3>
            <p className="mt-1 text-xs text-slate-500">
              Create standalone materials or complete study sessions to populate your library.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {/* 1. NOTES SECTION */}
            {(activeTab === "all" || activeTab === "notes") && filteredNotes.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-emerald-600" /> Notes ({filteredNotes.length})
                  </h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredNotes.map((note) => (
                    <article
                      key={note.id}
                      className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300 transition"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-bold text-slate-900 line-clamp-1">{note.title}</h3>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            disabled={deletingId === note.id}
                            className="text-slate-400 hover:text-red-600 transition disabled:opacity-50"
                            title="Delete note"
                            aria-label="Delete note"
                          >
                            {deletingId === note.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-4 leading-relaxed">{note.content}</p>
                      </div>
                      <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between">
                        {renderSessionBadge(note.session_id)}
                        <span className="text-[10px] text-slate-400">
                          {new Date(note.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* 2. FLASHCARDS SECTION */}
            {(activeTab === "all" || activeTab === "flashcards") && filteredFlashcards.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Layers3 className="h-5 w-5 text-amber-600" /> Flashcards ({filteredFlashcards.length})
                  </h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredFlashcards.map((card) => {
                    const isFlipped = flippedCards[card.id];
                    return (
                      <div
                        key={card.id}
                        className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300 transition"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full uppercase">
                              {isFlipped ? "Answer" : "Question"}
                            </span>
                            <button
                              onClick={() => handleDeleteFlashcard(card.id)}
                              disabled={deletingId === card.id}
                              className="text-slate-400 hover:text-red-600 transition disabled:opacity-50"
                              title="Delete flashcard"
                              aria-label="Delete flashcard"
                            >
                              {deletingId === card.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </div>

                          <p className="text-sm font-semibold text-slate-900 min-h-16 flex items-center">
                            {isFlipped ? card.answer : card.question}
                          </p>

                          <button
                            onClick={() => setFlippedCards((prev) => ({ ...prev, [card.id]: !prev[card.id] }))}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-700 transition"
                          >
                            <RotateCcw className="h-3.5 w-3.5" /> {isFlipped ? "Show Question" : "Show Answer"}
                          </button>
                        </div>

                        <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between">
                          {renderSessionBadge(card.session_id)}
                          <span className="text-[10px] text-slate-400">
                            {new Date(card.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* 3. RESOURCES SECTION */}
            {(activeTab === "all" || activeTab === "resources") && filteredResources.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-indigo-600" /> Resources ({filteredResources.length})
                  </h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredResources.map((res) => (
                    <article
                      key={res.id}
                      className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:border-slate-300 transition"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 shrink-0">
                              {res.kind === "youtube" ? (
                                <Youtube className="h-4 w-4 text-red-600" />
                              ) : res.kind === "document" ? (
                                <FileText className="h-4 w-4 text-blue-600" />
                              ) : res.kind === "link" ? (
                                <Link2 className="h-4 w-4 text-indigo-600" />
                              ) : (
                                <FileUp className="h-4 w-4 text-emerald-600" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-bold text-slate-900 text-sm truncate">{res.title}</h3>
                              <p className="text-[10px] text-slate-400 capitalize">{res.mime_type || res.kind}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleOpenResource(res)}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              title="Open resource"
                              aria-label="Open resource"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteResource(res)}
                              disabled={deletingId === res.id}
                              className="p-1.5 text-slate-400 hover:text-red-600 transition disabled:opacity-50"
                              title="Delete resource"
                              aria-label="Delete resource"
                            >
                              {deletingId === res.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        {res.extraction_status && (
                          <span
                            className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                              res.extraction_status === "done"
                                ? "bg-emerald-50 text-emerald-700"
                                : res.extraction_status === "pending"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            Status: {res.extraction_status}
                          </span>
                        )}
                      </div>

                      <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between">
                        {renderSessionBadge(res.session_id)}
                        <span className="text-[10px] text-slate-400">
                          {new Date(res.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* 4. QUIZZES SECTION */}
            {(activeTab === "all" || activeTab === "quizzes") && filteredQuizzes.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <HelpCircle className="h-5 w-5 text-purple-600" /> Quizzes ({filteredQuizzes.length})
                  </h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {filteredQuizzes.map((quiz) => {
                    const question = quiz.questions?.[0];
                    const attemptsList = quiz.attempts || [];
                    const latestAttempt = attemptsList[0];
                    const isRetaking = retakingQuizMap[quiz.id];

                    return (
                      <article
                        key={quiz.id}
                        className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-bold text-slate-900 text-base">{quiz.title}</h3>
                            <div className="flex items-center gap-2">
                              {attemptsList.length > 0 && (
                                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700">
                                  {attemptsList.length} {attemptsList.length === 1 ? "attempt" : "attempts"} (Latest: {latestAttempt.score}/{latestAttempt.total})
                                </span>
                              )}
                              <button
                                onClick={() => handleDeleteQuiz(quiz.id)}
                                disabled={deletingId === quiz.id}
                                className="text-slate-400 hover:text-red-600 transition disabled:opacity-50"
                                title="Delete quiz"
                                aria-label="Delete quiz"
                              >
                                {deletingId === quiz.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </div>

                          {question && (
                            <div className="space-y-3 pt-1">
                              <p className="text-xs font-semibold text-slate-800">{question.question}</p>

                              {latestAttempt && !isRetaking ? (
                                <div className="space-y-2 rounded-xl bg-slate-50 p-3 text-xs">
                                  <div className={`flex items-center justify-between font-bold ${latestAttempt.score > 0 ? "text-emerald-700" : "text-rose-700"}`}>
                                    <span className="flex items-center gap-1.5">
                                      {latestAttempt.score > 0 ? <Check className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />}
                                      {latestAttempt.score > 0 ? "Passed" : "Needs Review"} ({latestAttempt.score}/{latestAttempt.total})
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setRetakingQuizMap((prev) => ({ ...prev, [quiz.id]: true }))}
                                      className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-slate-700 border border-slate-200 hover:bg-slate-100 font-bold transition"
                                    >
                                      <RotateCcw className="h-3 w-3" /> Retake
                                    </button>
                                  </div>

                                  {Array.isArray(latestAttempt.answers) && latestAttempt.answers[0]?.selected_index !== undefined && (
                                    <p className="text-slate-600">
                                      Your answer: {question.options?.[latestAttempt.answers[0].selected_index]}
                                    </p>
                                  )}

                                  <p className="text-slate-600">
                                    Correct answer: {question.options?.[question.correct_index]}
                                  </p>
                                </div>
                              ) : (
                                <div className="grid gap-2 sm:grid-cols-2">
                                  {Array.isArray(question.options) &&
                                    question.options.map((opt, idx) => (
                                      <button
                                        key={idx}
                                        disabled={quizSavingId === quiz.id}
                                        onClick={() => handleRecordAttempt(quiz, idx)}
                                        className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-left text-xs font-medium text-slate-800 hover:border-purple-300 hover:bg-purple-50 transition"
                                      >
                                        <strong>{String.fromCharCode(65 + idx)}.</strong> {opt}
                                      </button>
                                    ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between">
                          {renderSessionBadge(quiz.session_id)}
                          <span className="text-[10px] text-slate-400">
                            {new Date(quiz.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

export default Library;
