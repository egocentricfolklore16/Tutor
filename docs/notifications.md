# Hyper Tutor Push Notification Pipeline

## Overview
Hyper Tutor provides real-time in-app and background push notifications across phone and desktop viewports for three primary events:
1. **New Message** (Direct DMs and Group study chats)
2. **Incoming Friend Request**
3. **Accepted Friend Request**

---

## Event Architecture & Flow

```
[Database Event (INSERT/UPDATE)]
       │
       ▼
[Postgres Triggers (tr_on_message_insert / tr_on_friendship_change)]
       │
       ▼
[in_app_notifications table (delivery_status = 'pending')]
       │
       ▼
[Edge Function (send-push)] ◄── User Preferences & Quiet Hours
       │
       ▼
[Web Push API (VAPID / Service Worker)] ──► Device Screen / Lockscreen
       │
       ▼
[User Taps Notification] ──► Deep Link Navigation to Conversation or Friends tab
```

---

## Database Schema & Migrations

### Tables Created (`supabase/migrations/20250524000000_chat_and_push_notifications.sql`)
- `push_subscriptions`: Stores VAPID endpoint, keys (`p256dh`, `auth`), platform, and user_agent. Unique index on `endpoint`.
- `notification_preferences`: Configures user settings:
  - `push_enabled` (master toggle)
  - `push_messages`
  - `push_friend_requests`
  - `push_friend_accepts`
  - `show_message_preview`
  - `quiet_hours_start` & `quiet_hours_end`
- `conversation_mutes`: Configures per-chat mute windows (`muted_until`).
- `in_app_notifications`: Logs all notification events with `delivery_status` (`pending`, `sent`, `failed`, `skipped`) for idempotency.

---

## Edge Function (`supabase/functions/send-push/index.ts`)

The `send-push` Deno Edge Function validates authorization, checks recipient preferences, evaluates quiet hours and conversation mutes, constructs rich payload JSON, and delivers push notifications using `web-push`.

### Key Safety & Filtering Guards:
- **Self-Action Suppression**: Never notifies a user about their own actions.
- **Preference Checks**: Skips if the notification type is disabled or quiet hours are active.
- **Mute Window**: Skips message notifications if the conversation is muted.
- **Preview Hiding**: Replaces content snippet with "Sent you a message" if `show_message_preview` is disabled.
- **Idempotency**: Prevents double dispatches using `delivery_status`.
- **Expired Cleanup**: Deletes invalid subscriptions on HTTP 404/410 errors.

---

## How to Setup & Deploy Push Notifications

1. **Generate VAPID Keys**:
   ```bash
   npx web-push generate-vapid-keys
   ```

2. **Configure Environment Variables**:
   - Client (`.env`):
     ```env
     VITE_VAPID_PUBLIC_KEY=your_public_vapid_key
     ```
   - Edge Function Secrets (`supabase secrets set`):
     ```bash
     supabase secrets set VAPID_PUBLIC_KEY=your_public_vapid_key
     supabase secrets set VAPID_PRIVATE_KEY=your_private_vapid_key
     supabase secrets set VAPID_SUBJECT=mailto:support@hypertutor.app
     ```

3. **Deploy Migration & Edge Function**:
   ```bash
   supabase db push
   supabase functions deploy send-push
   supabase functions deploy send-test-notification
   ```

4. **Adding a New Notification Type**:
   - Update `in_app_notifications.type` check constraint.
   - Add Postgres trigger or client caller inserting into `in_app_notifications`.
   - Update `send-push/index.ts` payload builder for the new notification type.
   - Add deep link handling in `public/sw.js`.
