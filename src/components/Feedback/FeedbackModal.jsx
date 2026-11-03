import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, Sparkles, AlertCircle, CheckCircle2, Shield, Paperclip } from "lucide-react";
import ResponsiveSheet from "../common/ResponsiveSheet";
import {
  FEEDBACK_TYPES,
  submitFeedback,
  getFeedbackDraft,
  saveFeedbackDraft,
  clearFeedbackDraft,
  checkRateLimit,
} from "../../lib/feedback";

const TYPE_OPTIONS = [
  { value: FEEDBACK_TYPES.GENERAL, label: "General", emoji: "💭", desc: "General thoughts or suggestions" },
  { value: FEEDBACK_TYPES.BUG, label: "Bug", emoji: "🐛", desc: "Something isn't working as expected" },
  { value: FEEDBACK_TYPES.FEATURE_REQUEST, label: "Idea / Feature", emoji: "💡", desc: "A feature you would love to see" },
  { value: FEEDBACK_TYPES.CONTENT_QUALITY, label: "Content Issue", emoji: "📚", desc: "Issue with quiz, lesson, or tutor response" },
];

const EMOJI_RATINGS = [
  { value: 1, emoji: "😖", label: "Poor" },
  { value: 2, emoji: "🙁", label: "Fair" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "😍", label: "Great" },
];

export default function FeedbackModal({ isOpen, onClose, user, initialType = FEEDBACK_TYPES.GENERAL, context = {} }) {
  const [type, setType] = useState(initialType);
  const [rating, setRating] = useState(null);
  const [message, setMessage] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [allowContact, setAllowContact] = useState(true);
  const [isPublic, setIsPublic] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submittedReward, setSubmittedReward] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState({ allowed: true, remaining: 5 });

  const hasLoadedDraftRef = useRef(false);

  useEffect(() => {
    if (isOpen && !hasLoadedDraftRef.current) {
      hasLoadedDraftRef.current = true;
      setRateLimitInfo(checkRateLimit());
      const draft = getFeedbackDraft();
      if (draft) {
        if (draft.type) setType(draft.type);
        if (draft.rating) setRating(draft.rating);
        if (draft.message) setMessage(draft.message);
        if (draft.email) setEmail(draft.email);
        if (draft.allow_contact !== undefined) setAllowContact(draft.allow_contact);
      }
    } else if (!isOpen) {
      hasLoadedDraftRef.current = false;
    }
  }, [isOpen]);

  const handleMessageChange = (e) => {
    const val = e.target.value;
    setMessage(val);
    saveFeedbackDraft({
      type,
      rating,
      message: val,
      email,
      allow_contact: allowContact,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() && !rating) {
      setError("Please select a rating or provide a message.");
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      user_id: user?.id || null,
      type,
      rating,
      message,
      attachment_url: attachmentUrl,
      email,
      allow_contact: allowContact,
      is_public: type === FEEDBACK_TYPES.FEATURE_REQUEST ? isPublic : false,
      context,
    };

    const res = await submitFeedback(payload, context);
    setLoading(false);

    if (res.success) {
      setIsSuccess(true);
      if (res.reward?.granted) {
        setSubmittedReward(res.reward);
      }
      clearFeedbackDraft();
    } else {
      setError(res.error || "Failed to send feedback. Please try again.");
    }
  };

  const handleResetAndClose = () => {
    setIsSuccess(false);
    setSubmittedReward(null);
    setMessage("");
    setRating(null);
    setError(null);
    onClose();
  };

  return (
    <ResponsiveSheet isOpen={isOpen} onClose={handleResetAndClose} title="Give Feedback">
      <div className="p-1">
        {isSuccess ? (
          <div className="py-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-slate-100">Thank You!</h3>
            <p className="text-slate-300 max-w-sm mx-auto text-sm">
              Your feedback helps us make Hyper Tutor better for everyone.
            </p>

            {submittedReward && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 font-semibold text-sm">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>+10 XP Earned for your feedback!</span>
              </div>
            )}

            <div className="pt-4">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {!rateLimitInfo.allowed && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Rate limit reached. Please wait a few minutes before submitting.</span>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Type Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Feedback Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setType(opt.value)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                      type === opt.value
                        ? "bg-emerald-500/20 border-emerald-500 text-slate-100"
                        : "bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    <span className="text-lg">{opt.emoji}</span>
                    <div>
                      <div className="text-xs font-semibold">{opt.label}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 1-5 Emoji Rating */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                How is your experience?
              </label>
              <div className="flex justify-between items-center bg-slate-900/50 p-2 rounded-xl border border-slate-800">
                {EMOJI_RATINGS.map((rate) => (
                  <button
                    key={rate.value}
                    type="button"
                    onClick={() => setRating(rating === rate.value ? null : rate.value)}
                    className={`p-2.5 rounded-xl transition-all flex flex-col items-center gap-1 ${
                      rating === rate.value
                        ? "bg-emerald-500/30 scale-110 text-slate-100 ring-2 ring-emerald-500"
                        : "hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span className="text-2xl">{rate.emoji}</span>
                    <span className="text-[10px] font-medium">{rate.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Message Input */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Message
                </label>
                <span className="text-[10px] text-slate-500">{message.length}/3000</span>
              </div>
              <textarea
                value={message}
                onChange={handleMessageChange}
                rows={4}
                maxLength={3000}
                placeholder="Tell us what you love, what broke, or what we should build next..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm resize-none"
              />
            </div>

            {/* Optional Attachment URL */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Optional Screenshot URL / Link
              </label>
              <div className="relative">
                <Paperclip className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="url"
                  value={attachmentUrl}
                  onChange={(e) => setAttachmentUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                />
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-3 pt-1 border-t border-slate-800/80">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs text-slate-300 font-medium">OK to contact me about this feedback</span>
                <input
                  type="checkbox"
                  checked={allowContact}
                  onChange={(e) => setAllowContact(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 rounded border-slate-700 bg-slate-900"
                />
              </label>

              {type === FEEDBACK_TYPES.FEATURE_REQUEST && (
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-slate-300 font-medium">
                    Publish to Public Roadmap for community voting
                  </span>
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 rounded border-slate-700 bg-slate-900"
                  />
                </label>
              )}
            </div>

            {/* Auto Capture Info */}
            <div className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/60 flex items-center gap-2 text-[11px] text-slate-400">
              <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Auto-capturing current screen route, browser, and device diagnostic details.</span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !rateLimitInfo.allowed}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Feedback</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </ResponsiveSheet>
  );
}
