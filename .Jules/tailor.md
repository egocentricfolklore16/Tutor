# Personalization Map

| Field | Collected in | Table/Column | Loaded in | Used in | Status |
|---|---|---|---|---|---|
| `fullName` | Onboarding Step 0 | `profiles.full_name` | `ProfileContext` | Dashboard header, Settings | Used |
| `learnerType` | Onboarding Step 0 | `profiles.learner_type` | `ProfileContext` | Settings, Dashboard AI Suggestions, AI Tutor system prompt | Used |
| `educationLevel` | Onboarding Step 0 | `profiles.education_level` | `ProfileContext` | Dashboard AI Suggestions, Settings, AI Tutor system prompt | Used |
| `primaryGoal` | Onboarding Step 1 | `profiles.primary_goal` | `ProfileContext` | Dashboard Overview header, Settings, AI Tutor system prompt | Used |
| `subjects` | Onboarding Step 1 | `profiles.subjects` | `ProfileContext` | Dashboard Overview header, Settings | Used |
| `weeklyHours` | Onboarding Step 2 | `profiles.weekly_hours` | `ProfileContext` | Dashboard AI suggestions, Planner, Settings | Used |
| `studyDays` | Onboarding Step 2 | `profiles.study_days` | `ProfileContext` | Planner calendar view, Planner session length calculation, Settings | Used |
| `preferredTime` | Onboarding Step 2 | `profiles.preferred_time` | `ProfileContext` | Planner default start time, Dashboard AI Suggestions, Settings | Used |
| `learningStyle` | Onboarding Step 3 | `profiles.learning_style` | `ProfileContext` | Settings, Dashboard AI Suggestions, AI Tutor system prompt | Used |
| `accessibilityNeeds` | Onboarding Step 3 | `profiles.accessibility_needs` | `ProfileContext` | Settings, AI Tutor prompt, Root Document Accessibility Classes (`high-contrast`, `accessibility-large-text`) | Used |
| `collaborationInterest` | Onboarding Step 3 | `profiles.collaboration_interest` | `ProfileContext` | Community Hub, Settings | Used |

## Journal

## 2025-05-20 - Connecting Orphaned Collaboration Interest Field
**Learning:** `collaboration_interest` was collected in Onboarding step 3 ("How would you like to learn with others?") and stored in `profiles.collaboration_interest`, but was never referenced in any UI component, Settings form, or AI context.
**Action:** Connect `collaboration_interest` to `Community.jsx` to render a personalized Phase 2 community preview badge and add a preference control in `Settings.jsx` so changes propagate instantly via `ProfileContext`.

## 2026-09-30 - Connecting Primary Goal to AI Tutor Prompt & Settings
**Learning:** `primary_goal` was collected in Onboarding step 1 ("What is your primary goal?"), stored in `profiles.primary_goal`, and displayed in the Dashboard header, but was not passed to the AI Tutor system prompt or editable in Settings.
**Action:** Inject `primary_goal` into the AI Tutor system prompt `<session_context>` (`systemPrompt.ts` and `promptBuilder.ts`) with safe default `"General learning"`, and add a Primary Goal preference control in `Settings.jsx` so edits immediately update profile state across the app.

## 2026-10-02 - Connecting Learner Type to Dashboard AI Suggestions & Settings
**Learning:** `learner_type` was collected in Onboarding step 0 ("Which learner sounds most like you?"), stored in `profiles.learner_type`, and passed into the AI Tutor Edge Function system prompt, but was omitted from Dashboard recommendations and editable Settings controls.
**Action:** Create `getLearnerTypeSuggestion` helper to surface personalized study strategy badges and recommendations on the Dashboard `AISuggestions` card, and add a Learner Type selector in `Settings.jsx` so preferences can be edited with instant UI propagation via `ProfileContext`.

## 2026-10-04 - Connecting Preferred Time to AI Suggestions & Settings
**Learning:** `preferred_time` was collected in Onboarding Step 2 ("When do you focus best?"), stored in `profiles.preferred_time`, and used in `Planner.jsx` for session start times, but could not be edited in Settings and was missing from Dashboard AI suggestions.
**Action:** Create `getPreferredTimeNote` in `src/lib/preferredTime.js` to personalize Dashboard AI study recommendations based on peak focus hours ("Morning", "Afternoon", "Evening", "Flexible"), and add a Preferred Focus Time selector control in `Settings.jsx` with instant propagation via `ProfileContext`.

## 2026-10-12 - Connecting Target Study Days to Planner Calendar & Settings
**Learning:** `study_days` was collected in Onboarding Step 2 ("Which days work best?"), stored in `profiles.study_days`, and used in `Planner.jsx` solely to divide session duration, but target days were invisible on the study calendar and missing from Settings.
**Action:** Create `isPreferredStudyDay` helper in `src/lib/studyDays.js` to highlight target study days on the Planner Calendar week view headers and mobile day tabs, and add a Target Study Days control in `Settings.jsx` so preference updates propagate immediately across the app via `ProfileContext`.

## 2026-10-14 - Connecting Weekly Hours to Settings & AI Suggestions
**Learning:** `weekly_hours` was collected in Onboarding Step 2 ("How many hours can you study each week?") and referenced in `AISuggestions.jsx` and `Planner.jsx`, but was not editable in Settings and lacked a dedicated helper with safe numeric bounds fallback testing.
**Action:** Create `getWeeklyHours` in `src/lib/weeklyHours.js` with tests in `test/weeklyHours.test.js`, connect it to `AISuggestions.jsx`, and add a Target Weekly Study Hours input control in `Settings.jsx` with immediate propagation via `ProfileContext`.

## 2026-10-18 - Connecting Learning Style to Dashboard AI Suggestions & Settings Options
**Learning:** `learning_style` was collected in Onboarding Step 3 ("How do you learn best?"), stored in `profiles.learning_style`, and passed to the AI Tutor system prompt, but Dashboard AI Suggestions rendered only generic string lowercasing, and Settings choice options ("Analogy-based") were misaligned with Onboarding choices ("Practice first", "Conversation").
**Action:** Create `getLearningStyleSuggestion` in `src/lib/learningStyle.js` with tests in `test/learningStyle.test.js`, connect it to `AISuggestions.jsx` to render tailored learning strategy advice, and align `styles` in `Settings.jsx` with onboarding options so preferences can be edited with instant UI propagation via `ProfileContext`.

## 2026-10-24 - Connecting Education Level to Dashboard AI Suggestions & Settings Options
**Learning:** `education_level` was collected in Onboarding Step 0 ("Where are you learning right now?"), stored in `profiles.education_level`, and passed to the AI Tutor system prompt, but was omitted from Dashboard recommendations and Settings `levels` options lacked onboarding choices ("High school", "College / university", "Working professional", "Independent learner"), displaying empty selection.
**Action:** Create `getEducationLevelSuggestion` in `src/lib/educationLevel.js` with tests in `test/educationLevel.test.js`, connect it to `AISuggestions.jsx` to render tailored academic study context notes, and update `levels` in `Settings.jsx` to include onboarding choices for instant UI propagation via `ProfileContext`.

## 2026-10-28 - Connecting Accessibility Needs to Document Root Classes & Aligning Settings Options
**Learning:** `accessibility_needs` was collected in Onboarding Step 3 ("Would any accessibility support help?"), stored in `profiles.accessibility_needs`, and sent to the AI Tutor prompt, but option casing in Settings ("Screen Reader", "High Contrast", "Larger Text") was misaligned with Onboarding ("Screen reader", "High contrast", "Larger text"), breaking option pre-filling and selection. Furthermore, selecting "High contrast" or "Larger text" did not toggle root UI accessibility classes on the document element.
**Action:** Create `hasAccessibilityNeed` and `getAccessibilityClasses` in `src/lib/accessibility.js` with tests in `test/accessibility.test.js`, connect `ProfileContext.jsx` to dynamically toggle `.high-contrast` and `.accessibility-large-text` on `document.documentElement`, and align options in `Settings.jsx` with case-insensitive matching.
