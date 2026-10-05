import { X } from "lucide-react";
import { useState } from "react";

function FeedbackDialog({ open, onClose, onLogout }) {
  const [reason, setReason] = useState("Taking a break");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!open) return null;

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
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="feedback-dialog-title" className="motion-dialog w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 text-slate-900 dark:text-slate-100 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="w-full text-center"><img src="/logo4-removebg-preview.png" alt="Lumo mascot looking sad" className="mx-auto mb-3 h-40 w-40 object-contain sm:h-52 sm:w-52" /><h2 id="feedback-dialog-title" className="text-2xl font-black">Before you go</h2><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">We would love to keep helping you learn. Please tell us what would make Hyper Tutor better before you leave.</p></div>
          <button type="button" onClick={onClose} title="Close feedback" className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200"><X size={18} /></button>
        </div>
        {submitted ? <div className="mt-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 p-4 text-sm font-semibold text-emerald-800 dark:text-emerald-200">Thanks for helping us improve Hyper Tutor.</div> : <form onSubmit={submitFeedback} className="mt-6 space-y-4"><label className="block text-sm font-semibold">What is the main reason you are leaving?<select value={reason} onChange={(event) => setReason(event.target.value)} className="mt-2 w-full rounded-xl border-0 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-3 font-normal outline-none focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900/40"><option>Taking a break</option><option>Not finding what I need</option><option>Something is not working</option><option>Other</option></select></label><label className="block text-sm font-semibold">How can we improve?<textarea value={message} onChange={(event) => setMessage(event.target.value)} rows="4" placeholder="Share your thoughts..." className="mt-2 w-full resize-none rounded-xl border-0 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-3 font-normal outline-none focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900/40" /></label><button type="submit" className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white hover:bg-emerald-700">Send feedback</button></form>}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">Close</button>{onLogout && <button type="button" onClick={onLogout} className="rounded-xl px-4 py-3 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40">Log out anyway</button>}</div>
      </section>
    </div>
  );
}

export default FeedbackDialog;
