## 2028-05-18 - Input validation and past-date rejection in activity schedulers
**Bug class:** Input validation boundary failures and unconstrained date selection.
**Root cause:** Duration inputs in planner modals allowed unbound or non-finite values, and activity form submission handlers allowed scheduling activities for dates/times in the past.
**Guardrail added:** Added duration boundary checks (5 to 720 minutes in Planner modals; positive finite hours in Study Home) and past date/time validation checks before submission, backed by `test/studyValidation.test.js` regression tests.
**Watch for:** Any new scheduling forms or modal dialogs that accept custom date, time, or duration inputs.

## 2028-05-19 - Case-sensitive route active state, chat scroll pinning, and feedback dialog state retention
**Bug class:** Stale UI state, case-sensitive route matching, and scroll state locking.
**Root cause:** `getActiveFromPath` in `Sidebar.jsx` evaluated exact capitalized route strings breaking on lowercase or sub-paths; `AITutorChat.jsx` failed to reset `isPinnedRef` to `true` when new user messages were dispatched after scrolling; `FeedbackDialog.jsx` retained stale `submitted` state across dialog re-openings.
**Guardrail added:** Lowercase normalization in route matchers, explicit `isPinnedRef` resets on message submit, and `open` state change resets in feedback dialogs.
**Watch for:** New route navigation links, chat interfaces using manual scroll-pinning refs, and reusable modals holding submitted state.
