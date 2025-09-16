# TODO: Fix Login Redirect Issue

## Steps to Complete
- [x] Add onAuthStateChange subscription in App.jsx to listen for authentication state changes and update session state accordingly.

## Completed Steps
- [x] Analyzed LoginForm.jsx and App.jsx to understand the login flow and identify the root cause.
- [x] Confirmed that session state is not updated after login due to missing auth state listener.
