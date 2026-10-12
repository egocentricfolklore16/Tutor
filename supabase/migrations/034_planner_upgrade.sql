-- Migration: 034_planner_upgrade.sql
-- Description: Creates planner_activities, planner_recurrence_rules, planner_occurrence_overrides, planner_reminders, user_subjects tables and RPCs.

-- 1. Create user_subjects table
CREATE TABLE IF NOT EXISTS public.user_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#3B82F6',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT user_subjects_name_not_empty CHECK (length(trim(name)) > 0)
);

ALTER TABLE public.user_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own user_subjects"
    ON public.user_subjects FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own user_subjects"
    ON public.user_subjects FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own user_subjects"
    ON public.user_subjects FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own user_subjects"
    ON public.user_subjects FOR DELETE
    USING (auth.uid() = user_id);

-- 2. Create planner_recurrence_rules table
CREATE TABLE IF NOT EXISTS public.planner_recurrence_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'weekdays', 'custom')),
    interval INT NOT NULL DEFAULT 1 CHECK (interval >= 1),
    days_of_week INT[] DEFAULT NULL, -- 0=Sun, 1=Mon, ..., 6=Sat
    ends_on DATE DEFAULT NULL,
    max_occurrences INT DEFAULT NULL CHECK (max_occurrences IS NULL OR max_occurrences >= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.planner_recurrence_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own planner_recurrence_rules"
    ON public.planner_recurrence_rules FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own planner_recurrence_rules"
    ON public.planner_recurrence_rules FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own planner_recurrence_rules"
    ON public.planner_recurrence_rules FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own planner_recurrence_rules"
    ON public.planner_recurrence_rules FOR DELETE
    USING (auth.uid() = user_id);

-- 3. Create planner_activities table
CREATE TABLE IF NOT EXISTS public.planner_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('time_block', 'recurring_session', 'study', 'deadline')),
    title TEXT NOT NULL CHECK (length(trim(title)) > 0),
    subject_id UUID REFERENCES public.user_subjects(id) ON DELETE SET NULL,
    subject_name TEXT DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'important', 'urgent')),
    color TEXT DEFAULT NULL,
    start_at TIMESTAMPTZ NOT NULL,
    duration_minutes INT NOT NULL CHECK (duration_minutes >= 5 AND duration_minutes <= 720),
    timezone TEXT NOT NULL DEFAULT 'UTC',
    reminder_minutes_before INT DEFAULT NULL CHECK (reminder_minutes_before IS NULL OR reminder_minutes_before >= 0),
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'skipped', 'cancelled')),
    recurrence_rule_id UUID REFERENCES public.planner_recurrence_rules(id) ON DELETE CASCADE,
    break_reminder BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.planner_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own planner_activities"
    ON public.planner_activities FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own planner_activities"
    ON public.planner_activities FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own planner_activities"
    ON public.planner_activities FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own planner_activities"
    ON public.planner_activities FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger for planner_activities.updated_at
CREATE OR REPLACE FUNCTION public.set_planner_activities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_planner_activities_updated_at ON public.planner_activities;
CREATE TRIGGER tr_planner_activities_updated_at
    BEFORE UPDATE ON public.planner_activities
    FOR EACH ROW
    EXECUTE FUNCTION public.set_planner_activities_updated_at();

-- 4. Create planner_occurrence_overrides table
CREATE TABLE IF NOT EXISTS public.planner_occurrence_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    rule_id UUID NOT NULL REFERENCES public.planner_recurrence_rules(id) ON DELETE CASCADE,
    occurrence_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'skipped', 'cancelled')),
    override_title TEXT DEFAULT NULL,
    override_start_at TIMESTAMPTZ DEFAULT NULL,
    override_duration_minutes INT DEFAULT NULL CHECK (override_duration_minutes IS NULL OR (override_duration_minutes >= 5 AND override_duration_minutes <= 720)),
    override_notes TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT planner_occurrence_overrides_rule_date_key UNIQUE (rule_id, occurrence_date)
);

ALTER TABLE public.planner_occurrence_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own planner_occurrence_overrides"
    ON public.planner_occurrence_overrides FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own planner_occurrence_overrides"
    ON public.planner_occurrence_overrides FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own planner_occurrence_overrides"
    ON public.planner_occurrence_overrides FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own planner_occurrence_overrides"
    ON public.planner_occurrence_overrides FOR DELETE
    USING (auth.uid() = user_id);

-- 5. Create planner_reminders table
CREATE TABLE IF NOT EXISTS public.planner_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_id UUID NOT NULL REFERENCES public.planner_activities(id) ON DELETE CASCADE,
    occurrence_start_at TIMESTAMPTZ NOT NULL,
    remind_at TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT planner_reminders_act_occ_key UNIQUE (activity_id, occurrence_start_at)
);

ALTER TABLE public.planner_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own planner_reminders"
    ON public.planner_reminders FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own planner_reminders"
    ON public.planner_reminders FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own planner_reminders"
    ON public.planner_reminders FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own planner_reminders"
    ON public.planner_reminders FOR DELETE
    USING (auth.uid() = user_id);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_planner_activities_user_start ON public.planner_activities (user_id, start_at);
CREATE INDEX IF NOT EXISTS idx_planner_activities_recurrence ON public.planner_activities (recurrence_rule_id);
CREATE INDEX IF NOT EXISTS idx_planner_reminders_unsent ON public.planner_reminders (remind_at) WHERE sent_at IS NULL;

-- 7. RPC: find_planner_conflicts
CREATE OR REPLACE FUNCTION public.find_planner_conflicts(
    p_start_at TIMESTAMPTZ,
    p_duration_minutes INT,
    p_exclude_activity_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    start_at TIMESTAMPTZ,
    end_at TIMESTAMPTZ,
    type TEXT,
    priority TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_new_end TIMESTAMPTZ;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    v_new_end := p_start_at + (p_duration_minutes || ' minutes')::INTERVAL;

    RETURN QUERY
    SELECT
        a.id,
        a.title,
        a.start_at,
        (a.start_at + (a.duration_minutes || ' minutes')::INTERVAL) AS end_at,
        a.type,
        a.priority
    FROM public.planner_activities a
    WHERE a.user_id = v_user_id
      AND a.status != 'cancelled'
      AND (p_exclude_activity_id IS NULL OR a.id != p_exclude_activity_id)
      AND a.start_at < v_new_end
      AND (a.start_at + (a.duration_minutes || ' minutes')::INTERVAL) > p_start_at;
END;
$$;

-- 8. RPC: regenerate_planner_reminders
CREATE OR REPLACE FUNCTION public.regenerate_planner_reminders(
    p_activity_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_activity public.planner_activities%ROWTYPE;
    v_remind_at TIMESTAMPTZ;
BEGIN
    SELECT * INTO v_activity FROM public.planner_activities WHERE id = p_activity_id AND user_id = auth.uid();
    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Delete existing unsent reminders for this activity
    DELETE FROM public.planner_reminders
    WHERE activity_id = p_activity_id AND sent_at IS NULL;

    IF v_activity.reminder_minutes_before IS NOT NULL AND v_activity.status = 'scheduled' THEN
        v_remind_at := v_activity.start_at - (v_activity.reminder_minutes_before || ' minutes')::INTERVAL;
        IF v_remind_at >= NOW() - INTERVAL '1 hour' THEN
            INSERT INTO public.planner_reminders (
                user_id,
                activity_id,
                occurrence_start_at,
                remind_at
            ) VALUES (
                v_activity.user_id,
                v_activity.id,
                v_activity.start_at,
                v_remind_at
            ) ON CONFLICT (activity_id, occurrence_start_at) DO UPDATE
            SET remind_at = EXCLUDED.remind_at, sent_at = NULL;
        END IF;
    END IF;
END;
$$;

-- 9. RPC: get_planner_occurrences
CREATE OR REPLACE FUNCTION public.get_planner_occurrences(
    from_ts TIMESTAMPTZ,
    to_ts TIMESTAMPTZ
)
RETURNS TABLE (
    id UUID,
    activity_id UUID,
    rule_id UUID,
    user_id UUID,
    type TEXT,
    title TEXT,
    subject_id UUID,
    subject_name TEXT,
    notes TEXT,
    priority TEXT,
    color TEXT,
    start_at TIMESTAMPTZ,
    duration_minutes INT,
    timezone TEXT,
    reminder_minutes_before INT,
    status TEXT,
    is_recurring BOOLEAN,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_rec RECORD;
    v_curr_date DATE;
    v_start_date DATE;
    v_end_date DATE;
    v_dow INT;
    v_occ_start TIMESTAMPTZ;
    v_override public.planner_occurrence_overrides%ROWTYPE;
    v_occ_count INT;
    v_match BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 1. Non-recurring activities
    RETURN QUERY
    SELECT
        a.id AS id,
        a.id AS activity_id,
        NULL::UUID AS rule_id,
        a.user_id,
        a.type,
        a.title,
        a.subject_id,
        a.subject_name,
        a.notes,
        a.priority,
        a.color,
        a.start_at,
        a.duration_minutes,
        a.timezone,
        a.reminder_minutes_before,
        a.status,
        FALSE AS is_recurring,
        a.created_at
    FROM public.planner_activities a
    WHERE a.user_id = v_user_id
      AND a.recurrence_rule_id IS NULL
      AND a.start_at >= from_ts
      AND a.start_at <= to_ts;

    -- 2. Recurring activities
    FOR v_rec IN
        SELECT
            a.id AS act_id,
            a.type AS act_type,
            a.title AS act_title,
            a.subject_id AS act_subject_id,
            a.subject_name AS act_subject_name,
            a.notes AS act_notes,
            a.priority AS act_priority,
            a.color AS act_color,
            a.start_at AS act_start_at,
            a.duration_minutes AS act_duration_minutes,
            a.timezone AS act_timezone,
            a.reminder_minutes_before AS act_reminder_minutes_before,
            a.status AS act_status,
            a.created_at AS act_created_at,
            r.id AS r_id,
            r.frequency AS r_frequency,
            r.interval AS r_interval,
            r.days_of_week AS r_days_of_week,
            r.ends_on AS r_ends_on,
            r.max_occurrences AS r_max_occurrences
        FROM public.planner_activities a
        JOIN public.planner_recurrence_rules r ON a.recurrence_rule_id = r.id
        WHERE a.user_id = v_user_id
    LOOP
        v_start_date := (v_rec.act_start_at AT TIME ZONE v_rec.act_timezone)::DATE;
        v_end_date := (to_ts AT TIME ZONE v_rec.act_timezone)::DATE;

        IF v_rec.r_ends_on IS NOT NULL AND v_rec.r_ends_on < v_end_date THEN
            v_end_date := v_rec.r_ends_on;
        END IF;

        v_curr_date := v_start_date;
        v_occ_count := 0;

        WHILE v_curr_date <= v_end_date LOOP
            v_dow := EXTRACT(DOW FROM v_curr_date)::INT; -- 0=Sun, 1=Mon, ..., 6=Sat
            v_match := FALSE;

            IF v_rec.r_frequency = 'daily' THEN
                IF ((v_curr_date - v_start_date) % v_rec.r_interval) = 0 THEN
                    v_match := TRUE;
                END IF;
            ELSIF v_rec.r_frequency = 'weekdays' THEN
                IF v_dow BETWEEN 1 AND 5 THEN
                    v_match := TRUE;
                END IF;
            ELSIF v_rec.r_frequency IN ('weekly', 'custom') THEN
                IF v_rec.r_days_of_week IS NOT NULL AND ARRAY_LENGTH(v_rec.r_days_of_week, 1) > 0 THEN
                    IF v_dow = ANY(v_rec.r_days_of_week) THEN
                        v_match := TRUE;
                    END IF;
                ELSE
                    -- Default to same day-of-week as start_at
                    IF v_dow = EXTRACT(DOW FROM v_start_date)::INT AND (((v_curr_date - v_start_date)/7) % v_rec.r_interval) = 0 THEN
                        v_match := TRUE;
                    END IF;
                END IF;
            END IF;

            IF v_match THEN
                v_occ_count := v_occ_count + 1;
                IF v_rec.r_max_occurrences IS NOT NULL AND v_occ_count > v_rec.r_max_occurrences THEN
                    EXIT;
                END IF;

                -- Calculate timestamp for this occurrence date
                v_occ_start := (v_curr_date + (v_rec.act_start_at AT TIME ZONE v_rec.act_timezone)::TIME) AT TIME ZONE v_rec.act_timezone;

                IF v_occ_start >= from_ts AND v_occ_start <= to_ts THEN
                    -- Check override
                    SELECT * INTO v_override
                    FROM public.planner_occurrence_overrides
                    WHERE rule_id = v_rec.r_id AND occurrence_date = v_curr_date;

                    IF FOUND THEN
                        IF v_override.status != 'cancelled' THEN
                            id := v_override.id;
                            activity_id := v_rec.act_id;
                            rule_id := v_rec.r_id;
                            user_id := v_user_id;
                            type := v_rec.act_type;
                            title := COALESCE(v_override.override_title, v_rec.act_title);
                            subject_id := v_rec.act_subject_id;
                            subject_name := v_rec.act_subject_name;
                            notes := COALESCE(v_override.override_notes, v_rec.act_notes);
                            priority := v_rec.act_priority;
                            color := v_rec.act_color;
                            start_at := COALESCE(v_override.override_start_at, v_occ_start);
                            duration_minutes := COALESCE(v_override.override_duration_minutes, v_rec.act_duration_minutes);
                            timezone := v_rec.act_timezone;
                            reminder_minutes_before := v_rec.act_reminder_minutes_before;
                            status := v_override.status;
                            is_recurring := TRUE;
                            created_at := v_rec.act_created_at;
                            RETURN NEXT;
                        END IF;
                    ELSE
                        id := v_rec.act_id;
                        activity_id := v_rec.act_id;
                        rule_id := v_rec.r_id;
                        user_id := v_user_id;
                        type := v_rec.act_type;
                        title := v_rec.act_title;
                        subject_id := v_rec.act_subject_id;
                        subject_name := v_rec.act_subject_name;
                        notes := v_rec.act_notes;
                        priority := v_rec.act_priority;
                        color := v_rec.act_color;
                        start_at := v_occ_start;
                        duration_minutes := v_rec.act_duration_minutes;
                        timezone := v_rec.act_timezone;
                        reminder_minutes_before := v_rec.act_reminder_minutes_before;
                        status := v_rec.act_status;
                        is_recurring := TRUE;
                        created_at := v_rec.act_created_at;
                        RETURN NEXT;
                    END IF;
                END IF;
            END IF;

            v_curr_date := v_curr_date + 1;
        END LOOP;
    END LOOP;
END;
$$;
