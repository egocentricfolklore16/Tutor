export const validateDisplayName = (name) => {
  if (!name || !name.trim()) return "Name is required.";
  const trimmed = name.trim();
  if (trimmed.length < 2) return "Name must be at least 2 characters.";
  if (trimmed.length > 24) return "Name must be 24 characters or less.";
  if (!/^[a-zA-Z0-9 '-]+$/.test(trimmed)) {
    return "Name can only contain letters, numbers, spaces, hyphens, and apostrophes.";
  }
  return null;
};

export const QUESTION_STEPS = [
  {
    id: "name",
    key: "display_name",
    question: "What would you like to be called?",
    helper: "We'll use this name to personalize your tutoring experience.",
    type: "text",
    required: true,
  },
  {
    id: "subjects",
    key: "subjects",
    question: "What do you want to learn?",
    helper: "Choose as many as you like. You can change these anytime.",
    type: "multi-subject",
    options: [
      "Math",
      "Science",
      "Computer Science",
      "Languages",
      "Humanities",
      "Business",
      "Exam Prep",
    ],
    required: true,
  },
  {
    id: "primary_goal",
    key: "primary_goal",
    question: "What's your goal?",
    helper: "Select your main focus so we can tailor recommendations.",
    type: "single",
    options: [
      "Pass an exam",
      "Improve grades",
      "Learn a new skill",
      "Just curious",
    ],
    required: true,
  },
  {
    id: "education_level",
    key: "education_level",
    question: "What's your current level?",
    helper: "This helps adjust explanations to the right complexity.",
    type: "single",
    options: ["Beginner", "Intermediate", "Advanced"],
    required: true,
  },
  {
    id: "learning_style",
    key: "learning_style",
    question: "How do you learn best?",
    helper: "Select one or more methods that work best for you.",
    type: "multiple",
    options: [
      "Explanations",
      "Practice questions",
      "Examples",
      "Quizzes",
      "Step-by-step",
    ],
    required: true,
  },
  {
    id: "daily_time",
    key: "daily_time",
    question: "How much time can you study each day?",
    helper: "Consistency matters more than marathon sessions.",
    type: "single",
    options: [
      "15 minutes / day",
      "30 minutes / day",
      "1 hour / day",
      "2+ hours / day",
    ],
    required: true,
  },
  {
    id: "completion",
    key: "completion",
    question: "You're all set.",
    helper: "Setting up your personalized workspace...",
    type: "completion",
    required: false,
  },
];

export const INITIAL_FORM = {
  display_name: "",
  subjects: [],
  otherSubject: "",
  primary_goal: "",
  education_level: "",
  learning_style: [],
  daily_time: "",
};

export function mapDailyTimeToWeeklyHours(dailyTime) {
  switch (dailyTime) {
    case "15 minutes / day":
      return 2;
    case "30 minutes / day":
      return 3.5;
    case "1 hour / day":
      return 7;
    case "2+ hours / day":
      return 14;
    default:
      return 5;
  }
}

export function validateStepAnswer(step, form) {
  if (!step || !step.required) return true;

  switch (step.id) {
    case "name":
      return !validateDisplayName(form.display_name);
    case "subjects": {
      const hasSelectedSubjects = Array.isArray(form.subjects) && form.subjects.length > 0;
      const hasOtherSubject = Boolean(form.otherSubject && form.otherSubject.trim());
      return hasSelectedSubjects || hasOtherSubject;
    }
    case "primary_goal":
      return Boolean(form.primary_goal && form.primary_goal.trim());
    case "education_level":
      return Boolean(form.education_level && form.education_level.trim());
    case "learning_style":
      return Array.isArray(form.learning_style) && form.learning_style.length > 0;
    case "daily_time":
      return Boolean(form.daily_time && form.daily_time.trim());
    default:
      return true;
  }
}
