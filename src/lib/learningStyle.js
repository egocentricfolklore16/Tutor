/**
 * Resolves learning style strategy guidance based on onboarding learning style preference.
 * Supported onboarding options: "Visual", "Practice first", "Step-by-step", "Conversation".
 *
 * @param {string | null | undefined} rawStyle - Raw learning style from profile
 * @returns {{ label: string, strategy: string }}
 */
export function getLearningStyleSuggestion(rawStyle) {
  if (typeof rawStyle !== "string" || !rawStyle.trim()) {
    return {
      label: "Adaptable Learner",
      strategy: "a balanced combination of visual summaries, step-by-step practice, and active recall review",
    };
  }

  const normalized = rawStyle.trim().toLowerCase();

  switch (normalized) {
    case "visual":
      return {
        label: "Visual Learner",
        strategy: "diagrams, mind maps, and structured visual cards to lock in concepts quickly",
      };
    case "practice first":
    case "practice-first":
      return {
        label: "Practice-First Learner",
        strategy: "immediate problem sets and active recall drills before reviewing theory",
      };
    case "step-by-step":
    case "step by step":
      return {
        label: "Step-by-Step Learner",
        strategy: "breaking complex topics into progressive, structured bite-sized steps",
      };
    case "conversation":
    case "conversational":
      return {
        label: "Conversational Learner",
        strategy: "interactive Q&A dialogue and discussion-driven practice questions",
      };
    default:
      return {
        label: "Adaptable Learner",
        strategy: "a balanced combination of visual summaries, step-by-step practice, and active recall review",
      };
  }
}
