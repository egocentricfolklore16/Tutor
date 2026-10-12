import React, { useState } from "react";
import { X, Send, Loader2, AlertCircle, Eye, Edit3 } from "lucide-react";
import supabase from "../../lib/supabase";

export default function AskQuestionModal({ user, userSubjects = [], onClose, onSuccess }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [subject, setSubject] = useState(userSubjects[0] || "General Study");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState([]);

  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleAddTag = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const cleaned = tagInput.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
      if (cleaned && tags.length < 5 && !tags.includes(cleaned)) {
        setTags([...tags, cleaned]);
        setTagInput("");
      }
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!user?.id) {
      setErrorMsg("You must be logged in to ask a question.");
      return;
    }

    const cleanTitle = title.trim();
    const cleanBody = body.trim();

    if (cleanTitle.length < 5 || cleanTitle.length > 200) {
      setErrorMsg("Title must be between 5 and 200 characters.");
      return;
    }

    if (!cleanBody) {
      setErrorMsg("Please provide question details.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("forum_posts")
        .insert({
          title: cleanTitle,
          body: cleanBody,
          subject,
          tags,
          user_id: user.id,
        })
        .select("id")
        .single();

      if (error) {
        if (
          error.message?.toLowerCase().includes("fast") ||
          error.message?.toLowerCase().includes("rate limit")
        ) {
          throw new Error("You are posting too fast. Please wait a moment before trying again.");
        }
        throw new Error(error.message || "Failed to post question.");
      }

      onSuccess(data.id);
    } catch (err) {
      console.error("Error asking question:", err);
      setErrorMsg(err.message || "Failed to submit question.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#14171c]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-slate-900 dark:text-white">
            Ask a Community Question
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Title (5-200 characters)
            </label>
            <input
              type="text"
              required
              minLength={5}
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. How do I evaluate the integral of x * e^x?"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-[#18211f] dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Subject
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Calculus, Physics, Biology"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-[#18211f] dark:text-white"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Question Details (Markdown supported)
              </label>

              <button
                type="button"
                onClick={() => setPreview(!preview)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:underline dark:text-emerald-400"
              >
                {preview ? <Edit3 className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                <span>{preview ? "Edit" : "Preview"}</span>
              </button>
            </div>

            {preview ? (
              <div className="min-h-[120px] rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800 dark:border-slate-700 dark:bg-[#18211f] dark:text-slate-200 whitespace-pre-wrap">
                {body || "Nothing to preview yet."}
              </div>
            ) : (
              <textarea
                required
                maxLength={10000}
                rows={5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Explain what you have tried so far and where you are stuck..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-[#18211f] dark:text-white"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tags (Up to 5)
            </label>

            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-xl bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-rose-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>

            {tags.length < 5 && (
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="Type tag and press Enter or comma..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-[#18211f] dark:text-white"
              />
            )}
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 dark:text-rose-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl bg-slate-200 px-4 py-2 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              <span>Post Question</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
