import React, { useEffect, useRef, useState } from "react";
import { getOwlPose, OWL_POSES, OwlPose } from "./poses";

type Props = {
  poseId?: string;
  mood?: "idle" | "curious" | "thinking" | "happy";
  debug?: boolean;
  className?: string;
  onClick?: () => void;
};

export default function HyperOwl({ poseId = "thinking", mood = "idle", debug = false, className = "", onClick }: Props) {
  const debugEnabled = debug || (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("owlDebug"));
  const [debugPoseId, setDebugPoseId] = useState(poseId);
  useEffect(() => setDebugPoseId(poseId), [poseId]);
  const pose = getOwlPose(debugEnabled ? debugPoseId : poseId);
  const rootRef = useRef<HTMLDivElement>(null);
  const lastPoseRef = useRef<OwlPose>(pose);
  const [previousPose, setPreviousPose] = useState<OwlPose | null>(null);
  const [showPrevious, setShowPrevious] = useState(false);

  useEffect(() => {
    if (lastPoseRef.current.id !== pose.id) {
      setPreviousPose(lastPoseRef.current);
      lastPoseRef.current = pose;
    }
    rootRef.current?.setAttribute("data-pose", poseId);
  }, [pose, poseId]);

  useEffect(() => {
    if (!previousPose) return;
    setShowPrevious(true);
    const timer = window.setTimeout(() => setShowPrevious(false), 250);
    return () => window.clearTimeout(timer);
  }, [previousPose]);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) return;
    const root = rootRef.current;
    if (!root) return;
    const irises = Array.from(root.querySelectorAll<HTMLElement>("[data-iris]"));
    const eyelids = Array.from(root.querySelectorAll<HTMLElement>("[data-eyelid]"));
    let frame = 0;
    let visible = true;

    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    observer.observe(root);

    const move = (event: PointerEvent) => {
      if (!visible) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = root.getBoundingClientRect();
        irises.forEach((iris) => {
          if (pose.eyes === "baked") return;
          const eyeConfig = iris.dataset.eye === "left" ? pose.eyes.leftEye : pose.eyes.rightEye;
          const cx = rect.left + rect.width * eyeConfig.cx / 100;
          const cy = rect.top + rect.height * eyeConfig.cy / 100;
          const dx = event.clientX - cx;
          const dy = event.clientY - cy;
          const distance = Math.hypot(dx, dy);
          const strength = Math.min(1, distance / 260);
          const angle = Math.atan2(dy, dx);
          const travel = eyeConfig.maxTravel * strength;
          iris.style.transform = `translate(${Math.cos(angle) * travel}px, ${Math.sin(angle) * travel}px)`;
        });
        if (window.matchMedia("(pointer:fine)").matches) {
          const dx = (event.clientX - (rect.left + rect.width / 2)) / rect.width;
          const dy = (event.clientY - (rect.top + rect.height / 2)) / rect.height;
          root.style.setProperty("--owl-tilt-x", `${Math.max(-5, Math.min(5, -dy * 5))}deg`);
          root.style.setProperty("--owl-tilt-y", `${Math.max(-8, Math.min(8, dx * 8))}deg`);
        }
        if (event.pointerType === "touch") {
          window.setTimeout(reset, 1500);
        }
      });
    };

    const reset = () => {
      irises.forEach((iris) => { iris.style.transform = "translate(0, 0)"; });
      root.style.setProperty("--owl-tilt-x", "0deg");
      root.style.setProperty("--owl-tilt-y", "0deg");
    };

    let blinkTimer = 0;
    const scheduleBlink = () => {
      blinkTimer = window.setTimeout(() => {
        if (!visible) { scheduleBlink(); return; }
        const blink = () => {
          eyelids.forEach((lid) => { lid.classList.add("is-blinking"); });
          window.setTimeout(() => eyelids.forEach((lid) => lid.classList.remove("is-blinking")), 150);
        };
        blink();
        if (Math.random() < 0.2) window.setTimeout(blink, 240);
        scheduleBlink();
      }, 2200 + Math.random() * 2800);
    };

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerleave", reset, { passive: true });
    scheduleBlink();
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerleave", reset);
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.clearTimeout(blinkTimer);
    };
  }, [pose]);

  const [debugConfig, setDebugConfig] = useState(pose.eyes === "baked" ? null : { ...pose.eyes });
  useEffect(() => setDebugConfig(pose.eyes === "baked" ? null : { ...pose.eyes }), [pose]);

  const copyDebug = () => navigator.clipboard?.writeText(JSON.stringify({ id: pose.id, eyes: debugConfig }, null, 2));

  const eyeMarkup = pose.eyes !== "baked" && (
    <>
      {(["leftEye", "rightEye"] as const).map((key) => {
        const config = debugConfig && debugConfig !== "baked" ? debugConfig[key] : pose.eyes[key];
        return (
          <span
            key={key}
            className="owl-eye"
            style={{ left: `${config.cx}%`, top: `${config.cy}%`, width: `${config.r * 2}%`, height: `${config.r * 2}%` }}
            onPointerDown={(event) => {
              if (!debugEnabled) return;
              event.stopPropagation();
              const target = event.currentTarget;
              target.setPointerCapture(event.pointerId);
              const move = (pointerEvent: PointerEvent) => {
                const rect = rootRef.current?.getBoundingClientRect();
                if (!rect) return;
                setDebugConfig((current) => {
                  if (!current || current === "baked") return current;
                  return {
                    ...current,
                    [key]: {
                      ...current[key],
                      cx: Math.max(0, Math.min(100, ((pointerEvent.clientX - rect.left) / rect.width) * 100)),
                      cy: Math.max(0, Math.min(100, ((pointerEvent.clientY - rect.top) / rect.height) * 100)),
                    },
                  };
                });
              };
              target.addEventListener("pointermove", move);
              target.addEventListener("pointerup", () => target.removeEventListener("pointermove", move), { once: true });
            }}
            onWheel={(event) => {
              if (!debugEnabled) return;
              event.preventDefault();
              setDebugConfig((current) => {
                if (!current || current === "baked") return current;
                return {
                  ...current,
                  [key]: { ...current[key], r: Math.max(2, current[key].r + (event.deltaY > 0 ? -0.5 : 0.5)) },
                };
              });
            }}
          >
            <span className="owl-sclera" />
            <span className="owl-iris" data-iris data-eye={key === "leftEye" ? "left" : "right"}>
              <span className="owl-pupil" />
              <span className="owl-glint owl-glint-a" />
              <span className="owl-glint owl-glint-b" />
            </span>
            <span className="owl-eyelid" data-eyelid />
          </span>
        );
      })}
    </>
  );

  return (
    <div
      ref={rootRef}
      data-pose={pose.id}
      className={`owl-root ${mood === "happy" ? "owl-happy" : ""} ${className}`}
      onClick={onClick}
      aria-hidden="true"
    >
      <div className="owl-float">
        <div className="owl-tilt">
          {previousPose && showPrevious && (
            <picture className="owl-picture owl-picture-old">
              <source srcSet={previousPose.webp} type="image/webp" />
              <img src={previousPose.pngFallback} alt="" width={previousPose.width} height={previousPose.height} draggable={false} />
            </picture>
          )}
          <picture className="owl-picture owl-picture-current">
            <source srcSet={pose.webp} type="image/webp" />
            <img src={pose.pngFallback} alt="" width={pose.width} height={pose.height} draggable={false} />
          </picture>
          {eyeMarkup}
        </div>
      </div>
      {debugEnabled && debugConfig && (
        <div className="owl-debug" onPointerDown={(event) => event.stopPropagation()}>
          <select
            aria-label="Debug owl pose"
            value={debugPoseId}
            onChange={(event) => setDebugPoseId(event.target.value)}
          >
            {Object.keys(OWL_POSES).map((id) => <option key={id} value={id}>{id}</option>)}
          </select>
          <button type="button" onClick={copyDebug}>Copy JSON</button>
        </div>
      )}
    </div>
  );
}
