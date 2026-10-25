import React, { useState, useEffect, useCallback } from "react";
import {
  Inbox,
  Filter,
  Search,
  Download,
  Send,
  MessageSquare,
  Tag,
  Star,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import {
  fetchAdminFeedbackList,
  updateAdminFeedback,
  addFeedbackReply,
  exportFeedbackToCSV,
  FEEDBACK_TYPES,
  FEEDBACK_STATUSES,
} from "../../lib/feedback";

export default function AdminFeedbackDashboard({ user }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: "all",
    status: "all",
    rating: "all",
    search: "",
  });

  const [selectedItem, setSelectedItem] = useState(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [isInternalReply, setIsInternalReply] = useState(false);
  const [replySubmitting, setReplySubmitting] = useState(false);

  const [newTagInput, setNewTagInput] = useState("");
  const [adminNotesInput, setAdminNotesInput] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    const data = await fetchAdminFeedbackList(filters);
    setItems(data);
    if (selectedItem?.id) {
      const refreshedSelected = data.find((i) => i.id === selectedItem.id);
      if (refreshedSelected) {
        setSelectedItem(refreshedSelected);
        setAdminNotesInput(refreshedSelected.admin_notes || "");
      }
    }
    setLoading(false);
  }, [filters, selectedItem?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectItem = (item) => {
    setSelectedItem(item);
    setAdminNotesInput(item.admin_notes || "");
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedItem) return;
    const res = await updateAdminFeedback(selectedItem.id, { status: newStatus });
    if (res.success) {
      loadData();
    }
  };

  const handlePriorityChange = async (newPriority) => {
    if (!selectedItem) return;
    const res = await updateAdminFeedback(selectedItem.id, { priority: Number(newPriority) });
    if (res.success) {
      loadData();
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedItem) return;
    const res = await updateAdminFeedback(selectedItem.id, { admin_notes: adminNotesInput });
    if (res.success) {
      alert("Admin notes saved.");
      loadData();
    }
  };

  const handleAddTag = async () => {
    if (!selectedItem || !newTagInput.trim()) return;
    const currentTags = selectedItem.tags || [];
    if (currentTags.includes(newTagInput.trim())) return;

    const updatedTags = [...currentTags, newTagInput.trim()];
    const res = await updateAdminFeedback(selectedItem.id, { tags: updatedTags });
    if (res.success) {
      setNewTagInput("");
      loadData();
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!selectedItem || !replyMessage.trim()) return;

    setReplySubmitting(true);
    const res = await addFeedbackReply({
      feedbackId: selectedItem.id,
      authorId: user?.id,
      message: replyMessage,
      isInternal: isInternalReply,
    });
    setReplySubmitting(false);

    if (res.success) {
      setReplyMessage("");
      loadData();
    } else {
      alert("Failed to send reply: " + res.error);
    }
  };

  const handleExportCSV = () => {
    const csvContent = exportFeedbackToCSV(items);
    if (!csvContent) return;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `feedback_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Metrics calculations
  const totalVolume = items.length;
  const ratingsWithValues = items.filter((i) => i.rating);
  const avgRating = ratingsWithValues.length
    ? (ratingsWithValues.reduce((acc, curr) => acc + curr.rating, 0) / ratingsWithValues.length).toFixed(1)
    : "N/A";

  const npsScores = items.filter((i) => i.nps_score !== null && i.nps_score !== undefined);
  let npsScore = "N/A";
  if (npsScores.length > 0) {
    const promoters = npsScores.filter((i) => i.nps_score >= 9).length;
    const detractors = npsScores.filter((i) => i.nps_score <= 6).length;
    npsScore = Math.round(((promoters - detractors) / npsScores.length) * 100);
  }

  const bugCount = items.filter((i) => i.type === FEEDBACK_TYPES.BUG).length;
  const ideaCount = items.filter((i) => i.type === FEEDBACK_TYPES.FEATURE_REQUEST).length;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <Inbox className="w-6 h-6 text-emerald-400" />
            <span>Feedback Admin Inbox</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Review user submissions, update status, respond to issues, and track feedback metrics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm flex items-center gap-2 shadow-lg shadow-emerald-900/20 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Volume</span>
          <div className="text-2xl font-bold text-slate-100">{totalVolume}</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Avg Rating</span>
          <div className="text-2xl font-bold text-amber-300">{avgRating} ★</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">NPS Score</span>
          <div className="text-2xl font-bold text-emerald-400">{npsScore}</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Bugs / Ideas</span>
          <div className="text-2xl font-bold text-slate-100">
            <span className="text-rose-400">{bugCount}</span> / <span className="text-amber-400">{ideaCount}</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row items-center gap-3 bg-slate-900/40 p-3 rounded-2xl border border-slate-800">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder="Search feedback text, email, or category..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
          />
        </div>

        <select
          value={filters.type}
          onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
          className="w-full md:w-auto px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs"
        >
          <option value="all">All Types</option>
          {Object.values(FEEDBACK_TYPES).map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          className="w-full md:w-auto px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs"
        >
          <option value="all">All Statuses</option>
          {Object.values(FEEDBACK_STATUSES).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={filters.rating}
          onChange={(e) => setFilters((f) => ({ ...f, rating: e.target.value }))}
          className="w-full md:w-auto px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs"
        >
          <option value="all">All Ratings</option>
          <option value="5">5 Stars</option>
          <option value="4">4 Stars</option>
          <option value="3">3 Stars</option>
          <option value="2">2 Stars</option>
          <option value="1">1 Star</option>
        </select>
      </div>

      {/* Main Grid: Inbox list + Detail View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Inbox list */}
        <div className="lg:col-span-5 space-y-3">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading inbox...</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-slate-500 bg-slate-900/30 rounded-2xl border border-slate-800 text-xs">
              No feedback items matching current filters.
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                onClick={() => handleSelectItem(item)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  selectedItem?.id === item.id
                    ? "bg-emerald-500/10 border-emerald-500/50 shadow-md"
                    : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex justify-between items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {item.type}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-slate-200 font-medium line-clamp-2 mb-2">
                  {item.message || "(No message text)"}
                </p>
                <div className="flex justify-between items-center text-[11px] text-slate-400">
                  <span className="font-semibold text-emerald-400">{item.status}</span>
                  {item.rating && <span className="text-amber-300">★ {item.rating}</span>}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detail view */}
        <div className="lg:col-span-7">
          {selectedItem ? (
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6 sticky top-20">
              {/* Item Header */}
              <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase px-2.5 py-0.5 rounded bg-slate-800 text-slate-200">
                      {selectedItem.type}
                    </span>
                    {selectedItem.rating && (
                      <span className="text-xs font-semibold text-amber-300">
                        ★ {selectedItem.rating}/5
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">
                    From: {selectedItem.email || "Anonymous"} | Screen: {selectedItem.screen || "/"}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedItem.priority || 3}
                    onChange={(e) => handlePriorityChange(e.target.value)}
                    className="px-3 py-1 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-semibold"
                    title="Priority"
                  >
                    <option value={1}>P1 - Urgent</option>
                    <option value={2}>P2 - High</option>
                    <option value={3}>P3 - Normal</option>
                    <option value={4}>P4 - Low</option>
                    <option value={5}>P5 - Trivial</option>
                  </select>
                  <select
                    value={selectedItem.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="px-3 py-1 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-semibold"
                  >
                    {Object.values(FEEDBACK_STATUSES).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Message text */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-slate-200 whitespace-pre-wrap">
                {selectedItem.message || "No detailed message provided."}
              </div>

              {/* Admin Notes & Tags */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Admin Notes (Internal)
                  </label>
                  <textarea
                    value={adminNotesInput}
                    onChange={(e) => setAdminNotesInput(e.target.value)}
                    rows={3}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    placeholder="Internal team notes..."
                  />
                  <button
                    onClick={handleSaveNotes}
                    className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                  >
                    Save Notes
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {(selectedItem.tags || []).map((tag, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[11px]">
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      placeholder="Add tag..."
                      className="flex-1 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200"
                    />
                    <button
                      onClick={handleAddTag}
                      className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Replies Section */}
              <div className="space-y-4 border-t border-slate-800 pt-4">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Conversation / Replies
                </h4>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(selectedItem.feedback_replies || []).map((reply) => (
                    <div
                      key={reply.id}
                      className={`p-3 rounded-xl border text-xs space-y-1 ${
                        reply.is_internal
                          ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
                          : "bg-slate-950 border-slate-800 text-slate-200"
                      }`}
                    >
                      <div className="flex justify-between items-center text-[10px] text-slate-400">
                        <span className="font-semibold">
                          {reply.is_internal ? "Internal Note" : "Public Reply"}
                        </span>
                        <span>{new Date(reply.created_at).toLocaleDateString()}</span>
                      </div>
                      <p>{reply.message}</p>
                    </div>
                  ))}
                </div>

                {/* Reply Form */}
                <form onSubmit={handleSendReply} className="space-y-3 pt-2">
                  <textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    rows={2}
                    placeholder="Write a response to the user..."
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                  />
                  <div className="flex justify-between items-center">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400">
                      <input
                        type="checkbox"
                        checked={isInternalReply}
                        onChange={(e) => setIsInternalReply(e.target.checked)}
                        className="accent-emerald-500"
                      />
                      <span>Internal staff note only</span>
                    </label>

                    <button
                      type="submit"
                      disabled={replySubmitting || !replyMessage.trim()}
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Response</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-slate-900/30 rounded-2xl border border-slate-800 text-slate-500 text-xs">
              Select a feedback item from the list to view details and reply.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
