import React, { useEffect, useRef, useState } from "react";
import { GraduationCap, Flame, Target, ArrowRight, Sparkles } from "lucide-react";
import { HERO_QUOTES } from "./getHeroState";
import "./greeting-hero.css";

export function GreetingHero({
  eyebrow,
  headline,
  subline,
  primaryLabel,
  onPrimary,
  secondaryLabel = "Ask AI Tutor",
  onSecondary,
  timeVariant = "afternoon",
  owlSrc = "/logo3.png",
  streak,
  goalDone,
  goalTotal,
  quotes = HERO_QUOTES,
  isLoading = false,
}) {
  const [quoteIndex, setQuoteIndex] = useState(() => Math.floor(Math.random() * (quotes?.length || 1)));
  const [isPaused, setIsPaused] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const cardRef = useRef(null);

  // IntersectionObserver to pause quote rotation when offscreen
  useEffect(() => {
    if (!cardRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  // 8s quote rotation interval
  useEffect(() => {
    if (typeof window === "undefined") return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion || isPaused || !isVisible || !quotes || quotes.length === 0) return;

    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        setQuoteIndex((prev) => (prev + 1) % quotes.length);
      }
    }, 8000);

    return () => clearInterval(timer);
  }, [isPaused, isVisible, quotes]);

  if (isLoading) {
    return (
      <div className="hero animate-pulse min-h-[210px] flex items-center p-6 rounded-3xl bg-slate-900/60 relative">
        <div className="hero-bg" />
        <div className="flex flex-col gap-2.5 w-1/2 relative z-10">
          <div className="h-3 w-20 bg-white/20 rounded-md" />
          <div className="h-7 w-56 bg-white/20 rounded-xl" />
          <div className="h-3.5 w-44 bg-white/15 rounded-md" />
          <div className="h-10 w-32 bg-white/20 rounded-full mt-3" />
        </div>
      </div>
    );
  }

  return (
    <section
      ref={cardRef}
      className="hero"
      data-time={timeVariant}
      aria-labelledby="hero-title"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background with clipped rounded corners and layered gradient glow */}
      <div className="hero-bg" />

      {/* Hero Text Content */}
      <div className="hero-content">
        <p className="hero-eyebrow">{eyebrow}</p>
        <h1 id="hero-title" className="hero-title">
          {headline}
        </h1>
        <p className="hero-sub">{subline}</p>
        <div className="hero-actions">
          <button type="button" className="hero-cta" onClick={onPrimary}>
            <span>{primaryLabel}</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </button>
          <button type="button" className="hero-ghost" onClick={onSecondary}>
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-emerald-200" />
            <span>{secondaryLabel}</span>
          </button>
        </div>
      </div>

      {/* Hero Art & Owl Mascot (owl top extends above hero-bg for head-pop effect) */}
      <div className="hero-art" aria-hidden="true">
        <div className="hero-glow-fallback" />
        <img
          className="hero-owl-glow"
          src={owlSrc}
          alt=""
          width={640}
          height={800}
          decoding="async"
        />
        <img
          className="hero-owl"
          src={owlSrc}
          alt=""
          width={640}
          height={800}
          decoding="async"
          fetchPriority="high"
        />

        {/* Floating Glass Icon */}
        <div className="glass glass-icon f1">
          <GraduationCap className="w-7 h-7 text-white" />
        </div>

        {/* Floating Glass Quote Card - Owl wing slightly overlaps for depth */}
        {quotes && quotes.length > 0 && (
          <div className="glass glass-quote f2">
            <p key={quoteIndex} className="quote-text">
              “{quotes[quoteIndex]}”
            </p>
            <span className="quote-line" />
          </div>
        )}

        {/* Floating Glass Stat Card */}
        {(streak !== undefined || goalTotal > 0) && (
          <div className="glass glass-stat f3">
            {streak !== undefined && (
              <span className="stat-row">
                <Flame className="w-3.5 h-3.5 text-amber-300 fill-amber-300" /> {streak} day streak
              </span>
            )}
            {goalTotal > 0 && (
              <span className="stat-row">
                <Target className="w-3.5 h-3.5 text-emerald-300" /> {goalDone || 0}/{goalTotal} min today
              </span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default GreetingHero;
