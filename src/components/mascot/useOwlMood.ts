import { useEffect, useState } from "react";

export function dispatchOwlHappy(detail?: unknown) {
  window.dispatchEvent(new CustomEvent("owl:happy", { detail }));
}

export function useOwlMood(resetDelay = 2500) {
  const [mood, setMood] = useState<"idle" | "happy">("idle");

  useEffect(() => {
    let timer = 0;
    const celebrate = () => {
      setMood("happy");
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setMood("idle"), resetDelay);
    };
    window.addEventListener("owl:happy", celebrate);
    return () => {
      window.removeEventListener("owl:happy", celebrate);
      window.clearTimeout(timer);
    };
  }, [resetDelay]);

  return mood;
}
