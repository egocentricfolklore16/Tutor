'use client';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { fanDefaults, type FanEntrance, type FanOptions } from './fan-layout';
import { createFanPlayback, type FanPlayback, type FanAction } from './fan-playback';
import type { FanLayoutInfo } from './fan-motion';
import './fan-gallery.css';

export interface FanGalleryItem {
  front: string;
  back: string;
  label?: string;
}
export interface FanGalleryProps extends Partial<FanOptions> {
  items: FanGalleryItem[];
  /**
   * How cards arrive: a closed stack opening like a swatch book (stack),
   * thrown from a deck (deal), rising from below (rise), flipped in place
   * (flip), swept one by one along an arc (circular) or carried as a closed
   * deck that unfolds on arrival (deck).
   */
  entrance?: FanEntrance;
  /** Card corner radius in pixels. */
  radius?: number;
  /** Seconds for one card to settle into the fan. */
  speed?: number;
  /** Seconds between successive cards. */
  stagger?: number;
  /** Entrance overshoot from 0 (soft) to 1 (springy). */
  bounce?: number;
  /** Seconds for the focus to glide to the pointed card. */
  hoverSpeed?: number;
  trigger?: 'auto' | 'scroll' | 'manual' | 'hover';
  /** Entry line from either viewport edge: 75 means 75% downward / 25% upward. */
  viewportStart?: number;
  /** Upward entry line measured from the top; omitted means 100 - viewportStart. */
  viewportStartUp?: number;
  once?: boolean;
  singleFlip?: boolean;
  onFlip?: (index: number, flipped: boolean) => void;
  title?: string;
  subtitle?: string;
  showTitle?: boolean;
  /** Accessible name of the gallery region. */
  ariaLabel?: string;
  /** Reports the spacing and card scale actually used to fit the container. */
  onLayout?: (info: FanLayoutInfo) => void;
  className?: string;
  style?: CSSProperties;
}
export interface FanGalleryHandle {
  play: () => void;
  reset: () => void;
  finish: () => void;
  replay: () => void;
  flipCard: (index: number, flipped: boolean) => void;
}
export const fanMotionDefaults = {
  entrance: 'stack' as FanEntrance,
  radius: 18,
  speed: 0.7,
  stagger: 0.09,
  bounce: 0.35,
  hoverSpeed: 0.28,
};

export const FanGallery = forwardRef<FanGalleryHandle, FanGalleryProps>(function FanGallery(
  {
    items,
    entrance = fanMotionDefaults.entrance,
    cardWidth = fanDefaults.cardWidth,
    aspectRatio = fanDefaults.aspectRatio,
    spacing = fanDefaults.spacing,
    curve = fanDefaults.curve,
    tilt = fanDefaults.tilt,
    lift = fanDefaults.lift,
    spread = fanDefaults.spread,
    stackFrom = fanDefaults.stackFrom,
    radius = fanMotionDefaults.radius,
    speed = fanMotionDefaults.speed,
    stagger = fanMotionDefaults.stagger,
    bounce = fanMotionDefaults.bounce,
    hoverSpeed = fanMotionDefaults.hoverSpeed,
    title = '',
    subtitle = '',
    showTitle = false,
    trigger = 'scroll',
    viewportStart = 75,
    viewportStartUp,
    once = true,
    singleFlip = true,
    onFlip,
    ariaLabel = 'Fan gallery',
    onLayout,
    className = '',
    style,
  },
  ref,
) {
  const root = useRef<HTMLElement>(null),
    stage = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLButtonElement | null)[]>([]);
  const playback = useRef<FanPlayback | null>(null);
  const pending = useRef<FanAction | null>(null);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const flippedRef = useRef(flippedIndices);
  const faceText = useRef<HTMLElement[]>([]);
  const flipRequest = useRef<(index: number, flipped: boolean) => void>(() => {});
  useImperativeHandle(ref, () => {
    const dispatch = (action: FanAction) => {
      pending.current = action;
      playback.current?.dispatch(action);
    };
    return {
      play: () => dispatch('play'),
      reset: () => dispatch('reset'),
      finish: () => dispatch('finish'),
      replay: () => dispatch('play'),
      flipCard: (index, flipped) => flipRequest.current(index, flipped),
    };
  }, []);
  const motionOptions = {
    entrance,
    cardWidth,
    aspectRatio,
    spacing,
    curve,
    tilt,
    lift,
    spread,
    stackFrom,
    radius,
    speed,
    stagger,
    bounce,
    hoverSpeed,
    trigger,
    viewportStart,
    viewportStartUp,
    once,
  };
  const latest = useRef(motionOptions);
  latest.current = motionOptions;
  const layoutCallback = useRef(onLayout);
  layoutCallback.current = onLayout;
  // The controller holds the card nodes, so it is recreated whenever their
  // count changes and when the trigger or heading changes.
  const cardCount = items.length;
  useEffect(() => {
    const element = root.current,
      field = stage.current;
    if (!element || !field || !items.length) return;
    const nodes = cards.current
      .slice(0, items.length)
      .filter((node): node is HTMLButtonElement => !!node);
    const controller = createFanPlayback(element, field, nodes, latest.current, pending, (info) =>
      layoutCallback.current?.(info),
    );
    playback.current = controller;
    return () => {
      controller.destroy();
      playback.current = null;
    };
  }, [cardCount, showTitle, title, subtitle, trigger, viewportStart, viewportStartUp, once]);
  const optionsKey = JSON.stringify(motionOptions);
  const appliedKey = useRef(optionsKey);
  useEffect(() => {
    if (appliedKey.current === optionsKey) return;
    appliedKey.current = optionsKey;
    playback.current?.update(latest.current);
  }, [optionsKey]);
  const fitKey = items.map((item) => `${item.front}\u0000${item.back}`).join('\u0001');
  useLayoutEffect(() => {
    const fitText = (node: HTMLElement) => {
      node.style.fontSize = '';
      const baseSize = Number.parseFloat(getComputedStyle(node).fontSize);
      if (node.scrollHeight <= node.clientHeight + 1 && node.scrollWidth <= node.clientWidth + 1) return;

      let low = 8;
      let high = baseSize;
      for (let attempt = 0; attempt < 10; attempt++) {
        const size = (low + high) / 2;
        node.style.fontSize = `${size}px`;
        if (node.scrollHeight <= node.clientHeight + 1 && node.scrollWidth <= node.clientWidth + 1) {
          low = size;
        } else {
          high = size;
        }
      }
      node.style.fontSize = `${low}px`;
    };
    const fitAll = () => faceText.current.forEach((node) => node && fitText(node));
    const observer = new ResizeObserver(fitAll);
    faceText.current.forEach((node) => node && observer.observe(node));
    fitAll();
    return () => observer.disconnect();
  }, [fitKey]);

  useEffect(() => {
    const valid = flippedRef.current.filter((index) => index < items.length);
    if (valid.length !== flippedRef.current.length) {
      flippedRef.current = valid;
      setFlippedIndices(valid);
    }
  }, [items.length]);

  useEffect(() => {
    if (!singleFlip || flippedRef.current.length <= 1) return;
    const keep = flippedRef.current.at(-1);
    const removed = flippedRef.current.filter((index) => index !== keep);
    if (!removed.length) return;
    const next = keep === undefined ? [] : [keep];
    flippedRef.current = next;
    setFlippedIndices(next);
    removed.forEach((index) => {
      playback.current?.flipCard(index, false);
      onFlip?.(index, false);
    });
  }, [singleFlip, onFlip]);

  const setCardFlipped = (index: number, flipped: boolean) => {
    const current = flippedRef.current;
    if (current.includes(index) === flipped) return;
    const next = flipped
      ? singleFlip
        ? [index]
        : [...current, index]
      : current.filter((cardIndex) => cardIndex !== index);
    const removed = current.filter((cardIndex) => !next.includes(cardIndex));
    flippedRef.current = next;
    setFlippedIndices(next);
    removed.forEach((cardIndex) => {
      playback.current?.flipCard(cardIndex, false);
      onFlip?.(cardIndex, false);
    });
    playback.current?.flipCard(index, flipped);
    onFlip?.(index, flipped);
    if (flipped) {
      playback.current?.activate(index);
    } else {
      const focusedIndex = cards.current.findIndex((node) => node === document.activeElement);
      playback.current?.activate(focusedIndex >= 0 ? focusedIndex : next.at(-1) ?? -1);
    }
  };
  flipRequest.current = setCardFlipped;
  const fallbackActiveIndex = () => flippedRef.current.at(-1) ?? -1;
  return (
    <section
      ref={root}
      className={`fan-gallery ${className}`}
      style={style}
      aria-label={ariaLabel}
    >
      {showTitle && (title || subtitle) && (
        <header className="fan-gallery-heading">
          {title && <h2>{title}</h2>}
          {subtitle && <p>{subtitle}</p>}
        </header>
      )}
      <div
        ref={stage}
        className="fan-gallery-stage"
        onPointerMove={(event) => {
          if (event.pointerType === 'touch') return;
          playback.current?.point(event.clientX, event.clientY);
        }}
        onPointerLeave={() => {
          const focused = cards.current.findIndex((node) => node === document.activeElement);
          playback.current?.activate(focused >= 0 ? focused : fallbackActiveIndex());
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null))
            playback.current?.activate(fallbackActiveIndex());
        }}
      >
        {items.map((item, i) => {
          const isFlipped = flippedIndices.includes(i);
          const visibleText = isFlipped ? item.back : item.front;
          const ariaLabel = !isFlipped && item.label ? `${item.label}: ${visibleText}` : visibleText;
          return (
            <button
              key={i}
              ref={(node) => {
                cards.current[i] = node;
              }}
              type="button"
              className="fan-gallery-card"
              data-flipped={isFlipped}
              aria-pressed={isFlipped}
              aria-label={ariaLabel}
              onFocus={() => playback.current?.activate(i)}
              onClick={() => setCardFlipped(i, !flippedRef.current.includes(i))}
              onKeyDown={(event) => {
                const next =
                  event.key === 'ArrowRight'
                    ? (i + 1) % items.length
                    : event.key === 'ArrowLeft'
                      ? (i - 1 + items.length) % items.length
                      : event.key === 'Home'
                        ? 0
                        : event.key === 'End'
                          ? items.length - 1
                          : -1;
                if (next >= 0) {
                  event.preventDefault();
                  cards.current[next]?.focus({ preventScroll: true });
                }
                if (event.key === 'Escape') {
                  event.preventDefault();
                  setCardFlipped(i, false);
                }
              }}
            >
              <span className="fan-gallery-card-inner">
                <span className="fan-gallery-face fan-gallery-face--front" aria-hidden={isFlipped}>
                  {item.label && <span className="fan-gallery-label">{item.label}</span>}
                  <span
                    className="fan-gallery-face-content"
                    ref={(node) => {
                      if (node) faceText.current[i * 2] = node;
                    }}
                  >
                    {item.front}
                  </span>
                </span>
                <span className="fan-gallery-face fan-gallery-face--back" aria-hidden={!isFlipped}>
                  <span
                    className="fan-gallery-face-content"
                    ref={(node) => {
                      if (node) faceText.current[i * 2 + 1] = node;
                    }}
                  >
                    {item.back}
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
});
