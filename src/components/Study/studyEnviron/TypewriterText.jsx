import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { sanitizePartialMarkdown } from "../../../lib/sanitizePartialMarkdown.js";

const TypewriterText = ({
  text = "",
  shouldAnimate = true,
  onComplete,
  onTick,
  reducedMotion = false,
  components = {},
}) => {
  const fullText = String(text || "");

  // Check prefers-reduced-motion from window media query if not passed
  const prefersReducedMotion =
    reducedMotion ||
    (typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  const startFullyRendered = !shouldAnimate || prefersReducedMotion || !fullText;

  const [displayedLength, setDisplayedLength] = useState(() =>
    startFullyRendered ? fullText.length : 0
  );
  const [isTyping, setIsTyping] = useState(() => !startFullyRendered);

  const animRef = useRef(null);
  const lastTimeRef = useRef(0);
  const onCompleteRef = useRef(onComplete);
  const onTickRef = useRef(onTick);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  const finishImmediately = useCallback(() => {
    setDisplayedLength(fullText.length);
    setIsTyping(false);
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
    if (onCompleteRef.current) {
      onCompleteRef.current();
    }
  }, [fullText.length]);

  useEffect(() => {
    if (startFullyRendered) {
      setDisplayedLength(fullText.length);
      setIsTyping(false);
      return;
    }

    let currentLen = 0;
    setDisplayedLength(0);
    setIsTyping(true);

    const step = (timestamp) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const elapsed = timestamp - lastTimeRef.current;

      // Every ~18ms advance by 3 characters
      if (elapsed >= 18) {
        lastTimeRef.current = timestamp;
        currentLen = Math.min(currentLen + 3, fullText.length);
        setDisplayedLength(currentLen);

        if (onTickRef.current) {
          onTickRef.current();
        }

        if (currentLen >= fullText.length) {
          setIsTyping(false);
          if (onCompleteRef.current) {
            onCompleteRef.current();
          }
          return;
        }
      }

      animRef.current = requestAnimationFrame(step);
    };

    lastTimeRef.current = 0;
    animRef.current = requestAnimationFrame(step);

    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
    };
  }, [fullText, startFullyRendered]);

  const rawPartial = fullText.slice(0, displayedLength);
  const sanitizedMarkdown = isTyping ? sanitizePartialMarkdown(rawPartial) : fullText;

  return (
    <div
      onClick={isTyping ? finishImmediately : undefined}
      className={`relative ${isTyping ? "cursor-pointer group/typewriter" : ""}`}
      title={isTyping ? "Click to finish typing" : undefined}
    >
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false }]]}
        components={components}
      >
        {sanitizedMarkdown}
      </ReactMarkdown>

      {isTyping && (
        <span
          className="inline-block w-[2px] h-[1.1em] bg-violet-600 dark:bg-violet-400 align-middle animate-pulse ml-0.5"
          aria-hidden="true"
        />
      )}

      {isTyping && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            finishImmediately();
          }}
          className="mt-1 inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 opacity-75 transition hover:bg-slate-200 hover:opacity-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          Skip
        </button>
      )}
    </div>
  );
};

export default TypewriterText;
