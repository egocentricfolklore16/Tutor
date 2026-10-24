import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchActivePrompts,
  fetchUserFeedbackState,
  checkPromptEligibility,
  logPromptEvent,
  submitFeedback,
  FEEDBACK_TYPES,
} from "../lib/feedback";

let sessionPromptCount = 0; // In-memory session tracking

export function useFeedbackPrompts(user) {
  const [prompts, setPrompts] = useState([]);
  const [userState, setUserState] = useState(null);
  const [activePrompt, setActivePrompt] = useState(null);
  const [loading, setLoading] = useState(true);

  const userId = user?.id || null;
  const userRef = useRef(user);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Load prompts & user feedback state
  useEffect(() => {
    let mounted = true;

    async function loadData() {
      setLoading(true);
      const [allPrompts, stateData] = await Promise.all([
        fetchActivePrompts(),
        userId ? fetchUserFeedbackState(userId) : null,
      ]);

      if (!mounted) return;

      setPrompts(allPrompts);
      setUserState(stateData);
      setLoading(false);
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, [userId]);

  // Trigger evaluation helper
  const evaluateTrigger = useCallback(
    (triggerType, customContext = {}) => {
      if (!userId || sessionPromptCount > 0 || activePrompt) return null;

      const candidate = prompts.find((p) => p.trigger_type === triggerType);
      if (!candidate) return null;

      const eligibility = checkPromptEligibility({
        prompt: candidate,
        userState,
        sessionPromptedThisSession: sessionPromptCount > 0,
      });

      if (eligibility.eligible) {
        sessionPromptCount += 1;
        setActivePrompt(candidate);

        // Log 'shown' event
        logPromptEvent({
          userId,
          promptId: candidate.id,
          action: "shown",
        });

        return candidate;
      }

      return null;
    },
    [userId, prompts, userState, activePrompt]
  );

  // Auto-trigger NPS / days_since_signup check
  useEffect(() => {
    if (!userId || loading || activePrompt) return;

    // Check NPS or days_since_signup prompt
    const npsPrompt = prompts.find((p) => p.type === FEEDBACK_TYPES.NPS || p.key === "nps_day7");
    if (npsPrompt) {
      const eligibility = checkPromptEligibility({
        prompt: npsPrompt,
        userState,
        sessionPromptedThisSession: sessionPromptCount > 0,
      });

      if (eligibility.eligible) {
        sessionPromptCount += 1;
        setActivePrompt(npsPrompt);
        logPromptEvent({
          userId,
          promptId: npsPrompt.id,
          action: "shown",
        });
      }
    }
  }, [userId, loading, prompts, userState, activePrompt]);

  // Event handler for submitting feedback from a prompt
  const handlePromptSubmit = async ({ rating, nps_score, message }) => {
    if (!activePrompt || !userId) return;

    const res = await submitFeedback({
      user_id: userId,
      type: activePrompt.type || FEEDBACK_TYPES.GENERAL,
      rating: rating || null,
      nps_score: nps_score ?? null,
      message: message || null,
      category: activePrompt.key,
      context: { prompt_id: activePrompt.id, trigger_type: activePrompt.trigger_type },
    });

    if (res.success) {
      await logPromptEvent({
        userId,
        promptId: activePrompt.id,
        action: "submitted",
        feedbackId: res.data?.id,
      });
      setActivePrompt(null);
    }

    return res;
  };

  // Event handler for snoozing prompt ("Maybe later")
  const snoozePrompt = async () => {
    if (!activePrompt || !userId) return;

    await logPromptEvent({
      userId,
      promptId: activePrompt.id,
      action: "snoozed",
    });

    setActivePrompt(null);
  };

  // Event handler for dismissing prompt
  const dismissPrompt = async () => {
    if (!activePrompt || !userId) return;

    await logPromptEvent({
      userId,
      promptId: activePrompt.id,
      action: "dismissed",
      currentDismissedCount: userState?.total_dismissed || 0,
    });

    setActivePrompt(null);
  };

  return {
    activePrompt,
    evaluateTrigger,
    handlePromptSubmit,
    snoozePrompt,
    dismissPrompt,
    loading,
  };
}
