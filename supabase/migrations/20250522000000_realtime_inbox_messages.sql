-- Migration: Enable Realtime and ensure RLS SELECT policy on public.messages for inbox and chat
-- Created: 2025-05-22

-- 1. Ensure REPLICA IDENTITY FULL on public.messages if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') THEN
    ALTER TABLE public.messages REPLICA IDENTITY FULL;
  END IF;
END $$;

-- 2. Ensure public.messages is included in the supabase_realtime publication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'messages'
    ) AND EXISTS (
      SELECT 1
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename = 'messages'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;
  END IF;
END $$;

-- 3. Ensure SELECT RLS policy on public.messages for conversation participants
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') THEN
    ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'messages'
        AND policyname = 'Users can select messages in their conversations'
    ) THEN
      CREATE POLICY "Users can select messages in their conversations"
        ON public.messages
        FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1
            FROM public.conversation_participants cp
            WHERE cp.conversation_id = messages.conversation_id
              AND cp.user_id = auth.uid()
          )
        );
    END IF;
  END IF;
END $$;
