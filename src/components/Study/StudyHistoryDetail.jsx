import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  FileText,
  HelpCircle,
  Layers3,
  Sparkles,
  Zap,
} from "lucide-react";
import supabase from "../../lib/supabase";
import LoadingCompanion from "../common/LoadingCompanion";

function StudyHistoryDetail() {
  const { historyId } = useParams();
  const navigate = useNavigate();
  const [historyItem, setHistoryItem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const toTitleCase = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/\b\w/g, (character) => character.toUpperCase());

  useEffect(() => {
    if (!historyId) return;

    const fetchHistoryDetail = async () => {
      setIsLoading(true);
      setError("");

      const { data, error: fetchError } = await supabase
        .from("study_history")
        .select("*")
        .eq("id", historyId)
        .single();

      if (fetchError) {
        console.error("Fetch history detail error:", fetchError);
        setError("Unable to load history entry.");
      } else {
        setHistoryItem(data);
      }
      setIsLoading(false);
    };

    fetchHistoryDetail();
  }, [historyId]);

  if (isLoading) {
    return <LoadingCompanion message="Loading session history..." />;
  }

  if (error || !historyItem) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 mb-4">{error || "History item not found."}</p>
        <button
          onClick={() => navigate("/Study")}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Study
        </button>
      </div>
    );
  }

  const timeline = Array.isArray(historyItem.timeline) ? historyItem.timeline : [];

  const getEventIcon = (type) => {
    switch (type) {
      case "note":
        return <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case "flashcard":
        return <Layers3 className="h-4 w-4 text-sky-600 dark:text-sky-400" />;
      case "quiz":
        return <HelpCircle className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
      case "resource":
        return <BookOpen className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      default:
        return <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
    }
  };

  const handleEventClick = (event) => {
    if (event.type === "note" && event.refId) {
      navigate(`/Study/${historyItem.id}/notes/${event.refId}`);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate("/Study")}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-600"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Study
        </button>
      </div>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#18211f] p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              Completed Session
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              {toTitleCase(historyItem.subject)}
            </h1>
            <p className="mt-1 text-base font-medium text-slate-600 dark:text-slate-300">
              {toTitleCase(historyItem.topic)}
            </p>
          </div>
          <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-3 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
            {historyItem.status}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800 pt-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-slate-400 dark:text-slate-500">Duration</p>
            <p className="mt-0.5 text-sm font-bold text-slate-800 dark:text-slate-200">
              {historyItem.duration_minutes} min
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400 dark:text-slate-500">Completed At</p>
            <p className="mt-0.5 text-sm font-bold text-slate-800 dark:text-slate-200">
              {new Date(historyItem.completed_at).toLocaleDateString([], {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400 dark:text-slate-500">XP Earned</p>
            <p className="mt-0.5 text-sm font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Zap className="h-3.5 w-3.5" /> +{historyItem.xp_earned || 50} XP
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400 dark:text-slate-500">Activities</p>
            <p className="mt-0.5 text-sm font-bold text-slate-800 dark:text-slate-200">
              {timeline.length} logged
            </p>
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Session Activity Timeline
        </h2>

        {timeline.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-[#18211f] p-8 text-center text-slate-500 dark:text-slate-400">
            <BookOpen className="mx-auto mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-medium">No activity recorded for this session</p>
          </div>
        ) : (
          <div className="relative space-y-4 before:absolute before:left-5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
            {timeline.map((event, index) => {
              const isClickable = event.type === "note" && event.refId;
              return (
                <div
                  key={event.id || index}
                  onClick={() => isClickable && handleEventClick(event)}
                  className={`relative flex items-start gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#18211f] p-4 pl-12 shadow-sm transition ${
                    isClickable ? "cursor-pointer hover:border-emerald-400" : ""
                  }`}
                >
                  <span className="absolute left-3 top-4 flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 ring-4 ring-white dark:ring-[#18211f]">
                    {getEventIcon(event.type)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {event.title}
                      </p>
                      <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                        {event.timestamp ? new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 capitalize">
                      {event.type}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default StudyHistoryDetail;
