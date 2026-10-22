import test from 'node:test';
import assert from 'node:assert/strict';
import { toDate, toTime } from '../src/lib/dates.js';

test('toDate converts valid date formats to Date instances', () => {
  const d1 = new Date('2025-01-01T00:00:00Z');
  assert.equal(toDate(d1), d1);

  const isoStr = '2025-05-10T12:00:00.000Z';
  const resStr = toDate(isoStr);
  assert.ok(resStr instanceof Date);
  assert.equal(resStr.getTime(), new Date(isoStr).getTime());

  const num = 1700000000000;
  const resNum = toDate(num);
  assert.ok(resNum instanceof Date);
  assert.equal(resNum.getTime(), num);
});

test('toDate returns null for invalid, empty, or nullish inputs', () => {
  assert.equal(toDate(null), null);
  assert.equal(toDate(undefined), null);
  assert.equal(toDate(''), null);
  assert.equal(toDate('not-a-date'), null);
  assert.equal(toDate(new Date('invalid')), null);
  assert.equal(toDate(NaN), null);
});

test('toTime returns epoch timestamp or 0 fallback', () => {
  const now = Date.now();
  assert.equal(toTime(now), now);
  assert.equal(toTime(new Date(now)), now);
  assert.equal(toTime('2025-01-01T00:00:00Z'), new Date('2025-01-01T00:00:00Z').getTime());

  assert.equal(toTime(null), 0);
  assert.equal(toTime(undefined), 0);
  assert.equal(toTime('invalid'), 0);
});
