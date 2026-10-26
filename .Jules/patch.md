## 2028-05-18 - Unmemoized defaults & modal draft loading hook dependencies
**Bug class:** Unstable object reference dependencies in `useEffect` and unstable state triggers in draft population.
**Root cause:** Form default helper functions returning new object literals on every render triggered unstable `useEffect` dependencies, and referencing form state variables inside initial draft loading effects created missing dependency ESLint errors.
**Guardrail added:** Wrapped default form objects in `useMemo` and used `hasLoadedDraftRef` to gate one-time draft initialization on modal open, backed by `test/feedback.test.js` regression test suite.
**Watch for:** Modal dialog components that load drafts from `localStorage` or compute default values on render.

## 2028-05-18 - Input validation and past-date rejection in activity schedulers
**Bug class:** Input validation boundary failures and unconstrained date selection.
**Root cause:** Duration inputs in planner modals allowed unbound or non-finite values, and activity form submission handlers allowed scheduling activities for dates/times in the past.
**Guardrail added:** Added duration boundary checks (5 to 720 minutes in Planner modals; positive finite hours in Study Home) and past date/time validation checks before submission, backed by `test/studyValidation.test.js` regression tests.
**Watch for:** Any new scheduling forms or modal dialogs that accept custom date, time, or duration inputs.

## 2028-05-18 - Undeclared handlers and parameter mismatches in feedback components
**Bug class:** Mismatched or underscore-prefixed function and parameter names causing `ReferenceError` at runtime.
**Root cause:** A handler function in `AdminFeedbackDashboard.jsx` was declared with a leading underscore (`_handlePriorityChange`) while JSX called `handlePriorityChange`, and `useFeedbackPrompts.js` declared `_customContext` as a parameter while referencing `customContext`.
**Guardrail added:** Aligned declarations and usages across feedback dashboard and prompt hooks, backed by `test/feedback.test.js` regression tests and strict ESLint `no-undef` validation.
**Watch for:** Handlers or parameters renamed with leading underscores during refactoring without updating all internal call sites.
