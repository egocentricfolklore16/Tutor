import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getOwlPose, OwlEyePixels, OwlPoseConfig, POSE_CONFIG } from "./poses";
import OwlCalibrator from "./OwlCalibrator";
import { useOwlEyeBehavior } from "./useOwlEyeBehavior";

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
  const eyeLookDebug = debugEnabled && typeof window !== "undefined" && new URLSearchParams(window.location.search).get("eyeLook") === "1";
  const [debugPoseId, setDebugPoseId] = useState(poseId === "happy" ? "wings-up" : poseId);
  const [poseConfigs, setPoseConfigs] = useState(POSE_CONFIG);
  const [loadedSize, setLoadedSize] = useState<NaturalSize | null>(null);
  const [compare, setCompare] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
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

  useOwlEyeBehavior({
    rootRef,
    stageRef,
    pose,
    naturalWidth,
    mood,
    enabled: pose.eyes !== "baked" && !compare,
  });

  const eyeMarkup = pose.eyes !== "baked" && !debugEnabled && !compare && (
    <>
      {(["leftEye", "rightEye"] as const).map((eyeName) => {
        const eye = pose.eyes[eyeName];
        return (
          <span
            key={eyeName}
            className={`owl-eye ${eyeName === "rightEye" ? "owl-eye-right" : "owl-eye-left"}`}
            style={{
              left: `${eye.x / naturalWidth * 100}%`,
              top: `${eye.y / naturalHeight * 100}%`,
              width: `${2 * eye.r / naturalWidth * 100}%`,
              aspectRatio: "1",
            }}
          >
            <span className="owl-plate">
              <span
                className="owl-iris"
                data-iris
                data-eye={eyeName === "leftEye" ? "left" : "right"}
                style={{ width: eyeName === "rightEye" ? "75.385%" : "76.923%", height: eyeName === "rightEye" ? "75.385%" : "76.923%" }}
              >
                <span className="owl-pupil" />
                <span className="owl-glint owl-glint-a" />
                <span className="owl-glint owl-glint-b" />
                <span className="owl-glint-curve" />
              </span>
              <span className="owl-socket-shadow" />
              <span className="owl-eyelid owl-upper-lid" data-eyelid />
              <span className="owl-lower-lid" />
              <span className="owl-vignette" />
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
      className={`owl-root ${mood === "happy" ? "owl-happy" : ""} ${debugEnabled ? "owl-debug-active" : ""} ${eyeLookDebug ? "owl-eye-look-debug" : ""} ${className}`}
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
