import supabase from "./supabase.js";

// Storage key to remember achievement IDs that have already triggered an unlock toast
const TOASTED_KEY = "hyper_tutor_toasted_achievements";

function getToastedState() {
  try {
    const raw = localStorage.getItem(TOASTED_KEY);
    if (raw === null) {
      return { set: new Set(), isInitialized: false };
    }
    return { set: new Set(JSON.parse(raw)), isInitialized: true };
  } catch {
    return { set: new Set(), isInitialized: false };
  }
}

function saveToastedSet(set) {
  try {
    localStorage.setItem(TOASTED_KEY, JSON.stringify(Array.from(set)));
  } catch (err) {
    console.error("Error saving toasted achievements set:", err);
  }
}

/**
 * Calls sync_my_achievements() on the server, evaluates returned achievements against
 * previously toasted achievements, triggers unlock toasts for any newly unlocked ones,
 * and refreshes user XP/level from the server.
 */
export async function syncAndCheckAchievements({ quiet = false } = {}) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return [];

    const { data: achievements, error } = await supabase.rpc("sync_my_achievements");

    if (error) {
      console.error("Error calling sync_my_achievements:", error);
      return [];
    }

    if (!Array.isArray(achievements)) return [];

    const { set: toastedSet, isInitialized } = getToastedState();
    let newlyUnlocked = 0;

    // If localStorage was never initialized (first app run for user),
    // seed all currently earned achievements into toastedSet without showing toasts
    if (!isInitialized) {
      achievements.forEach((ach) => {
        if (ach.earned) {
          toastedSet.add(ach.id);
        }
      });
      saveToastedSet(toastedSet);
      return achievements;
    }

    for (const ach of achievements) {
      if (ach.earned && !toastedSet.has(ach.id)) {
        toastedSet.add(ach.id);
        newlyUnlocked++;

        if (!quiet) {
          const toastMessage = `Achievement unlocked: ${ach.title} +${ach.xp_reward || 0} XP`;
          window.dispatchEvent(
            new CustomEvent("hyper-tutor-quest-completed-toast", {
              detail: { message: toastMessage },
            })
          );
        }
      }
    }

    saveToastedSet(toastedSet);

    if (newlyUnlocked > 0) {
      // Trigger profile refetch from server to update XP/level display without local arithmetic
      window.dispatchEvent(
        new CustomEvent("hyper-tutor-rewards-updated", {
          detail: { xp: 0, gems: 0 },
        })
      );
    }

    return achievements;
  } catch (err) {
    console.error("Exception in syncAndCheckAchievements:", err);
    return [];
  }
}
