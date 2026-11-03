/**
 * Lumo Ready-Made Prompts Configuration
 *
 * Easy to edit config file for Lumo AI assistant ready-made prompt suggestions.
 * To add a new prompt or category:
 * 1. Add a category object to LUMO_CATEGORIES if creating a new category.
 * 2. Add prompt object(s) to LUMO_PROMPTS array.
 *    - `text`: Prompt text. Placeholders like `[topic]` will fill the input box for user editing.
 *              Prompts without `[...]` placeholders send immediately on tap.
 */

export const LUMO_CATEGORIES = [
  { id: 'explain', label: 'Explain', description: 'Break down complex topics simply' },
  { id: 'practice', label: 'Practice', description: 'Test your knowledge & practice' },
  { id: 'study_plan', label: 'Study Plan', description: 'Schedule & structure study time' },
  { id: 'summarize', label: 'Summarize', description: 'Synthesize notes & key points' },
  { id: 'exam_help', label: 'Exam Help', description: 'Past questions & worked solutions' },
];

export const LUMO_PROMPTS = [
  // Explain
  {
    id: 'exp-1',
    category: 'explain',
    label: 'Explain simply',
    text: 'Explain [topic] simply, then give a real-life example.',
  },
  {
    id: 'exp-2',
    category: 'explain',
    label: 'Step-by-step breakdown',
    text: 'Break down [topic/concept] into simple step-by-step components.',
  },
  {
    id: 'exp-3',
    category: 'explain',
    label: 'Analogy explanation',
    text: 'Explain [topic] using an everyday analogy so I can remember it easily.',
  },
  {
    id: 'exp-4',
    category: 'explain',
    label: 'Common misunderstandings',
    text: 'What are the top 3 common mistakes students make when learning [topic]?',
  },

  // Practice
  {
    id: 'prac-1',
    category: 'practice',
    label: '5-Question quiz',
    text: 'Quiz me on [topic] with 5 questions, then grade my answers.',
  },
  {
    id: 'prac-2',
    category: 'practice',
    label: 'Active recall drill',
    text: 'Ask me 3 active recall questions about [topic] one by one.',
  },
  {
    id: 'prac-3',
    category: 'practice',
    label: 'Hard practice problem',
    text: 'Give me a challenging practice problem on [topic] without giving away the answer.',
  },
  {
    id: 'prac-4',
    category: 'practice',
    label: 'Quick knowledge check',
    text: 'Test if I truly understand [topic] with a tricky conceptual question.',
  },

  // Study plan
  {
    id: 'plan-1',
    category: 'study_plan',
    label: '7-Day study plan',
    text: 'Make a 7-day study plan for [topic/exam].',
  },
  {
    id: 'plan-2',
    category: 'study_plan',
    label: 'Cramming schedule',
    text: 'Help me prioritize what to review in the next 2 hours for [subject/exam].',
  },
  {
    id: 'plan-3',
    category: 'study_plan',
    label: 'Weekly goals',
    text: 'Break down [subject] into manageable weekly study goals.',
  },
  {
    id: 'plan-4',
    category: 'study_plan',
    label: 'Revision checklist',
    text: 'Create a comprehensive revision checklist for [topic/subject].',
  },

  // Summarize
  {
    id: 'sum-1',
    category: 'summarize',
    label: 'Notes to flashcards',
    text: 'Summarize these notes into key points and flashcards.',
  },
  {
    id: 'sum-2',
    category: 'summarize',
    label: 'Executive summary',
    text: 'Give me a 5-bullet point summary of [topic/concept].',
  },
  {
    id: 'sum-3',
    category: 'summarize',
    label: 'Key formulas & terms',
    text: 'List all essential terms, formulas, and definitions for [topic].',
  },
  {
    id: 'sum-4',
    category: 'summarize',
    label: 'Compare & contrast',
    text: 'Compare and contrast [concept A] vs [concept B] in a clear table format.',
  },

  // Exam help
  {
    id: 'exam-1',
    category: 'exam_help',
    label: 'Past questions & solutions',
    text: 'Give me past-question style problems on [topic] with worked solutions.',
  },
  {
    id: 'exam-2',
    category: 'exam_help',
    label: 'Exam tips & pitfalls',
    text: 'What are key exam tips, criteria, and marking pitfalls for [subject/exam]?',
  },
  {
    id: 'exam-3',
    category: 'exam_help',
    label: 'Timed practice essay/prompt',
    text: 'Give me an exam-style prompt on [topic] with guidance on how to structure a top-scoring answer.',
  },
  {
    id: 'exam-4',
    category: 'exam_help',
    label: 'Formula / rule application',
    text: 'Show me step-by-step how to solve exam questions involving [formula or rule].',
  },
];

/**
 * Checks if a prompt text contains a placeholder like `[topic]` or `[subject]`.
 * @param {string} text
 * @returns {boolean}
 */
export function hasPlaceholder(text) {
  if (!text || typeof text !== 'string') return false;
  return /\[.*?\]/.test(text);
}

/**
 * Get prompts filtered by category id (or all if category is null/undefined/'all')
 * @param {string} [categoryId]
 * @returns {Array}
 */
export function getPromptsByCategory(categoryId) {
  if (!categoryId || categoryId === 'all') return LUMO_PROMPTS;
  return LUMO_PROMPTS.filter((p) => p.category === categoryId);
}

/**
 * Quick access array of prominent empty-state prompts
 */
export const FEATURED_PROMPTS = [
  LUMO_PROMPTS.find((p) => p.id === 'exp-1'),
  LUMO_PROMPTS.find((p) => p.id === 'prac-1'),
  LUMO_PROMPTS.find((p) => p.id === 'plan-1'),
  LUMO_PROMPTS.find((p) => p.id === 'sum-1'),
  LUMO_PROMPTS.find((p) => p.id === 'exam-1'),
].filter(Boolean);

/**
 * Generates a personalized empty-state greeting for Lumo using student profile data.
 * @param {object} [profile]
 * @returns {string}
 */
export function getLumoGreeting(profile) {
  const firstName = profile?.full_name ? String(profile.full_name).trim().split(' ')[0] : null;
  const primarySubject =
    (profile?.settings_subject && String(profile.settings_subject).trim()) ||
    (Array.isArray(profile?.subjects) && profile.subjects[0] && String(profile.subjects[0]).trim()) ||
    null;

  if (firstName && primarySubject) {
    return `Hi ${firstName}, I'm Lumo. Ready to work on ${primarySubject}?`;
  }
  if (firstName) {
    return `Hi ${firstName}, I'm Lumo. What are we studying?`;
  }
  return "Hi, I'm Lumo. What are we studying?";
}

/**
 * Replaces prompt placeholders like [topic], [subject], [topic/concept] with profile values when available.
 * If data is missing or not applicable, leaves the original bracket placeholder untouched for manual editing.
 * @param {string} promptText
 * @param {object} [profile]
 * @returns {string}
 */
export function formatPromptForProfile(promptText, profile) {
  if (!promptText || typeof promptText !== 'string') return '';
  if (!profile || typeof profile !== 'object') return promptText;

  const currentTopic = profile.current_topic ? String(profile.current_topic).trim() : null;
  const primarySubject =
    (profile.settings_subject && String(profile.settings_subject).trim()) ||
    (Array.isArray(profile.subjects) && profile.subjects[0] && String(profile.subjects[0]).trim()) ||
    null;

  let formatted = promptText;

  if (currentTopic) {
    formatted = formatted
      .replaceAll('[topic]', currentTopic)
      .replaceAll('[topic/concept]', currentTopic)
      .replaceAll('[topic/subject]', currentTopic);
  }

  if (primarySubject) {
    formatted = formatted
      .replaceAll('[subject]', primarySubject)
      .replaceAll('[subject/exam]', primarySubject)
      .replaceAll('[topic/exam]', primarySubject);
  }

  return formatted;
}
