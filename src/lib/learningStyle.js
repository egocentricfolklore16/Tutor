export const LEARNING_STYLE_OPTIONS = [
  "Explanations",
  "Practice questions",
  "Examples",
  "Quizzes",
  "Step-by-step",
];

const STYLE_MAP = {
  explanations: {
    label: "Concept-First Learner",
    strategy: "deep explanatory breakdowns, intuitive analogies, and conceptual intuition",
  },
  "practice questions": {
    label: "Practice-First Learner",
    strategy: "immediate problem sets and active recall drills before reviewing theory",
  },
  "practice first": {
    label: "Practice-First Learner",
    strategy: "immediate problem sets and active recall drills before reviewing theory",
  },
  "practice-first": {
    label: "Practice-First Learner",
    strategy: "immediate problem sets and active recall drills before reviewing theory",
  },
  examples: {
    label: "Example-Driven Learner",
    strategy: "worked examples, real-world models, and concrete walkthroughs to grasp core concepts",
  },
  quizzes: {
    label: "Quiz-Focused Learner",
    strategy: "rapid self-testing, low-stakes checkpoint quizzes, and flashcard recall",
  },
  "step-by-step": {
    label: "Step-by-Step Learner",
    strategy: "breaking complex topics into progressive, structured bite-sized steps",
  },
  "step by step": {
    label: "Step-by-Step Learner",
    strategy: "breaking complex topics into progressive, structured bite-sized steps",
  },
  visual: {
    label: "Visual Learner",
    strategy: "diagrams, mind maps, and structured visual cards to lock in concepts quickly",
  },
  conversation: {
    label: "Conversational Learner",
    strategy: "interactive Q&A dialogue and discussion-driven practice questions",
  },
  conversational: {
    label: "Conversational Learner",
    strategy: "interactive Q&A dialogue and discussion-driven practice questions",
  },
};

const DEFAULT_SUGGESTION = {
  label: "Adaptable Learner",
  strategy: "a balanced combination of visual summaries, step-by-step practice, and active recall review",
};

/**
 * Normalizes learning style preference from profile (string or string array) to an active choice.
 *
 * @param {string | string[] | null | undefined} rawStyle
 * @returns {string}
 */
export function resolveLearningStyleFromProfile(rawStyle) {
  if (Array.isArray(rawStyle)) {
    for (const item of rawStyle) {
      if (typeof item === "string" && item.trim()) {
        const found = LEARNING_STYLE_OPTIONS.find(
          (opt) => opt.toLowerCase() === item.trim().toLowerCase()
        );
        if (found) return found;
      }
    }
  } else if (typeof rawStyle === "string" && rawStyle.trim()) {
    const clean = rawStyle.trim().toLowerCase();
    const found = LEARNING_STYLE_OPTIONS.find(
      (opt) => opt.toLowerCase() === clean
    );
    if (found) return found;
    if (clean.includes("practice")) return "Practice questions";
    if (clean.includes("step")) return "Step-by-step";
    if (clean.includes("visual")) return "Examples";
    if (clean.includes("conversation")) return "Explanations";
  }
  return "Step-by-step";
}

/**
 * Resolves learning style strategy guidance based on onboarding learning style preference.
 * Supports string or string array inputs from onboarding multi-select.
 *
 * @param {string | string[] | null | undefined} rawStyle - Raw learning style from profile
 * @returns {{ label: string, strategy: string }}
 */
export function getLearningStyleSuggestion(rawStyle) {
  let candidate = "";
  if (Array.isArray(rawStyle)) {
    candidate = rawStyle.find((s) => typeof s === "string" && s.trim()) || "";
  } else if (typeof rawStyle === "string") {
    candidate = rawStyle;
  }

  if (!candidate || !candidate.trim()) {
    return DEFAULT_SUGGESTION;
  }

  const normalized = candidate.trim().toLowerCase();
  return STYLE_MAP[normalized] || DEFAULT_SUGGESTION;
}
