import React, { useState } from "react";
import { AlertCircle, RefreshCw, X, ChevronDown } from "lucide-react";

/**
 * Lumo Mascot Component with multiple poses/sizes
 */
export function Lumo({ pose = "greeting", size = "md", className = "" }) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-14 h-14",
    lg: "w-20 h-20",
    xl: "w-28 h-28",
  };

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${sizeClasses[size] || sizeClasses.md} ${className}`}>
      <img
        src="/logo3.png"
        alt={`Lumo mascot (${pose})`}
        className="w-full h-full object-contain filter drop-shadow-sm"
      />
    </div>
  );
}

/**
 * Button Component (Supports primary emerald, orange CTA, secondary, outline, ghost, soft, danger)
 */
export function Button({
  children,
  variant = "primary", // primary (emerald) | cta (orange) | secondary | outline | ghost | soft | danger
  size = "md", // sm | md | lg
  isLoading = false,
  isDisabled = false,
  leftIcon = null,
  rightIcon = null,
  fullWidth = false,
  className = "",
  type = "button",
  onClick,
  ...props
}) {
  const baseStyles =
    "inline-flex items-center justify-center font-bold rounded-xl transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none min-h-[44px]";

  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs gap-1.5 min-h-[36px]",
    md: "px-4 py-2.5 text-sm gap-2 min-h-[44px]",
    lg: "px-6 py-3.5 text-base gap-2.5 min-h-[50px]",
  };

  const variantStyles = {
    primary:
      "bg-emerald-600 hover:bg-emerald-700 text-white shadow-button-primary active:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500",
    cta:
      "bg-orange-500 hover:bg-orange-600 text-white shadow-button-cta active:bg-orange-700",
    secondary:
      "bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 shadow-sm",
    outline:
      "border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 text-slate-700 dark:border-slate-800 dark:hover:border-emerald-700/60 dark:hover:bg-emerald-950/30 dark:text-slate-200",
    ghost:
      "text-slate-600 hover:text-emerald-600 hover:bg-emerald-50/60 dark:text-slate-300 dark:hover:text-emerald-400 dark:hover:bg-slate-800/60",
    soft:
      "bg-emerald-50 text-emerald-700 hover:bg-emerald-100/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/40",
    danger:
      "bg-rose-600 hover:bg-rose-700 text-white shadow-sm dark:bg-rose-600 dark:hover:bg-rose-500",
  };

  return (
    <button
      type={type}
      disabled={isDisabled || isLoading}
      onClick={onClick}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant] || variantStyles.primary} ${
        fullWidth ? "w-full" : ""
      } ${className}`}
      {...props}
    >
      {isLoading ? (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
}

export function IconButton({
  icon: Icon,
  label,
  variant = "ghost",
  size = "md",
  className = "",
  onClick,
  ...props
}) {
  const sizeClasses = {
    sm: "w-8 h-8 p-1.5",
    md: "w-11 h-11 p-2.5",
    lg: "w-12 h-12 p-3",
  };

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
        sizeClasses[size]
      } ${
        variant === "ghost"
          ? "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
      } ${className}`}
      {...props}
    >
      <Icon className="w-5 h-5" />
    </button>
  );
}

export function Card({
  children,
  className = "",
  variant = "default", // default | elevated | glass | gradient
  hoverEffect = false,
  padding = "p-5 md:p-6",
  onClick,
  ...props
}) {
  const variantStyles = {
    default:
      "bg-white dark:bg-[#141923] border border-slate-200/80 dark:border-white/10 shadow-surface",
    elevated:
      "bg-white dark:bg-[#1b2230] border border-slate-200/60 dark:border-white/10 shadow-overlay",
    glass: "glass-card shadow-surface",
    gradient:
      "bg-gradient-to-br from-emerald-600 to-teal-700 text-white border border-emerald-500/30 shadow-surface",
  };

  const hoverClass = hoverEffect
    ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-overlay hover:border-emerald-300 dark:hover:border-emerald-600 transition-all duration-180"
    : "";

  return (
    <div
      className={`rounded-3xl ${padding} ${variantStyles[variant] || variantStyles.default} ${hoverClass} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  trend,
  variant = "default",
  className = "",
}) {
  return (
    <Card variant={variant} className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold tracking-wide uppercase text-slate-500 dark:text-slate-400">
          {label}
        </span>
        {Icon && (
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-2xl font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white">
          {value}
        </span>
        {trend && (
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              trend.isPositive
                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
                : "bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
            }`}
          >
            {trend.value}
          </span>
        )}
      </div>

      {subtext && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtext}</p>
      )}
    </Card>
  );
}

export function Badge({
  children,
  variant = "emerald", // emerald | orange | amber | cyan | rose | slate
  size = "md",
  className = "",
  icon: Icon = null,
}) {
  const sizeStyles = {
    sm: "px-2 py-0.5 text-[11px] gap-1",
    md: "px-2.5 py-1 text-xs font-bold gap-1.5",
  };

  const variantStyles = {
    emerald:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40",
    orange:
      "bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-200/60 dark:border-orange-800/40",
    amber:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40",
    cyan:
      "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-200/60 dark:border-cyan-800/40",
    rose:
      "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/40",
    slate:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-bold ${sizeStyles[size]} ${
        variantStyles[variant] || variantStyles.emerald
      } ${className}`}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {children}
    </span>
  );
}

export function SectionLabel({ children, className = "" }) {
  return (
    <span className={`text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block ${className}`}>
      {children}
    </span>
  );
}

export function Chip({ label, isActive = false, onClick, className = "", icon: Icon = null }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold min-h-[36px] transition-all ${
        isActive
          ? "bg-orange-500 text-white shadow-button-cta"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
      } ${className}`}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      <span>{label}</span>
    </button>
  );
}

export function DropdownPill({ options = [], value, onChange, className = "" }) {
  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold py-1.5 pl-3 pr-7 rounded-full border-none focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 pointer-events-none" />
    </div>
  );
}

export function ProgressBar({ value = 0, max = 100, variant = "orange", height = "h-2", className = "" }) {
  const percentage = Math.min(Math.max(0, (value / max) * 100), 100);

  const colors = {
    orange: "bg-orange-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    cyan: "bg-cyan-500",
    rose: "bg-rose-500",
  };

  return (
    <div className={`w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden ${height} ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-300 ease-out ${colors[variant] || colors.orange}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

export function ProgressRing({
  size = 60,
  strokeWidth = 6,
  progress = 0,
  variant = "emerald",
  children,
  className = "",
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  const strokeColors = {
    emerald: "#10b981",
    orange: "#f26b21",
    amber: "#f59e0b",
    cyan: "#06b6d4",
    rose: "#f43f5e",
  };

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-100 dark:text-slate-800"
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColors[variant] || strokeColors.emerald}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  );
}

export function Skeleton({ className = "", variant = "rounded" }) {
  const variantClasses = {
    circle: "rounded-full",
    rounded: "rounded-2xl",
    text: "rounded-md h-4 w-3/4",
  };

  return (
    <div
      className={`animate-pulse bg-slate-200/80 dark:bg-slate-800/80 ${variantClasses[variant]} ${className}`}
    />
  );
}

export function EmptyState({
  title = "No data yet",
  description = "Start your first session to unlock your stats.",
  actionLabel,
  onAction,
  className = "",
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 rounded-3xl bg-slate-50/50 dark:bg-slate-900/30 border border-dashed border-slate-200 dark:border-slate-800 ${className}`}>
      <Lumo pose="sleeping" size="lg" className="mb-3" />
      {title && (
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
          {title}
        </h3>
      )}
      {description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4 leading-relaxed">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button variant="cta" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function ErrorState({
  message = "Failed to load data.",
  onRetry,
  className = "",
}) {
  return (
    <div className={`flex items-center justify-between gap-3 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs font-bold text-rose-700 dark:text-rose-300 ${className}`}>
      <div className="flex items-center gap-2 min-w-0">
        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
        <span className="truncate">{message}</span>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 dark:text-rose-300 hover:underline shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Try again
        </button>
      )}
    </div>
  );
}

export function StreakChip({ count = 0, isAtRisk = false }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold tabular-nums transition ${
        isAtRisk
          ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
          : "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300"
      }`}
    >
      🔥 {count}d
    </span>
  );
}

export function XpChip({ amount = 0 }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold tabular-nums bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
      ⚡ {amount} XP
    </span>
  );
}

export function GemChip({ count = 0 }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold tabular-nums bg-cyan-100 text-cyan-900 dark:bg-cyan-950/60 dark:text-cyan-300">
      💎 {count}
    </span>
  );
}

export function Tabs({ tabs, activeTab, onChange, className = "" }) {
  return (
    <div className={`flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl overflow-x-auto no-scrollbar ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap min-h-[36px] ${
              isActive
                ? "bg-orange-500 text-white shadow-button-cta"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            {tab.icon && <tab.icon className="w-3.5 h-3.5" />}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Input({
  label,
  error,
  leftIcon: LeftIcon = null,
  rightIcon: RightIcon = null,
  className = "",
  id,
  ...props
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {label && (
        <label htmlFor={inputId} className="text-xs font-bold text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <div className="relative flex items-center w-full">
        {LeftIcon && (
          <div className="absolute left-3.5 text-slate-400 dark:text-slate-500 pointer-events-none">
            <LeftIcon className="w-4 h-4" />
          </div>
        )}
        <input
          id={inputId}
          className={`w-full rounded-xl bg-slate-50 dark:bg-[#141923] border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px] ${
            LeftIcon ? "pl-10" : ""
          } ${RightIcon ? "pr-10" : ""} ${
            error ? "border-rose-500 focus:ring-rose-500" : ""
          }`}
          {...props}
        />
        {RightIcon && (
          <div className="absolute right-3.5 text-slate-400 dark:text-slate-500">
            <RightIcon className="w-4 h-4" />
          </div>
        )}
      </div>
      {error && <span className="text-xs text-rose-500 font-bold">{error}</span>}
    </div>
  );
}

export function Tooltip({ children, text }) {
  return (
    <div className="relative group inline-block">
      {children}
      <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:block px-2.5 py-1 text-[11px] font-bold text-white bg-slate-900 dark:bg-slate-800 rounded-md whitespace-nowrap shadow-md z-50 pointer-events-none">
        {text}
      </div>
    </div>
  );
}
