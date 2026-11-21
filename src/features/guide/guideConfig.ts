export type GuidePose = "thinking" | "wings-up" | "pointing" | "happy" | "reading";
export type GuideStepType = "navigate" | "click" | "input" | "observe" | "info";
export type GuideFlowStep = {
  id: string;
  anchor: string;
  route?: string;
  type: GuideStepType;
  title: string;
  text: string;
  pose: GuidePose;
  advanceOn?: "click" | "input" | "observe";
  fallbackText?: string;
};
export type GuideFlow = {
  id: string;
  title: string;
  description: string;
  steps: GuideFlowStep[];
};

export const grandTour: GuideFlow = {
  id: "grand-tour",
  title: "Take a quick tour",
  description: "A 60-second tour of Hyper Tutor",
  steps: [
    { id: "tour-sidebar", anchor: "sidebar-home", route: "/Dashboard", type: "info", title: "Move around", text: "Use Home, Explore, Planner, Focus, Library, Community, Help, and Settings to move through Hyper Tutor.", pose: "pointing", fallbackText: "Open the sidebar to explore the app." },
    { id: "tour-search", anchor: "topbar-search", type: "info", title: "Find saved study content", text: "Search notes, flashcards, and resources instantly. Press Cmd+K or Ctrl+K anytime.", pose: "pointing" },
    { id: "tour-rewards", anchor: "topbar-xp", type: "info", title: "Track your rewards", text: "Your XP shows progress and level growth. Gems can be spent in the Gem Shop.", pose: "thinking" },
    { id: "tour-notifications", anchor: "topbar-notifications", type: "info", title: "Stay up to date", text: "Check study reminders and account updates here.", pose: "pointing" },
    { id: "tour-new-session", anchor: "new-session", route: "/courses", type: "navigate", title: "Start studying", text: "New Session opens the course area and lets you create a study session.", pose: "wings-up", advanceOn: "observe" },
    { id: "tour-ai", anchor: "lumo-ai-fab", type: "info", title: "Ask Lumo", text: "Ask me anything, and I can help explain ideas or open study tools.", pose: "wings-up" },
    { id: "tour-profile", anchor: "topbar-profile", type: "info", title: "Make it yours", text: "Open your profile menu for theme, settings, and account options.", pose: "happy" },
  ],
};

export const taskFlows: GuideFlow[] = [
  {
    id: "create-study-session",
    title: "Create a study session",
    description: "Plan a study session in the Study Planner",
    steps: [
      { id: "create-navigate", anchor: "sidebar-planner", route: "/Planner", type: "navigate", title: "Open Study Planner", text: "The Planner keeps your study sessions and deadlines together.", pose: "pointing", fallbackText: "Study Planner is the calendar sidebar item." },
      { id: "create-click", anchor: "planner-create-new", type: "click", title: "Create a session", text: "Choose Create new to open the session form.", pose: "pointing", advanceOn: "click" },
      { id: "create-title", anchor: "planner-session-title", type: "input", title: "Name your session", text: "Name your session, like \"Biology revision\".", pose: "thinking", advanceOn: "input" },
      { id: "create-date", anchor: "planner-session-date", type: "input", title: "Choose a date", text: "Pick the day you want to study.", pose: "thinking", advanceOn: "input" },
      { id: "create-time", anchor: "planner-session-time", type: "input", title: "Choose a start time", text: "Set a start time that works for you.", pose: "thinking", advanceOn: "input" },
      { id: "create-save", anchor: "planner-session-save", type: "click", title: "Save the session", text: "Review the details, then press Save yourself.", pose: "wings-up", advanceOn: "click" },
      { id: "create-celebrate", anchor: "planner-success", type: "observe", title: "Session planned", text: "Nice work. Your session is now in the Planner.", pose: "happy", advanceOn: "observe" },
    ],
  },
  { id: "start-session", title: "Start or resume a session", description: "Find and open a course session", steps: [
    { id: "start-navigate", anchor: "sidebar-courses", route: "/courses", type: "navigate", title: "Open Courses", text: "Choose Courses to find available and recent sessions.", pose: "pointing" },
    { id: "start-click", anchor: "study-session-action", type: "click", title: "Start or resume", text: "Use the session card's Start or Resume button.", pose: "pointing", advanceOn: "click" },
  ] },
  { id: "upload-resource", title: "Upload a resource", description: "Add a file or link to your Library", steps: [
    { id: "upload-navigate", anchor: "sidebar-library", route: "/Library", type: "navigate", title: "Open Library", text: "Your resources, notes, flashcards, and quizzes live here.", pose: "pointing" },
    { id: "upload-click", anchor: "library-resource", type: "click", title: "Add a resource", text: "Choose Resource, then select a file or add a link.", pose: "pointing", advanceOn: "click" },
  ] },
  { id: "make-flashcards", title: "Make flashcards", description: "Create practice cards in the Library", steps: [
    { id: "flash-navigate", anchor: "sidebar-library", route: "/Library", type: "navigate", title: "Open Library", text: "Flashcards can be created and reviewed in one place.", pose: "pointing" },
    { id: "flash-click", anchor: "library-flashcard", type: "click", title: "Create flashcards", text: "Choose Flashcard and enter a question and answer.", pose: "pointing", advanceOn: "click" },
  ] },
  { id: "take-quiz", title: "Take a quiz", description: "Find or generate a quiz", steps: [
    { id: "quiz-navigate", anchor: "sidebar-library", route: "/Library", type: "navigate", title: "Open Library", text: "Open the Library to find saved quizzes.", pose: "pointing" },
    { id: "quiz-click", anchor: "library-quiz", type: "click", title: "Open a quiz", text: "Choose a quiz tab or card, then answer it yourself.", pose: "pointing", advanceOn: "click" },
  ] },
  { id: "ask-ai", title: "Ask the AI tutor", description: "Start a conversation with Lumo", steps: [
    { id: "ai-click", anchor: "lumo-ai-fab", type: "click", title: "Open Lumo", text: "Open the chat and ask for an explanation or a study action.", pose: "wings-up", advanceOn: "click" },
  ] },
  { id: "join-group", title: "Join a study group", description: "Find and join community study rooms", steps: [
    { id: "group-navigate", anchor: "sidebar-community", route: "/Community", type: "navigate", title: "Open Community", text: "Community is where you can find groups and shared sessions.", pose: "pointing" },
  ] },
  { id: "check-progress", title: "Check my progress", description: "Review study trends and achievements", steps: [
    { id: "progress-navigate", anchor: "sidebar-progress", route: "/Progress", type: "navigate", title: "Open Progress", text: "Review your trends, streak, and recent study activity.", pose: "pointing" },
  ] },
  { id: "get-gems", title: "Get more gems or upgrade", description: "Review gems and paid options safely", steps: [
    { id: "gems-navigate", anchor: "topbar-gems", route: "/Shop", type: "navigate", title: "Open the Shop", text: "The shop shows gem options. Checkout always stays in your control.", pose: "pointing" },
  ] },
  { id: "change-theme", title: "Change theme or notifications", description: "Update appearance and notification preferences", steps: [
    { id: "theme-navigate", anchor: "sidebar-settings", route: "/Settings", type: "navigate", title: "Open Settings", text: "Use Appearance or Notifications to change your preferences.", pose: "pointing" },
  ] },
];

