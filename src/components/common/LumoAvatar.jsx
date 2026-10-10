import React, { useEffect } from "react";

const SIZE_MAP = {
  xs: { px: 28, classNames: "h-[28px] w-[28px]" },
  sm: { px: 40, classNames: "h-[40px] w-[40px]" },
  lg: { px: 88, classNames: "h-[88px] w-[88px]" },
};

const THINKING_IMG = "/logo5-removebg-preview.png";
const REPLIED_IMG = "/logo3.png";

export default function LumoAvatar({ size = "sm", state = "thinking", className = "" }) {
  const config = SIZE_MAP[size] || SIZE_MAP.sm;
  const isThinking = state === "thinking";

  useEffect(() => {
    if (typeof window !== "undefined") {
      const img1 = new Image();
      img1.src = THINKING_IMG;
      const img2 = new Image();
      img2.src = REPLIED_IMG;
    }
  }, []);

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center select-none ${config.classNames} ${className}`.trim()}
      style={{ width: `${config.px}px`, height: `${config.px}px` }}
    >
      {/* Thinking Owl */}
      <img
        src={THINKING_IMG}
        alt="Lumo, your AI study partner"
        width={config.px}
        height={config.px}
        draggable={false}
        className={`absolute inset-0 h-full w-full object-contain transition-all duration-200 ease-in-out ${
          isThinking
            ? "opacity-100 scale-100 animate-lumo-head-tilt"
            : "opacity-0 scale-95 pointer-events-none"
        }`}
      />

      {/* Replied Owl */}
      <img
        src={REPLIED_IMG}
        alt="Lumo, your AI study partner"
        width={config.px}
        height={config.px}
        draggable={false}
        className={`absolute inset-0 h-full w-full object-contain transition-all duration-200 ease-in-out ${
          !isThinking
            ? "opacity-100 scale-100"
            : "opacity-0 scale-95 pointer-events-none"
        }`}
      />
    </div>
  );
}
