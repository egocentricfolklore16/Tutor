import React, { useState, useEffect } from "react";
import { MessageSquare, Clock, CheckCircle2, AlertCircle, ShieldAlert, Sparkles, Plus, CornerDownRight } from "lucide-react";
import { fetchMyFeedback, FEEDBACK_STATUSES } from "../../lib/feedback";
import FeedbackModal from "./FeedbackModal";
import supabase from "../../lib/supabase";

const STATUS_BADGES = {
  [FEEDBACK_STATUSES.NEW]: { label: "Submitted", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  [FEEDBACK_STATUSES.REVIEWING]: { label: "Reviewing", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  [FEEDBACK_STATUSES.PLANNED]: { label: "Planned", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  [FEEDBACK_STATUSES.IN_PROGRESS]: { label: "In Progress", color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" },
  [FEEDBACK_STATUSES.RESOLVED]: { label: "Resolved", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  [FEEDBACK_STATUSES.CLOSED]: { label: "Closed", color: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
  [FEEDBACK_STATUSES.WONT_FIX]: { label: "Won't Fix", color: "bg-rose-500/20 text-rose-400 border-rose-500/30" },
};

export default function MyFeedback({ user }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const userId = user?.id || null;

  const loadFeedback = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const data = await fetchMyFeedback(userId);
    setItems(data);
    setLoading(false);
  };

  useEffect(() => {
    loadFeedback();

    if (!userId) return;

    // Realtime channel for status changes or replies on my feedback
    const channel = supabase
      .channel("my-feedback-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "feedback", filter: `user_id=eq.${userId}` },
        () => {
          loadFeedback();
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "feedback_replies" },
        () => {
          loadFeedback();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <MessageSquare className="w-6 h-6 text-emerald-400" />
            <span>My Feedback</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Track your bug reports, feature requests, and official responses from the team.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 transition-all self-start sm:self-auto shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Feedback</span>
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs">Loading feedback history...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/30 rounded-2xl border border-slate-800/80 space-y-3">
          <MessageSquare className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-300">No feedback submitted yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Have a suggestion or found an issue? Submit feedback and earn +10 XP!
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            Submit Feedback
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const badge = STATUS_BADGES[item.status] || STATUS_BADGES[FEEDBACK_STATUSES.NEW];
            const replies = item.feedback_replies || [];

            return (
              <div key={item.id} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {item.type?.replace("_", " ")}
                      </span>
                      {item.rating && (
                        <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-amber-300 font-semibold">
                          ★ {item.rating}/5
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-200 leading-relaxed font-normal whitespace-pre-wrap">
                      {item.message || "No detailed text provided."}
                    </p>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border shrink-0 ${badge.color}`}>
                    {badge.label}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-500 border-t border-slate-800/60 pt-3">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                  {item.screen && <span>Page: {item.screen}</span>}
                </div>

                {/* Team Replies */}
                {replies.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-3">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <CornerDownRight className="w-3.5 h-3.5" />
                      Team Replies ({replies.length})
                    </span>

                    <div className="space-y-2 pl-4 border-l-2 border-emerald-500/30">
                      {replies.map((reply) => (
                        <div key={reply.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs space-y-1">
                          <div className="flex justify-between items-center text-slate-400">
                            <span className="font-semibold text-emerald-300">Hyper Tutor Support</span>
                            <span className="text-[10px] text-slate-500">
                              {new Date(reply.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-slate-200 whitespace-pre-wrap">{reply.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <FeedbackModal isOpen={modalOpen} onClose={() => setModalOpen(false)} user={user} />
    </div>
  );
}
