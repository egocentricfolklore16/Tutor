import React, { useState } from "react";
import { ThumbsUp, ThumbsDown, Check, Send } from "lucide-react";
import { submitTutorResponseFeedback } from "../../lib/feedback";

export default function InlineTutorFeedback({ messageId, userId, context = {} }) {
  const [voted, setVoted] = useState(null); // 'up' or 'down'
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleVote = async (type) => {
    setVoted(type);
    const rating = type === "up" ? 5 : 1;

    setSubmitting(true);
    await submitTutorResponseFeedback({
      userId,
      messageId,
      rating,
      message: note,
      context,
    });
    setSubmitting(false);

    if (type === "down") {
      setShowNoteInput(true);
    } else {
      setSubmitted(true);
    }
  };

  const handleNoteSubmit = async (e) => {
    e.preventDefault();
    if (!note.trim()) return;

    setSubmitting(true);
    await submitTutorResponseFeedback({
      userId,
      messageId,
      rating: voted === "up" ? 5 : 1,
      message: note,
      context,
    });
    setSubmitting(false);
    setShowNoteInput(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 mt-1.5">
        <Check className="w-3.5 h-3.5" />
        <span>Feedback saved</span>
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Helpful?</span>
        <button
          type="button"
          onClick={() => handleVote("up")}
          disabled={submitting}
          className={`p-1 rounded-md text-xs transition-colors ${
            voted === "up"
              ? "bg-emerald-500/20 text-emerald-400"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          }`}
          title="Thumbs up"
        >
          <ThumbsUp className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => handleVote("down")}
          disabled={submitting}
          className={`p-1 rounded-md text-xs transition-colors ${
            voted === "down"
              ? "bg-rose-500/20 text-rose-400"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          }`}
          title="Thumbs down"
        >
          <ThumbsDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {showNoteInput && (
        <form onSubmit={handleNoteSubmit} className="flex gap-1.5 items-center pt-1">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What could be improved?"
            className="flex-1 px-2.5 py-1 text-xs rounded-lg bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button
            type="submit"
            disabled={submitting || !note.trim()}
            className="p-1 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium disabled:opacity-50 flex items-center gap-1"
          >
            <Send className="w-3 h-3" />
          </button>
        </form>
      )}
    </div>
  );
}
