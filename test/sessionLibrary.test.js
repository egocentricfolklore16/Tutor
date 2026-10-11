import test from "node:test";
import assert from "node:assert/strict";
import { deleteSession, completeSession, pauseSessionBeacon } from "../src/lib/sessionService.js";
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

test("Library materials persist and are accessible after session deletion", async () => {
  // Simulate database state with a study session and associated materials
  const sessions = [{ id: 42, user_id: "user_abc", Subject: "Physics" }];
  const libraryNotes = [
    { id: 1, session_id: 42, user_id: "user_abc", title: "Newton's Laws", content: "F = ma" },
  ];
  const libraryFlashcards = [
    { id: 1, session_id: 42, user_id: "user_abc", question: "Speed of light?", answer: "3x10^8 m/s" },
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
    return originalFrom(tableName);
  };

  try {
    // Delete session
    const res = await deleteSession({ id: 42 });
    assert.equal(res.error, null);

    // Verify session was removed from Study
    assert.equal(sessions.length, 0);

    // Verify materials still exist in Library
    const { data: fetchedNotes } = await supabase.from("session_notes").select("*").eq("user_id", "user_abc");
    const { data: fetchedCards } = await supabase.from("session_flashcards").select("*").eq("user_id", "user_abc");

    assert.equal(fetchedNotes.length, 1);
    assert.equal(fetchedNotes[0].title, "Newton's Laws");
    assert.equal(fetchedNotes[0].session_id, null, "Material session_id is detached so item persists in Library");

    assert.equal(fetchedCards.length, 1);
    assert.equal(fetchedCards[0].question, "Speed of light?");
    assert.equal(fetchedCards[0].session_id, null, "Flashcard session_id is detached so item persists in Library");
  } finally {
    supabase.from = originalFrom;
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
