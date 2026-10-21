import React, { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";

export default function CreateGroupModal({ isOpen, onClose, onCreateGroup, loading, userSubjects = [] }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [privacy, setPrivacy] = useState("public");

  useEffect(() => {
    if (isOpen) {
      setName("");
      setDescription("");
      setSubject(Array.isArray(userSubjects) && userSubjects.length > 0 ? userSubjects[0] : "");
      setPrivacy("public");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !subject.trim()) return;
    onCreateGroup({
      name: name.trim(),
      description: description.trim(),
      subject: subject.trim(),
      privacy,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-overlay dark:bg-[#14171c]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-group-title"
      >
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3 dark:border-slate-800">
          <p id="create-group-title" className="text-lg font-bold text-slate-900 dark:text-white">
            Create New Study Group
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close create group dialog"
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Group Name *
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Calculus Champions"
              className="w-full rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 shadow-inset-field focus:shadow-focus dark:bg-[#18211f] dark:text-white outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Subject *
            </label>
            <input
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Mathematics"
              className="w-full rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 shadow-inset-field focus:shadow-focus dark:bg-[#18211f] dark:text-white outline-none"
            />
            {Array.isArray(userSubjects) && userSubjects.length > 0 && (
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Your subjects:</span>
                {userSubjects.map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setSubject(sub)}
                    className={`rounded-lg px-2 py-0.5 text-[11px] font-semibold transition ${
                      subject === sub
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-[#18211f] dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will this group work on?"
              rows={3}
              className="w-full rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 shadow-inset-field focus:shadow-focus dark:bg-[#18211f] dark:text-white outline-none"
            />
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="radio"
                name="privacy"
                value="public"
                checked={privacy === "public"}
                onChange={() => setPrivacy("public")}
                className="accent-emerald-600"
              />
              <span>Public (anyone can join)</span>
            </label>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="radio"
                name="privacy"
                value="private"
                checked={privacy === "private"}
                onChange={() => setPrivacy("private")}
                className="accent-emerald-600"
              />
              <span>Private (requires owner approval)</span>
            </label>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 shadow-button-primary"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Create Group</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
