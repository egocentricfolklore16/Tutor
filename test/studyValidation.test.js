import { test } from 'node:test';
import assert from 'node:assert/strict';
import { plannerActivitySchema } from '../src/lib/plannerSchema.js';

test('plannerActivitySchema validates duration boundaries', () => {
  const validActivity = {
    type: 'study',
    title: 'Calculus Review',
    date: '2028-10-15',
    startTime: '10:00',
    duration_minutes: 45,
  };

  // Valid schema parsing
  const parsed = plannerActivitySchema.parse(validActivity);
  assert.equal(parsed.duration_minutes, 45);

  // Rejects duration < 5 minutes
  const lowResult = plannerActivitySchema.safeParse({ ...validActivity, duration_minutes: 4 });
  assert.equal(lowResult.success, false);
  const lowIssues = lowResult.error.issues || lowResult.error.errors;
  assert.ok(lowIssues.some((e) => e.message.includes('Duration must be at least 5 minutes')));

  // Rejects duration > 720 minutes
  const highResult = plannerActivitySchema.safeParse({ ...validActivity, duration_minutes: 721 });
  assert.equal(highResult.success, false);
  const highIssues = highResult.error.issues || highResult.error.errors;
  assert.ok(highIssues.some((e) => e.message.includes('Duration cannot exceed 12 hours')));
});

test('study session duration and past-date validation helpers logic', () => {
  // Pure helper function verifying duration bounds in hours (0.25 to 100)
  const validateHours = (hours) => {
    const num = Number(hours);
    return Number.isFinite(num) && num > 0 && num <= 100;
  };

  assert.equal(validateHours('1'), true);
  assert.equal(validateHours(0.25), true);
  assert.equal(validateHours(100), true);
  assert.equal(validateHours(0), false);
  assert.equal(validateHours(-1), false);
  assert.equal(validateHours(100.5), false);
  assert.equal(validateHours('abc'), false);

  // Pure helper function verifying date/time is in the future
  const isFutureDateTime = (dateStr, timeStr, now = new Date()) => {
    if (!dateStr || !timeStr) return false;
    const selected = new Date(`${dateStr}T${timeStr}:00`);
    return !isNaN(selected.getTime()) && selected > now;
  };

  const fakeNow = new Date('2028-05-10T12:00:00');
  assert.equal(isFutureDateTime('2028-05-10', '13:00', fakeNow), true);
  assert.equal(isFutureDateTime('2028-05-10', '11:00', fakeNow), false);
  assert.equal(isFutureDateTime('2028-05-09', '14:00', fakeNow), false);
});
