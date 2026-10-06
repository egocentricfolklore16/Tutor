import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getPreferredTimeNote } from '../src/lib/preferredTime.js';

test('getPreferredTimeNote maps all 4 onboarding choices accurately', () => {
  assert.strictEqual(
    getPreferredTimeNote('Morning'),
    'Since you focus best in the morning, schedule your key practice sessions early.'
  );
  assert.strictEqual(
    getPreferredTimeNote('Afternoon'),
    'Since you focus best in the afternoon, plan your deep work after midday.'
  );
  assert.strictEqual(
    getPreferredTimeNote('Evening'),
    'Since you focus best in the evening, save your main study sessions for tonight.'
  );
  assert.strictEqual(
    getPreferredTimeNote('Flexible'),
    'With a flexible focus window, pick a consistent time block that fits your day.'
  );
});

test('getPreferredTimeNote falls back safely when preferred time is missing, null, or unknown', () => {
  assert.strictEqual(
    getPreferredTimeNote(null),
    'Schedule your practice sessions when your energy and focus are highest.'
  );
  assert.strictEqual(
    getPreferredTimeNote(undefined),
    'Schedule your practice sessions when your energy and focus are highest.'
  );
  assert.strictEqual(
    getPreferredTimeNote('Midnight'),
    'Schedule your practice sessions when your energy and focus are highest.'
  );
});
