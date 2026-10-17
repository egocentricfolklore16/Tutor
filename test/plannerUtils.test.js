import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getNextHalfHour,
  formatTimeSlot,
  calculateEndTimeString,
  generateRecurrencePreview,
  suggestNextFreeSlot,
  getPlannerDefaults,
} from '../src/lib/plannerUtils.js';
import { plannerActivitySchema } from '../src/lib/plannerSchema.js';

test('getNextHalfHour rounds date to next 30-minute boundary', () => {
  const d = new Date('2025-05-24T14:15:00');
  const result = getNextHalfHour(d);
  assert.equal(result, '14:30');

  const d2 = new Date('2025-05-24T14:45:00');
  const result2 = getNextHalfHour(d2);
  assert.equal(result2, '15:00');
});

test('formatTimeSlot converts 24h string to 12h AM/PM format', () => {
  assert.equal(formatTimeSlot('14:30'), '2:30 PM');
  assert.equal(formatTimeSlot('09:05'), '9:05 AM');
  assert.equal(formatTimeSlot('00:00'), '12:00 AM');
  assert.equal(formatTimeSlot('12:00'), '12:00 PM');
});

test('calculateEndTimeString calculates accurate end time string', () => {
  assert.equal(calculateEndTimeString('14:00', 45), '2:45 PM');
  assert.equal(calculateEndTimeString('23:30', 60), '12:30 AM');
});

test('generateRecurrencePreview computes correct summary and next dates', () => {
  const preview = generateRecurrencePreview({
    startDate: '2025-05-26', // Mon
    frequency: 'weekly',
    interval: 1,
    daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
    endsMode: 'never',
  });

  assert.equal(preview.summary, 'Repeats every Mon, Wed, Fri');
  assert.equal(preview.previewDates.length, 3);
});

test('suggestNextFreeSlot shifts candidate time past conflicts', () => {
  const start = new Date('2025-05-24T14:00:00Z');
  const conflicts = [
    {
      start_at: '2025-05-24T14:00:00Z',
      end_at: '2025-05-24T14:45:00Z',
    },
  ];

  const suggested = suggestNextFreeSlot(start, 45, conflicts);
  assert.ok(suggested.suggestedStart > start);
});

test('getPlannerDefaults derives default startTime from preferredTime', () => {
  assert.equal(getPlannerDefaults('Morning').startTime, '09:00');
  assert.equal(getPlannerDefaults('Afternoon').startTime, '14:00');
  assert.equal(getPlannerDefaults('Evening').startTime, '19:00');
});

test('getPlannerDefaults falls back safely for Flexible, null, undefined, or unknown preferredTime', () => {
  const flexibleDefault = getPlannerDefaults('Flexible');
  const nullDefault = getPlannerDefaults(null);
  const undefinedDefault = getPlannerDefaults(undefined);
  const unknownDefault = getPlannerDefaults('Midnight');

  assert.ok(flexibleDefault.startTime.includes(':'));
  assert.ok(nullDefault.startTime.includes(':'));
  assert.ok(undefinedDefault.startTime.includes(':'));
  assert.ok(unknownDefault.startTime.includes(':'));
});

test('plannerActivitySchema validates valid payload and rejects invalid duration', () => {
  const validPayload = {
    type: 'study',
    title: '  Taxation Revision  ',
    date: '2025-05-24',
    startTime: '14:30',
    duration_minutes: 45,
    priority: 'important',
    recurring_frequency: 'none',
  };

  const parsed = plannerActivitySchema.safeParse(validPayload);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.title, 'Taxation Revision');
  }

  const invalidPayload = {
    ...validPayload,
    duration_minutes: 2, // Below min 5
  };

  const invalidParsed = plannerActivitySchema.safeParse(invalidPayload);
  assert.equal(invalidParsed.success, false);
});
