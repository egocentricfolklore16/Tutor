import React, { useEffect, useRef, useState } from "react";
import HyperOwl from "./HyperOwl";
import GemWallet from "../../features/gamification/components/GemWallet";
import { dispatchOwlHappy, useOwlMood } from "./useOwlMood";
import "./mascot.css";
import "./mascot-layout.css";

type Props = { completion: number; completedSessions: number; gems: number; level: number; onVisitShop: () => void };

export default function ProgressMascot({ completion, completedSessions, gems, level, onVisitShop }: Props) {
  const [chip, setChip] = useState(false);
  const [pose, setPose] = useState("thinking");
  const previousLevel = useRef(level);
  const owlMood = useOwlMood(2500);

  useEffect(() => {
    const handleRewards = (event: Event) => {
      const detail = (event as CustomEvent<{ xp?: number }>).detail || {};
      if ((detail.xp || 0) > 0) dispatchOwlHappy(detail);
    };
    window.addEventListener("hyper-tutor-rewards-updated", handleRewards);
    return () => window.removeEventListener("hyper-tutor-rewards-updated", handleRewards);
  }, []);

  useEffect(() => {
    if (owlMood === "happy") setPose("happy");
  }, [owlMood]);

  useEffect(() => {
    if (completion >= 100 || level > previousLevel.current) setPose("happy");
    else if (completedSessions === 0) setPose("thoughtful");
    else setPose("pointing");
    previousLevel.current = level;
  }, [completion, completedSessions, level]);

  return (
    <div data-lumo-mascot className="progress-mascot-stage">
      {chip && (
        <div className="progress-mascot-chip" role="status" aria-live="polite">
          {level > 1 ? `Level ${level} already, keep going!` : `${gems} gems saved. The shop is open!`}
        </div>
      )}
      <HyperOwl poseId={pose} mood={pose === "happy" ? "happy" : "idle"} onClick={() => setChip((current) => !current)} />
      <div className="progress-gem-strip">
        <GemWallet balance={gems} onVisitShop={onVisitShop} />
      </div>
    </div>
  );
}
