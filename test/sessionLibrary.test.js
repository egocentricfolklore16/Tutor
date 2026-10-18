import test from "node:test";
import assert from "node:assert/strict";
import {
  deleteSession,
  completeSession,
  pauseSession,
  pauseSessionBeacon,
  resumeSession,
  heartbeatSession,
} from "../src/lib/sessionService.js";
import supabase from "../src/lib/supabase.js";

test("deleteSession returns error if session ID is missing", async () => {
  const result = await deleteSession({});
  assert.ok(result.error);
  assert.equal(result.error.message, "Missing session ID");
});

test("deleteSession only deletes the Study record and does not delete Library materials", async () => {
  const deletedTables = [];
  const originalFrom = supabase.from;

  // Intercept supabase.from calls to log table deletions
  supabase.from = (tableName) => {
    return {
      delete: () => {
        deletedTables.push(tableName);
        return {
          eq: () => {
            return Promise.resolve({ error: null });
          },
        };
      },
    };
  };

  try {
    const result = await deleteSession({ id: 101 });
    assert.equal(result.error, null);
    assert.deepEqual(deletedTables, ["Study"], "Only 'Study' should be targeted for deletion");
    assert.ok(!deletedTables.includes("session_notes"), "session_notes must NOT be deleted");
    assert.ok(!deletedTables.includes("session_flashcards"), "session_flashcards must NOT be deleted");
    assert.ok(!deletedTables.includes("session_resources"), "session_resources must NOT be deleted");
    assert.ok(!deletedTables.includes("session_quizzes"), "session_quizzes must NOT be deleted");
  } finally {
    supabase.from = originalFrom;
  }
});

test("Library materials across all 4 types (notes, flashcards, quizzes, resources) persist with session_id detached after session deletion", async () => {
  // Simulate database state with a study session and associated materials across all 4 types
  const sessions = [{ id: 42, user_id: "user_abc", Subject: "Physics" }];
  const libraryNotes = [
    { id: 1, session_id: 42, user_id: "user_abc", title: "Newton's Laws", content: "F = ma" },
  ];
  const libraryFlashcards = [
    { id: 1, session_id: 42, user_id: "user_abc", question: "Speed of light?", answer: "3x10^8 m/s" },
  ];
  const libraryQuizzes = [
    { id: 1, session_id: 42, user_id: "user_abc", title: "Mechanics Quiz", score: 90 },
  ];
  const libraryResources = [
    { id: 1, session_id: 42, user_id: "user_abc", title: "Formula Sheet PDF", url: "https://example.com/sheet.pdf" },
  ];

  const originalFrom = supabase.from;

  supabase.from = (tableName) => {
    if (tableName === "Study") {
      return {
        delete: () => ({
          eq: (col, val) => {
            // Simulate ON DELETE SET NULL on related tables as performed by Supabase database
            const idx = sessions.findIndex((s) => s.id === val);
            if (idx !== -1) sessions.splice(idx, 1);
            libraryNotes.forEach((n) => {
              if (n.session_id === val) n.session_id = null;
            });
            libraryFlashcards.forEach((f) => {
              if (f.session_id === val) f.session_id = null;
            });
            libraryQuizzes.forEach((q) => {
              if (q.session_id === val) q.session_id = null;
            });
            libraryResources.forEach((r) => {
              if (r.session_id === val) r.session_id = null;
            });
            return Promise.resolve({ error: null });
          },
        }),
      };
    }
    if (tableName === "session_notes") {
      return {
        select: () => ({
          eq: (col, val) => Promise.resolve({ data: libraryNotes.filter((n) => n.user_id === val), error: null }),
        }),
      };
    }
    if (tableName === "session_flashcards") {
      return {
        select: () => ({
          eq: (col, val) => Promise.resolve({ data: libraryFlashcards.filter((f) => f.user_id === val), error: null }),
        }),
      };
    }
    if (tableName === "session_quizzes") {
      return {
        select: () => ({
          eq: (col, val) => Promise.resolve({ data: libraryQuizzes.filter((q) => q.user_id === val), error: null }),
        }),
      };
    }
    if (tableName === "session_resources") {
      return {
        select: () => ({
          eq: (col, val) => Promise.resolve({ data: libraryResources.filter((r) => r.user_id === val), error: null }),
        }),
      };
    }
    return originalFrom(tableName);
  };

  try {
    // Delete session
    const res = await deleteSession({ id: 42 });
    assert.equal(res.error, null);

    // Verify session was removed from Study
    assert.equal(sessions.length, 0);

    // Verify all 4 material types still exist in Library with detached session_id
    const { data: fetchedNotes } = await supabase.from("session_notes").select("*").eq("user_id", "user_abc");
    const { data: fetchedCards } = await supabase.from("session_flashcards").select("*").eq("user_id", "user_abc");
    const { data: fetchedQuizzes } = await supabase.from("session_quizzes").select("*").eq("user_id", "user_abc");
    const { data: fetchedResources } = await supabase.from("session_resources").select("*").eq("user_id", "user_abc");

    assert.equal(fetchedNotes.length, 1);
    assert.equal(fetchedNotes[0].title, "Newton's Laws");
    assert.equal(fetchedNotes[0].session_id, null, "Note session_id is detached so item persists in Library");

    assert.equal(fetchedCards.length, 1);
    assert.equal(fetchedCards[0].question, "Speed of light?");
    assert.equal(fetchedCards[0].session_id, null, "Flashcard session_id is detached so item persists in Library");

    assert.equal(fetchedQuizzes.length, 1);
    assert.equal(fetchedQuizzes[0].title, "Mechanics Quiz");
    assert.equal(fetchedQuizzes[0].session_id, null, "Quiz session_id is detached so item persists in Library");

    assert.equal(fetchedResources.length, 1);
    assert.equal(fetchedResources[0].title, "Formula Sheet PDF");
    assert.equal(fetchedResources[0].session_id, null, "Resource session_id is detached so item persists in Library");
  } finally {
    supabase.from = originalFrom;
  }
});

test("deleteSession handles database deletion failure gracefully", async () => {
  const originalFrom = supabase.from;
  const dbError = { message: "Database deletion constraint violation", code: "23503" };

  supabase.from = (table) => {
    if (table === "Study") {
      return {
        delete: () => ({
          eq: () => Promise.resolve({ error: dbError }),
        }),
      };
    }
    return originalFrom(table);
  };

  try {
    const res = await deleteSession({ id: 999 });
    assert.ok(res.error, "deleteSession should return error object when deletion fails");
    assert.equal(res.error.message, "Database deletion constraint violation");
  } finally {
    supabase.from = originalFrom;
  }
});

test("Completing a session preserves all 4 Library material types for the user", async () => {
  const userId = "user_complete_materials";
  const originalRpc = supabase.rpc;
  const originalFrom = supabase.from;

  const userMaterials = {
    notes: [{ id: 10, session_id: 88, user_id: userId, title: "Calculus Summary" }],
    flashcards: [{ id: 20, session_id: 88, user_id: userId, question: "Derivative of e^x?" }],
    quizzes: [{ id: 30, session_id: 88, user_id: userId, title: "Limits Practice" }],
    resources: [{ id: 40, session_id: 88, user_id: userId, title: "Textbook Ch 3" }],
  };

  supabase.rpc = (fnName, params) => {
    assert.equal(fnName, "complete_study_session");
    assert.equal(params.p_session_id, 88);
    return Promise.resolve({
      data: [{ history_id: "hist_88", current_streak: 3, xp_points: 50 }],
      error: null,
    });
  };

  supabase.from = (tableName) => {
    if (tableName === "session_notes") {
      return { select: () => ({ eq: (col, val) => Promise.resolve({ data: userMaterials.notes.filter((m) => m.user_id === val), error: null }) }) };
    }
    if (tableName === "session_flashcards") {
      return { select: () => ({ eq: (col, val) => Promise.resolve({ data: userMaterials.flashcards.filter((m) => m.user_id === val), error: null }) }) };
    }
    if (tableName === "session_quizzes") {
      return { select: () => ({ eq: (col, val) => Promise.resolve({ data: userMaterials.quizzes.filter((m) => m.user_id === val), error: null }) }) };
    }
    if (tableName === "session_resources") {
      return { select: () => ({ eq: (col, val) => Promise.resolve({ data: userMaterials.resources.filter((m) => m.user_id === val), error: null }) }) };
    }
    return originalFrom(tableName);
  };

  try {
    const res = await completeSession({ id: 88, userId, durationSeconds: 3600 });
    assert.equal(res.error, null);
    assert.equal(res.data.history_id, "hist_88");

    // Query all 4 material types from Library
    const { data: notes } = await supabase.from("session_notes").select("*").eq("user_id", userId);
    const { data: cards } = await supabase.from("session_flashcards").select("*").eq("user_id", userId);
    const { data: quizzes } = await supabase.from("session_quizzes").select("*").eq("user_id", userId);
    const { data: resources } = await supabase.from("session_resources").select("*").eq("user_id", userId);

    assert.equal(notes.length, 1);
    assert.equal(notes[0].title, "Calculus Summary");
    assert.equal(cards.length, 1);
    assert.equal(cards[0].question, "Derivative of e^x?");
    assert.equal(quizzes.length, 1);
    assert.equal(quizzes[0].title, "Limits Practice");
    assert.equal(resources.length, 1);
    assert.equal(resources[0].title, "Textbook Ch 3");
  } finally {
    supabase.rpc = originalRpc;
    supabase.from = originalFrom;
  }
});

test("Concurrent duplicate calls to completeSession execute safely without throwing exceptions", async () => {
  let callCount = 0;
  const originalRpc = supabase.rpc;

  supabase.rpc = (_fnName, _params) => {
    callCount++;
    return Promise.resolve({
      data: [{ history_id: `hist_dup_${callCount}`, current_streak: 5, xp_points: 50 }],
      error: null,
    });
  };

  try {
    const results = await Promise.all([
      completeSession({ id: 200, userId: "user_dup", durationSeconds: 1200 }),
      completeSession({ id: 200, userId: "user_dup", durationSeconds: 1200 }),
    ]);

    assert.equal(results.length, 2);
    assert.equal(results[0].error, null);
    assert.equal(results[1].error, null);
    assert.equal(callCount, 2);
  } finally {
    supabase.rpc = originalRpc;
  }
});

test("completeSession validates session ID and user authentication", async () => {
  const noIdResult = await completeSession({});
  assert.ok(noIdResult.error);
  assert.equal(noIdResult.error.message, "Missing session ID");

  const originalAuth = supabase.auth;
  supabase.auth = {
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
  };

  try {
    const noAuthResult = await completeSession({ id: 99 });
    assert.ok(noAuthResult.error);
    assert.equal(noAuthResult.error.message, "User not authenticated");
  } finally {
    supabase.auth = originalAuth;
  }
});

test("completeSession calls complete_study_session RPC with required parameters", async () => {
  let rpcCalledWith = null;
  const originalRpc = supabase.rpc;

  supabase.rpc = (fnName, params) => {
    rpcCalledWith = { fnName, params };
    return Promise.resolve({
      data: [{ history_id: "hist_123", current_streak: 5, longest_streak: 7, xp_points: 100, gems: 10 }],
      error: null,
    });
  };

  try {
    const res = await completeSession({
      id: 55,
      userId: "user_456",
      durationSeconds: 1800,
      timeline: [{ type: "focus_started", timestamp: 1000 }],
      xp: 50,
      gems: 5,
    });

    assert.equal(res.error, null);
    assert.equal(rpcCalledWith.fnName, "complete_study_session");
    assert.equal(rpcCalledWith.params.p_session_id, 55);
    assert.equal(rpcCalledWith.params.p_xp, 50);
    assert.equal(rpcCalledWith.params.p_gems, 5);
    assert.equal(res.data.history_id, "hist_123");
  } finally {
    supabase.rpc = originalRpc;
  }
});

test("pauseSessionBeacon URL-encodes session ID and attaches authenticated JWT token from localStorage", async () => {
  let capturedFetch = null;
  const originalFetch = globalThis.fetch;
  const originalLocalStorage = globalThis.localStorage;

  const mockToken = "mock_user_jwt_access_token_123";
  const mockLocalStorageData = {
    "sb-testref-auth-token": JSON.stringify({ access_token: mockToken }),
  };

  globalThis.localStorage = {
    length: Object.keys(mockLocalStorageData).length,
    key: (i) => Object.keys(mockLocalStorageData)[i],
    getItem: (k) => mockLocalStorageData[k] || null,
  };

  globalThis.fetch = (url, options) => {
    capturedFetch = { url, options };
    return Promise.resolve({ ok: true });
  };

  try {
    pauseSessionBeacon({ id: "100&bad_param=true", time_left: 300, elapsed_seconds: 600 });

    assert.ok(capturedFetch, "fetch should have been invoked");
    assert.ok(capturedFetch.url.includes("id=eq.100%26bad_param%3Dtrue"), "session ID must be URL encoded");
    assert.equal(
      capturedFetch.options.headers.Authorization,
      `Bearer ${mockToken}`,
      "Authorization header must carry authenticated user JWT token"
    );
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.localStorage = originalLocalStorage;
  }
});

test("pauseSession requires session ID and handles non-numeric time_left or elapsed_seconds safely", async () => {
  const missingIdRes = await pauseSession({});
  assert.ok(missingIdRes.error);
  assert.equal(missingIdRes.error.message, "Missing session ID");

  let updatePayload = null;
  const originalFrom = supabase.from;

  supabase.from = (table) => {
    if (table === "Study") {
      return {
        update: (payload) => {
          updatePayload = payload;
          return {
            eq: () => ({
              neq: () => ({
                select: () => Promise.resolve({ data: [{ id: 88, ...payload }], error: null }),
              }),
            }),
          };
        },
      };
    }
    return originalFrom(table);
  };

  try {
    // Valid numeric values
    const res = await pauseSession({ id: 88, time_left: 120, elapsed_seconds: 480 });
    assert.equal(res.error, null);
    assert.equal(updatePayload.session_status, "paused");
    assert.equal(updatePayload.time_left, 120);
    assert.equal(updatePayload.elapsed_seconds, 480);
    assert.ok(updatePayload.paused_at);

    // Invalid non-numeric or NaN values
    const nanRes = await pauseSession({ id: 88, time_left: "invalid", elapsed_seconds: NaN });
    assert.equal(nanRes.error, null);
    assert.equal(updatePayload.time_left, null, "Invalid time_left must safely default to null");
    assert.equal(updatePayload.elapsed_seconds, 0, "Invalid elapsed_seconds must safely default to 0");
  } finally {
    supabase.from = originalFrom;
  }
});

test("pauseSession Beacon handles non-numeric or NaN values safely without emitting NaN JSON", async () => {
  let capturedBody = null;
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (url, options) => {
    capturedBody = JSON.parse(options.body);
    return Promise.resolve({ ok: true });
  };

  try {
    pauseSessionBeacon({ id: 99, time_left: "invalid", elapsed_seconds: "bad_val" });
    assert.ok(capturedBody);
    assert.equal(capturedBody.time_left, null, "Beacon invalid time_left must default to null");
    assert.equal(capturedBody.elapsed_seconds, 0, "Beacon invalid elapsed_seconds must default to 0");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("pauseSession retries once on initial Supabase query error", async () => {
  let attempts = 0;
  const originalFrom = supabase.from;

  supabase.from = (table) => {
    if (table === "Study") {
      return {
        update: () => ({
          eq: () => ({
            neq: () => ({
              select: () => {
                attempts++;
                if (attempts === 1) {
                  return Promise.resolve({ data: null, error: new Error("DB Connection Error") });
                }
                return Promise.resolve({ data: [{ id: 77, session_status: "paused" }], error: null });
              },
            }),
          }),
        }),
      };
    }
    return originalFrom(table);
  };

  try {
    const res = await pauseSession({ id: 77, time_left: 300, elapsed_seconds: 600 });
    assert.equal(res.error, null);
    assert.equal(attempts, 2, "pauseSession must retry query once on failure");
    assert.equal(res.data[0].session_status, "paused");
  } finally {
    supabase.from = originalFrom;
  }
});

test("resumeSession validates session ID and resets paused state", async () => {
  const missingIdRes = await resumeSession({});
  assert.ok(missingIdRes.error);
  assert.equal(missingIdRes.error.message, "Missing session ID");

  let updatePayload = null;
  const originalFrom = supabase.from;

  supabase.from = (table) => {
    if (table === "Study") {
      return {
        update: (payload) => {
          updatePayload = payload;
          return {
            eq: () => ({
              neq: () => ({
                select: () => Promise.resolve({ data: [{ id: 66, ...payload }], error: null }),
              }),
            }),
          };
        },
      };
    }
    return originalFrom(table);
  };

  try {
    const res = await resumeSession({ id: 66 });
    assert.equal(res.error, null);
    assert.equal(updatePayload.session_status, "active");
    assert.equal(updatePayload.paused_at, null);
    assert.ok(updatePayload.last_active_at);
  } finally {
    supabase.from = originalFrom;
  }
});

test("heartbeatSession requires active session ID and updates last_active_at", async () => {
  // Missing ID -> early return no-op
  await heartbeatSession({});

  let updatePayload = null;
  const originalFrom = supabase.from;

  supabase.from = (table) => {
    if (table === "Study") {
      return {
        update: (payload) => {
          updatePayload = payload;
          return {
            eq: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          };
        },
      };
    }
    return originalFrom(table);
  };

  try {
    await heartbeatSession({ id: 44 });
    assert.ok(updatePayload);
    assert.ok(updatePayload.last_active_at);
  } finally {
    supabase.from = originalFrom;
  }
});
