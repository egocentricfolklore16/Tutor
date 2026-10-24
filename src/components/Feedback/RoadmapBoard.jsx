import React, { useState, useEffect } from "react";
import { ThumbsUp, Lightbulb, Plus, Sparkles, Filter } from "lucide-react";
import { fetchPublicRoadmap, toggleFeedbackVote, FEEDBACK_TYPES, FEEDBACK_STATUSES } from "../../lib/feedback";
import FeedbackModal from "./FeedbackModal";

export default function RoadmapBoard({ user }) {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);

  const userId = user?.id || null;

  const loadRoadmap = async () => {
    setLoading(true);
    const data = await fetchPublicRoadmap(userId);
    setIdeas(data);
    setLoading(false);
  };

  useEffect(() => {
    loadRoadmap();
  }, [userId]);

  const handleVoteToggle = async (ideaId) => {
    if (!userId) {
      alert("Please sign in to vote on roadmap ideas.");
      return;
    }

    // Optimistic UI update
    setIdeas((prev) =>
      prev.map((item) => {
        if (item.id === ideaId) {
          const nextVoted = !item.userHasVoted;
          const nextCount = nextVoted ? item.vote_count + 1 : Math.max(item.vote_count - 1, 0);
          return { ...item, userHasVoted: nextVoted, vote_count: nextCount };
        }
        return item;
      })
    );

    const res = await toggleFeedbackVote(ideaId, userId);
    if (!res.success) {
      // Revert if error
      loadRoadmap();
    }
  };

  const filteredIdeas = ideas.filter((item) => {
    if (filterStatus === "all") return true;
    return item.status === filterStatus;
  });

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <Lightbulb className="w-6 h-6 text-amber-400" />
            <span>Public Ideas & Roadmap</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            See upcoming features, upvote your favorite ideas, and submit new feature requests.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 shrink-0 self-start md:self-auto transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Submit New Idea</span>
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800">
        {[
          { key: "all", label: "All Ideas" },
          { key: FEEDBACK_STATUSES.PLANNED, label: "Planned" },
          { key: FEEDBACK_STATUSES.IN_PROGRESS, label: "In Progress" },
          { key: FEEDBACK_STATUSES.RESOLVED, label: "Completed" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              filterStatus === tab.key
                ? "bg-emerald-500/20 border border-emerald-500 text-emerald-300"
                : "bg-slate-900/50 border border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs">Loading roadmap items...</p>
        </div>
      ) : filteredIdeas.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/30 rounded-2xl border border-slate-800/80 text-slate-400">
          <p className="text-sm">No public ideas found in this view.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredIdeas.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between gap-4 hover:border-slate-700 transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {item.status}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed font-medium">
                  {item.message}
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-slate-800/60 pt-3">
                <button
                  onClick={() => handleVoteToggle(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                    item.userHasVoted
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-sm"
                      : "bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600 hover:text-white"
                  }`}
                >
                  <ThumbsUp className={`w-3.5 h-3.5 ${item.userHasVoted ? "fill-emerald-400 text-emerald-400" : ""}`} />
                  <span>{item.vote_count || 0} Votes</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <FeedbackModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        user={user}
        initialType={FEEDBACK_TYPES.FEATURE_REQUEST}
      />
    </div>
  );
}
