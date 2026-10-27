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

## 2028-05-18 - Mismatched and unused parameter identifiers causing ESLint errors
**Bug class:** Undeclared identifier / unused variable lint errors due to mismatch between handler names or unused argument prefixes.
**Root cause:** Function defined as `_handlePriorityChange` while JSX referenced `handlePriorityChange`, and parameter defined as `_customContext` while body referenced `customContext`.
**Guardrail added:** Aligned function and parameter names across component, hook, and unit test suites, backed by `pnpm lint` in CI pipeline and `test/feedback.test.js`.
**Watch for:** Renaming handlers or adding underscore prefixes without checking all usage sites across JSX and callback bodies.
