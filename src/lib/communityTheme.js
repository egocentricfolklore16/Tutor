/**
 * Theme helper matching the Promo Card ("Find your study group") theme structure.
 *
 * Light mode: flat, fully saturated poster color on white.
 * Dark mode: desaturated dark gradient fading into #18211f.
 */
export function communityCardTheme(color = "emerald") {
  const normalizedColor = color === "gold" ? "amber" : color;

  const themes = {
    emerald: {
      container:
        "relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-emerald-600 p-4 text-white shadow-surface hover:shadow-surface-hover transition dark:border-white/5 dark:bg-[#18211f] dark:bg-gradient-to-br dark:from-emerald-500/10 dark:via-transparent dark:to-transparent dark:hover:border-emerald-500/30",
      faintIcon: "text-white/20 dark:text-emerald-400/20",
      labelIcon: "text-white/90 dark:text-emerald-400",
      labelText: "text-white/90 dark:text-emerald-400",
      title: "font-bold text-white dark:text-white",
      description: "text-emerald-100 dark:text-gray-400",
      link: "text-white dark:text-emerald-400 hover:underline transition",
      chip: "bg-white/20 text-white dark:bg-emerald-950/60 dark:text-emerald-300",
      badge: "bg-emerald-500/20 text-white dark:bg-emerald-950/60 dark:text-emerald-300",
      divider: "border-white/20 dark:border-slate-800",
      buttonPrimary:
        "bg-white text-emerald-950 hover:bg-emerald-50 dark:bg-emerald-600 dark:text-white dark:hover:bg-emerald-700",
    },
    teal: {
      container:
        "relative overflow-hidden rounded-2xl border border-teal-500/20 bg-teal-600 p-4 text-white shadow-surface hover:shadow-surface-hover transition dark:border-white/5 dark:bg-[#18211f] dark:bg-gradient-to-br dark:from-teal-500/10 dark:via-transparent dark:to-transparent dark:hover:border-teal-500/30",
      faintIcon: "text-white/20 dark:text-teal-400/20",
      labelIcon: "text-white/90 dark:text-teal-400",
      labelText: "text-white/90 dark:text-teal-400",
      title: "font-bold text-white dark:text-white",
      description: "text-teal-100 dark:text-gray-400",
      link: "text-white dark:text-teal-400 hover:underline transition",
      chip: "bg-white/20 text-white dark:bg-teal-950/60 dark:text-teal-300",
      badge: "bg-teal-500/20 text-white dark:bg-teal-950/60 dark:text-teal-300",
      divider: "border-white/20 dark:border-slate-800",
      buttonPrimary:
        "bg-white text-teal-950 hover:bg-teal-50 dark:bg-teal-600 dark:text-white dark:hover:bg-teal-700",
    },
    violet: {
      container:
        "relative overflow-hidden rounded-2xl border border-violet-500/20 bg-violet-600 p-4 text-white shadow-surface hover:shadow-surface-hover transition dark:border-white/5 dark:bg-[#18211f] dark:bg-gradient-to-br dark:from-violet-500/10 dark:via-transparent dark:to-transparent dark:hover:border-violet-500/30",
      faintIcon: "text-white/20 dark:text-violet-400/20",
      labelIcon: "text-white/90 dark:text-violet-400",
      labelText: "text-white/90 dark:text-violet-400",
      title: "font-bold text-white dark:text-white",
      description: "text-violet-100 dark:text-gray-400",
      link: "text-white dark:text-violet-400 hover:underline transition",
      chip: "bg-white/20 text-white dark:bg-violet-950/60 dark:text-violet-300",
      badge: "bg-violet-500/20 text-white dark:bg-violet-950/60 dark:text-violet-300",
      divider: "border-white/20 dark:border-slate-800",
      buttonPrimary:
        "bg-white text-violet-950 hover:bg-violet-50 dark:bg-violet-600 dark:text-white dark:hover:bg-violet-700",
    },
    amber: {
      container:
        "relative overflow-hidden rounded-2xl border border-amber-500/20 bg-amber-600 p-4 text-white shadow-surface hover:shadow-surface-hover transition dark:border-white/5 dark:bg-[#18211f] dark:bg-gradient-to-br dark:from-amber-500/10 dark:via-transparent dark:to-transparent dark:hover:border-amber-500/30",
      faintIcon: "text-white/20 dark:text-amber-400/20",
      labelIcon: "text-white/90 dark:text-amber-400",
      labelText: "text-white/90 dark:text-amber-400",
      title: "font-bold text-white dark:text-white",
      description: "text-amber-100 dark:text-gray-400",
      link: "text-white dark:text-amber-400 hover:underline transition",
      chip: "bg-white/20 text-white dark:bg-amber-950/60 dark:text-amber-300",
      badge: "bg-amber-500/20 text-white dark:bg-amber-950/60 dark:text-amber-300",
      divider: "border-white/20 dark:border-slate-800",
      buttonPrimary:
        "bg-white text-amber-950 hover:bg-amber-50 dark:bg-amber-600 dark:text-white dark:hover:bg-amber-700",
    },
  };

  return themes[normalizedColor] || themes.emerald;
}
