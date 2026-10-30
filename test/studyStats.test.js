import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStudyStatsAnalytics } from '../src/lib/studyStatsUtils.js';

test('computeStudyStatsAnalytics returns zero stats and empty subject array for empty data', () => {
  const result = computeStudyStatsAnalytics([], []);

  assert.equal(result.hasData, false);
  assert.equal(result.totalHours, 0);
  assert.equal(result.focusHours, 0);
  assert.equal(result.weekHours, 0);
  assert.equal(result.subjects.length, 0);
  assert.equal(result.chart.length, 7);
});

test('computeStudyStatsAnalytics accurately aggregates total and focus hours across sessions and history', () => {
  const now = new Date().toISOString();
  const sessions = [
    { Date: now, Duration: '2.5', Subject: 'Physics', session_status: 'completed' },
    { Date: now, Duration: '1.5', Subject: 'Maths', session_status: 'pending' },
  ];
  const history = [
    { completed_at: now, duration_minutes: 120, subject: 'Physics' }, // 2 hours
  ];

  const result = computeStudyStatsAnalytics(sessions, history);

  assert.equal(result.hasData, true);
  assert.equal(result.totalHours, 6); // 2.5 + 1.5 + 2
  assert.equal(result.focusHours, 4.5); // 2.5 (completed) + 2 (history)
  assert.equal(result.subjects.length, 2);

  const physics = result.subjects.find((s) => s.name === 'Physics');
  assert.ok(physics);
  assert.equal(physics.hours, 4.5);
  assert.equal(physics.performance, 'good');

  const maths = result.subjects.find((s) => s.name === 'Maths');
  assert.ok(maths);
  assert.equal(maths.hours, 1.5);
  assert.equal(maths.performance, 'good');
});

test('computeStudyStatsAnalytics evaluates performance tiers correctly (bad < 1.5h, good 1.5h-5h, excellent >= 5h)', () => {
  const now = new Date().toISOString();
  const sessions = [
    { Date: now, Duration: '1.0', Subject: 'History', session_status: 'completed' }, // bad (< 1.5h)
    { Date: now, Duration: '3.0', Subject: 'Chemistry', session_status: 'completed' }, // good (3.0h)
    { Date: now, Duration: '5.5', Subject: 'Biology', session_status: 'completed' }, // excellent (>= 5h)
  ];

  const result = computeStudyStatsAnalytics(sessions, []);

  const historySub = result.subjects.find((s) => s.name === 'History');
  assert.equal(historySub.performance, 'bad');
  assert.equal(historySub.color, 'bg-red-500');

  const chemistrySub = result.subjects.find((s) => s.name === 'Chemistry');
  assert.equal(chemistrySub.performance, 'good');
  assert.equal(chemistrySub.color, 'bg-yellow-500');

  const biologySub = result.subjects.find((s) => s.name === 'Biology');
  assert.equal(biologySub.performance, 'excellent');
  assert.equal(biologySub.color, 'bg-green-500');
});
