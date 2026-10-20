import { useState, useEffect, useCallback } from 'react';
import supabase from '../lib/supabase';
import { calculateEndTimeString, calculateMinutesBetween } from '../lib/plannerUtils';

export function generateRecurringOccurrences(rule, rangeFrom, rangeTo) {
  const occurrences = [];
  if (!rule || rule.is_active === false) return occurrences;

  const ruleStartStr = rule.start_date || new Date().toISOString().slice(0, 10);
  const ruleStart = new Date(`${ruleStartStr}T00:00:00`);

  const ruleEnd = rule.end_date ? new Date(`${rule.end_date}T23:59:59`) : null;

  const from = new Date(rangeFrom);
  const to = new Date(rangeTo);

  const startCheck = from > ruleStart ? new Date(from) : new Date(ruleStart);
  startCheck.setHours(0, 0, 0, 0);

  const endCheck = ruleEnd && ruleEnd < to ? new Date(ruleEnd) : new Date(to);
  endCheck.setHours(23, 59, 59, 999);

  if (startCheck > endCheck) return occurrences;

  const curr = new Date(startCheck);

  while (curr <= endCheck) {
    let matches = false;
    const dayOfWeek = curr.getDay(); // 0=Sun..6=Sat
    const dayOfMonth = curr.getDate();

    switch (rule.frequency) {
      case 'daily':
        matches = true;
        break;
      case 'weekdays':
        matches = dayOfWeek >= 1 && dayOfWeek <= 5;
        break;
      case 'weekly':
        if (Array.isArray(rule.days_of_week) && rule.days_of_week.length > 0) {
          matches = rule.days_of_week.includes(dayOfWeek);
        }
        break;
      case 'monthly':
        matches = dayOfMonth === ruleStart.getDate();
        break;
      default:
        matches = false;
    }

    if (matches) {
      const year = curr.getFullYear();
      const month = String(curr.getMonth() + 1).padStart(2, '0');
      const day = String(curr.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const startTime = rule.start_time ? rule.start_time.slice(0, 5) : '09:00';

      occurrences.push({
        id: `rec-${rule.id}-${dateStr}`,
        activityId: rule.id,
        ruleId: rule.id,
        type: 'recurring_session',
        activityType: 'session',
        title: rule.title,
        subject: rule.subject || '',
        date: new Date(`${dateStr}T${startTime}:00`),
        startTime: startTime,
        duration: rule.duration_minutes || 25,
        reminder: rule.reminder_minutes ?? 15,
        frequency: rule.frequency,
        days_of_week: rule.days_of_week,
        isRecurring: true,
        status: 'scheduled',
        color: 'bg-purple-600',
      });
    }

    curr.setDate(curr.getDate() + 1);
  }

  return occurrences;
}

export function usePlannerActivities(dateRange = {}) {
  const [activities, setActivities] = useState([]);
  const [recurringRules, setRecurringRules] = useState([]);
  const [deadlinesList, setDeadlinesList] = useState([]);
  const [timeBlocksList, setTimeBlocksList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchActivities = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setActivities([]);
        setRecurringRules([]);
        setDeadlinesList([]);
        setTimeBlocksList([]);
        setIsLoading(false);
        return;
      }

      const fromTs = dateRange.from
        ? new Date(dateRange.from).toISOString()
        : new Date(Date.now() - 14 * 86400000).toISOString();
      const toTs = dateRange.to
        ? new Date(dateRange.to).toISOString()
        : new Date(Date.now() + 30 * 86400000).toISOString();

      // Fetch in parallel from exact tables
      const [studyRes, deadlinesRes, timeBlocksRes, recurringRes] = await Promise.all([
        supabase
          .from('Study')
          .select('*')
          .eq('user_id', user.id)
          .neq('session_status', 'completed'),
        supabase
          .from('deadlines')
          .select('*')
          .eq('user_id', user.id),
        supabase
          .from('time_blocks')
          .select('*')
          .eq('user_id', user.id),
        supabase
          .from('recurring_sessions')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true),
      ]);

      if (studyRes.error) console.error('Error fetching Study table:', studyRes.error);
      if (deadlinesRes.error) console.error('Error fetching deadlines:', deadlinesRes.error);
      if (timeBlocksRes.error) console.error('Error fetching time_blocks:', timeBlocksRes.error);
      if (recurringRes.error) console.error('Error fetching recurring_sessions:', recurringRes.error);

      // Map Study sessions (normal one-off only)
      const studyMapped = (studyRes.data || []).map((session) => {
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
          type: 'study',
          activityType: session.activity_type || 'session',
          title: session.Topic || session.Subject || 'Study Session',
          subject: session.Subject || '',
          date: new Date(`${session.Date}T${session.Start || '09:00'}:00`),
          startTime: session.Start || '09:00',
          duration: Math.round(Number(session.Duration || 0.75) * 60),
          reminder: session.reminder_minutes ?? 15,
          priority: session.Status === 'very important' ? 'urgent' : session.Status === 'not so important' ? 'low' : 'normal',
          status: session.session_status || 'scheduled',
          color,
          isRecurring: false,
          completed: Boolean(session.completed),
        };
      });

      // Map Deadlines
      const rawDeadlines = deadlinesRes.data || [];
      const deadlinesMapped = rawDeadlines.map((dl) => ({
        id: dl.id,
        activityId: dl.id,
        type: 'deadline',
        activityType: 'deadline',
        title: dl.title,
        subject: dl.subject || '',
        deadline: dl.due_date,
        due_date: dl.due_date,
        date: new Date(`${dl.due_date}T00:00:00`),
        priority: dl.status || 'medium',
        status: dl.status || 'medium',
        reminder: dl.reminder_minutes ?? 15,
        color: 'bg-red-500',
        isRecurring: false,
      }));

      // Map Time Blocks
      const rawTimeBlocks = timeBlocksRes.data || [];
      const timeBlocksMapped = rawTimeBlocks.map((tb) => {
        const startTime = tb.start_time ? tb.start_time.slice(0, 5) : '09:00';
        const endTime = tb.end_time ? tb.end_time.slice(0, 5) : '10:00';
        const duration = calculateMinutesBetween(startTime, endTime);
        const dayLabel = new Date(`${tb.block_date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' });

        return {
          id: tb.id,
          activityId: tb.id,
          type: 'time_block',
          activityType: 'time_block',
          title: tb.purpose || 'Time Block',
          purpose: tb.purpose || 'Time Block',
          block_date: tb.block_date,
          date: new Date(`${tb.block_date}T${startTime}:00`),
          start_time: startTime,
          end_time: endTime,
          start: startTime,
          end: endTime,
          startTime: startTime,
          day: dayLabel,
          duration,
          color: 'bg-blue-600',
          isRecurring: false,
        };
      });

      // Map Recurring Sessions & Generate Occurrences
      const rawRecurring = recurringRes.data || [];
      const generatedOccurrences = [];
      rawRecurring.forEach((rule) => {
        const occurrences = generateRecurringOccurrences(rule, fromTs, toTs);
        generatedOccurrences.push(...occurrences);
      });

      const allPlannerItems = [
        ...studyMapped,
        ...deadlinesMapped,
        ...timeBlocksMapped,
        ...generatedOccurrences,
      ];

      setActivities(allPlannerItems);
      setRecurringRules(rawRecurring);
      setDeadlinesList(rawDeadlines);
      setTimeBlocksList(rawTimeBlocks);
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

  return {
    activities,
    recurringRules,
    deadlinesList,
    timeBlocksList,
    isLoading,
    error,
    refetch: fetchActivities,
  };
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
      }
      if (isMounted) setIsChecking(false);
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

      const targetType = payload.type;

      if (targetType === 'deadline') {
        const deadlinePayload = {
          user_id: user.id,
          title: payload.title.trim(),
          subject: payload.subject || null,
          due_date: payload.date || payload.due_date,
          status: payload.priority || payload.status || 'medium',
          reminder_minutes: payload.reminder !== null ? Number(payload.reminder) : 15,
        };

        const { data, error: err } = await supabase
          .from('deadlines')
          .insert(deadlinePayload)
          .select()
          .single();

        if (err) throw err;
        setIsSaving(false);
        return data;
      }

      if (targetType === 'time_block') {
        const startTime = payload.startTime || payload.start_time;
        let endTime = payload.endTime || payload.end_time;
        if (!endTime && startTime && payload.duration) {
          endTime = calculateEndTimeString(startTime, payload.duration);
        }

        if (endTime <= startTime) {
          throw new Error('End time must be after start time.');
        }

        const blockPayload = {
          user_id: user.id,
          block_date: payload.date || payload.block_date,
          start_time: startTime,
          end_time: endTime,
          purpose: payload.title?.trim() || payload.purpose?.trim() || 'Protected Time Block',
        };

        const { data, error: err } = await supabase
          .from('time_blocks')
          .insert(blockPayload)
          .select()
          .single();

        if (err) throw err;
        setIsSaving(false);
        return data;
      }

      if (targetType === 'recurring_session') {
        let freq = payload.recurring_frequency || payload.frequency || 'daily';
        if (freq === 'custom') freq = 'weekly';

        const daysOfWeek = payload.recurring_days_of_week || payload.days_of_week || null;
        if (freq === 'weekly' && (!Array.isArray(daysOfWeek) || daysOfWeek.length === 0)) {
          throw new Error('Please select at least one day of the week for weekly recurring sessions.');
        }

        const recurringPayload = {
          user_id: user.id,
          title: payload.title.trim(),
          subject: payload.subject || null,
          start_time: payload.startTime || payload.start_time || '09:00',
          duration_minutes: Number(payload.duration || payload.duration_minutes || 25),
          frequency: freq,
          days_of_week: freq === 'weekly' ? daysOfWeek : null,
          start_date: payload.date || payload.start_date || new Date().toISOString().slice(0, 10),
          end_date: payload.recurring_ends_on || payload.end_date || null,
          reminder_minutes: payload.reminder !== null ? Number(payload.reminder) : 15,
          is_active: true,
        };

        const { data, error: err } = await supabase
          .from('recurring_sessions')
          .insert(recurringPayload)
          .select()
          .single();

        if (err) throw err;
        setIsSaving(false);
        return data;
      }

      // Default: insert into "Study" table for standard study sessions
      const studyPayload = {
        user_id: user.id,
        Subject: payload.subject || 'General',
        Topic: payload.title.trim(),
        Status: payload.priority === 'urgent' ? 'very important' : payload.priority === 'low' ? 'not so important' : 'medium',
        Date: payload.date,
        Start: payload.startTime || '09:00',
        Duration: Number(payload.duration || 45) / 60,
        reminder_minutes: payload.reminder !== null ? Number(payload.reminder) : 15,
        session_status: 'active',
      };

      const { data, error: err } = await supabase
        .from('Study')
        .insert(studyPayload)
        .select()
        .single();

      if (err) throw err;
      setIsSaving(false);
      return data;
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

  const updateActivity = async (id, payload) => {
    setIsSaving(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const targetType = payload.type;

      if (targetType === 'deadline') {
        const updateData = {};
        if (payload.title) updateData.title = payload.title.trim();
        if (payload.subject !== undefined) updateData.subject = payload.subject;
        if (payload.date || payload.due_date) updateData.due_date = payload.date || payload.due_date;
        if (payload.priority || payload.status) updateData.status = payload.priority || payload.status;
        if (payload.reminder !== undefined) updateData.reminder_minutes = payload.reminder;

        const { error: err } = await supabase
          .from('deadlines')
          .update(updateData)
          .eq('id', id)
          .eq('user_id', user.id);

        if (err) throw err;
        setIsSaving(false);
        return;
      }

      if (targetType === 'time_block') {
        const updateData = {};
        if (payload.title || payload.purpose) updateData.purpose = payload.title?.trim() || payload.purpose?.trim();
        if (payload.date || payload.block_date) updateData.block_date = payload.date || payload.block_date;
        if (payload.startTime || payload.start_time) updateData.start_time = payload.startTime || payload.start_time;
        if (payload.endTime || payload.end_time) updateData.end_time = payload.endTime || payload.end_time;

        const { error: err } = await supabase
          .from('time_blocks')
          .update(updateData)
          .eq('id', id)
          .eq('user_id', user.id);

        if (err) throw err;
        setIsSaving(false);
        return;
      }

      if (targetType === 'recurring_session' || payload.recurring_frequency) {
        const updateData = {};
        if (payload.title) updateData.title = payload.title.trim();
        if (payload.subject !== undefined) updateData.subject = payload.subject;
        if (payload.startTime || payload.start_time) updateData.start_time = payload.startTime || payload.start_time;
        if (payload.duration || payload.duration_minutes) updateData.duration_minutes = Number(payload.duration || payload.duration_minutes);

        if (payload.recurring_frequency || payload.frequency) {
          let freq = payload.recurring_frequency || payload.frequency;
          if (freq === 'custom') freq = 'weekly';
          updateData.frequency = freq;
        }

        if (payload.recurring_days_of_week || payload.days_of_week) updateData.days_of_week = payload.recurring_days_of_week || payload.days_of_week;
        if (payload.reminder !== undefined) updateData.reminder_minutes = payload.reminder;

        const { error: err } = await supabase
          .from('recurring_sessions')
          .update(updateData)
          .eq('id', id)
          .eq('user_id', user.id);

        if (err) throw err;
        setIsSaving(false);
        return;
      }

      // Default: Update "Study"
      const updateData = {};
      if (payload.title) updateData.Topic = payload.title.trim();
      if (payload.subject !== undefined) updateData.Subject = payload.subject;
      if (payload.date) updateData.Date = payload.date;
      if (payload.startTime) updateData.Start = payload.startTime;
      if (payload.duration) updateData.Duration = Number(payload.duration) / 60;
      if (payload.status) updateData.session_status = payload.status;
      if (payload.completed !== undefined) updateData.completed = payload.completed;

      const { error: err } = await supabase
        .from('Study')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id);

      if (err) throw err;
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

  const deleteActivity = async (activityId, activityType = 'study') => {
    setIsDeleting(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      if (activityType === 'deadline') {
        const { error: err } = await supabase
          .from('deadlines')
          .delete()
          .eq('id', activityId)
          .eq('user_id', user.id);
        if (err) throw err;
        setIsDeleting(false);
        return;
      }

      if (activityType === 'time_block') {
        const { error: err } = await supabase
          .from('time_blocks')
          .delete()
          .eq('id', activityId)
          .eq('user_id', user.id);
        if (err) throw err;
        setIsDeleting(false);
        return;
      }

      if (activityType === 'recurring_session') {
        const { error: err } = await supabase
          .from('recurring_sessions')
          .delete()
          .eq('id', activityId)
          .eq('user_id', user.id);
        if (err) throw err;
        setIsDeleting(false);
        return;
      }

      // Try deleting from Study table, with fallbacks if needed
      const { error: studyErr } = await supabase
        .from('Study')
        .delete()
        .eq('id', activityId)
        .eq('user_id', user.id);

      if (studyErr) {
        // Fallback checks
        await supabase.from('deadlines').delete().eq('id', activityId).eq('user_id', user.id);
        await supabase.from('time_blocks').delete().eq('id', activityId).eq('user_id', user.id);
        await supabase.from('recurring_sessions').delete().eq('id', activityId).eq('user_id', user.id);
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
