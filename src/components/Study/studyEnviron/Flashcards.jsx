import React, { useEffect, useRef, useState } from "react";
import {
  Eye,
  EyeOff,
  Layers3,
  Pencil,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import supabase from "../../../lib/supabase";
import { gamificationService } from "../../../features/gamification";
import { Card, Button, ProgressBar, Badge } from "../../common/UIKit";

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
    // Legacy single property parsing fallback
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

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.code !== "Space" || event.repeat || isLoading || !cards.length || isReviewComplete)
        return;
      const target = event.target;
      const tagName = target?.tagName?.toLowerCase();
      if (
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select" ||
        tagName === "button" ||
        target?.isContentEditable
      )
        return;

      event.preventDefault();
      setIsAnswerVisible((visible) => !visible);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cards.length, isLoading, isReviewComplete]);

  const activeCard = cards[activeIndex];

  // Flashcard review tracking for quests
  useEffect(() => {
    if (isAnswerVisible && activeCard?.id) {
      if (!reviewedCardIdsRef.current.has(activeCard.id)) {
        reviewedCardIdsRef.current.add(activeCard.id);
        gamificationService.recordFlashcardReview(activeCard.id).then(({ error: reviewErr }) => {
          if (reviewErr) {
            console.error("Flashcard review tracking error:", reviewErr);
          }
          gamificationService.checkAndClaimQuests();
        });
      }
    }
  }, [isAnswerVisible, activeCard?.id]);

  const saveCard = async (event) => {
    event.preventDefault();
    if (!studyId) {
      setError("Active study session required to save flashcards.");
      return;
    }
    const question = normalizeCardValue(form.question, "question");
    const answer = normalizeCardValue(form.answer, "answer");
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
      setCards((current) =>
        editingId
          ? current.map((card) => (card.id === editingId ? cleanCard : card))
          : [...current, cleanCard]
      );
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

  const advanceCard = () => {
    if (activeIndex >= cards.length - 1) {
      setIsReviewComplete(true);
      setIsAnswerVisible(false);
      return;
    }
    setActiveIndex((index) => index + 1);
    setIsAnswerVisible(false);
  };

  const prevCard = () => {
    if (activeIndex > 0) {
      setActiveIndex((index) => index - 1);
      setIsAnswerVisible(false);
    }
  };

  const restartReview = () => {
    setActiveIndex(0);
    setIsAnswerVisible(false);
    setIsReviewComplete(false);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header & Progress */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400">
              <Layers3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Flashcard Practice
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Card {cards.length && !isReviewComplete ? activeIndex + 1 : 0} of {cards.length}
              </p>
            </div>
          </div>

          <Badge variant="violet" size="sm">
            {cards.length - activeIndex} Left
          </Badge>
        </div>

        <ProgressBar
          value={isReviewComplete ? cards.length : activeIndex + 1}
          max={cards.length || 1}
          variant="violet"
        />
      </Card>

      {/* Flip Card Container */}
      <Card padding="p-8 md:p-12" className="flex flex-col items-center justify-center min-h-[280px]">
        {isLoading ? (
          <div className="flex flex-col items-center gap-2">
            <Sparkles className="w-8 h-8 text-violet-600 animate-pulse" />
            <span className="text-sm text-slate-500">Loading flashcards...</span>
          </div>
        ) : !activeCard || isReviewComplete ? (
          <div className="flex flex-col items-center text-center gap-3">
            <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {cards.length ? "Deck Completed!" : "No Flashcards in Deck"}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
              {cards.length
                ? "Excellent job reviewing all flashcards for this study session!"
                : "Add your first card below to start active recall practice."}
            </p>
            {cards.length > 0 && (
              <Button
                variant="primary"
                size="md"
                leftIcon={<RotateCcw className="w-4 h-4" />}
                onClick={restartReview}
                className="mt-2 font-bold"
              >
                Review Deck Again
              </Button>
            )}
          </div>
        ) : (
          <div className="w-full flex flex-col items-center text-center gap-6">
            <Badge variant={isAnswerVisible ? "mint" : "violet"} size="sm">
              {isAnswerVisible ? "ANSWER" : "QUESTION"}
            </Badge>

            <div
              onClick={() => setIsAnswerVisible((v) => !v)}
              className="cursor-pointer min-h-[140px] flex items-center justify-center w-full max-w-xl transition-all duration-300"
            >
              <h3 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white leading-relaxed">
                {isAnswerVisible ? activeCard.answer : activeCard.question}
              </h3>
            </div>

            <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
              Tap card or press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-violet-950 text-slate-600 dark:text-violet-300">Space</kbd> to flip
            </p>

            <div className="flex items-center gap-3 w-full max-w-md mt-4">
              <Button
                variant="outline"
                size="md"
                onClick={prevCard}
                isDisabled={activeIndex === 0}
                leftIcon={<ChevronLeft className="w-4 h-4" />}
                className="flex-1"
              >
                Prev
              </Button>

              <Button
                variant="soft"
                size="md"
                onClick={() => setIsAnswerVisible((v) => !v)}
                leftIcon={isAnswerVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                className="flex-1"
              >
                {isAnswerVisible ? "Hide" : "Reveal"}
              </Button>

              <Button
                variant="primary"
                size="md"
                onClick={advanceCard}
                rightIcon={<ChevronRight className="w-4 h-4" />}
                className="flex-1 font-bold"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Add / Edit Form */}
      <Card>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4 text-violet-600" />
          {editingId ? "Edit Flashcard" : "Add New Flashcard"}
        </h3>

        <form onSubmit={saveCard} className="flex flex-col gap-3">
          <input
            value={form.question}
            onChange={(e) => setForm({ ...form, question: e.target.value })}
            placeholder="Front (Question)"
            className="w-full rounded-xl bg-slate-50 dark:bg-[#181432] border border-slate-200 dark:border-violet-900/40 p-3 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500 min-h-[44px]"
          />
          <input
            value={form.answer}
            onChange={(e) => setForm({ ...form, answer: e.target.value })}
            placeholder="Back (Answer)"
            className="w-full rounded-xl bg-slate-50 dark:bg-[#181432] border border-slate-200 dark:border-violet-900/40 p-3 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500 min-h-[44px]"
          />

          <div className="flex justify-end gap-2 mt-1">
            {editingId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingId(null);
                  setForm({ question: "", answer: "" });
                }}
              >
                Cancel
              </Button>
            )}
            <Button variant="primary" size="sm" type="submit" className="font-bold">
              {editingId ? "Update Card" : "Save Card"}
            </Button>
          </div>
        </form>
      </Card>

      {/* Manage Cards Deck List */}
      {cards.length > 0 && (
        <Card>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
            Cards in this Deck ({cards.length})
          </h3>
          <div className="flex flex-col gap-2">
            {cards.map((card, idx) => (
              <div
                key={card.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-violet-950/40 border border-slate-200/60 dark:border-violet-900/30 text-xs"
              >
                <div className="min-w-0 flex-1 pr-3">
                  <p className="font-bold text-slate-900 dark:text-white truncate">
                    {idx + 1}. {card.question}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {card.answer}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingId(card.id);
                      setForm({ question: card.question, answer: card.answer });
                    }}
                    className="p-1.5 h-8 w-8 min-h-0 min-w-0"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCard(card.id)}
                    className="p-1.5 h-8 w-8 min-h-0 min-w-0 text-rose-500 hover:text-rose-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default Flashcards;
