import React, { useState } from "react";
import { Send, Loader2, Lock } from "lucide-react";
import ResponsiveSheet from "../../../../components/common/ResponsiveSheet";

export default function RequestJoinModal({ isOpen, onClose, groupName, onSubmit, submitting }) {
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSubmit(message.trim());
    setMessage("");
  };

  return (
    <ResponsiveSheet
      isOpen={isOpen}
      onClose={onClose}
      title={`Request to Join ${groupName}`}
      maxWidth="max-w-md"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 shadow-button-primary"
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            <span>Send Request</span>
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Introduce yourself to the group owner (optional):
          </p>
        </div>

        <div className="relative">
          <textarea
            rows={3}
            maxLength={200}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Hi! I'm studying Calculus this term and would love to join your study sessions..."
            className="w-full rounded-xl bg-slate-50 p-3 text-xs text-slate-900 outline-none shadow-inset-field focus:shadow-focus dark:bg-[#18211f] dark:text-white"
          />
          <span className="absolute bottom-2 right-2 text-[10px] font-semibold text-slate-400">
            {message.length}/200
          </span>
        </div>
      </form>
    </ResponsiveSheet>
  );
}
