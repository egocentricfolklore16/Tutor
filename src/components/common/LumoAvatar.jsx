import React from "react";

const SIZE_MAP = {
  xs: { px: 28, classNames: "h-[28px] w-[28px]" },
  sm: { px: 40, classNames: "h-[40px] w-[40px]" },
  lg: { px: 88, classNames: "h-[88px] w-[88px]" },
};

export default function LumoAvatar({ size = "sm", className = "" }) {
  const config = SIZE_MAP[size] || SIZE_MAP.sm;

  return (
    <img
      src="/logo5-removebg-preview.png"
      alt="Lumo, your AI study partner"
      width={config.px}
      height={config.px}
      draggable={false}
      className={`object-contain select-none ${config.classNames} ${className}`.trim()}
    />
  );
}
