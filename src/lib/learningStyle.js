/**
 * Resolves learning style strategy guidance based on onboarding learning style preference.
 * Supported onboarding options: "Explanations", "Practice questions", "Examples", "Quizzes", "Step-by-step",
 * as well as legacy/alternative options ("Visual", "Practice first", "Conversation").
 * Accepts string or array of strings (from onboarding multi-select).
 *
 * @param {string | string[] | null | undefined} rawStyle - Raw learning style from profile
 * @returns {{ label: string, strategy: string }}
 */
export function getLearningStyleSuggestion(rawStyle) {
  let styleToEvaluate = rawStyle;

  if (Array.isArray(rawStyle)) {
    if (rawStyle.length === 0) {
      styleToEvaluate = null;
    } else {
      styleToEvaluate = rawStyle[0];
    }
  }

  if (typeof styleToEvaluate !== "string" || !styleToEvaluate.trim()) {
    return {
      label: "Adaptable Learner",
      strategy: "a balanced combination of visual summaries, step-by-step practice, and active recall review",
    };
  }

  const normalized = styleToEvaluate.trim().toLowerCase();

  switch (normalized) {
    case "explanations":
    case "explanation":
      return {
        label: "Concept-First Learner",
        strategy: "clear foundational explanations and structured core concepts before diving into problems",
      };
    case "practice questions":
    case "practice-questions":
    case "practice first":
    case "practice-first":
      return {
        label: "Practice-First Learner",
        strategy: "immediate problem sets and active recall drills before reviewing theory",
      };
    case "examples":
    case "worked examples":
      return {
        label: "Example-Driven Learner",
        strategy: "real-world worked examples and practical demonstrations to illustrate key ideas",
      };
    case "quizzes":
    case "quiz":
      return {
        label: "Quiz-Focused Learner",
        strategy: "frequent low-stakes micro-quizzes and knowledge checks to reinforce memory retention",
      };
    case "step-by-step":
    case "step by step":
      return {
        label: "Step-by-Step Learner",
        strategy: "breaking complex topics into progressive, structured bite-sized steps",
      };
    case "visual":
      return {
        label: "Visual Learner",
        strategy: "diagrams, mind maps, and structured visual cards to lock in concepts quickly",
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
