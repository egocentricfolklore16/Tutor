import React, { useState } from "react";
import { Sparkles, Check, X, Loader2, AlertCircle } from "lucide-react";
import supabase from "../../lib/supabase";
import { useProfile } from "../../app/ProfileContext";

export default function ChooseUsernameCard() {
  const { profile, refetchProfile } = useProfile();
  const [usernameInput, setUsernameInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem("hyper_tutor_username_card_dismissed") === "true";
  });

  // Don't render if user already has a set username or if dismissed
  if (!profile || profile.username || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    localStorage.setItem("hyper_tutor_username_card_dismissed", "true");
    setDismissed(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const cleaned = usernameInput.trim().toLowerCase();

    if (!cleaned) {
      setErrorMsg("Please enter a username.");
      return;
    }

    const validRegex = /^[a-z0-9_]{3,20}$/;
    if (!validRegex.test(cleaned)) {
      setErrorMsg("Username must be 3-20 characters using lowercase letters, numbers, or underscores.");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthenticated");

      const { error } = await supabase
        .from("profiles")
        .update({ username: cleaned })
        .eq("user_id", user.id);

      if (error) {
        if (
          error.code === "23505" ||
          error.message?.toLowerCase().includes("unique") ||
          error.message?.toLowerCase().includes("duplicate") ||
          error.message?.toLowerCase().includes("already exists")
        ) {
          throw new Error("That username is already taken. Please pick another one.");
        }
        throw new Error(error.message || "Failed to set username.");
      }

      setSuccessMsg("Username set successfully!");
      if (refetchProfile) await refetchProfile();
      setTimeout(() => {
        handleDismiss();
      }, 1500);
    } catch (err) {
      setErrorMsg(err.message || "Could not set username. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-emerald-300/80 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/5 p-5 shadow-sm dark:border-emerald-800/60 dark:bg-emerald-950/20 mb-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
          <Sparkles className="h-5 w-5 shrink-0" />
          <span>Choose Your Unique Handle</span>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-full p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
          title="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
        Personalize your profile on the community leaderboards and chats by setting a username.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">@</span>
          <input
            type="text"
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value.toLowerCase())}
            placeholder="username_123"
            maxLength={20}
            className="w-full rounded-2xl border border-slate-200 bg-white py-2 pl-8 pr-4 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-[#14171c] dark:text-white"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !usernameInput.trim()}
          className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 shrink-0 min-h-[38px]"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          <span>Set Username</span>
        </button>
      </form>

      {errorMsg && (
        <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <Check className="h-3.5 w-3.5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
    </div>
  );
}
