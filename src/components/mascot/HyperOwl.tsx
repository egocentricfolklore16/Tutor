import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getOwlPose, OwlEyePixels, OwlPoseConfig, POSE_CONFIG } from "./poses";
import OwlCalibrator from "./OwlCalibrator";

type Props = {
  poseId?: string;
  mood?: "idle" | "curious" | "thinking" | "happy";
  debug?: boolean;
  className?: string;
  onClick?: () => void;
};

type NaturalSize = { poseId: string; width: number; height: number };
type EyeName = "leftEye" | "rightEye";

export default function HyperOwl({ poseId = "thinking", mood = "idle", debug = false, className = "", onClick }: Props) {
  const debugEnabled = debug || (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("owlDebug"));
  const [debugPoseId, setDebugPoseId] = useState(poseId === "happy" ? "wings-up" : poseId);
  const [poseConfigs, setPoseConfigs] = useState(POSE_CONFIG);
  const [loadedSize, setLoadedSize] = useState<NaturalSize | null>(null);
  const [compare, setCompare] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const lastPoseRef = useRef<OwlPoseConfig>(getOwlPose(poseId));
  const [previousPose, setPreviousPose] = useState<OwlPoseConfig | null>(null);
  const [showPrevious, setShowPrevious] = useState(false);

  useEffect(() => setDebugPoseId(poseId === "happy" ? "wings-up" : poseId), [poseId]);

  const activePoseId = debugEnabled ? debugPoseId : poseId;
  const pose = poseConfigs[activePoseId] || getOwlPose(activePoseId);
  const naturalWidth = loadedSize?.poseId === pose.id ? loadedSize.width : pose.naturalWidth;
  const naturalHeight = loadedSize?.poseId === pose.id ? loadedSize.height : pose.naturalHeight;

  useEffect(() => {
    if (lastPoseRef.current.id !== pose.id) {
      setPreviousPose(lastPoseRef.current);
      lastPoseRef.current = pose;
    }
    rootRef.current?.setAttribute("data-pose", pose.id);
  }, [pose]);

  useEffect(() => {
    if (!previousPose) return;
    setShowPrevious(true);
    const timer = window.setTimeout(() => setShowPrevious(false), 250);
    return () => window.clearTimeout(timer);
  }, [previousPose]);

  const handleImageLoad = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;
    const size = { poseId: pose.id, width: image.naturalWidth, height: image.naturalHeight };
    setLoadedSize(size);
    if (import.meta.env.DEV && (size.width !== pose.naturalWidth || size.height !== pose.naturalHeight)) {
      console.warn(
        `[HyperOwl] ${pose.id} image is ${size.width}x${size.height}; POSE_CONFIG expects ${pose.naturalWidth}x${pose.naturalHeight}.`,
      );
    }
  }, [pose]);

  const handleImageError = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;
    if (image.dataset.fallback === "true") return;
    image.dataset.fallback = "true";
    image.src = pose.pngFallback;
  }, [pose]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    for (const [label, src] of [["WebP", pose.webp], ["PNG", pose.pngFallback]] as const) {
      const variant = new Image();
      variant.onload = () => {
        if (variant.naturalWidth !== pose.naturalWidth || variant.naturalHeight !== pose.naturalHeight) {
          console.warn(
            `[HyperOwl] ${pose.id} ${label} is ${variant.naturalWidth}x${variant.naturalHeight}; POSE_CONFIG expects ${pose.naturalWidth}x${pose.naturalHeight}.`,
          );
        }
      };
      variant.src = src;
    }
  }, [pose]);

  const updateEye = useCallback((targetPoseId: string, eye: EyeName, value: OwlEyePixels) => {
    setPoseConfigs((current) => {
      const currentPose = current[targetPoseId];
      if (!currentPose || currentPose.eyes === "baked") return current;
      const next = {
        ...currentPose,
        eyes: { ...currentPose.eyes, [eye]: value },
      } as OwlPoseConfig;
      return { ...current, [targetPoseId]: next };
    });
  }, []);

  const copyConfigs = useMemo(() => poseConfigs, [poseConfigs]);

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

    const reset = () => {
      irises.forEach((iris) => { iris.style.transform = "translate(-50%, -50%)"; });
      root.style.setProperty("--owl-tilt-x", "0deg");
      root.style.setProperty("--owl-tilt-y", "0deg");
    };

    const move = (event: PointerEvent) => {
      if (!visible || compare) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        irises.forEach((iris) => {
          const eye = iris.closest<HTMLElement>(".owl-eye");
          const rect = eye?.getBoundingClientRect();
          const pixels = iris.dataset.eye === "left" ? pose.eyes !== "baked" && pose.eyes.leftEye : pose.eyes !== "baked" && pose.eyes.rightEye;
          if (!rect || !pixels) return;
          const dx = event.clientX - (rect.left + rect.width / 2);
          const dy = event.clientY - (rect.top + rect.height / 2);
          const distance = Math.hypot(dx, dy);
          const strength = Math.min(1, distance / 260);
          const angle = Math.atan2(dy, dx);
          const travel = pixels.r * 0.26 * (stageRef.current?.getBoundingClientRect().width || 0) / naturalWidth * strength;
          iris.style.transform = `translate(calc(-50% + ${Math.cos(angle) * travel}px), calc(-50% + ${Math.sin(angle) * travel}px))`;
        });
        if (window.matchMedia("(pointer:fine)").matches) {
          const stageRect = stageRef.current?.getBoundingClientRect();
          if (!stageRect) return;
          const dx = (event.clientX - (stageRect.left + stageRect.width / 2)) / stageRect.width;
          const dy = (event.clientY - (stageRect.top + stageRect.height / 2)) / stageRect.height;
          root.style.setProperty("--owl-tilt-x", `${Math.max(-5, Math.min(5, -dy * 5))}deg`);
          root.style.setProperty("--owl-tilt-y", `${Math.max(-8, Math.min(8, dx * 8))}deg`);
        }
        if (event.pointerType === "touch") window.setTimeout(reset, 1500);
      });
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
  }, [compare, naturalWidth, pose, pose.id]);

  const eyeMarkup = pose.eyes !== "baked" && !debugEnabled && !compare && (
    <>
      {(["leftEye", "rightEye"] as const).map((eyeName) => {
        const eye = pose.eyes[eyeName];
        return (
          <span
            key={eyeName}
            className="owl-eye"
            style={{
              left: `${eye.x / naturalWidth * 100}%`,
              top: `${eye.y / naturalHeight * 100}%`,
              width: `${2 * eye.r / naturalWidth * 100}%`,
              aspectRatio: "1",
            }}
          >
            <span className="owl-plate">
              <span className="owl-iris" data-iris data-eye={eyeName === "leftEye" ? "left" : "right"}>
                <span className="owl-pupil" />
                <span className="owl-glint owl-glint-a" />
                <span className="owl-glint owl-glint-b" />
              </span>
              <span className="owl-eyelid" data-eyelid />
            </span>
          </span>
        );
      })}
    </>
  );

  const stageAspectRatio = `${naturalWidth} / ${naturalHeight}`;

  return (
    <div
      ref={rootRef}
      data-pose={pose.id}
      className={`owl-root ${mood === "happy" ? "owl-happy" : ""} ${debugEnabled ? "owl-debug-active" : ""} ${className}`}
      onClick={onClick}
      aria-hidden="true"
    >
      <div className="owl-float">
        <div className="owl-tilt">
          <div
            ref={stageRef}
            className="owl-stage"
            style={{ aspectRatio: stageAspectRatio }}
          >
            {previousPose && showPrevious && !compare && (
              <img
                className="owl-image owl-picture-old"
                src={previousPose.webp}
                alt=""
                width={previousPose.naturalWidth}
                height={previousPose.naturalHeight}
                draggable={false}
                aria-hidden="true"
              />
            )}
            <img
              key={pose.id}
              ref={imageRef}
              className="owl-image owl-picture-current"
              src={compare ? pose.pngFallback : pose.webp}
              onLoad={handleImageLoad}
              onError={handleImageError}
              alt=""
              width={pose.naturalWidth}
              height={pose.naturalHeight}
              draggable={false}
              aria-hidden="true"
            />
            {eyeMarkup}
            {debugEnabled && pose.eyes !== "baked" && (
              <OwlCalibrator
                pose={pose}
                poseId={pose.id}
                poseConfigs={copyConfigs}
                stageRef={stageRef}
                naturalWidth={naturalWidth}
                naturalHeight={naturalHeight}
                compare={compare}
                onCompareChange={setCompare}
                onPoseChange={setDebugPoseId}
                onEyeChange={updateEye}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
