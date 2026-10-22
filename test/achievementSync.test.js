import test from "node:test";
import assert from "node:assert/strict";
import supabase from "../src/lib/supabase.js";
import { syncAndCheckAchievements } from "../src/lib/achievementSync.js";

function createMockLocalStorage(initialStore = {}) {
  let store = { ...initialStore };
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get _store() {
      return store;
    },
  };
}

function mockWindowAndAuth({ user = { id: "user_123" } } = {}) {
  const originalAuth = supabase.auth;
  const originalRpc = supabase.rpc;
  const originalLocalStorage = globalThis.localStorage;
  const originalWindow = globalThis.window;

  const dispatchedEvents = [];

  const mockWin = {
    dispatchEvent: (evt) => {
      dispatchedEvents.push(evt);
    },
    CustomEvent: class CustomEvent {
      constructor(type, eventInitDict) {
        this.type = type;
        this.detail = eventInitDict?.detail;
      }
    },
  };

  supabase.auth = {
    getUser: () => Promise.resolve({ data: { user }, error: null }),
  };

  globalThis.window = mockWin;

  return {
    dispatchedEvents,
    restore: () => {
      supabase.auth = originalAuth;
      supabase.rpc = originalRpc;
      if (originalLocalStorage) {
        globalThis.localStorage = originalLocalStorage;
      } else {
        delete globalThis.localStorage;
      }
      if (originalWindow) {
        globalThis.window = originalWindow;
      } else {
        delete globalThis.window;
      }
    },
  };
}

test("syncAndCheckAchievements returns empty array when user is unauthenticated", async () => {
  const env = mockWindowAndAuth({ user: null });
  try {
    const result = await syncAndCheckAchievements();
    assert.deepEqual(result, []);
  } finally {
    env.restore();
  }
});

test("syncAndCheckAchievements handles RPC error gracefully", async () => {
  const env = mockWindowAndAuth();
  supabase.rpc = (fn) => {
    assert.equal(fn, "sync_my_achievements");
    return Promise.resolve({ data: null, error: new Error("RPC failed") });
  };

  try {
    const result = await syncAndCheckAchievements();
    assert.deepEqual(result, []);
  } finally {
    env.restore();
  }
});

test("syncAndCheckAchievements seeds initial earned state without toasts when localStorage is uninitialized", async () => {
  const env = mockWindowAndAuth();
  const mockStorage = createMockLocalStorage();
  globalThis.localStorage = mockStorage;

  const achievements = [
    { id: "ach_1", title: "First Step", earned: true, xp_reward: 50 },
    { id: "ach_2", title: "Mastery", earned: false, xp_reward: 100 },
  ];

  supabase.rpc = () => Promise.resolve({ data: achievements, error: null });

  try {
    const result = await syncAndCheckAchievements();
    assert.equal(result.length, 2);
    assert.equal(env.dispatchedEvents.length, 0, "No toast events on initial uninitialized seed run");

    const saved = JSON.parse(mockStorage.getItem("hyper_tutor_toasted_achievements"));
    assert.deepEqual(saved, ["ach_1"], "Initial earned achievement seeded into localStorage set");
  } finally {
    env.restore();
  }
});

test("syncAndCheckAchievements dispatches unlock toast and rewards update for newly earned achievements", async () => {
  const env = mockWindowAndAuth();
  // Pre-initialize localStorage with ach_1
  const mockStorage = createMockLocalStorage({
    hyper_tutor_toasted_achievements: JSON.stringify(["ach_1"]),
  });
  globalThis.localStorage = mockStorage;

  const achievements = [
    { id: "ach_1", title: "First Step", earned: true, xp_reward: 50 },
    { id: "ach_2", title: "Night Owl", earned: true, xp_reward: 75 },
  ];

  supabase.rpc = () => Promise.resolve({ data: achievements, error: null });

  try {
    const result = await syncAndCheckAchievements();
    assert.equal(result.length, 2);

    // Should dispatch 2 events: unlock toast and rewards-updated
    assert.equal(env.dispatchedEvents.length, 2);
    assert.equal(env.dispatchedEvents[0].type, "hyper-tutor-quest-completed-toast");
    assert.ok(env.dispatchedEvents[0].detail.message.includes("Night Owl"));
    assert.ok(env.dispatchedEvents[0].detail.message.includes("+75 XP"));

    assert.equal(env.dispatchedEvents[1].type, "hyper-tutor-rewards-updated");

    const saved = JSON.parse(mockStorage.getItem("hyper_tutor_toasted_achievements"));
    assert.deepEqual(saved.sort(), ["ach_1", "ach_2"]);
  } finally {
    env.restore();
  }
});

test("syncAndCheckAchievements respects quiet mode by suppressing toast notifications", async () => {
  const env = mockWindowAndAuth();
  const mockStorage = createMockLocalStorage({
    hyper_tutor_toasted_achievements: JSON.stringify(["ach_1"]),
  });
  globalThis.localStorage = mockStorage;

  const achievements = [
    { id: "ach_1", title: "First Step", earned: true },
    { id: "ach_3", title: "Streak Champion", earned: true, xp_reward: 150 },
  ];

  supabase.rpc = () => Promise.resolve({ data: achievements, error: null });

  try {
    const result = await syncAndCheckAchievements({ quiet: true });
    assert.equal(result.length, 2);

    // Only rewards-updated should be dispatched, no toast event
    assert.equal(env.dispatchedEvents.length, 1);
    assert.equal(env.dispatchedEvents[0].type, "hyper-tutor-rewards-updated");

    const saved = JSON.parse(mockStorage.getItem("hyper_tutor_toasted_achievements"));
    assert.deepEqual(saved.sort(), ["ach_1", "ach_3"]);
  } finally {
    env.restore();
  }
});

test("syncAndCheckAchievements deduplicates already toasted achievements on repeated runs", async () => {
  const env = mockWindowAndAuth();
  const mockStorage = createMockLocalStorage({
    hyper_tutor_toasted_achievements: JSON.stringify(["ach_1", "ach_2"]),
  });
  globalThis.localStorage = mockStorage;

  const achievements = [
    { id: "ach_1", title: "First Step", earned: true, xp_reward: 50 },
    { id: "ach_2", title: "Night Owl", earned: true, xp_reward: 75 },
  ];

  supabase.rpc = () => Promise.resolve({ data: achievements, error: null });

  try {
    const result = await syncAndCheckAchievements();
    assert.equal(result.length, 2);
    assert.equal(env.dispatchedEvents.length, 0, "No duplicate toasts or updates for already toasted achievements");
  } finally {
    env.restore();
  }
});

test("syncAndCheckAchievements recovers safely from corrupted localStorage JSON", async () => {
  const env = mockWindowAndAuth();
  const mockStorage = createMockLocalStorage({
    hyper_tutor_toasted_achievements: "{invalid json string",
  });
  globalThis.localStorage = mockStorage;

  const achievements = [
    { id: "ach_1", title: "First Step", earned: true, xp_reward: 50 },
  ];

  supabase.rpc = () => Promise.resolve({ data: achievements, error: null });

  try {
    const result = await syncAndCheckAchievements();
    assert.equal(result.length, 1);
    // Corrupted localStorage forces uninitialized state -> seeds earned achievement without toast
    assert.equal(env.dispatchedEvents.length, 0);

    const saved = JSON.parse(mockStorage.getItem("hyper_tutor_toasted_achievements"));
    assert.deepEqual(saved, ["ach_1"]);
  } finally {
    env.restore();
  }
});
