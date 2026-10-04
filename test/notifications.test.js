import { test } from "node:test";
import assert from "node:assert/strict";
import { scheduleSessionRemindersFromSessions, scheduleStudyReminder } from "../src/lib/notifications.js";

test("scheduleSessionRemindersFromSessions returns empty array when sessions is empty or null", async () => {
  const resultNull = await scheduleSessionRemindersFromSessions(null);
  assert.deepEqual(resultNull, []);

  const resultEmpty = await scheduleSessionRemindersFromSessions([]);
  assert.deepEqual(resultEmpty, []);
});

test("scheduleStudyReminder respects pushActiveOverride boolean parameter", async () => {
  const session = { id: "session-1", Date: new Date(Date.now() + 3600000), Start: "10:00" };

  // When pushActiveOverride is true, returns null without setting local timer
  const resultPushActive = await scheduleStudyReminder(session, null, true);
  assert.equal(resultPushActive, null);
});
