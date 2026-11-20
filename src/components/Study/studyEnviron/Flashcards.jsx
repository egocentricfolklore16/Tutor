import React, { useEffect, useRef, useState } from "react";
import {
  Layers3,
  Pencil,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import supabase from "../../../lib/supabase";
import { gamificationService } from "../../../features/gamification";
import { FanGallery } from "../../fan-gallery";

const normalizeCardValue = (value, key, depth = 0) => {
  if (value === null || value === undefined || depth > 3) return "";
  if (typeof value === "object") {
    const property = value[key] ?? value[key === "question" ? "front" : "back"];
    return property === undefined ? "" : normalizeCardValue(property, key, depth + 1);
  }

  let text = typeof value === "string" ? value.trim() : String(value).trim();
  if (!text) return "";

  try {
    const parsed = JSON.parse(text);
    if (typeof parsed === "string") return normalizeCardValue(parsed, key, depth + 1);
    if (parsed && typeof parsed === "object") {
      const property = parsed[key] ?? parsed[key === "question" ? "front" : "back"];
      if (property !== undefined) return normalizeCardValue(property, key, depth + 1);
    }
  } catch {
    // Some legacy rows contain a single JSON property rather than valid JSON.
  }

  text = text
    .replace(/^\s*\{\s*["']?(?:question|answer|front|back)["']?\s*:\s*/i, "")
    .replace(/,\s*\}?\s*$/, "")
    .replace(/\s*\}\s*$/, "")
    .trim();

  if (text.length >= 2 && text.startsWith('"') && text.endsWith('"')) {
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed === "string") return parsed.trim();
    } catch {
      text = text.slice(1, -1).replace(/\\"/g, '"').trim();
    }
  } else if (text.length >= 2 && text.startsWith("'") && text.endsWith("'")) {
    text = text.slice(1, -1).trim();
  }

  return text.replace(/,\s*$/, "").trim();
};

const normalizeFlashcard = (card) => ({
  ...card,
  question: normalizeCardValue(card.question ?? card.front, "question"),
  answer: normalizeCardValue(card.answer ?? card.back, "answer"),
});

const Flashcards = ({ studyId, userId, onTimelineEvent }) => {
  const [cards, setCards] = useState([]);
  const [form, setForm] = useState({ question: "", answer: "" });
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAnswerVisible, setIsAnswerVisible] = useState(false);
  const [isReviewComplete, setIsReviewComplete] = useState(false);
  const reviewedCardIdsRef = useRef(new Set());
  const fanRef = useRef(null);

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
        if (fetchError) setError(fetchError.message);
        else setCards((data || []).map(normalizeFlashcard));
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [studyId]);

  const saveCard = async (event) => {
    event.preventDefault();
    if (!studyId) {
      setError("An active course is required to save flashcards.");
      return;
    }
    const question = normalizeCardValue(form.question, "question");
    const answer = normalizeCardValue(form.answer, "answer");
    if (!question || !answer) return;

    let activeUserId = userId;
    if (!activeUserId) {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
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
      ? supabase.from("session_flashcards").update({ question: payload.question, answer: payload.answer }).eq("id", editingId).select().single()
      : supabase.from("session_flashcards").insert(payload).select().single();

    const { data, error: saveError } = await query;
    if (saveError) setError(saveError.message);
    else {
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
      setCards((current) => editingId
        ? current.map((card) => card.id === editingId ? cleanCard : card)
        : [...current, cleanCard]);
      setForm({ question: "", answer: "" });
      setEditingId(null);
    }
  };

  const removeCard = async (id) => {
    const { error: deleteError } = await supabase.from("session_flashcards").delete().eq("id", id);
    if (deleteError) setError(deleteError.message);
    else {
      const nextCards = cards.filter((card) => card.id !== id);
      setCards(nextCards);
      setActiveIndex((index) => Math.min(index, Math.max(0, nextCards.length - 1)));
      setIsAnswerVisible(false);
      setIsReviewComplete(false);
    }
  };

  const activeCard = cards[activeIndex];
  const handleCardFlip = (index, flipped) => {
    if (!flipped) {
      if (index === activeIndex) setIsAnswerVisible(false);
      return;
    }

    const card = cards[index];
    if (card?.id && !reviewedCardIdsRef.current.has(card.id)) {
      reviewedCardIdsRef.current.add(card.id);
      gamificationService.recordFlashcardReview(card.id).then(({ error: reviewErr }) => {
        if (reviewErr) {
          console.error("Flashcard review tracking error:", reviewErr);
        }
        gamificationService.checkAndClaimQuests();
      });
    }
    if (index === activeIndex) setIsAnswerVisible(true);
  };
  const dueCount = isReviewComplete ? 0 : Math.max(0, cards.length - activeIndex);
  const progress = cards.length
    ? isReviewComplete ? 100 : ((activeIndex + 1) / cards.length) * 100
    : 0;
  const accentText = "text-orange-600 dark:text-orange-400";
  const accentButton = "bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-400";
  const accentSoft = "bg-orange-50 dark:bg-orange-500/15";
  const accentLabel = "text-orange-700 dark:text-orange-300";

  const advanceCard = () => {
    if (activeCard) fanRef.current?.flipCard(activeIndex, false);
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

  return (
    <div className="space-y-8">
      <header className="mx-auto w-full max-w-3xl">
        <div className="flex items-center gap-3">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${accentSoft} ${accentLabel}`}>
            <Layers3 className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">Daily Flashcard Review</h2>
          </div>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400 sm:text-base">
          Strengthen your memory retention with scientifically timed active recall intervals.
        </p>
      </header>

      <section className="mx-auto w-full max-w-3xl" aria-label="Flashcard review progress">
        <div className="flex items-center justify-between gap-4">
          <p className="flex min-w-0 items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <Sparkles className={`h-4 w-4 shrink-0 ${accentText}`} />
            <span>Due in Queue: <strong className="font-bold text-slate-900 dark:text-slate-100">{dueCount}</strong></span>
          </p>
          <p className="shrink-0 text-sm text-slate-500 dark:text-slate-400">
            Card <span className="font-semibold text-slate-700 dark:text-slate-200">{cards.length && !isReviewComplete ? activeIndex + 1 : 0}</span> of {cards.length}
          </p>
        </div>
        <div
          className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
          role="progressbar"
          aria-label="Flashcard review progress"
          aria-valuemin={0}
          aria-valuemax={cards.length || 1}
          aria-valuenow={isReviewComplete ? cards.length : cards.length ? activeIndex + 1 : 0}
        >
          <div className="h-full rounded-full bg-orange-600 transition-[width] duration-300 dark:bg-orange-400" style={{ width: `${progress}%` }} />
        </div>
      </section>

      <section id="flashcard-review" className="mx-auto w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-[#18211f] sm:p-8 md:p-10">
        {isLoading ? (
          <div className="flex min-h-64 items-center justify-center text-center" role="status">
            <div>
              <Sparkles className={`mx-auto h-7 w-7 animate-pulse ${accentText}`} />
              <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">Loading your flashcards...</p>
            </div>
          </div>
        ) : error && cards.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center text-center" role="alert">
            <p className="font-semibold text-red-700 dark:text-red-300">We couldn&apos;t load your flashcards.</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{error}</p>
          </div>
        ) : !activeCard || isReviewComplete ? (
          <div className="flex min-h-64 flex-col items-center justify-center text-center">
            <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${accentSoft} ${accentLabel}`}>
              {cards.length ? <Sparkles className="h-6 w-6" /> : <Layers3 className="h-6 w-6" />}
            </span>
            <h3 className="mt-4 text-xl font-bold text-slate-900 dark:text-slate-100">
              All caught up
            </h3>
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
        ) : (
          <div className="space-y-3">
            <p className="text-center text-xs text-slate-500 dark:text-slate-400">
              Click or tap a card to flip. Use Left/Right to move, Enter or Space to flip, and Escape to return to the question.
            </p>
            <FanGallery
              ref={fanRef}
              key={`${studyId}-${cards.map((card) => card.id).join(",")}`}
              items={cards.map((card, index) => ({
                front: card.question,
                back: card.answer,
                label: `Card ${index + 1}`,
              }))}
              cardWidth={220}
              aspectRatio={0.8}
              spacing={0.69}
              curve={0.14}
              tilt={14.5}
              lift={42}
              spread={0.2}
              stackFrom="left"
              speed={0.7}
              stagger={0.09}
              bounce={0.35}
              hoverSpeed={0.28}
              radius={18}
              entrance="stack"
              trigger="scroll"
              viewportStart={75}
              once={true}
              showTitle={false}
              singleFlip={true}
              ariaLabel="Flashcard deck"
              onFlip={handleCardFlip}
            />
            {isAnswerVisible && (
              <button
                type="button"
                onClick={advanceCard}
                className={`mt-5 flex min-h-12 w-full items-center justify-center rounded-xl px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#18211f] ${accentButton}`}
              >
                {activeIndex === cards.length - 1 ? "Finish review" : "Next card"}
              </button>
            )}
          </div>
        )}
      </section>

      {error && cards.length > 0 && (
        <div role="alert" className="mx-auto flex w-full max-w-3xl items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
          <span>{error}</span>
          <button type="button" aria-label="Dismiss error" onClick={() => setError("")} className="shrink-0 rounded p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <form onSubmit={saveCard} className="dark-surface mx-auto w-full max-w-3xl space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 sm:p-5">
        <div className="dark-primary-text flex items-center gap-2">
          <Plus className={`h-4 w-4 ${accentText}`} />
          <h3 className="font-bold text-slate-900 dark:text-slate-100">{editingId ? "Edit flashcard" : "Add to this deck"}</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="sr-only" htmlFor="flashcard-question">Question</label>
          <input
            id="flashcard-question"
            value={form.question}
            onChange={(event) => setForm({ ...form, question: event.target.value })}
            placeholder="Question"
            className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 text-slate-900 outline-none placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-orange-500 dark:border-slate-700 dark:bg-[#18211f] dark:text-slate-100 dark:placeholder:text-slate-500"
            disabled={!studyId}
          />
          <label className="sr-only" htmlFor="flashcard-answer">Answer</label>
          <input
            id="flashcard-answer"
            value={form.answer}
            onChange={(event) => setForm({ ...form, answer: event.target.value })}
            placeholder="Answer"
            className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 text-slate-900 outline-none placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-orange-500 dark:border-slate-700 dark:bg-[#18211f] dark:text-slate-100 dark:placeholder:text-slate-500"
            disabled={!studyId}
          />
        </div>
        <div className="flex justify-end gap-2">
          {editingId && (
            <button
              type="button"
              onClick={() => { setForm({ question: "", answer: "" }); setEditingId(null); }}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
          )}
          <button
            disabled={!studyId}
            className={`inline-flex min-h-10 items-center rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${accentButton}`}
          >
            <Plus className="mr-1 inline h-4 w-4" />{editingId ? "Update card" : "Save card"}
          </button>
        </div>
      </form>

      {cards.length > 0 && (
        <section className="mx-auto w-full max-w-3xl space-y-3" aria-label="Manage flashcards">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Cards in this deck</h3>
          {cards.map((card, index) => (
            <article key={`edit-${card.id}`} className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-[#18211f]">
              <button
                type="button"
                onClick={() => {
                  setActiveIndex(index);
                  setIsAnswerVisible(false);
                  setIsReviewComplete(false);
                  document.getElementById("flashcard-review")?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
                className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              >
                <span className={`text-xs font-bold uppercase tracking-wider ${accentText}`}>Card {index + 1}</span>
                <span className="mt-1 block break-words text-sm font-semibold text-slate-800 dark:text-slate-100">{card.question}</span>
              </button>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => { setEditingId(card.id); setForm({ question: card.question, answer: card.answer }); }}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  title="Edit card"
                  aria-label={`Edit card ${index + 1}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => removeCard(card.id)}
                  className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                  title="Delete card"
                  aria-label={`Delete card ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
};

export default Flashcards;
