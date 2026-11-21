import { useEffect, useState } from "react";

export type OwlMood = "idle" | "curious" | "thinking" | "happy";
export const OWL_HAPPY_EYE_MOOD_MS = 800;

export function dispatchOwlHappy(detail?: unknown) {
  const eventDetail = detail && typeof detail === "object" ? detail : {};
  window.dispatchEvent(new CustomEvent("owl:happy", {
    detail: { ...eventDetail, eyeMoodDuration: OWL_HAPPY_EYE_MOOD_MS },
  }));
}

export function useOwlMood(resetDelay = 2500) {
  const [mood, setMood] = useState<OwlMood>("idle");

  useEffect(() => {
    let timer = 0;
    const celebrate = (event: Event) => {
      setMood("happy");
      window.clearTimeout(timer);
      const duration = (event as CustomEvent<{ eyeMoodDuration?: number }>).detail?.eyeMoodDuration;
      timer = window.setTimeout(() => setMood("idle"), Math.min(resetDelay, duration || resetDelay));
    };
    window.addEventListener("owl:happy", celebrate);
    return () => {
      window.removeEventListener("owl:happy", celebrate);
      window.clearTimeout(timer);
    };
  }, [resetDelay]);

  return mood;
}
