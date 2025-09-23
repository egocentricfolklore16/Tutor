# TODO: Save Username to Profiles Table

## Completed Steps
- [x] Analyzed SignupForm.jsx and project structure
- [x] Confirmed 'profiles' table exists (user stated "IT EXISTS ALREADY")
- [x] Modified SignupForm.jsx to insert username into 'profiles' table after successful signup
  - Added code to insert `user_id` and `username` into 'profiles' table
  - Added error handling for profile insertion
  - Updated `supabase.auth.signUp` to capture `data` for user ID

## Next Steps
- [ ] Test the signup functionality to ensure username is saved to 'profiles' table
- [ ] Verify database schema supports the insertion
- [ ] Test error handling for profile insertion failures
- [ ] Consider adding username validation (unique constraint handling)

## Notes
- The 'profiles' table is assumed to have columns: `user_id` (UUID) and `username` (TEXT)
- Row Level Security (RLS) should be configured on the 'profiles' table for proper access control
- The username is now saved to both auth metadata and the 'profiles' table
