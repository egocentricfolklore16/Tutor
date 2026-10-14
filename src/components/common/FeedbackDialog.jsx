import { useState } from "react";
import ResponsiveSheet from "./ResponsiveSheet";

function FeedbackDialog({ open, onClose, onLogout }) {
  const [reason, setReason] = useState("Taking a break");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submitFeedback = (event) => {
    event.preventDefault();
    const feedback = { reason, message: message.trim(), createdAt: new Date().toISOString() };
    let existing = [];
    const KEY = "hyper-tutor-feedback";
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          existing = parsed;
        } else {
          console.error(`Invalid feedback history shape in localStorage key '${KEY}'. Clearing key.`);
          localStorage.removeItem(KEY);
        }
      }
    } catch (err) {
      console.error(`Error parsing JSON from localStorage key '${KEY}':`, err);
      try {
        localStorage.removeItem(KEY);
      } catch (e) {
        // ignore
      }
    }
    localStorage.setItem(KEY, JSON.stringify([feedback, ...existing].slice(0, 25)));
    setSubmitted(true);
  };

  return (
    <ResponsiveSheet
      isOpen={open}
      onClose={onClose}
      title="Before you go"
      maxWidth="max-w-md"
      footer={
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 w-full">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Close
          </button>
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
            >
              Log out anyway
            </button>
          )}
        </div>
      }
    >
      <div className="w-full text-center">
        <img
          src="/logo4-removebg-preview.png"
          alt="Lumo mascot looking sad"
          className="mx-auto mb-3 h-36 w-36 object-contain sm:h-44 sm:w-44"
        />
        <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
          We would love to keep helping you learn. Please tell us what would make Hyper Tutor better before you leave.
        </p>
      </div>

      {submitted ? (
        <div
          role="status"
          aria-live="polite"
          className="mt-4 rounded-2xl bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
        >
          Thanks for helping us improve Hyper Tutor.
        </div>
      ) : (
        <form onSubmit={submitFeedback} className="mt-4 space-y-3">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            What is the main reason you are leaving?
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-[#18211f] dark:text-white"
            >
              <option>Taking a break</option>
              <option>Not finding what I need</option>
              <option>Something is not working</option>
              <option>Other</option>
            </select>
          </label>

          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            How can we improve?
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={3}
              placeholder="Share your thoughts..."
              className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-[#18211f] dark:text-white"
            />
          </label>

          <button
            type="submit"
            className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"
          >
            Send feedback
          </button>
        </form>
      )}
    </ResponsiveSheet>
  );
}

export default FeedbackDialog;
