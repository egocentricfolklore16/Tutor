import { RefObject, useEffect, useRef } from "react";
import { OwlPoseConfig } from "./poses";

type Props = {
  rootRef: RefObject<HTMLDivElement | null>;
  stageRef: RefObject<HTMLDivElement | null>;
  pose: OwlPoseConfig;
  naturalWidth: number;
  mood: "idle" | "curious" | "thinking" | "happy";
  enabled: boolean;
};

type EyeName = "left" | "right";
type Blink = { start: number; close: number; hold: number; open: number };
type EyeRuntime = {
  name: EyeName;
  element: HTMLElement;
  iris: HTMLElement;
  highlights: HTMLElement[];
  pupil: HTMLElement | null;
  upperLid: HTMLElement | null;
  lowerLid: HTMLElement | null;
  radius: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  blink: Blink | null;
};
type PointerSample = { x: number; y: number; time: number };

const randomBetween = (minimum: number, maximum: number) => minimum + Math.random() * (maximum - minimum);
const clampVector = (x: number, y: number, maximum: number) => {
  const length = Math.hypot(x, y);
  if (!length || length <= maximum) return { x, y };
  return { x: x * maximum / length, y: y * maximum / length };
};
const easeOut = (value: number) => 1 - (1 - value) * (1 - value);

function blinkDurations(slow: boolean): Omit<Blink, "start"> {
  return slow ? { close: 160, hold: 120, open: 200 } : { close: 80, hold: 40, open: 130 };
}

export function useOwlEyeBehavior({
  rootRef, stageRef, pose, naturalWidth, mood, enabled,
}: Props) {
  const moodRef = useRef(mood);
  const previousMoodRef = useRef(mood);
  const happyUntilRef = useRef(0);
  const suppressPropHappyRef = useRef(false);

  useEffect(() => {
    moodRef.current = mood;
    if (mood === "happy" && previousMoodRef.current !== "happy" && performance.now() < happyUntilRef.current) {
      suppressPropHappyRef.current = true;
    }
    if (mood !== "happy" && previousMoodRef.current === "happy") {
      suppressPropHappyRef.current = false;
    }
    previousMoodRef.current = mood;
  }, [mood]);

  useEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    if (!root || !stage || !enabled || pose.eyes === "baked") return undefined;

    const eyes: EyeRuntime[] = Array.from(root.querySelectorAll<HTMLElement>(".owl-eye")).flatMap((element) => {
      const iris = element.querySelector<HTMLElement>("[data-iris]");
      const eyeName = iris?.dataset.eye as EyeName | undefined;
      if (!iris || !eyeName) return [];
      const config = pose.eyes === "baked" ? null : eyeName === "left" ? pose.eyes.leftEye : pose.eyes.rightEye;
      if (!config) return [];
      return [{
        name: eyeName,
        element,
        iris,
        highlights: Array.from(element.querySelectorAll<HTMLElement>(".owl-glint, .owl-glint-curve")),
        pupil: element.querySelector<HTMLElement>(".owl-pupil"),
        upperLid: element.querySelector<HTMLElement>(".owl-upper-lid, .owl-eyelid"),
        lowerLid: element.querySelector<HTMLElement>(".owl-lower-lid"),
        radius: config.r,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        blink: null,
      }];
    });
    if (!eyes.length) return undefined;

    const setEyeDimensions = () => {
      const scale = stage.getBoundingClientRect().width / naturalWidth;
      eyes.forEach((eye) => {
        const radius = eye.radius * scale;
        eye.element.style.setProperty("--eye-radius", `${radius}px`);
        eye.element.style.setProperty("--eye-shadow-top-y", `${radius * 0.18}px`);
        eye.element.style.setProperty("--eye-shadow-blur", `${radius * 0.22}px`);
        eye.element.style.setProperty("--eye-shadow-bottom-y", `${radius * -0.06}px`);
        eye.element.style.setProperty("--eye-shadow-bottom-blur", `${radius * 0.12}px`);
        eye.element.style.setProperty("--iris-rim-width", `${radius * 0.09}px`);
      });
    };
    const sizeObserver = new ResizeObserver(setEyeDimensions);
    sizeObserver.observe(stage);
    setEyeDimensions();

    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = reducedQuery.matches;
    let visible = false;
    let frame = 0;
    let lastFrame = performance.now();
    let lastPointerMove = lastFrame;
    let hasPointer = false;
    let touchLookUntil = 0;
    let pointerHistory: PointerSample[] = [];
    let attentionStarted = 0;
    let lookedAway = false;
    let lookAwayUntil = 0;
    let returnToCursorUntil = 0;
    let lookAwayX = 0;
    let lookAwayY = 0;
    let idleTargetX = 0;
    let idleTargetY = 0;
    let idleTargetUntil = 0;
    let nextSaccadeAt = lastFrame + randomBetween(1500, 3500);
    let nextBlinkAt = lastFrame + randomBetween(reducedMotion ? 8000 : 2500, reducedMotion ? 8000 : 5500);
    let secondBlinkAt = 0;
    let nextMicroUpdate = lastFrame;
    let microX = 0;
    let microY = 0;

    const startBlink = (at: number, slow: boolean) => {
      const durations = blinkDurations(slow);
      eyes.forEach((eye, index) => {
        eye.blink = { start: at + (index === 0 ? 0 : randomBetween(0, 15)), ...durations };
      });
    };

    const triggerBlink = (at = performance.now()) => {
      if (reducedMotion) return;
      const slow = Math.random() < 1 / 6;
      startBlink(at, slow);
      secondBlinkAt = Math.random() < 0.2
        ? at + blinkDurations(slow).close + blinkDurations(slow).hold + blinkDurations(slow).open + 130
        : 0;
    };

    const onPointerMove = (event: PointerEvent) => {
      const now = performance.now();
      const next = { x: event.clientX, y: event.clientY, time: now };
      const previous = pointerHistory[pointerHistory.length - 1];
      if (previous && now - previous.time <= 100 && Math.hypot(next.x - previous.x, next.y - previous.y) > 400) {
        triggerBlink(now);
      }
      pointerHistory.push(next);
      if (pointerHistory.length > 30) pointerHistory = pointerHistory.slice(-30);
      lastPointerMove = now;
      hasPointer = true;
      if (event.pointerType === "touch") touchLookUntil = now + 1500;
    };
    const onPointerLeave = () => {
      hasPointer = false;
      pointerHistory = [];
      attentionStarted = 0;
      lookedAway = false;
      returnToCursorUntil = 0;
      lastPointerMove = performance.now();
    };

    const happyListener = (event: Event) => {
      const now = performance.now();
      const duration = (event as CustomEvent<{ eyeMoodDuration?: number }>).detail?.eyeMoodDuration || 800;
      happyUntilRef.current = now + duration;
      suppressPropHappyRef.current = moodRef.current === "happy";
      triggerBlink(now);
    };

    const visibilityChanged = () => {
      if (document.visibilityState === "visible") startLoop();
      else stopLoop();
    };
    const reducedChanged = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;
      const now = performance.now();
      nextBlinkAt = now + (reducedMotion ? 8000 : randomBetween(2500, 5500));
      if (reducedMotion) {
        pointerHistory = [];
        eyes.forEach((eye) => { eye.x = 0; eye.y = 0; eye.vx = 0; eye.vy = 0; });
      }
      startLoop();
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) startLoop();
      else stopLoop();
    });
    const stopLoop = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    };
    const startLoop = () => {
      if (!visible || document.visibilityState !== "visible" || frame) return;
      lastFrame = performance.now();
      frame = requestAnimationFrame(tick);
    };

    const currentPointer = (time: number, delay: number) => {
      if (!pointerHistory.length) return null;
      const targetTime = time - delay;
      let sample = pointerHistory[0];
      for (let index = pointerHistory.length - 1; index >= 0; index -= 1) {
        if (pointerHistory[index].time <= targetTime) {
          sample = pointerHistory[index];
          break;
        }
      }
      return sample;
    };

    const tick = (time: number) => {
      frame = 0;
      if (!visible || document.visibilityState !== "visible") return;
      const dt = Math.min(0.032, Math.max(0.001, (time - lastFrame) / 1000));
      lastFrame = time;
      const stageRect = stage.getBoundingClientRect();
      const stageCenterX = stageRect.left + stageRect.width / 2;
      const stageCenterY = stageRect.top + stageRect.height / 2;
      const latestPointer = currentPointer(time, 0);
      const pointerDistance = latestPointer ? Math.hypot(latestPointer.x - stageCenterX, latestPointer.y - stageCenterY) : Infinity;
      const insideAttention = pointerDistance <= 220;

      if (!reducedMotion && insideAttention) {
        if (!attentionStarted) attentionStarted = time;
        if (!lookedAway && time - attentionStarted >= 4000) {
          lookedAway = true;
          lookAwayUntil = time + randomBetween(600, 900);
          lookAwayX = (Math.random() < 0.5 ? -1 : 1) * 0.08;
          lookAwayY = -0.08;
        }
      } else {
        attentionStarted = 0;
        lookedAway = false;
      }

      if (!reducedMotion && time >= nextSaccadeAt && time - lastPointerMove >= 3000) {
        const angle = randomBetween(0, Math.PI * 2);
        const distance = randomBetween(0.04, 0.12);
        idleTargetX = Math.cos(angle) * distance;
        idleTargetY = Math.sin(angle) * distance;
        idleTargetUntil = time + randomBetween(450, 800);
        nextSaccadeAt = time + randomBetween(1500, 3500);
      }
      if (time > idleTargetUntil) {
        idleTargetX *= Math.max(0, 1 - dt * 3);
        idleTargetY *= Math.max(0, 1 - dt * 3);
      }

      if (time >= nextBlinkAt && !reducedMotion) {
        triggerBlink(time);
        nextBlinkAt = time + randomBetween(2500, 5500);
      } else if (secondBlinkAt && time >= secondBlinkAt) {
        startBlink(time, false);
        secondBlinkAt = 0;
      }
      if (reducedMotion && time >= nextBlinkAt) {
        startBlink(time, true);
        nextBlinkAt = time + 8000;
      }

      if (time >= nextMicroUpdate) {
        microX = randomBetween(-0.02, 0.02);
        microY = randomBetween(-0.02, 0.02);
        nextMicroUpdate = time + randomBetween(120, 300);
      }

      const currentMood = moodRef.current;
      const curious = !reducedMotion && (currentMood === "curious" || pointerDistance <= 180);
      const eventHappy = time < happyUntilRef.current;
      const happy = !reducedMotion && (eventHappy || (currentMood === "happy" && !suppressPropHappyRef.current));
      const thinking = pose.id === "thinking" || currentMood === "thinking";
      const pupilRadius = happy || curious ? 0.46 : thinking ? 0.38 : 0.4;
      const pupilScale = pupilRadius / 0.4;
      const gazeOffsetX = thinking ? -0.045 : 0;
      const gazeOffsetY = thinking ? -0.06 : 0;

      eyes.forEach((eye) => {
        const delay = eye.name === "right" ? 20 : 0;
        const pointerActive = !reducedMotion && hasPointer && (
          time - lastPointerMove < 3000 || time < touchLookUntil || time < returnToCursorUntil
        );
        const point = pointerActive ? currentPointer(time, delay) : null;
        const eyeRect = eye.element.getBoundingClientRect();
        let targetX = 0;
        let targetY = 0;

        if (lookedAway && time < lookAwayUntil) {
          targetX = lookAwayX;
          targetY = lookAwayY;
        } else {
          if (lookedAway && !returnToCursorUntil) returnToCursorUntil = time + 900;
          if (point && (time - lastPointerMove < 3000 || time < returnToCursorUntil)) {
            const dx = point.x - (eyeRect.left + eyeRect.width / 2);
            const dy = point.y - (eyeRect.top + eyeRect.height / 2);
            const distance = Math.hypot(dx, dy);
            const strength = easeOut(Math.min(1, distance / 320));
            const maximum = eye.radius * 0.2 * stageRect.width / naturalWidth;
            const magnitude = maximum * strength;
            targetX = distance ? dx / distance * magnitude : 0;
            targetY = distance ? dy / distance * magnitude : 0;
          } else if (!reducedMotion) {
            targetX = idleTargetX * eye.radius * stageRect.width / naturalWidth;
            targetY = idleTargetY * eye.radius * stageRect.width / naturalWidth;
          }
          targetX += gazeOffsetX * eye.radius * stageRect.width / naturalWidth;
          targetY += gazeOffsetY * eye.radius * stageRect.width / naturalWidth;
          if (!reducedMotion && !point && !thinking) {
            targetX += microX * eye.radius * stageRect.width / naturalWidth;
            targetY += microY * eye.radius * stageRect.width / naturalWidth;
          }
        }
        const maximum = eye.radius * 0.2 * stageRect.width / naturalWidth;
        const target = reducedMotion ? { x: 0, y: 0 } : clampVector(targetX, targetY, maximum);
        const ax = 140 * (target.x - eye.x) - 18 * eye.vx;
        const ay = 140 * (target.y - eye.y) - 18 * eye.vy;
        eye.vx += ax * dt;
        eye.vy += ay * dt;
        eye.x += eye.vx * dt;
        eye.y += eye.vy * dt;
        const position = clampVector(eye.x, eye.y, maximum);
        eye.x = position.x;
        eye.y = position.y;
        eye.iris.style.transform = `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`;
        eye.highlights.forEach((highlight) => {
          highlight.style.setProperty("--glint-counter-x", `${-position.x * 0.75}px`);
          highlight.style.setProperty("--glint-counter-y", `${-position.y * 0.75}px`);
        });
        if (eye.pupil) eye.pupil.style.transform = `translate(-50%, -50%) scale(${pupilScale})`;

        const blink = eye.blink;
        let blinkProgress = 0;
        if (blink) {
          const elapsed = time - blink.start;
          if (elapsed < 0) {
            blinkProgress = 0;
          } else if (elapsed < blink.close) {
            const progress = elapsed / blink.close;
            blinkProgress = 1 - (1 - progress) ** 3;
          } else if (elapsed < blink.close + blink.hold) {
            blinkProgress = 1;
          } else if (elapsed < blink.close + blink.hold + blink.open) {
            const progress = (elapsed - blink.close - blink.hold) / blink.open;
            blinkProgress = (1 - progress) ** 3;
          } else {
            eye.blink = null;
          }
        }
        const plateHeight = eyeRect.height * 1.04;
        const restingLid = pose.id === "thinking" ? 0.18 : 0.14;
        const rightLid = eye.name === "right" ? 0.01 : 0;
        const verticalGaze = maximum ? position.y / maximum : 0;
        const gazeLid = verticalGaze * 0.04 * plateHeight;
        const moodLid = curious ? -0.03 * plateHeight : 0;
        const happyLid = happy ? 0.08 * plateHeight : 0;
        if (eye.upperLid) {
          const base = (-1 + restingLid + rightLid) * plateHeight;
          const blinkTravel = blinkProgress * ((1 - restingLid - rightLid) * plateHeight - gazeLid - moodLid - happyLid);
          eye.upperLid.style.transform = `translateY(${base + gazeLid + moodLid + happyLid + blinkTravel}px)`;
        }
        if (eye.lowerLid) {
          eye.lowerLid.style.transform = `translateY(${happy ? -0.1 * plateHeight : 0}px)`;
        }
      });
      if (!reducedMotion && window.matchMedia("(pointer:fine)").matches && latestPointer && hasPointer) {
        const dx = (latestPointer.x - stageCenterX) / Math.max(1, stageRect.width);
        const dy = (latestPointer.y - stageCenterY) / Math.max(1, stageRect.height);
        root.style.setProperty("--owl-tilt-x", `${Math.max(-5, Math.min(5, -dy * 5))}deg`);
        root.style.setProperty("--owl-tilt-y", `${Math.max(-8, Math.min(8, dx * 8))}deg`);
      } else {
        root.style.setProperty("--owl-tilt-x", "0deg");
        root.style.setProperty("--owl-tilt-y", "0deg");
      }

      frame = requestAnimationFrame(tick);
    };

    const lastPose = root.dataset.eyePose;
    if (lastPose && lastPose !== pose.id) triggerBlink(performance.now());
    root.dataset.eyePose = pose.id;
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave, { passive: true });
    window.addEventListener("owl:happy", happyListener);
    document.addEventListener("visibilitychange", visibilityChanged);
    reducedQuery.addEventListener("change", reducedChanged);
    observer.observe(root);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("owl:happy", happyListener);
      document.removeEventListener("visibilitychange", visibilityChanged);
      reducedQuery.removeEventListener("change", reducedChanged);
      observer.disconnect();
      sizeObserver.disconnect();
      stopLoop();
    };
  }, [enabled, naturalWidth, pose, rootRef, stageRef]);
}
