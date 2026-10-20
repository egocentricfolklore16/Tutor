import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { isSlipping, getOverdueDuration } from '../src/lib/plannerUtils.js';

describe('isSlipping pure helper', () => {
  test('returns false for session exactly 59 min overdue', () => {
    const now = new Date(2025, 4, 24, 15, 0, 0, 0); // 3:00 PM
    const session = {
      Date: '2025-05-24',
      Start: '14:01', // Scheduled for 2:01 PM -> 59 mins ago
      completed: false,
      session_status: 'active',
    };

    assert.strictEqual(isSlipping(session, now), false);
    const duration = getOverdueDuration(session, now);
    assert.strictEqual(duration.totalMinutes, 59);
    assert.strictEqual(duration.display, '59m overdue');
  });

  test('returns false for session exactly 60 min overdue', () => {
    const now = new Date(2025, 4, 24, 15, 0, 0, 0); // 3:00 PM
    const session = {
      Date: '2025-05-24',
      Start: '14:00', // Scheduled for 2:00 PM -> exactly 60 mins ago
      completed: false,
      session_status: 'active',
    };

    assert.strictEqual(isSlipping(session, now), false);
    const duration = getOverdueDuration(session, now);
    assert.strictEqual(duration.totalMinutes, 60);
    assert.strictEqual(duration.display, '1h overdue');
  });

  test('returns true for session 61 min overdue', () => {
    const now = new Date(2025, 4, 24, 15, 0, 0, 0); // 3:00 PM
    const session = {
      Date: '2025-05-24',
      Start: '13:59', // Scheduled for 1:59 PM -> 61 mins ago
      completed: false,
      session_status: 'active',
    };

    assert.strictEqual(isSlipping(session, now), true);
    const duration = getOverdueDuration(session, now);
    assert.strictEqual(duration.totalMinutes, 61);
    assert.strictEqual(duration.display, '1h 1m overdue');
  });

  test('returns false for a future session', () => {
    const now = new Date(2025, 4, 24, 12, 0, 0, 0); // 12:00 PM
    const session = {
      Date: '2025-05-24',
      Start: '14:00', // Scheduled for 2:00 PM today
      completed: false,
      session_status: 'active',
    };

    assert.strictEqual(isSlipping(session, now), false);
  });

  test('returns false for a completed session', () => {
    const now = new Date(2025, 4, 24, 18, 0, 0, 0); // 6:00 PM
    const sessionCompletedBool = {
      Date: '2025-05-24',
      Start: '10:00',
      completed: true,
      session_status: 'active',
    };

    const sessionCompletedStatus = {
      Date: '2025-05-24',
      Start: '10:00',
      completed: false,
      session_status: 'completed',
    };

    assert.strictEqual(isSlipping(sessionCompletedBool, now), false);
    assert.strictEqual(isSlipping(sessionCompletedStatus, now), false);
  });

  test('returns false for an in-progress or paused session', () => {
    const now = new Date(2025, 4, 24, 18, 0, 0, 0); // 6:00 PM
    const inProgressSession = {
      Date: '2025-05-24',
      Start: '10:00',
      completed: false,
      session_status: 'in_progress',
    };

    const pausedSession = {
      Date: '2025-05-24',
      Start: '10:00',
      completed: false,
      session_status: 'paused',
    };

    assert.strictEqual(isSlipping(inProgressSession, now), false);
    assert.strictEqual(isSlipping(pausedSession, now), false);
  });

  test('handles a session crossing midnight correctly', () => {
    // Scheduled at 11:30 PM on May 24th
    const session = {
      Date: '2025-05-24',
      Start: '23:30',
      completed: false,
      session_status: 'active',
    };

    // 12:20 AM on May 25th (50 mins later)
    const now50m = new Date(2025, 4, 25, 0, 20, 0, 0);
    assert.strictEqual(isSlipping(session, now50m), false);

    // 12:31 AM on May 25th (61 mins later)
    const now61m = new Date(2025, 4, 25, 0, 31, 0, 0);
    assert.strictEqual(isSlipping(session, now61m), true);

    const duration = getOverdueDuration(session, now61m);
    assert.strictEqual(duration.display, '1h 1m overdue');
  });

  test('handles different local date parsing and scheduled_start objects', () => {
    const now = new Date(2025, 4, 24, 16, 0, 0, 0);

    const dateObjSession = {
      date: new Date(2025, 4, 24, 14, 0, 0, 0), // 2:00 PM local
      completed: false,
      session_status: 'scheduled',
    };
    assert.strictEqual(isSlipping(dateObjSession, now), true); // 120 mins overdue

    const scheduledStartSession = {
      scheduled_start: new Date(2025, 4, 24, 14, 0, 0, 0).toISOString(),
      completed: false,
      session_status: 'scheduled',
    };
    assert.strictEqual(isSlipping(scheduledStartSession, now), true);
  });
});
