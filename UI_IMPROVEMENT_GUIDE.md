# UI IMPROVEMENT GUIDE

## 1. CURRENT UI SNAPSHOT

- Dashboard: `src/components/Dashboard/Overview.jsx` plus `DashboardHeader.jsx`, `DashboardStatsBar.jsx`, `QuickShortcuts.jsx`, and `StudyCompanion.jsx` present the student overview, stats blocks, quick actions, and companion card. It is functional and visually rich, but it competes with multiple primary actions and repeated metric language.
- Study environment: `src/components/Study/studyEnviron/StudyEnvironment.jsx` and `AITutorChat.jsx` provide the main learning flow and AI side panels. The study flow is clear, but tool panels and oversized surfaces can feel busy, especially when several study modules are active at once.
- Planner / Library / Community / Settings: these screens are present and usable, but they are not the first-message surfaces. The dashboard and study screens carry most of the visual weight and should be cleaned first.

## 2. WHAT WORKS WELL

- The visual identity already has a clear product voice: light-mode emerald and mint with rounded, energetic treatment; dark mode uses muted surfaces. This is visible in the dashboard and study companion work in `src/components/Study/studyEnviron/StudyCompanion.jsx` and `src/components/Dashboard/Overview.jsx`.
- Fixed action patterns are already intentional and should remain: the floating session button and chat button are anchored in the study flow. This creates a strong sense of momentum without leaving the session.
- `DashboardHeader.jsx` provides a strong “command center” pattern with search, alerts, streak, XP, and gems. It feels product-like and should stay, but its metric density needs compression.
- The AI chat system in `src/components/Study/studyEnviron/AITutorChat.jsx` already contains useful status patterns, action cards, and markdown rendering. Keep the interaction, but reduce canvas noise and unify button styling.

## 3. PROBLEMS FOUND

| Screen | File/Component | Issue | Why it hurts the student | Severity | Recommended fix |
| --- | --- | --- | --- | --- | --- |
| Dashboard | `src/components/Dashboard/Overview.jsx` | Multiple primary actions compete: greeting CTA, review banner, quick shortcuts, stat cards. | Students do not know which action matters first. | High | Keep one start-studying CTA, reduce secondary actions to compact blocks. |
| Dashboard | `src/components/Dashboard/DashboardStatsBar.jsx` | Stats are repeated in multiple places and shown as independent blocks. | Repetition adds noise and weakens the signal. | High | Keep the single best metric source and reduce to a compact summary. |
| Dashboard | `src/components/Dashboard/QuickShortcuts.jsx` | Rotated cards with heavy decorations create extra visual noise. | The UI feels playful but crowded, making the page harder to scan. | Med | Convert to flat tiles with stable alignment and less rotation. |
| Dashboard | `src/components/Study/studyEnviron/StudyCompanion.jsx` | Companion card and riddle block are large, dense, and duplicative. | The visual weight is heavy without a clear purpose above the fold. | High | Collapse the companion into a single focused card and move the riddle to secondary state. |
| Study environment | `src/components/Study/studyEnviron/StudyEnvironment.jsx` | The tool panel and timer area can feel layered and fragmented. | Students lose the “what am I doing now?” signal. | Med | Reframe controls with clearer hierarchy and calmer surfaces. |
| Study chat | `src/components/Study/studyEnviron/AITutorChat.jsx` | Several bubbles and cards use multiple color treatments for the same message group. | The chat becomes visually noisy and less readable. | Med | Use a tighter, calmer palette with one accent per action type. |
| Header | `src/components/Dashboard/DashboardHeader.jsx` | Many dropdown metrics are stacked into the top bar. | The header is doing too much; it becomes cluttered before the student reaches the actual work. | Med | Keep only the most important statuses and move lower-value detail into a single compact menu. |
| Mobile | `src/components/InstallPrompt.tsx` and layout shell | Floating install card and sticky actions can overlap. | Mobile students can lose tap targets or miss the chat/new session actions. | High | Rework spacing and stacking order, keep safe-area padding. |

## 4. DESIGN SYSTEM RULES (the single source of truth)

### Spacing scale

Allowed values only: `4, 8, 12, 16, 24, 32` (Tailwind values `1, 2, 3, 4, 6, 8`).

- Use `gap-2`, `gap-3`, `gap-4`, `gap-6`, `gap-8` for grouping.
- Use `p-3`, `p-4`, `p-5`, `p-6`, `p-8` for panel padding.
- Use `space-y-4` and `space-y-6` to separate sections.
- Keep section spacing larger than internal element spacing.

### Radius scale

- Buttons and inputs: `rounded-xl`
- Cards and panels: `rounded-2xl`
- Badges: `rounded-full`
- No other radii beyond these values.

### Type scale

Use the same four roles across the app:

- Page title: `text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50`
- Section title: `text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100`
- Body: `text-sm leading-6 text-slate-600 dark:text-slate-300`
- Caption: `text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400`

### Icon rules

- Inline/captions: `h-4 w-4`
- Buttons and controls: `h-4 w-4` or `h-5 w-5`
- Headers and empty states: `h-5 w-5` or `h-6 w-6`
- Use one stroke width consistently (`strokeWidth={1.8}` where needed) and keep styling calm.

### Color tokens

- Primary: `emerald-600` / `green-600` for light; `emerald-400` in dark
- Accent: `amber-500`, `orange-500`, `sky-500`
- Surface: white in light; `#18211f` / `slate-900` in dark
- Surface-raised: `bg-slate-50` / `bg-slate-900` layered backgrounds
- Border: `border-slate-200` and `dark:border-slate-800`
- Text: `text-slate-900` / `dark:text-slate-50`
- Text-muted: `text-slate-600` / `dark:text-slate-300`
- Success: `emerald` accents
- Warning: `amber` / `orange`
- Danger: `rose-500`

### Shadow and elevation

- Keep light mode flat and purposeful: subtle `shadow-sm` only when needed.
- Dark mode: layered surfaces via color depth, not by heavy borders or high-contrast shadows.
- No decorative shadow glows.

### Theme rule

- Light mode remains flat, saturated emerald/mint on white. No gradients except where already embedded in branded product moments.
- Dark mode is muted and desaturated, with backgrounds fading into `#18211f`; do not invert light-mode colors blindly.

## 5. DECLUTTER RECOMMENDATIONS (per screen)

### Dashboard

- Merge: header summary badges and stats summary should be treated as one source of truth.
- Collapse: quick shortcuts should become a compact card set instead of rotated tiles.
- Move: weak-area card and daily quests should sit below the hero CTA.
- Reorder: hero CTA -> primary stat summary -> daily quests -> weak-area card -> lower info modules.
- Flag for removal or reduction: decorative rotation, repeated “streak + flaming badge + stat blocks” in multiple places.

### Study environment

- Merge: session controls and accent states should share one visual pattern.
- Collapse: tool modules should be grouped under a single panel with tabs or subheaders.
- Move: AI chat actions should become a clean conversation panel rather than an oversized block.
- Reorder: timer and focus status first, then tools, then notes/flashcards/resources.

### Planner / Library / Community / Settings

- Keep but simplify: preserve all features and actions; reduce spare timber such as overuse of borders and heavy contrast.
- Use consistent card treatment and spacing; avoid unique one-off panel styles.
- Keep deeper detail in the screen body rather than surfacing all info in the header.

## 6. DASHBOARD IMPROVEMENTS

- Recommended order: 1) hero / session CTA, 2) compact stat strip, 3) daily quests, 4) weak-area card, 5) lower detail modules.
- Primary module prominence: the “start studying” action should be the dominant button in the hero band. Daily quests should be the next most important module. Weak-area resurfacing should be a compact callout aligning with the student’s current gaps.
- Header, stats, quests, and companion each need distinct jobs: header = navigation + status; stats = aggregate signal; quests = behavior change; companion = encouragement, not extra KPI data.
- Weekly or long-term metrics should be moved below the fold unless the student purposely opens them.

## 7. MOBILE & PWA POLISH

- Tap targets: keep minimum 44x44px for all controls.
- Safe area: use `pb-[env(safe-area-inset-bottom)]` on floating elements.
- Fixed bottom-right stacking: AI chat, New Session, and install card share predictable spacing with a consistent gap and z-index.
- Install card: place it lower on the stack and allow dismiss without hiding vital floating actions.
- Bottom-nav vs sidebar: ensure the app behaves sensibly on mobile widths without horizontal scroll.

## 8. ACCESSIBILITY

- Contrast failures to check and fix: dark-mode text using low-contrast amber/text combos should use higher-contrast tokens like `text-amber-200` or `text-amber-300` on layered dark surfaces.
- Focus-visible rings: use `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70` on all buttons and inputs.
- Icon-only buttons: add `aria-label` for every icon-only action.
- Keyboard navigation: ensure the sidebar, dropdowns, and modal focus traps remain reachable.
- Respect `prefers-reduced-motion` and avoid motion-heavy transitions during a study session.
- Keep semantic heading order: page title → section title → body copy.

## 9. MOTION & FEEDBACK

- Add skeletons to primary data blocks while content loads.
- Empty states should be one icon + one line + one action button.
- Use success/error states with consistent tint and text styling.
- Hover/press states should remain subtle and consistent; use `transition-colors` and `transition-transform` within 150-250ms.
- Collapse/expand transitions should remain gentle and not distract from study momentum.

## 10. PRIORITY ROADMAP

### Quick wins

- [x] Simplify dashboard hero and CTA hierarchy in `Overview.jsx`.
- [x] Reduce visual noise in `DashboardStatsBar.jsx` and `QuickShortcuts.jsx`.
- [x] Tidy `StudyCompanion.jsx` into a single calmer card block.
- [x] Add missing `aria-label`s and focus-visible states to icon-only controls where necessary.
- [ ] Apply safe-area and stacking adjustments for floating actions in mobile layouts. (deferred to the next pass)

### Medium

- [ ] Rework the study environment panel layout in `StudyEnvironment.jsx` and `AITutorChat.jsx`.
- [x] Normalize card spacing/radius decisions across the dashboard and study screens.
- [x] Reconcile duplicated metrics across header stats and dashboard summaries.
- [x] Add consistent empty/loading/success states for dashboard modules.

### Large

- [ ] Audit all screens for one-source metric ownership and duplicate cards.
- [ ] Revisit Community and Planner modules for a full content hierarchy pass.
- [ ] Make a product decision on which stat set should remain visible across the app.

## 11. COPY-PASTE TAILWIND SNIPPETS

- Card: `rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/80`
- Raised card: `rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900`
- Primary button: `inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-400`
- Secondary button: `inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800`
- Ghost button: `inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-slate-200 dark:hover:bg-slate-800`
- Icon button: `inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white`
- Input: `w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500`
- Badge: `inline-flex items-center rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300`
- Section header: `flex items-center justify-between gap-3 pb-3 text-sm font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400`
- Empty state: `flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-900/80`
- Skeleton: `animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800`

## 12. OPEN QUESTIONS FOR THE OWNER

- Which single metric should remain visible in the dashboard as the top-of-page source of truth: streak, XP, hours, or weak-area count?
- Should the quick-start CTA route to the study page or to a new session generator?
- Is daily quests expected to be a primary click destination or a secondary motivational panel?
- Should the AI chat sit as a floating panel on top of all screens or as an in-page companion only?

## CHECKLIST SUMMARY

- [x] Dashboard and study flow were reviewed.
- [x] The guide captures the main issues and priorities.
- [x] The design system rules are codified for implementation.
- [x] The implemented quick wins and targeted medium changes are reflected in the codebase without broad, unnecessary churn.
