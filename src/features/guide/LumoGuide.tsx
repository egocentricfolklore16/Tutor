import React, { useEffect, useRef, useState } from "react";
import { useGuide } from "./useGuide";
import HyperOwl from "../../components/mascot/HyperOwl";

function poseForGuide(pose: string) {
  if (pose === "happy" || pose === "wings-up") return "wings-up";
  if (pose === "pointing") return "pointing";
  if (pose === "reading") return "reading";
  return "thinking";
}

export default function LumoGuide() {
  const guide = useGuide();
  const rootRef = useRef<HTMLDivElement>(null);
  const owlRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const [resolvedTarget, setResolvedTarget] = useState<HTMLElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const fallbackTimer = useRef<number | null>(null);
  const [missing, setMissing] = useState(false);
  const [debugOpen, setDebugOpen] = useState(() => new URLSearchParams(window.location.search).has("guideDebug"));

  const step = guide.flow?.steps[guide.stepIndex] || null;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setDebugOpen(params.has("guideDebug"));
  }, []);

  useEffect(() => {
    if (!guide.active) return;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => previousFocus.current?.focus();
  }, [guide.active]);

  useEffect(() => {
    if (!guide.active || !step) return;
    setMissing(false);
    const focusTimer = window.setTimeout(() => {
      bubbleRef.current?.querySelector<HTMLButtonElement>("button[data-guide-primary]")?.focus();
    }, 80);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") guide.skip();
      if (event.key === "ArrowRight") guide.nextStep();
      if (event.key === "ArrowLeft") guide.previousStep();
    };
    window.addEventListener("keydown", onKey);

    let elapsed = 0;
    const findTarget = () => {
      let targets = Array.from(document.querySelectorAll<HTMLElement>(`[data-guide="${step.anchor}"]`));
      let target = targets.find((item) => {
        const rect = item.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }) || null;
      if (target) {
        targetRef.current = target;
        setResolvedTarget(target);
        setMissing(false);
        return;
      }
      elapsed += 100;
      if (elapsed >= 2000) {
        targetRef.current = null;
        setResolvedTarget(null);
        setMissing(true);
      } else fallbackTimer.current = window.setTimeout(findTarget, 100);
    };
    findTarget();

    return () => {
      window.clearTimeout(focusTimer);
      if (fallbackTimer.current) window.clearTimeout(fallbackTimer.current);
      window.removeEventListener("keydown", onKey);
    };
  }, [guide.active, guide.stepIndex, step?.anchor, step?.route]);

  useEffect(() => {
    if (!guide.active || !step) return;
    const target = resolvedTarget;
    if (!target) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.matchMedia("(max-width: 639px)").matches;
    const rect = target.getBoundingRect?.() || target.getBoundingClientRect();

    if (!reduced) target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    else target.scrollIntoView({ behavior: "instant", block: "center", inline: "nearest" });

    const update = () => {
      frameRef.current = null;
      const current = targetRef.current;
      if (!current) return;
      const r = current.getBoundingClientRect();
      const visible = r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth;
      if (!visible) {
        current.scrollIntoView({ behavior: reduced ? "instant" : "smooth", block: "center" });
      }

      if (spotlightRef.current) {
        const pad = mobile ? 6 : 8;
        spotlightRef.current.style.transform = `translate3d(${r.left - pad}px, ${r.top - pad}px, 0)`;
        spotlightRef.current.style.width = `${r.width + pad * 2}px`;
        spotlightRef.current.style.height = `${r.height + pad * 2}px`;
      }

      if (owlRef.current) {
        let x: number;
        let y: number;
        if (mobile) {
          x = Math.min(window.innerWidth - 128, window.innerWidth / 2 - 64);
          y = window.innerHeight - (mobile ? 238 : 190);
        } else {
          const owlW = 112;
          const owlH = 100;
          const rightSpace = window.innerWidth - r.right;
          const leftSpace = r.left;
          const belowSpace = window.innerHeight - r.bottom;
          const aboveSpace = r.top;
          const sides = [
            { side: "right", score: rightSpace, x: r.right + 12, y: r.top + r.height / 2 - owlH / 2 },
            { side: "left", score: leftSpace, x: r.left - owlW - 12, y: r.top + r.height / 2 - owlH / 2 },
            { side: "below", score: belowSpace, x: r.left + r.width / 2 - owlW / 2, y: r.bottom + 12 },
            { side: "above", score: aboveSpace, x: r.left + r.width / 2 - owlW / 2, y: r.top - owlH - 12 },
          ].sort((a, b) => b.score - a.score);
          const best = sides[0];
          x = Math.max(8, Math.min(window.innerWidth - owlW - 8, best.x));
          y = Math.max(8, Math.min(window.innerHeight - owlH - 8, best.y));
        }
        owlRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }

      if (bubbleRef.current) {
        if (mobile) {
          bubbleRef.current.style.left = "8px";
          bubbleRef.current.style.right = "8px";
          bubbleRef.current.style.bottom = "calc(4.25rem + env(safe-area-inset-bottom))";
          bubbleRef.current.style.top = "auto";
        } else {
          const bubbleW = Math.min(320, window.innerWidth - 32);
          const owlRect = owlRef.current?.getBoundingClientRect();
          let bx = (owlRect?.left || r.right) + 118;
          let by = (owlRect?.top || r.top) - 30;
          bx = Math.max(8, Math.min(window.innerWidth - bubbleW - 8, bx));
          by = Math.max(8, Math.min(window.innerHeight - 220, by));
          bubbleRef.current.style.left = `${bx}px`;
          bubbleRef.current.style.top = `${by}px`;
          bubbleRef.current.style.right = "auto";
          bubbleRef.current.style.bottom = "auto";
        }
      }
    };

    const schedule = () => {
      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(update);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(target);
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    update();

    if (!step.anchor) setMissing(true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
    };
  }, [guide.active, guide.stepIndex, step?.anchor, resolvedTarget]);

  useEffect(() => {
    if (!guide.active || !step) return;
    const advanceOn = step.advanceOn;
    if (!advanceOn) return;
    const target = resolvedTarget;
    if (!target) return;
    if (advanceOn === "click") {
      const handler = () => guide.nextStep();
      target.addEventListener("click", handler, { once: true });
      return () => target.removeEventListener("click", handler);
    }
    if (advanceOn === "input") {
      const handler = (event: Event) => {
        const element = event.target as HTMLInputElement;
        if (element.value?.trim()) guide.nextStep();
      };
      target.addEventListener("input", handler);
      return () => target.removeEventListener("input", handler);
    }
  }, [guide.active, guide.stepIndex, step?.advanceOn, resolvedTarget]);

  useEffect(() => {
    if (!guide.welcomeOpen && !guide.active) return;
    document.querySelectorAll<HTMLElement>("[data-lumo-mascot]").forEach((node) => {
      node.style.opacity = "0";
      node.style.pointerEvents = "none";
    });
    return () => document.querySelectorAll<HTMLElement>("[data-lumo-mascot]").forEach((node) => {
      node.style.opacity = "";
      node.style.pointerEvents = "";
    });
  }, [guide.welcomeOpen, guide.active]);

  if (!guide.active && !guide.welcomeOpen && !debugOpen) return null;

  const rectText = targetRef.current ? (() => {
    const r = targetRef.current.getBoundingClientRect();
    return `${Math.round(r.width)} x ${Math.round(r.height)} at ${Math.round(r.x)}, ${Math.round(r.y)}`;
  })() : "No resolved target";

  return (
    <div ref={rootRef} className="lumo-guide-layer" aria-live="off">
      {guide.active && <div ref={spotlightRef} className="lumo-guide-spotlight" aria-hidden="true" />}

      {guide.active && step && (
        <div ref={owlRef} className="lumo-guide-owl">
          <div className="lumo-guide-shadow" aria-hidden="true" />
          <HyperOwl poseId={poseForGuide(step.pose)} mood={step.pose === "happy" ? "happy" : "idle"} />
        </div>
      )}

      {guide.welcomeOpen && (
        <div className="lumo-welcome" role="dialog" aria-labelledby="lumo-welcome-title">
          <div className="lumo-welcome-owl" aria-hidden="true">
            <HyperOwl poseId="wings-up" mood="happy" />
          </div>
          <div>
            <h2 id="lumo-welcome-title">Welcome, {guide.firstName}</h2>
            <p>Hi {guide.firstName}! I'm Lumo. Want a 60-second tour?</p>
            <div className="lumo-guide-actions">
              <button type="button" data-guide-primary onClick={guide.startTour} className="lumo-guide-primary">Show me around</button>
              <button type="button" onClick={() => guide.closeWelcome(true)} className="lumo-guide-secondary">Maybe later</button>
            </div>
          </div>
        </div>
      )}

      {guide.active && step && (
        <section
          ref={bubbleRef}
          className="lumo-guide-bubble"
          role="dialog"
          aria-labelledby="lumo-step-title"
        >
          <span className="sr-only" aria-live="polite">{step.title}. {step.text}</span>
          <h2 id="lumo-step-title">{step.title}</h2>
          <p>{missing ? (step.fallbackText || "This item is unavailable on the current screen.") : step.text}</p>
          {step.type === "navigate" && (
            <button type="button" className="lumo-guide-take-me" onClick={() => {
              if (step.route) window.history.pushState({}, "", step.route);
              window.dispatchEvent(new PopStateEvent("popstate"));
            }}>Take me there</button>
          )}
          <div className="lumo-guide-actions">
            <button type="button" onClick={guide.previousStep} disabled={guide.stepIndex === 0} className="lumo-guide-secondary">Back</button>
            <button type="button" data-guide-primary onClick={guide.nextStep} className="lumo-guide-primary">
              {guide.stepIndex === (guide.flow?.steps.length || 1) - 1 ? "Done" : "Next"}
            </button>
          </div>
          <div className="lumo-guide-meta">
            <span>{guide.stepIndex + 1} of {guide.flow?.steps.length}</span>
            <div className="lumo-guide-dots" aria-label={`Step ${guide.stepIndex + 1} of ${guide.flow?.steps.length}`}>
              {guide.flow?.steps.map((item, index) => <i key={item.id} className={index === guide.stepIndex ? "active" : ""} />)}
            </div>
            <button type="button" onClick={guide.skip} className="lumo-guide-skip">Skip tour</button>
          </div>
        </section>
      )}

      {debugOpen && (
        <aside className="lumo-guide-debug" aria-label="Lumo guide debug">
          <strong>Guide debug</strong>
          <span>Step: {guide.stepIndex + 1}</span>
          <span>Anchor: {step?.anchor || "welcome"}</span>
          <span>Rect: {rectText}</span>
          <button type="button" onClick={() => guide.startTour()}>Restart tour</button>
          <button type="button" onClick={() => guide.resetOnboarding()}>Reset onboarding</button>
        </aside>
      )}
    </div>
  );
}
