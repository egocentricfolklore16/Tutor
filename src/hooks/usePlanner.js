import { useState, useEffect, useCallback } from 'react';
import supabase from '../lib/supabase';
import { savePlannerDefaults, getUserTimezone } from '../lib/plannerUtils';

export function usePlannerActivities(dateRange = {}) {
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchActivities = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setActivities([]);
        setIsLoading(false);
        return;
      }

      const fromTs = dateRange.from
        ? new Date(dateRange.from).toISOString()
        : new Date(Date.now() - 14 * 86400000).toISOString();
      const toTs = dateRange.to
        ? new Date(dateRange.to).toISOString()
        : new Date(Date.now() + 30 * 86400000).toISOString();

      // Try RPC get_planner_occurrences
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_planner_occurrences', {
        from_ts: fromTs,
        to_ts: toTs,
      });

      if (!rpcError && Array.isArray(rpcData)) {
        const mapped = rpcData.map((item) => {
          let color = item.color || 'bg-blue-500';
          if (!item.color) {
            switch (item.priority) {
              case 'urgent':
              case 'important':
                color = 'bg-red-500';
                break;
              case 'low':
                color = 'bg-emerald-500';
                break;
              default:
                color = 'bg-blue-500';
            }
          }

          const startDate = new Date(item.start_at);
          const hours = String(startDate.getHours()).padStart(2, '0');
          const mins = String(startDate.getMinutes()).padStart(2, '0');
          const startTimeStr = `${hours}:${mins}`;

          return {
            id: item.id,
            activityId: item.activity_id,
            ruleId: item.rule_id,
            type: item.type,
            title: item.title,
            subject: item.subject_name || '',
            subjectId: item.subject_id,
            notes: item.notes || '',
            priority: item.priority,
            color,
            date: startDate,
            startTime: startTimeStr,
            duration: item.duration_minutes,
            reminder: item.reminder_minutes_before ?? 15,
            status: item.status,
            isRecurring: Boolean(item.is_recurring),
          };
        });

        setActivities(mapped);
        setIsLoading(false);
        return;
      }

      // Legacy fallback query to "Study" table if new RPC is not yet created
      console.warn('RPC get_planner_occurrences fallback to legacy Study table:', rpcError?.message);
      const { data: legacyData, error: legacyError } = await supabase
        .from('Study')
        .select('id,Subject,Topic,Status,Date,"Start",Duration,recurring,reminder_minutes,deadline,activity_type,session_status')
        .eq('user_id', user.id)
        .neq('session_status', 'completed');

      if (legacyError) {
        throw legacyError;
      }

      const legacyMapped = (legacyData || []).map((session) => {
        let color = 'bg-blue-500';
        switch (session.Status?.trim().toLowerCase()) {
          case 'very important':
          case 'important':
            color = 'bg-red-500';
            break;
          case 'not so important':
          case 'low':
            color = 'bg-emerald-500';
            break;
          case 'medium':
            color = 'bg-amber-500';
            break;
          default:
            color = 'bg-blue-500';
        }

        return {
          id: session.id,
          activityId: session.id,
          type: session.activity_type || 'study',
          title: session.Topic,
          subject: session.Subject,
          date: new Date(session.Date),
          startTime: session.Start,
          duration: Math.round(Number(session.Duration || 1) * 60),
          reminder: session.reminder_minutes ?? 15,
          priority: session.Status === 'very important' ? 'urgent' : session.Status === 'not so important' ? 'low' : 'normal',
          status: session.session_status || 'scheduled',
          color,
          isRecurring: Boolean(session.recurring && session.recurring !== 'none'),
        };
      });

      setActivities(legacyMapped);
    } catch (err) {
      console.error('Failed to fetch planner activities:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [dateRange.from, dateRange.to]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  return { activities, isLoading, error, refetch: fetchActivities };
}

export function usePlannerConflicts(startAt, durationMinutes, excludeId = null) {
  const [conflicts, setConflicts] = useState([]);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (!startAt || !durationMinutes) {
      setConflicts([]);
      return;
    }

    let isMounted = true;
    const timer = setTimeout(async () => {
      setIsChecking(true);
      try {
        const { data, error } = await supabase.rpc('find_planner_conflicts', {
          p_start_at: new Date(startAt).toISOString(),
          p_duration_minutes: Number(durationMinutes),
          p_exclude_activity_id: excludeId || null,
        });

        if (!error && Array.isArray(data) && isMounted) {
          setConflicts(data);
        } else {
          if (isMounted) setConflicts([]);
        }
      } catch (err) {
        console.warn('Conflict check error:', err);
        if (isMounted) setConflicts([]);
      } finally {
        if (isMounted) setIsChecking(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      isMounted = false;
    };
  }, [startAt, durationMinutes, excludeId]);

  return { conflicts, isChecking };
}

export function useCreateActivity() {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const createActivity = async (payload) => {
    setIsSaving(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const startAtDate = new Date(`${payload.date}T${payload.startTime}:00`);
      let recurrenceRuleId = null;

      // 1. Create recurrence rule if recurring
      if (payload.recurring_frequency && payload.recurring_frequency !== 'none') {
        const { data: ruleData, error: ruleErr } = await supabase
          .from('planner_recurrence_rules')
          .insert({
            user_id: user.id,
            frequency: payload.recurring_frequency,
            interval: payload.recurring_interval || 1,
            days_of_week: payload.recurring_days_of_week || null,
            ends_on: payload.recurring_ends_mode === 'on_date' ? payload.recurring_ends_on : null,
            max_occurrences: payload.recurring_ends_mode === 'after_count' ? payload.recurring_max_occurrences : null,
          })
          .select('id')
          .single();

        if (ruleErr) throw ruleErr;
        recurrenceRuleId = ruleData.id;
      }

      // 2. Insert planner activity
      const activityPayload = {
        user_id: user.id,
        type: payload.type,
        title: payload.title.trim(),
        subject_id: payload.subject_id || null,
        subject_name: payload.subject || payload.subject_name || null,
        notes: payload.notes?.trim() || null,
        priority: payload.priority || 'normal',
        color: payload.color || '#3B82F6',
        start_at: startAtDate.toISOString(),
        duration_minutes: Number(payload.duration_minutes || payload.duration || 45),
        timezone: getUserTimezone(),
        reminder_minutes_before: payload.reminder_minutes_before ?? payload.reminder ?? 15,
        recurrence_rule_id: recurrenceRuleId,
        break_reminder: Boolean(payload.break_reminder),
      };

      const { data: actData, error: actErr } = await supabase
        .from('planner_activities')
        .insert(activityPayload)
        .select()
        .single();

      if (actErr) {
        // Fallback to legacy Study table if new table doesn't exist
        console.warn('planner_activities insert fallback to Study:', actErr.message);
        const { data: studyData, error: studyErr } = await supabase
          .from('Study')
          .insert({
            user_id: user.id,
            Subject: payload.subject || 'General',
            Topic: payload.title.trim(),
            Status: payload.priority === 'urgent' ? 'very important' : payload.priority === 'low' ? 'not so important' : 'medium',
            Date: payload.date,
            Start: payload.startTime,
            Duration: Number(payload.duration_minutes || 45) / 60,
            recurring: payload.recurring_frequency || 'none',
            reminder_minutes: payload.reminder_minutes_before ?? 15,
            activity_type: payload.type,
            session_status: 'active',
          })
          .select('id')
          .single();

        if (studyErr) throw studyErr;

        savePlannerDefaults({
          duration: payload.duration_minutes,
          reminder: payload.reminder_minutes_before,
          subject: payload.subject,
          priority: payload.priority,
          color: payload.color,
        });

        setIsSaving(false);
        return { id: studyData.id, legacy: true };
      }

      // Trigger reminder regeneration
      await supabase.rpc('regenerate_planner_reminders', { p_activity_id: actData.id });

      savePlannerDefaults({
        duration: payload.duration_minutes,
        reminder: payload.reminder_minutes_before,
        subject: payload.subject,
        priority: payload.priority,
        color: payload.color,
      });

      setIsSaving(false);
      return actData;
    } catch (err) {
      console.error('Failed to create activity:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setIsSaving(false);
      throw new Error(msg);
    }
  };

  return { createActivity, isSaving, error };
}

export function useUpdateActivity() {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const updateActivity = async (id, payload, scope = 'all') => {
    setIsSaving(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const startAtDate = new Date(`${payload.date}T${payload.startTime}:00`);

      if (scope === 'this_only' && payload.ruleId) {
        // Create or update planner_occurrence_overrides
        const { error: ovErr } = await supabase
          .from('planner_occurrence_overrides')
          .upsert({
            user_id: user.id,
            rule_id: payload.ruleId,
            occurrence_date: payload.date,
            status: payload.status || 'scheduled',
            override_title: payload.title?.trim() || null,
            override_start_at: startAtDate.toISOString(),
            override_duration_minutes: Number(payload.duration_minutes || 45),
            override_notes: payload.notes?.trim() || null,
          });

        if (ovErr) throw ovErr;
        setIsSaving(false);
        return;
      }

      // Scope = all or non-recurring update
      const updateData = {
        title: payload.title?.trim(),
        subject_id: payload.subject_id || null,
        subject_name: payload.subject || payload.subject_name || null,
        notes: payload.notes?.trim() || null,
        priority: payload.priority || 'normal',
        color: payload.color || '#3B82F6',
        start_at: startAtDate.toISOString(),
        duration_minutes: Number(payload.duration_minutes || 45),
        reminder_minutes_before: payload.reminder_minutes_before ?? 15,
        status: payload.status || 'scheduled',
        break_reminder: Boolean(payload.break_reminder),
      };

      const { error: actErr } = await supabase
        .from('planner_activities')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id);

      if (actErr) {
        // Try fallback to legacy Study table
        await supabase
          .from('Study')
          .update({
            Topic: payload.title?.trim(),
            Subject: payload.subject,
            Date: payload.date,
            Start: payload.startTime,
            Duration: Number(payload.duration_minutes || 45) / 60,
          })
          .eq('id', id)
          .eq('user_id', user.id);
      } else {
        await supabase.rpc('regenerate_planner_reminders', { p_activity_id: id });
      }

      setIsSaving(false);
    } catch (err) {
      console.error('Failed to update activity:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setIsSaving(false);
      throw new Error(msg);
    }
  };

  return { updateActivity, isSaving, error };
}

export function useDeleteActivity() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);

  const deleteActivity = async (activityId, scope = 'all', ruleId = null, dateStr = null) => {
    setIsDeleting(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      if (scope === 'this_only' && ruleId && dateStr) {
        // Mark this single occurrence as cancelled in overrides
        const { error: ovErr } = await supabase
          .from('planner_occurrence_overrides')
          .upsert({
            user_id: user.id,
            rule_id: ruleId,
            occurrence_date: dateStr,
            status: 'cancelled',
          });

        if (ovErr) throw ovErr;
        setIsDeleting(false);
        return;
      }

      // Full deletion
      const { error: actErr } = await supabase
        .from('planner_activities')
        .delete()
        .eq('id', activityId)
        .eq('user_id', user.id);

      if (actErr) {
        // Fallback delete on legacy Study table
        await supabase.from('Study').delete().eq('id', activityId).eq('user_id', user.id);
      }

      setIsDeleting(false);
    } catch (err) {
      console.error('Failed to delete activity:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setIsDeleting(false);
      throw new Error(msg);
    }
  };

  return { deleteActivity, isDeleting, error };
}
