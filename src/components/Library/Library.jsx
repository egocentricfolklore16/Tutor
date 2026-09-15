import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, CheckCircle, ExternalLink, FileText, HelpCircle, Layers3, Library as LibraryIcon, Loader2, Search, Trash2, X } from "lucide-react";
import supabase from "../../lib/supabase";
import LoadingCompanion from "../common/LoadingCompanion";

const STORAGE_BUCKET = "resources";

function Library({ session }) {
  const navigate = useNavigate();
  const [resources, setResources] = useState([]);
  const [notes, setNotes] = useState([]);
  const [flashcards, setFlashcards] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [studies, setStudies] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [detailModal, setDetailModal] = useState(null);

  useEffect(() => {
    const fetchLibrary = async () => {
      const userId = session?.user?.id;
      if (!userId) return;

      setIsLoading(true);
      setError("");

      const [
        { data: resourceData, error: resourceError },
        { data: noteData, error: noteError },
        { data: flashcardData, error: flashcardError },
        { data: quizData, error: quizError },
        { data: studyData, error: studyError }
      ] = await Promise.all([
        supabase.from("resources").select("id, session_id, file_name, file_path, file_type, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("notes").select("id, session_id, title, content, created_at").order("created_at", { ascending: false }),
        supabase.from("flashcards").select("id, session_id, question, answer, created_at").order("created_at", { ascending: false }),
        supabase.from("study_session_logs").select("id, session_id, concept, question, correct_answer, is_correct, outcome, created_at, answered_at").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("Study").select("id, Subject, Topic").eq("user_id", userId),
      ]);

      if (resourceError || studyError) {
        setError("Unable To Load Your Library Right Now.");
      } else {
        setResources(resourceData || []);
        setNotes(noteData || []);
        setFlashcards(flashcardData || []);
        setQuizzes(quizData || []);
        setStudies(studyData || []);
      }

      setIsLoading(false);
    };

    fetchLibrary();

    const userId = session?.user?.id;
    if (!userId) return undefined;

    const channel = supabase
      .channel(`library-resources-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "resources", filter: `user_id=eq.${userId}` },
        fetchLibrary
      )
      .subscribe();

    window.addEventListener("focus", fetchLibrary);

    return () => {
      window.removeEventListener("focus", fetchLibrary);
      supabase.removeChannel(channel);
    };
  }, [session]);

  const studyById = useMemo(
    () => new Map(studies.map((study) => [study.id, study])),
    [studies]
  );

  const allLibraryItems = useMemo(() => {
    const normalizedResources = resources.map((res) => ({
      id: `res-${res.id}`,
      type: "resource",
      title: res.file_name,
      createdAt: res.created_at,
      subject: studyById.get(res.session_id)?.Subject || "",
      refId: res.id,
      original: res,
    }));

    const normalizedNotes = notes.map((note) => ({
      id: `note-${note.id}`,
      type: "note",
      title: note.title || "Untitled Note",
      createdAt: note.created_at,
      subject: studyById.get(note.session_id)?.Subject || "",
      refId: note.id,
      original: note,
    }));

    const normalizedFlashcards = flashcards.map((fc) => ({
      id: `fc-${fc.id}`,
      type: "flashcard",
      title: fc.question || "Flashcard",
      createdAt: fc.created_at,
      subject: studyById.get(fc.session_id)?.Subject || "",
      refId: fc.id,
      original: fc,
    }));

    const normalizedQuizzes = quizzes.map((q) => ({
      id: `quiz-${q.id}`,
      type: "quiz",
      title: q.question || q.concept || "Practice Question",
      createdAt: q.created_at || q.answered_at,
      subject: studyById.get(q.session_id)?.Subject || "",
      refId: q.id,
      original: q,
    }));

    return [...normalizedResources, ...normalizedNotes, ...normalizedFlashcards, ...normalizedQuizzes].sort(
      (left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0)
    );
  }, [resources, notes, flashcards, quizzes, studyById]);

  const filteredItems = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return allLibraryItems.filter((item) => {
      const matchesTab = activeTab === "all" || item.type === activeTab;
      if (!matchesTab) return false;
      if (!query) return true;
      return [item.title, item.subject, item.type]
        .filter(Boolean)
        .some((val) => val.toLowerCase().includes(query));
    });
  }, [allLibraryItems, activeTab, searchTerm]);

  const groupedItems = useMemo(() => {
    const groups = new Map();

    filteredItems.forEach((item) => {
      const sessionId = item.original.session_id || "ungrouped";
      const study = studyById.get(sessionId);
      const groupName = study
        ? `${study.Subject || "Untitled subject"}${study.Topic ? `: ${study.Topic}` : ""}`
        : "General Library Items";

      if (!groups.has(sessionId)) groups.set(sessionId, { name: groupName, items: [] });
      groups.get(sessionId).items.push(item);
    });

    return Array.from(groups.values());
  }, [filteredItems, studyById]);

  const resourceAnalytics = useMemo(() => {
    const typeTotals = resources.reduce((totals, resource) => {
      const type = resource.file_type?.split("/").pop()?.toUpperCase() || "FILE";
      totals[type] = (totals[type] || 0) + 1;
      return totals;
    }, {});
    const subjectTotals = resources.reduce((totals, resource) => {
      const study = studyById.get(resource.session_id);
      const subject = study?.Subject || "Other Library Items";
      totals[subject] = (totals[subject] || 0) + 1;
      return totals;
    }, {});
    const uploadDays = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));
      const key = date.toISOString().slice(0, 10);
      return { key, label: date.toLocaleDateString("en-US", { weekday: "short" }), count: 0 };
    });
    resources.forEach((resource) => {
      const day = uploadDays.find((item) => item.key === new Date(resource.created_at).toISOString().slice(0, 10));
      if (day) day.count += 1;
    });
    const typeBreakdown = Object.entries(typeTotals).sort(([, left], [, right]) => right - left);
    const subjectBreakdown = Object.entries(subjectTotals).sort(([, left], [, right]) => right - left);
    return {
      typeBreakdown,
      subjectBreakdown,
      uploadDays,
      sessionsCovered: new Set(resources.map((resource) => resource.session_id).filter(Boolean)).size,
      topSubject: subjectBreakdown[0]?.[0] || "No Subject Yet",
      recentUploads: uploadDays.reduce((total, day) => total + day.count, 0),
    };
  }, [resources, studyById]);

  const removeResource = async (resourceId) => {
    setDeletingId(resourceId);
    const { error: deleteError } = await supabase
      .from("resources")
      .delete()
      .eq("id", resourceId);

    if (deleteError) {
      setError("Unable To Remove This Library Item.");
    } else {
      const resource = resources.find((item) => item.id === resourceId);
      if (resource?.file_path) await supabase.storage.from(STORAGE_BUCKET).remove([resource.file_path]);
      setResources((current) => current.filter((resource) => resource.id !== resourceId));
    }
    setDeletingId(null);
  };

  const openResource = async (filePath) => {
    const { data, error: urlError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(filePath, 3600);
    if (urlError) {
      setError("Unable To Open This Library Item.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const previewResource = async (resource) => {
    setPreview(resource);
    setPreviewUrl("");
    setIsPreviewLoading(true);
    const { data, error: urlError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(resource.file_path, 3600);
    if (urlError) setError("Unable To Preview This Library Item.");
    else setPreviewUrl(data.signedUrl);
    setIsPreviewLoading(false);
  };

  const handleItemClick = (item) => {
    if (item.type === "resource") {
      previewResource(item.original);
    } else if (item.type === "note") {
      navigate(`/Study/${item.original.session_id || "general"}/notes/${item.refId}`);
    } else if (item.type === "flashcard" || item.type === "quiz") {
      setDetailModal(item);
    }
  };

  const getItemIcon = (type) => {
    switch (type) {
      case "note":
        return <FileText className="h-4 w-4 text-indigo-600" />;
      case "flashcard":
        return <Layers3 className="h-4 w-4 text-emerald-600" />;
      case "quiz":
        return <HelpCircle className="h-4 w-4 text-amber-600" />;
      default:
        return <BookOpen className="h-4 w-4 text-sky-600" />;
    }
  };

  const canEmbed = (fileType) => ["application/pdf", "text/plain", "text/html"].includes(fileType) || fileType?.startsWith("image/") || fileType?.startsWith("video/") || fileType?.startsWith("audio/");

  const tabCounts = {
    all: allLibraryItems.length,
    resource: resources.length,
    note: notes.length,
    flashcard: flashcards.length,
    quiz: quizzes.length,
  };

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 md:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-indigo-600">
              <LibraryIcon className="h-4 w-4" /> Your Study Library
            </div>
            <h1 className="text-3xl font-bold text-slate-900 md:text-4xl">Library</h1>
            <p className="mt-2 text-slate-500">Everything You Have Saved: Resources, Notes, Flashcards & Quizzes.</p>
          </div>
          <label className="relative block w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search Library"
              className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
        </header>

        {/* Content Type Filter Tabs */}
        <div className="mb-8 flex flex-wrap gap-2 border-b border-slate-200 pb-4">
          {[
            { id: "all", label: "All Items" },
            { id: "resource", label: "Resources" },
            { id: "note", label: "Notes" },
            { id: "flashcard", label: "Flashcards" },
            { id: "quiz", label: "Quizzes" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  activeTab === tab.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                }`}
              >
                {tabCounts[tab.id] || 0}
              </span>
            </button>
          ))}
        </div>

        {!isLoading && resources.length > 0 && (
          <section className="mb-8 space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                [resources.length, "Total Files"],
                [resourceAnalytics.sessionsCovered, "Sessions Covered"],
                [resourceAnalytics.typeBreakdown.length, "File Formats"],
                [resourceAnalytics.recentUploads, "Uploaded This Week"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-2xl font-bold text-slate-900">{value}</p>
                  <p className="mt-1 text-sm text-slate-500">{label}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
                <div className="mb-4 flex items-end justify-between gap-3">
                  <div><h2 className="font-semibold text-slate-900">Upload Activity</h2><p className="mt-1 text-sm text-slate-500">Files Added Over The Last Seven Days</p></div>
                  <span className="text-sm font-semibold text-indigo-600">{resourceAnalytics.recentUploads} Files</span>
                </div>
                <div className="flex h-32 items-end justify-between gap-2 border-b border-slate-100 px-1">
                  {resourceAnalytics.uploadDays.map((day) => {
                    const height = resourceAnalytics.recentUploads ? Math.max(10, (day.count / Math.max(...resourceAnalytics.uploadDays.map((item) => item.count), 1)) * 100) : 10;
                    return <div key={day.key} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><span className="text-xs font-semibold text-slate-500">{day.count || ""}</span><div className="w-full max-w-8 rounded-t-md bg-indigo-400" style={{ height: `${height}%` }} /><span className="text-xs text-slate-400">{day.label}</span></div>;
                  })}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="font-semibold text-slate-900">Library Makeup</h2>
                <p className="mt-1 text-sm text-slate-500">Formats And Subjects In Your Collection</p>
                <div className="mt-4 space-y-3">
                  {resourceAnalytics.typeBreakdown.slice(0, 4).map(([type, count]) => <div key={type}><div className="mb-1 flex justify-between text-sm"><span className="font-medium text-slate-700">{type}</span><span className="text-slate-500">{count}</span></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-emerald-400" style={{ width: `${(count / resources.length) * 100}%` }} /></div></div>)}
                  <p className="pt-1 text-xs text-slate-400">Top Subject: <span className="font-semibold text-slate-600">{resourceAnalytics.topSubject}</span></p>
                </div>
              </div>
            </div>
          </section>
        )}

        {error && <p className="mb-5 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>}

        {preview && (
          <section className="mb-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 p-4">
              <div className="flex min-w-0 items-center gap-3">
                <FileText className="h-5 w-5 shrink-0 text-indigo-600" />
                <h2 className="min-w-0 break-words font-semibold text-slate-800">{preview.file_name}</h2>
              </div>
              <button type="button" onClick={() => { setPreview(null); setPreviewUrl(""); }} title="Close Preview" className="shrink-0 rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex min-h-64 items-center justify-center bg-slate-50 p-4">
              {isPreviewLoading ? <Loader2 className="h-6 w-6 animate-spin text-indigo-600" /> : canEmbed(preview.file_type) ? (
                preview.file_type.startsWith("image/") ? <img src={previewUrl} alt={preview.file_name} className="max-h-[32rem] max-w-full object-contain" /> : preview.file_type.startsWith("video/") ? <video src={previewUrl} controls className="max-h-[32rem] max-w-full" /> : preview.file_type.startsWith("audio/") ? <audio src={previewUrl} controls /> : <iframe src={previewUrl} title={`Preview of ${preview.file_name}`} className="h-[28rem] w-full rounded-lg border border-slate-200 bg-white" />
              ) : <p className="text-center text-sm text-slate-500">Preview Is Not Available For This File Type. Open The File To View It.</p>}
            </div>
            <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 p-4">
              <button type="button" onClick={() => openResource(preview.file_path)} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"><ExternalLink className="h-4 w-4" /> Open Full File</button>
              <span className="break-words text-xs text-slate-400">{preview.file_type}</span>
            </div>
          </section>
        )}

        {/* Flashcard / Quiz Detail Modal */}
        {detailModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
            <div className="motion-dialog w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  {getItemIcon(detailModal.type)}
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {detailModal.type}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailModal(null)}
                  className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                {detailModal.type === "flashcard" && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Question</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">{detailModal.original.question}</p>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Answer</p>
                    <p className="mt-1 rounded-xl bg-slate-50 p-4 text-base font-semibold text-slate-800">
                      {detailModal.original.answer}
                    </p>
                  </div>
                )}

                {detailModal.type === "quiz" && (
                  <div>
                    {detailModal.original.concept && (
                      <span className="inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 mb-2">
                        {detailModal.original.concept}
                      </span>
                    )}
                    <p className="text-base font-bold text-slate-900">{detailModal.original.question || detailModal.title}</p>
                    {detailModal.original.correct_answer && (
                      <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
                        <strong className="block text-xs font-bold uppercase tracking-wider text-emerald-700">Correct Answer</strong>
                        {detailModal.original.correct_answer}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setDetailModal(null)}
                  className="rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-20 text-slate-500">
            <LoadingCompanion message="Loading your library..." />
          </div>
        ) : groupedItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center">
            <BookOpen className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <h2 className="text-lg font-semibold text-slate-800">
              {searchTerm ? "No Matching Library Items" : "Your Library Is Empty"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {searchTerm ? "Try A Different Search Term or Tab." : "Saved Resources, Notes, Flashcards, and Quizzes will appear here."}
            </p>
          </div>
        ) : (
          <div className="space-y-7">
            {groupedItems.map((group) => (
              <section key={group.name}>
                <h2 className="mb-3 text-lg font-bold text-slate-800">{group.name}</h2>
                <div className="grid gap-3 md:grid-cols-2">
                  {group.items.map((item) => (
                    <article
                      key={item.id}
                      className="flex min-w-0 items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-300"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="p-1 rounded-md bg-slate-100">{getItemIcon(item.type)}</span>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{item.type}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleItemClick(item)}
                          className="block max-w-full truncate text-left font-semibold text-slate-900 hover:text-indigo-700"
                        >
                          {item.title}
                          {item.type === "resource" && <ExternalLink className="ml-2 inline h-3.5 w-3.5" />}
                        </button>
                        <p className="mt-1 truncate text-xs text-slate-400">
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "Recently saved"}
                        </p>
                      </div>

                      {item.type === "resource" && (
                        <button
                          type="button"
                          title="Delete Library Item"
                          aria-label={`Delete ${item.title}`}
                          disabled={deletingId === item.refId}
                          onClick={() => removeResource(item.refId)}
                          className="shrink-0 rounded-md p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        >
                          {deletingId === item.refId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default Library;