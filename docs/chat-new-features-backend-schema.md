# Backend Database Rows & Columns Specification for Upgraded Chat Features

This document specifies the database tables, columns, data types, constraints, foreign keys, RLS (Row Level Security) policies, and Realtime channel configurations required on the backend (Supabase / PostgreSQL) to support the newly added Chat features in Hyper Tutor.

---

## 1. Overview of Newly Added Chat Features

The chat system in Hyper Tutor was upgraded with four core capabilities:
1. **Emoji Reactions**: Users can react to any message with emojis (e.g. 👍, ❤️, 🔥, 💡, 🎓, 🎉, 💯). Reactions can be toggled on and off per user.
2. **Pinned Messages & Study Notes**: Important study explanations, homework reminders, or video room links can be pinned to a conversation. Pinned messages appear in a quick-access drawer at the top of the chat thread.
3. **Quoted Reply Reference**: Users can quote/reply to a specific prior message in the chat. A preview bar appears above the composer, and a quoted reference card renders inside the message bubble.
4. **Message Editing**: Users can edit their previously sent messages. Edited messages display an `(edited)` indicator beside the timestamp.

---

## 2. Table Specifications: Rows & Columns

### Table 1: `public.message_reactions`

Stores individual user emoji reactions attached to messages.

| Column Name | Data Type | Nullable | Default | Description | Constraints & Foreign Keys |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | No | `gen_random_uuid()` | Primary Key | `PRIMARY KEY` |
| `message_id` | `uuid` | No | - | Foreign Key to target message | `REFERENCES public.messages(id) ON DELETE CASCADE` |
| `user_id` | `uuid` | No | - | Foreign Key to reacting user | `REFERENCES auth.users(id) ON DELETE CASCADE` |
| `emoji` | `text` | No | - | Unicode emoji character string | `CHECK (char_length(emoji) <= 10)` |
| `created_at` | `timestamptz` | No | `now()` | Timestamp when reaction was added | - |

**Unique Constraint**:
```sql
ALTER TABLE public.message_reactions
  ADD CONSTRAINT unique_message_user_emoji UNIQUE (message_id, user_id, emoji);
```

**Indexes**:
```sql
CREATE INDEX idx_message_reactions_msg_id ON public.message_reactions (message_id);
CREATE INDEX idx_message_reactions_user_id ON public.message_reactions (user_id);
```

---

### Table 2: `public.pinned_messages`

Stores pinned messages and study notes per conversation.

| Column Name | Data Type | Nullable | Default | Description | Constraints & Foreign Keys |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | No | `gen_random_uuid()` | Primary Key | `PRIMARY KEY` |
| `conversation_id` | `uuid` | No | - | Foreign Key to conversation | `REFERENCES public.conversations(id) ON DELETE CASCADE` |
| `message_id` | `uuid` | No | - | Foreign Key to target message | `REFERENCES public.messages(id) ON DELETE CASCADE` |
| `pinned_by` | `uuid` | No | - | Foreign Key to user who pinned | `REFERENCES auth.users(id) ON DELETE CASCADE` |
| `pinned_at` | `timestamptz` | No | `now()` | Timestamp when message was pinned | - |

**Unique Constraint**:
```sql
ALTER TABLE public.pinned_messages
  ADD CONSTRAINT unique_conversation_pinned_message UNIQUE (conversation_id, message_id);
```

**Indexes**:
```sql
CREATE INDEX idx_pinned_messages_conv_id ON public.pinned_messages (conversation_id);
```

---

### Alter Table Extensions: `public.messages`

Extends the existing `public.messages` table to support reply references, message editing, and reaction payload caching.

| Column Name | Data Type | Nullable | Default | Description | Constraints & Foreign Keys |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `reply_to_message_id` | `uuid` | Yes | `NULL` | Foreign Key to referenced message | `REFERENCES public.messages(id) ON DELETE SET NULL` |
| `is_edited` | `boolean` | No | `false` | Indicates whether content was edited | - |
| `updated_at` | `timestamptz` | Yes | `NULL` | Timestamp of last message edit | - |
| `reactions` | `jsonb` | Yes | `'{}'::jsonb` | Cached reaction map `{ [emoji]: [userIds...] }` | - |

**SQL Migration Commands**:
```sql
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS reply_to_message_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_edited boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS reactions jsonb DEFAULT '{}'::jsonb;

CREATE INDEX idx_messages_reply_to_id ON public.messages (reply_to_message_id) WHERE reply_to_message_id IS NOT NULL;
```

---

## 3. Row Level Security (RLS) Policies

### RLS Policies for `public.message_reactions`
```sql
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Select: Participants in the conversation can view reactions
CREATE POLICY "Participants can view message reactions"
  ON public.message_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_reactions.message_id
        AND cp.user_id = auth.uid()
    )
  );

-- Insert: Users can add reactions to messages in conversations they joined
CREATE POLICY "Users can add message reactions"
  ON public.message_reactions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_reactions.message_id
        AND cp.user_id = auth.uid()
    )
  );

-- Delete: Users can delete their own reactions
CREATE POLICY "Users can remove own message reactions"
  ON public.message_reactions FOR DELETE
  USING (auth.uid() = user_id);
```

### RLS Policies for `public.pinned_messages`
```sql
ALTER TABLE public.pinned_messages ENABLE ROW LEVEL SECURITY;

-- Select: Participants in conversation can view pinned messages
CREATE POLICY "Participants can view pinned messages"
  ON public.pinned_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = pinned_messages.conversation_id
        AND cp.user_id = auth.uid()
    )
  );

-- Insert: Participants in conversation can pin messages
CREATE POLICY "Participants can pin messages"
  ON public.pinned_messages FOR INSERT
  WITH CHECK (
    auth.uid() = pinned_by
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = pinned_messages.conversation_id
        AND cp.user_id = auth.uid()
    )
  );

-- Delete: Participants in conversation can unpin messages
CREATE POLICY "Participants can unpin messages"
  ON public.pinned_messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = pinned_messages.conversation_id
        AND cp.user_id = auth.uid()
    )
  );
```

---

## 4. Supabase Realtime Channel Integration

Ensure publication is enabled for table changes in PostgreSQL:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pinned_messages;
```

Frontend listeners subscribe to:
- `chat_messages:${conversation_id}:${uuid}`: Listens for `INSERT`, `UPDATE` (edits), and `DELETE` on `public.messages`.
- Broadcast presence and typing events via `chat_presence:${conversation_id}:${uuid}`.
