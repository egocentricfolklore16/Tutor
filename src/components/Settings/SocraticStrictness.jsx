import { useEffect, useState } from "react";
import supabase from "../../lib/supabase";

const STRICTNESS_OPTIONS = [
  { label: "Always Guide First", value: "always_guide" },
  { label: "Hints Then Answer", value: "hints_then_answer" },
  { label: "Direct Help", value: "direct_help" },
];

export default function SocraticStrictness() {
  const [strictness, setStrictness] = useState("hints_then_answer");

  useEffect(() => {
    let isMounted = true;
    async function fetchPreference() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from("user_preferences")
          .select("socratic_strictness")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.warn("Failed to fetch user_preferences:", error);
          return;
        }

        if (isMounted && data?.socratic_strictness) {
          setStrictness(data.socratic_strictness);
        }
      } catch (err) {
        console.error("Error loading Socratic strictness preference:", err);
      }
    }

    fetchPreference();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSelect = async (newValue) => {
    // Optimistic UI update
    setStrictness(newValue);

    const callRpc = () => supabase.rpc("set_socratic_strictness", { p_strictness: newValue });

    const { error } = await callRpc();
    if (error) {
      console.warn("First RPC call to set_socratic_strictness failed, retrying once...", error);
      const { error: retryError } = await callRpc();
      if (retryError) {
        console.error("Failed to set Socratic strictness after retry:", retryError);
      }
    }
  };

  return (
    <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-sm text-white">
      <h3 id="socratic-strictness-heading" className="text-xl font-bold text-white mb-4">Socratic Strictness</h3>

      {/* Segmented pill control */}
      <div
        role="radiogroup"
        aria-labelledby="socratic-strictness-heading"
        className="inline-flex w-full sm:w-auto items-center p-1 bg-zinc-900 rounded-full border border-zinc-800 gap-1"
      >
        {STRICTNESS_OPTIONS.map((option) => {
          const isSelected = strictness === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => handleSelect(option.value)}
              className={`flex-1 sm:flex-initial rounded-full px-4 py-2.5 text-sm font-semibold transition-colors duration-150 active:scale-95 focus-visible:ring-2 focus-visible:ring-emerald-500 outline-none ${
                isSelected
                  ? "bg-green-900/40 text-green-400"
                  : "text-zinc-300 hover:text-white bg-transparent"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-zinc-400">
        This preference controls whether the tutor guides, hints, or answers directly.
      </p>
    </div>
  );
}
