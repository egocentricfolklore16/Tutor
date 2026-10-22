import React, { useState } from "react";
import { Flag, Loader2, CheckCircle } from "lucide-react";
import { submitCommunityReport } from "../../services/reportsService";
import Modal from "../../../../components/common/ResponsiveSheet";

export function ReportDialog({ isOpen, onClose, reporterId, targetType, targetId, targetName }) {
  const [reason, setReason] = useState("inappropriate_content");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reporterId || !targetType || !targetId) return;

    setLoading(true);
    setError(null);

    try {
      await submitCommunityReport({
        reporterId,
        targetType,
        targetId,
        reason,
        details,
      });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 2000);
    } catch (err) {
      setError(err?.message || "Failed to submit report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
          <Flag className="h-4 w-4" />
          <span>Report Content or User</span>
        </div>
      }
      maxWidth="max-w-md"
      closeOnOverlayClick={false}
    >
      {submitted ? (
        <div className="py-8 text-center space-y-2">
          <CheckCircle className="mx-auto h-10 w-10 text-emerald-500" />
          <p className="text-sm font-bold text-slate-900 dark:text-white">Report Submitted</p>
          <p className="text-xs text-slate-500">Thank you for helping keep the community safe.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Reporting: <strong className="text-slate-900 dark:text-white">{targetName || targetType}</strong>
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Reason for report
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl bg-slate-50 p-2.5 text-xs text-slate-900 shadow-inset-field dark:bg-[#18211f] dark:text-white outline-none"
            >
              <option value="inappropriate_content">Inappropriate content or language</option>
              <option value="harassment">Harassment or bullying</option>
              <option value="spam">Spam or misleading information</option>
              <option value="impersonation">Impersonation or fake account</option>
              <option value="other">Other issue</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Additional Details (optional)
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              placeholder="Describe what happened..."
              className="w-full rounded-xl bg-slate-50 p-2.5 text-xs text-slate-900 shadow-inset-field focus:shadow-focus dark:bg-[#18211f] dark:text-white outline-none"
            />
          </div>

          {error && <p className="text-xs font-bold text-rose-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Submit Report</span>
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
