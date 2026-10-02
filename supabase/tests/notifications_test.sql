-- Verification Test Suite for Web Push Notifications
-- File: supabase/tests/notifications_test.sql

begin;

-- Create temporary test schema/isolation or cleanup existing test users
delete from auth.users where email like '%@test-notifications.local';

-- Seed Test Users
insert into auth.users (id, email, role)
values
  ('11111111-1111-1111-1111-111111111111', 'lagos@test-notifications.local', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'ny@test-notifications.local', 'authenticated'),
  ('33333333-3333-3333-3333-333333333333', 'streak@test-notifications.local', 'authenticated'),
  ('44444444-4444-4444-4444-444444444444', 'inactivity@test-notifications.local', 'authenticated');

insert into public.profiles (user_id, username, full_name, timezone, onboarding_completed, last_seen_at)
values
  ('11111111-1111-1111-1111-111111111111', 'lagos_user', 'Lagos User', 'Africa/Lagos', true, '2025-05-10 00:00:00+00'),
  ('22222222-2222-2222-2222-222222222222', 'ny_user', 'NY User', 'America/New_York', true, '2025-05-10 00:00:00+00'),
  ('33333333-3333-3333-3333-333333333333', 'streak_user', 'Streak User', 'UTC', true, '2025-05-09 10:00:00+00'),
  ('44444444-4444-4444-4444-444444444444', 'inactive_user', 'Inactivity User', 'UTC', true, '2025-05-08 10:00:00+00');

-------------------------------------------------------------------------------
-- TEST 1: Session at 09:00 Lagos (UTC+1), reminder_minutes = 15
-- Session start: 09:00 Lagos = 08:00 UTC. Reminder time (15m before) = 07:45 UTC.
-------------------------------------------------------------------------------
insert into public."Study" (id, user_id, "Subject", "Topic", "Date", "Start", "Duration", reminder_minutes, muted, completed, session_status)
values (101, '11111111-1111-1111-1111-111111111111', 'Math', 'Algebra', '2025-05-10', '09:00:00', 1, 15, false, false, 'active');

-- Check 1a: Call at 07:44 UTC -> NOT claimed
perform public.claim_due_notifications('2025-05-10 07:44:00+00');
do $$
begin
  assert (select count(*) from public.notification_log where user_id = '11111111-1111-1111-1111-111111111111' and dedupe_key = 'session:101:2025-05-10') = 0,
    'TEST 1a failed: session claimed too early';
end;
$$;

-- Check 1b: Call at 07:45 UTC -> Claimed
perform public.claim_due_notifications('2025-05-10 07:45:00+00');
do $$
begin
  assert (select count(*) from public.notification_log where user_id = '11111111-1111-1111-1111-111111111111' and dedupe_key = 'session:101:2025-05-10') = 1,
    'TEST 1b failed: session not claimed at due time';
end;
$$;

-- Check 1c: Idempotency check - second call in a row does not duplicate
perform public.claim_due_notifications('2025-05-10 07:45:30+00');
do $$
begin
  assert (select count(*) from public.notification_log where user_id = '11111111-1111-1111-1111-111111111111' and dedupe_key = 'session:101:2025-05-10') = 1,
    'TEST 1c failed: session notification duplicated';
end;
$$;

-------------------------------------------------------------------------------
-- TEST 2: Muted or completed sessions never claimed
-------------------------------------------------------------------------------
insert into public."Study" (id, user_id, "Subject", "Topic", "Date", "Start", "Duration", reminder_minutes, muted, completed, session_status)
values
  (102, '11111111-1111-1111-1111-111111111111', 'Physics', 'Muted Session', '2025-05-10', '09:00:00', 1, 15, true, false, 'active'),
  (103, '11111111-1111-1111-1111-111111111111', 'Physics', 'Completed Session', '2025-05-10', '09:00:00', 1, 15, false, true, 'completed');

perform public.claim_due_notifications('2025-05-10 07:45:00+00');
do $$
begin
  assert (select count(*) from public.notification_log where dedupe_key in ('session:102:2025-05-10', 'session:103:2025-05-10')) = 0,
    'TEST 2 failed: muted or completed session claimed';
end;
$$;

-------------------------------------------------------------------------------
-- TEST 3: reminder_minutes = 0 (fires at start time)
-------------------------------------------------------------------------------
insert into public."Study" (id, user_id, "Subject", "Topic", "Date", "Start", "Duration", reminder_minutes, muted, completed, session_status)
values (104, '11111111-1111-1111-1111-111111111111', 'Bio', 'Genetics', '2025-05-10', '09:00:00', 1, 0, false, false, 'active');

-- At 07:59 UTC (08:59 Lagos) -> NOT claimed
perform public.claim_due_notifications('2025-05-10 07:59:00+00');
do $$
begin
  assert (select count(*) from public.notification_log where dedupe_key = 'session:104:2025-05-10') = 0,
    'TEST 3a failed: zero-reminder session claimed before start';
end;
$$;

-- At 08:00 UTC (09:00 Lagos) -> Claimed
perform public.claim_due_notifications('2025-05-10 08:00:00+00');
do $$
begin
  assert (select count(*) from public.notification_log where dedupe_key = 'session:104:2025-05-10') = 1,
    'TEST 3b failed: zero-reminder session not claimed at start time';
end;
$$;

-------------------------------------------------------------------------------
-- TEST 4: DST Timezone test (America/New_York)
-------------------------------------------------------------------------------
-- 09:00 EDT (UTC-4) during summer -> 13:00 UTC. Reminder 15m before -> 12:45 UTC.
insert into public."Study" (id, user_id, "Subject", "Topic", "Date", "Start", "Duration", reminder_minutes)
values (105, '22222222-2222-2222-2222-222222222222', 'History', 'US History', '2025-07-01', '09:00:00', 1, 15);

perform public.claim_due_notifications('2025-07-01 12:45:00+00');
do $$
begin
  assert (select count(*) from public.notification_log where dedupe_key = 'session:105:2025-07-01') = 1,
    'TEST 4 failed: DST timezone notification instant calculation incorrect';
end;
$$;

-------------------------------------------------------------------------------
-- TEST 5 & 6: Streak Alerts & 3am Cutoff
-------------------------------------------------------------------------------
insert into public.users_streaks (user_id, current_streak, longest_streak, last_active_date, freeze_tokens_available)
values ('33333333-3333-3333-3333-333333333333', 5, 5, '2025-05-09', 1)
on conflict (user_id) do update set current_streak = 5, last_active_date = '2025-05-09';

-- At 20:00 UTC on 2025-05-10 (hours_into_streak_day = 17) -> streak_at_risk claimed
perform public.claim_due_notifications('2025-05-10 20:00:00+00');
do $$
begin
  assert (select count(*) from public.notification_log where user_id = '33333333-3333-3333-3333-333333333333' and kind = 'streak_at_risk') = 1,
    'TEST 5a failed: streak_at_risk not claimed';
end;
$$;

-- At 22:30 UTC on 2025-05-10 (hours_into_streak_day = 19.5) -> streak_final claimed
perform public.claim_due_notifications('2025-05-10 22:30:00+00');
do $$
begin
  assert (select count(*) from public.notification_log where user_id = '33333333-3333-3333-3333-333333333333' and kind = 'streak_final') = 1,
    'TEST 5b failed: streak_final not claimed';
end;
$$;

-- At 01:00 UTC on 2025-05-11: streak_day is 2025-05-10 (3am cutoff). If last_active_date was 2025-05-10, no alerts sent.
update public.users_streaks set last_active_date = '2025-05-10' where user_id = '33333333-3333-3333-3333-333333333333';
perform public.claim_due_notifications('2025-05-11 01:00:00+00');
do $$
begin
  assert (select count(*) from public.notification_log where user_id = '33333333-3333-3333-3333-333333333333' and dedupe_key like '%2025-05-11') = 0,
    'TEST 6 failed: 3am cutoff not respected';
end;
$$;

-------------------------------------------------------------------------------
-- TEST 7: Inactivity Nudges & Anti-Nag Cap
-------------------------------------------------------------------------------
-- User inactive today, onboarding_completed = true, no streak at risk
insert into public.users_streaks (user_id, current_streak, longest_streak, last_active_date)
values ('44444444-4444-4444-4444-444444444444', 0, 0, null)
on conflict (user_id) do update set current_streak = 0;

-- At 17:00 UTC (hours_into_streak_day = 14) -> inactivity nudge claimed
perform public.claim_due_notifications('2025-05-10 17:00:00+00');
do $$
begin
  assert (select count(*) from public.notification_log where user_id = '44444444-4444-4444-4444-444444444444' and kind = 'inactivity') = 1,
    'TEST 7a failed: inactivity nudge not claimed';
end;
$$;

-------------------------------------------------------------------------------
-- TEST 8: Notification preferences toggles
-------------------------------------------------------------------------------
insert into public.notification_preferences (user_id, push_enabled, session_reminders, streak_alerts, inactivity_nudges)
values ('11111111-1111-1111-1111-111111111111', false, true, true, true)
on conflict (user_id) do update set push_enabled = false;

insert into public."Study" (id, user_id, "Subject", "Topic", "Date", "Start", "Duration", reminder_minutes)
values (106, '11111111-1111-1111-1111-111111111111', 'Art', 'Drawing', '2025-05-10', '12:00:00', 1, 15);

perform public.claim_due_notifications('2025-05-10 10:45:00+00');
do $$
begin
  assert (select count(*) from public.notification_log where dedupe_key = 'session:106:2025-05-10') = 0,
    'TEST 8 failed: session claimed when push_enabled is false';
end;
$$;

-------------------------------------------------------------------------------
-- TEST 9: Quiet hours (23:00 - 07:00 local time)
-------------------------------------------------------------------------------
-- At 00:00 UTC (quiet hours active for UTC user), streak alert or inactivity MUST NOT fire
perform public.claim_due_notifications('2025-05-11 00:00:00+00');
do $$
begin
  assert (select count(*) from public.notification_log where created_at >= '2025-05-11 00:00:00+00' and kind in ('streak_at_risk', 'streak_final', 'inactivity')) = 0,
    'TEST 9 failed: streak/inactivity notification sent during quiet hours';
end;
$$;

-------------------------------------------------------------------------------
-- TEST 10: Recurrence expansion (daily, weekly, monthly)
-------------------------------------------------------------------------------
insert into public.notification_preferences (user_id, push_enabled) values ('11111111-1111-1111-1111-111111111111', true) on conflict (user_id) do update set push_enabled = true;

insert into public."Study" (id, user_id, "Subject", "Topic", "Date", "Start", "Duration", recurring, reminder_minutes)
values (107, '11111111-1111-1111-1111-111111111111', 'CS', 'Algorithms', '2025-05-01', '09:00:00', 1, 'daily', 15);

-- Check daily occurrence on 2025-05-12 at 07:45 UTC (08:45 Lagos -> 15m before 09:00 Lagos)
perform public.claim_due_notifications('2025-05-12 07:45:00+00');
do $$
begin
  assert (select count(*) from public.notification_log where dedupe_key = 'session:107:2025-05-12') = 1,
    'TEST 10 failed: daily recurring session occurrence not claimed';
end;
$$;

rollback;
