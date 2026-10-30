/**
 * Resolves initial learning style string from a user profile object or value.
 * Handles array, stringified array, or string.
 *
 * @param {object | string | Array | null | undefined} profileOrStyle
 * @returns {string}
 */
export function resolveLearningStyleFromProfile(profileOrStyle) {
  let styleVal = profileOrStyle;
  if (profileOrStyle && typeof profileOrStyle === "object" && !Array.isArray(profileOrStyle)) {
    styleVal = profileOrStyle.learning_style;
  }

  if (Array.isArray(styleVal)) {
    const firstStr = styleVal.find((item) => typeof item === "string" && item.trim());
    return firstStr ? firstStr.trim() : "";
  }

  if (typeof styleVal === "string" && styleVal.trim()) {
    const trimmed = styleVal.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          const firstParsed = parsed.find((item) => typeof item === "string" && item.trim());
          if (firstParsed) return firstParsed.trim();
        }
      } catch {
        // Ignore JSON parse error and fallback
      }
    }
    return trimmed;
  }

  return "";
}

/**
 * Resolves learning style strategy guidance based on onboarding or settings learning style preference.
 * Supported onboarding choices: "Explanations", "Practice questions", "Examples", "Quizzes", "Step-by-step".
 * Supported legacy options: "Visual", "Practice first", "Conversation".
 *
 * @param {string | Array | null | undefined} rawStyle - Raw learning style from profile
 * @returns {{ label: string, strategy: string }}
 */
export function getLearningStyleSuggestion(rawStyle) {
  const resolved = resolveLearningStyleFromProfile(rawStyle);
  if (!resolved) {
    return {
      label: "Adaptable Learner",
      strategy: "a balanced combination of visual summaries, step-by-step practice, and active recall review",
    };
  }

  const normalized = resolved.toLowerCase();

  switch (normalized) {
    case "explanations":
    case "explanation":
      return {
        label: "Explanation-Focused Learner",
        strategy: "detailed conceptual breakdowns and clear foundational explanations",
      };
    case "practice questions":
    case "practice question":
    case "practice first":
    case "practice-first":
      return {
        label: "Practice-First Learner",
        strategy: "immediate problem sets and active recall drills before reviewing theory",
      };
    case "examples":
    case "example":
      return {
        label: "Example-Driven Learner",
        strategy: "worked examples, real-world case studies, and concrete applications",
      };
    case "quizzes":
    case "quiz":
      return {
        label: "Quiz-Focused Learner",
        strategy: "quick self-assessment quizzes and retrieval practice drills",
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
