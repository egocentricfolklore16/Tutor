import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPreferredStudyDay } from '../src/lib/studyDays.js';

test('isPreferredStudyDay returns true when Date matches preferred days', () => {
  // 2026-10-12 is a Monday
  const mondayDate = new Date('2026-10-12T10:00:00Z');
  const preferred = ['Mon', 'Wed', 'Fri'];

  assert.equal(isPreferredStudyDay(mondayDate, preferred), true);
});

test('isPreferredStudyDay returns false when Date does not match preferred days', () => {
  // 2026-10-13 is a Tuesday
  const tuesdayDate = new Date('2026-10-13T10:00:00Z');
  const preferred = ['Mon', 'Wed', 'Fri'];

  assert.equal(isPreferredStudyDay(tuesdayDate, preferred), false);
});

test('isPreferredStudyDay handles full weekday strings and case variations', () => {
  const preferred = ['Mon', 'Thu', 'Sun'];

  assert.equal(isPreferredStudyDay('Monday', preferred), true);
  assert.equal(isPreferredStudyDay('mon', preferred), true);
  assert.equal(isPreferredStudyDay('THURSDAY', preferred), true);
  assert.equal(isPreferredStudyDay('Tue', preferred), false);
});

test('isPreferredStudyDay falls back safely when inputs are null, undefined, invalid, or empty', () => {
  assert.equal(isPreferredStudyDay(null, ['Mon']), false);
  assert.equal(isPreferredStudyDay(undefined, ['Mon']), false);
  assert.equal(isPreferredStudyDay(new Date('invalid date'), ['Mon']), false);
  assert.equal(isPreferredStudyDay(new Date(), null), false);
  assert.equal(isPreferredStudyDay(new Date(), undefined), false);
  assert.equal(isPreferredStudyDay(new Date(), []), false);
  assert.equal(isPreferredStudyDay('', ['Mon']), false);
  assert.equal(isPreferredStudyDay(12345, ['Mon']), false);
});
