import React, { RefObject, useEffect, useState } from "react";
import { OwlEyePixels, OwlPoseConfig } from "./poses";

type EyeName = "leftEye" | "rightEye";
type Props = {
  pose: OwlPoseConfig;
  poseId: string;
  poseConfigs: Record<string, OwlPoseConfig>;
  stageRef: RefObject<HTMLDivElement | null>;
  naturalWidth: number;
  naturalHeight: number;
  compare: boolean;
  onCompareChange: (value: boolean) => void;
  onPoseChange: (id: string) => void;
  onEyeChange: (poseId: string, eye: EyeName, value: OwlEyePixels) => void;
};

const isInputTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement && Boolean(target.closest("button, input, select, textarea"));

export default function OwlCalibrator({
  pose, poseId, poseConfigs, stageRef, naturalWidth, naturalHeight,
  compare, onCompareChange, onPoseChange, onEyeChange,
}: Props) {
  const [selectedEye, setSelectedEye] = useState<EyeName>("leftEye");
  const [aspectWarning, setAspectWarning] = useState(false);
  const eyes = pose.eyes === "baked" ? null : pose.eyes;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    const check = () => {
      const rect = stage.getBoundingClientRect();
      if (!rect.height || !naturalWidth || !naturalHeight) return;
      const renderedRatio = rect.width / rect.height;
      const naturalRatio = naturalWidth / naturalHeight;
      setAspectWarning(Math.abs(renderedRatio / naturalRatio - 1) > 0.005);
    };
    const observer = new ResizeObserver(check);
    observer.observe(stage);
    check();
    return () => observer.disconnect();
  }, [stageRef, naturalWidth, naturalHeight]);

  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      if (isInputTarget(event.target)) return;
      if (event.key.toLowerCase() === "c") {
        onCompareChange(true);
        return;
      }
      if (event.key.startsWith("Arrow")) {
        event.preventDefault();
        const current = eyes?.[selectedEye];
        if (!current) return;
        const amount = 0.5;
        const next = { ...current };
        if (event.key === "ArrowLeft") next.x -= amount;
        if (event.key === "ArrowRight") next.x += amount;
        if (event.key === "ArrowUp") next.y -= amount;
        if (event.key === "ArrowDown") next.y += amount;
        onEyeChange(poseId, selectedEye, next);
        return;
      }
      if (event.key === "+" || event.key === "=" || event.key === "-" || event.key === "_") {
        event.preventDefault();
        const current = eyes?.[selectedEye];
        if (!current) return;
        const amount = event.altKey ? 2 : event.shiftKey ? 0.25 : 0.5;
        onEyeChange(poseId, selectedEye, {
          ...current,
          r: Math.max(1, current.r + (event.key === "+" || event.key === "=" ? amount : -amount)),
        });
      }
    };
    const keyUp = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "c") onCompareChange(false);
    };
    const clearCompare = () => onCompareChange(false);
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("blur", clearCompare);
    return () => {
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", clearCompare);
    };
  }, [eyes, onCompareChange, onEyeChange, poseId, selectedEye]);

  const copyConfig = async () => {
    const output = {
      ...poseConfigs,
      [poseId]: pose,
    };
    await navigator.clipboard.writeText(`export const POSE_CONFIG = ${JSON.stringify(output, null, 2)} as const;`);
  };

  if (!eyes || compare) return null;

  return (
    <>
      {(["leftEye", "rightEye"] as const).map((eyeName) => {
        const eye = eyes[eyeName];
        return (
          <div
            key={eyeName}
            className={`owl-eye owl-eye-debug ${selectedEye === eyeName ? "is-selected" : ""}`}
            style={{
              left: `${eye.x / naturalWidth * 100}%`,
              top: `${eye.y / naturalHeight * 100}%`,
              width: `${2 * eye.r / naturalWidth * 100}%`,
              aspectRatio: "1",
            }}
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setSelectedEye(eyeName);
              const stage = stageRef.current;
              if (!stage) return;
              const rect = stage.getBoundingClientRect();
              const initial = eye;
              const startX = event.clientX;
              const startY = event.clientY;
              const move = (pointerEvent: PointerEvent) => {
                onEyeChange(poseId, eyeName, {
                  ...initial,
                  x: initial.x + ((pointerEvent.clientX - startX) / rect.width) * naturalWidth,
                  y: initial.y + ((pointerEvent.clientY - startY) / rect.height) * naturalHeight,
                });
              };
              const stop = () => {
                window.removeEventListener("pointermove", move);
                window.removeEventListener("pointerup", stop);
                window.removeEventListener("pointercancel", stop);
              };
              window.addEventListener("pointermove", move);
              window.addEventListener("pointerup", stop, { once: true });
              window.addEventListener("pointercancel", stop, { once: true });
            }}
            onWheel={(event) => {
              event.preventDefault();
              setSelectedEye(eyeName);
              const amount = event.altKey ? 2 : event.shiftKey ? 0.25 : 0.5;
              onEyeChange(poseId, eyeName, { ...eye, r: Math.max(1, eye.r + (event.deltaY < 0 ? amount : -amount)) });
            }}
            aria-label={`${eyeName}: x ${eye.x.toFixed(2)}, y ${eye.y.toFixed(2)}, radius ${eye.r.toFixed(2)} pixels`}
          >
            <span className="owl-plate">
              <span className="owl-iris" data-iris data-eye={eyeName === "leftEye" ? "left" : "right"}>
                <span className="owl-pupil" />
                <span className="owl-glint owl-glint-a" />
                <span className="owl-glint owl-glint-b" />
              </span>
              <span className="owl-eyelid" data-eyelid />
            </span>
            <span className="owl-debug-crosshair" />
            <span className="owl-debug-measure">{`x ${eye.x.toFixed(2)} · y ${eye.y.toFixed(2)} · r ${eye.r.toFixed(2)}`}</span>
          </div>
        );
      })}
      <div className="owl-calibrator" onPointerDown={(event) => event.stopPropagation()}>
        {aspectWarning && <p className="owl-calibrator-warning">Stage/image aspect ratio differs by more than 0.5%.</p>}
        <label>
          Pose
          <select value={poseId} onChange={(event) => onPoseChange(event.target.value)}>
            <option value="wings-up">Wings up</option>
            <option value="thinking">Thinking</option>
          </select>
        </label>
        <span className="owl-calibrator-hint">Drag eye · wheel radius · arrows nudge · hold C to compare</span>
        <button type="button" onClick={copyConfig}>Copy POSE_CONFIG</button>
      </div>
    </>
  );
}
