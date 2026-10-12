import { z } from 'zod';

export const plannerActivitySchema = z.object({
  id: z.string().optional(),
  type: z.enum(['time_block', 'recurring_session', 'study', 'deadline']),
  title: z
    .string()
    .transform((val) => val.trim())
    .pipe(z.string().min(1, 'Title is required').max(100, 'Title is too long')),
  subject_id: z.string().nullable().optional(),
  subject_name: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  priority: z.enum(['low', 'normal', 'important', 'urgent']).default('normal'),
  color: z.string().nullable().optional(),
  date: z.string().min(1, 'Date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  duration_minutes: z
    .number({ invalid_type_error: 'Duration must be a number' })
    .min(5, 'Duration must be at least 5 minutes')
    .max(720, 'Duration cannot exceed 12 hours (720 minutes)'),
  timezone: z.string().default('UTC'),
  reminder_minutes_before: z.number().nullable().optional(),
  break_reminder: z.boolean().default(false),
  // Recurrence rule parameters
  recurring_frequency: z.enum(['none', 'daily', 'weekly', 'weekdays', 'custom']).default('none'),
  recurring_interval: z.number().min(1).default(1),
  recurring_days_of_week: z.array(z.number().min(0).max(6)).nullable().optional(),
  recurring_ends_mode: z.enum(['never', 'on_date', 'after_count']).default('never'),
  recurring_ends_on: z.string().nullable().optional(),
  recurring_max_occurrences: z.number().nullable().optional(),
});
