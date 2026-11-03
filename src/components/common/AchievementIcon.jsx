import React from "react";
import * as LucideIcons from "lucide-react";

/**
 * Flexible achievement icon renderer.
 * - Renders matching Lucide React icon if name matches (e.g., "Award", "zap", "trophy")
 * - Renders text/emoji directly if string is an emoji
 * - Falls back to Award icon if unknown or missing
 */
export default function AchievementIcon({ icon, className = "h-5 w-5", textClassName = "text-xl" }) {
  if (!icon || typeof icon !== "string") {
    const Fallback = LucideIcons.Award;
    return <Fallback className={className} />;
  }

  const trimmed = icon.trim();
  if (!trimmed) {
    const Fallback = LucideIcons.Award;
    return <Fallback className={className} />;
  }

  // Check direct name match
  let IconComponent = LucideIcons[trimmed];

  // Try converting kebab-case / camelCase / lowercase to PascalCase (e.g., "zap" -> "Zap")
  if (!IconComponent) {
    const pascalName = trimmed
      .replace(/[-_]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""))
      .replace(/^[a-z]/, (c) => c.toUpperCase());
    IconComponent = LucideIcons[pascalName];
  }

  if (IconComponent && (typeof IconComponent === "function" || typeof IconComponent === "object")) {
    try {
      return <IconComponent className={className} />;
    } catch {
      // Fall through on unexpected render error
    }
  }

  // If not a Lucide icon name, render as emoji/text string
  return <span className={textClassName}>{trimmed}</span>;
}
