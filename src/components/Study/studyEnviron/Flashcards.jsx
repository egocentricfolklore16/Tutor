import React, { useEffect, useState } from "react";
import {
  Eye,
  EyeOff,
  Layers3,
  Pencil,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import supabase from "../../../lib/supabase";
import { normalizeFlashcard, normalizeFlashcardValue } from "../../../lib/flashcardNormalization";

const Flashcards = ({ studyId, userId, onTimelineEvent }) => {
  const [cards, setCards] = useState([]);
  const [form, setForm] = useState({ question: "", answer: "" });
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAnswerVisible, setIsAnswerVisible] = useState(false);
  const [isReviewComplete, setIsReviewComplete] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    if (!studyId) {
      setCards([]);
      setIsLoading(false);
      return () => {
        isCurrent = false;
      };
    }

    setIsLoading(true);
    setError("");

    supabase
      .from("session_flashcards")
      .select("id,session_id,user_id,question,answer,source,created_at")
      .eq("session_id", studyId)
      .order("created_at")
      .then(({ data, error: fetchError }) => {
        if (!isCurrent) return;
        if (fetchError) {
          setError(fetchError.message);
          setCards([]);
          return;
        }

        setCards((data || []).map((card) => normalizeFlashcard(card)));
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [studyId]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.code !== "Space" || event.repeat || isLoading || !cards.length || isReviewComplete) return;

      const target = event.target;
      const tagName = target?.tagName?.toLowerCase();
      if (
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select" ||
        tagName === "button" ||
        target?.isContentEditable
      ) {
        return;
      }

      event.preventDefault();
      setIsAnswerVisible((visible) => !visible);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cards.length, isLoading, isReviewComplete]);

  const activeCard = cards[activeIndex] ?? null;
  const dueCount = isReviewComplete ? 0 : Math.max(0, cards.length - activeIndex);
  const progressIndex = cards.length === 0 ? 0 : isReviewComplete ? cards.length : activeIndex + 1;
  const progress = cards.length ? (progressIndex / cards.length) * 100 : 0;
  const accentText = "text-brand-strong dark:text-orange-400";
  const accentButton = "bg-brand hover:bg-brand-strong dark:bg-orange-500 dark:hover:bg-orange-400";
  const accentSoft = "bg-brand-soft dark:bg-orange-500/15";
  const accentLabel = "text-brand-strong dark:text-orange-300";

  const saveCard = async (event) => {
    event.preventDefault();

    if (!studyId) {
      setError("Active study session required to save flashcards.");
      return;
    }

    const question = normalizeFlashcardValue(form.question, "question").trim();
    const answer = normalizeFlashcardValue(form.answer, "answer").trim();
    if (!question || !answer) return;

    let activeUserId = userId;
    if (!activeUserId) {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) {
        setError(userError.message);
        return;
      }
      activeUserId = user?.id;
    }

    const payload = {
      question,
      answer,
      session_id: studyId,
      user_id: activeUserId,
      source: "user",
    };

    const query = editingId
      ? supabase
          .from("session_flashcards")
          .update({ question: payload.question, answer: payload.answer })
          .eq("id", editingId)
          .select()
          .single()
      : supabase.from("session_flashcards").insert(payload).select().single();

    const { data, error: saveError } = await query;
    if (saveError) {
      setError(saveError.message);
      return;
    }

    const cleanCard = normalizeFlashcard(data);
    setError("");

    if (!editingId && onTimelineEvent && data) {
      onTimelineEvent({
        id: crypto.randomUUID(),
        type: "flashcard",
        refId: String(data.id),
        title: cleanCard.question || "Flashcard created",
        timestamp: new Date().toISOString(),
      });
    }

    setCards((current) =>
      editingId
        ? current.map((card) => (card.id === editingId ? cleanCard : card))
        : [...current, cleanCard]
    );
    setForm({ question: "", answer: "" });
    setEditingId(null);
  };

  const removeCard = async (id) => {
    const { error: deleteError } = await supabase
      .from("session_flashcards")
      .delete()
      .eq("id", id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    const nextCards = cards.filter((card) => card.id !== id);
    setCards(nextCards);
    setActiveIndex((index) => Math.min(index, Math.max(0, nextCards.length - 1)));
    setIsAnswerVisible(false);
    setIsReviewComplete(false);
  };

  const advanceCard = () => {
    if (activeIndex >= cards.length - 1) {
      setIsReviewComplete(true);
      setIsAnswerVisible(false);
      return;
    }

    setActiveIndex((index) => index + 1);
    setIsAnswerVisible(false);
  };

  const restartReview = () => {
    setActiveIndex(0);
    setIsAnswerVisible(false);
    setIsReviewComplete(false);
  };

  const toggleReveal = () => setIsAnswerVisible((visible) => !visible);

  const renderReviewCard = () => {
    if (!activeCard || isReviewComplete) {
      return (
        <div className="flex min-h-64 flex-col items-center justify-center text-center">
          <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${accentSoft} ${accentLabel}`}>
            {cards.length ? <Sparkles className="h-6 w-6" /> : <Layers3 className="h-6 w-6" />}
          </span>
          <h3 className="mt-4 text-xl font-bold text-slate-900 dark:text-slate-100">All caught up</h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
            {cards.length
              ? "You reviewed every card in this session. Come back later to strengthen your recall."
              : "There are no flashcards waiting in this session. Add a question and answer below to build your deck."}
          </p>
          {cards.length > 0 && (
            <button
              type="button"
              onClick={restartReview}
              className={`mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 ${accentButton}`}
            >
              <RotateCcw className="h-4 w-4" /> Review again
            </button>
          )}
        </div>
      );
    }

    return (
      <article
        tabIndex={0}
        aria-label={`Flashcard ${activeIndex + 1} of ${cards.length}`}
        className="rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-4 dark:focus-visible:ring-offset-[#18211f]"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className={`rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] ${accentSoft} ${accentLabel}`}>
            {isAnswerVisible ? "Answer" : "Question"}
          </span>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Press <kbd className="mx-1 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-sans font-semibold text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">Space</kbd> to flip
          </p>
        </div>

        <div className="flex min-h-36 items-center py-8 sm:min-h-44">
          <h3 className="w-full break-words text-left text-xl font-bold leading-relaxed text-slate-900 dark:text-slate-100 sm:text-2xl">
            {isAnswerVisible ? activeCard.answer : activeCard.question}
          </h3>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={toggleReveal}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 ${accentButton}`}
          >
            {isAnswerVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {isAnswerVisible ? "Hide answer" : "Reveal answer"}
          </button>

          {!isReviewComplete && (
            <button
              type="button"
              onClick={advanceCard}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:focus-visible:ring-slate-400"
            >
              {activeIndex >= cards.length - 1 ? "Finish" : "Next card"}
            </button>
          )}
        </div>
      </article>
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-[#18211f]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-strong dark:text-orange-300">
              Flashcards
            </p>
            <h3 className="mt-1 text-xl font-black text-slate-900 dark:text-slate-100">Review your deck</h3>
          </div>
          <div className="rounded-full bg-brand-soft px-3 py-1.5 text-xs font-bold text-brand-strong dark:bg-orange-500/10 dark:text-orange-300">
            {cards.length} cards
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="mb-5 flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span>{dueCount} remaining</span>
          <span>{Math.round(progress)}% complete</span>
        </div>

        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div className="h-full rounded-full bg-brand transition-[width] dark:bg-orange-500" style={{ width: `${progress}%` }} />
        </div>

        <div className="mt-5">
          {isLoading ? (
            <div className="text-sm text-slate-500">Loading flashcards...</div>
          ) : (
            renderReviewCard()
          )}
        </div>
      </div>

      <form onSubmit={saveCard} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-[#18211f]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {editingId ? "Edit flashcard" : "Add flashcard"}
          </h3>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm({ question: "", answer: "" });
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            >
              <X className="h-3.5 w-3.5" /> Cancel
            </button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Question
            <textarea
              value={form.question}
              onChange={(event) => setForm((current) => ({ ...current, question: event.target.value }))}
              rows={4}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-orange-400 dark:focus:ring-orange-500/15"
              placeholder="What do you want to remember?"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Answer
            <textarea
              value={form.answer}
              onChange={(event) => setForm((current) => ({ ...current, answer: event.target.value }))}
              rows={4}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-orange-400 dark:focus:ring-orange-500/15"
              placeholder="Add the answer or summary"
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="submit"
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 ${accentButton}`}
          >
            {editingId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {editingId ? "Save changes" : "Add card"}
          </button>
        </div>
      </form>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-[#18211f]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Deck list</h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">{cards.length} saved</span>
        </div>

        {cards.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
            No flashcards yet. Add your first question and answer to build the deck.
          </div>
        ) : (
          <div className="space-y-3">
            {cards.map((card, index) => (
              <div key={card.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/40">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Card {index + 1}
                    </p>
                    <p className="mt-1 break-words text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {card.question}
                    </p>
                    <p className="mt-1 break-words text-sm text-slate-600 dark:text-slate-400">{card.answer}</p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(card.id);
                        setForm({ question: card.question, answer: card.answer });
                      }}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      aria-label={`Edit card ${index + 1}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeCard(card.id)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
                      aria-label={`Delete card ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Flashcards;
