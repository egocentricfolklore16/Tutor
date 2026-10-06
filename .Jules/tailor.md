# Personalization Map

| Field | Collected in | Table/Column | Loaded in | Used in | Status |
|---|---|---|---|---|---|
| `fullName` | Onboarding Step 0 | `profiles.full_name` | `ProfileContext` | Dashboard header, Settings | Used |
| `learnerType` | Onboarding Step 0 | `profiles.learner_type` | `ProfileContext` | Settings, Dashboard AI Suggestions, AI Tutor system prompt | Used |
| `educationLevel` | Onboarding Step 0 | `profiles.education_level` | `ProfileContext` | Settings, AI Tutor system prompt | Used |
| `primaryGoal` | Onboarding Step 1 | `profiles.primary_goal` | `ProfileContext` | Dashboard Overview header, Settings, AI Tutor system prompt | Used |
| `subjects` | Onboarding Step 1 | `profiles.subjects` | `ProfileContext` | Dashboard Overview header, Settings | Used |
| `weeklyHours` | Onboarding Step 2 | `profiles.weekly_hours` | `ProfileContext` | Dashboard AI suggestions, Planner | Used |
| `studyDays` | Onboarding Step 2 | `profiles.study_days` | `ProfileContext` | Planner session length calculation | Used |
| `preferredTime` | Onboarding Step 2 | `profiles.preferred_time` | `ProfileContext` | Planner default start time | Used |
| `learningStyle` | Onboarding Step 3 | `profiles.learning_style` | `ProfileContext` | Settings, AI Tutor system prompt | Used |
| `accessibilityNeeds` | Onboarding Step 3 | `profiles.accessibility_needs` | `ProfileContext` | Settings, AI Tutor system prompt | Used |
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
