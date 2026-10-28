import React from "react";

export function Button({
  children,
  variant = "primary", // primary | secondary | outline | ghost | soft | danger
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
    "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-180 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed select-none min-h-[44px]";

  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs gap-1.5 min-h-[36px]",
    md: "px-4 py-2.5 text-sm gap-2 min-h-[44px]",
    lg: "px-6 py-3.5 text-base gap-2.5 min-h-[50px]",
  };

  const variantStyles = {
    primary:
      "bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-500/20 active:bg-violet-800 dark:bg-violet-600 dark:hover:bg-violet-500 dark:shadow-violet-900/40",
    secondary:
      "bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 shadow-sm",
    outline:
      "border border-slate-200 hover:border-violet-300 hover:bg-violet-50/50 text-slate-700 dark:border-violet-900/40 dark:hover:border-violet-700/60 dark:hover:bg-violet-950/30 dark:text-slate-200",
    ghost:
      "text-slate-600 hover:text-violet-600 hover:bg-violet-50/60 dark:text-slate-300 dark:hover:text-violet-300 dark:hover:bg-violet-950/40",
    soft:
      "bg-violet-50 text-violet-700 hover:bg-violet-100/80 dark:bg-violet-950/60 dark:text-violet-300 dark:hover:bg-violet-900/40",
    danger:
      "bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-500/20 dark:bg-rose-600 dark:hover:bg-rose-500",
  };

  return (
    <button
      type={type}
      disabled={isDisabled || isLoading}
      onClick={onClick}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${
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
      "bg-white dark:bg-[#120F24] border border-slate-200/80 dark:border-violet-900/30 shadow-sm",
    elevated:
      "bg-white dark:bg-[#15122b] border border-slate-200/60 dark:border-violet-900/40 shadow-md shadow-violet-500/5 dark:shadow-violet-950/50",
    glass: "glass-card shadow-sm",
    gradient:
      "bg-gradient-to-br from-violet-600 to-indigo-700 text-white border border-violet-500/30 shadow-lg shadow-violet-600/20",
  };

  const hoverClass = hoverEffect
    ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-md hover:border-violet-300 dark:hover:border-violet-700/60 transition-all duration-200"
    : "";

  return (
    <div
      className={`rounded-2xl ${padding} ${variantStyles[variant]} ${hoverClass} ${className}`}
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
  trend, // { value: '+12%', isPositive: true }
  variant = "default",
  className = "",
}) {
  return (
    <Card variant={variant} className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-violet-300/70">
          {label}
        </span>
        {Icon && (
          <div className="p-2 rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400">
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {value}
        </span>
        {trend && (
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
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
  variant = "violet", // violet | amber | mint | rose | slate
  size = "md", // sm | md
  className = "",
  icon: Icon = null,
}) {
  const sizeStyles = {
    sm: "px-2 py-0.5 text-xs gap-1",
    md: "px-2.5 py-1 text-xs font-medium gap-1.5",
  };

  const variantStyles = {
    violet:
      "bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border border-violet-200/60 dark:border-violet-800/40",
    amber:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40",
    mint:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40",
    rose:
      "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/40",
    slate:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {children}
    </span>
  );
}

export function Chip({ label, isActive = false, onClick, className = "", icon: Icon = null }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold min-h-[36px] transition-all ${
        isActive
          ? "bg-violet-600 text-white shadow-sm shadow-violet-500/30 dark:bg-violet-600"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 dark:bg-violet-950/40 dark:text-slate-300 dark:hover:bg-violet-900/40"
      } ${className}`}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      <span>{label}</span>
    </button>
  );
}

export function ProgressBar({ value = 0, max = 100, variant = "violet", height = "h-2", className = "" }) {
  const percentage = Math.min(Math.max(0, (value / max) * 100), 100);

  const colors = {
    violet: "bg-violet-600 dark:bg-violet-500",
    amber: "bg-amber-500",
    mint: "bg-emerald-500",
    rose: "bg-rose-500",
  };

  return (
    <div className={`w-full bg-slate-100 dark:bg-violet-950/60 rounded-full overflow-hidden ${height} ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ease-out ${colors[variant]}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

export function ProgressRing({
  size = 60,
  strokeWidth = 6,
  progress = 0,
  variant = "violet",
  children,
  className = "",
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  const strokeColors = {
    violet: "#6c4df6",
    amber: "#f59e0b",
    mint: "#10b981",
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
          className="text-slate-100 dark:text-violet-950/60"
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColors[variant]}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  );
}

export function Skeleton({ className = "", variant = "rounded" }) {
  const variantClasses = {
    circle: "rounded-full",
    rounded: "rounded-xl",
    text: "rounded-md h-4 w-3/4",
  };

  return (
    <div
      className={`animate-pulse bg-slate-200/80 dark:bg-violet-900/30 ${variantClasses[variant]} ${className}`}
    />
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = "",
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 rounded-2xl bg-slate-50/50 dark:bg-violet-950/20 border border-dashed border-slate-200 dark:border-violet-900/30 ${className}`}>
      {Icon && (
        <div className="p-3.5 rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-950/80 dark:text-violet-400 mb-3 shadow-sm">
          <Icon className="w-7 h-7" />
        </div>
      )}
      {title && (
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
          {title}
        </h3>
      )}
      {description && (
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-4">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button variant="soft" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function Tabs({ tabs, activeTab, onChange, className = "" }) {
  return (
    <div className={`flex items-center gap-1 p-1 bg-slate-100 dark:bg-violet-950/60 rounded-xl overflow-x-auto no-scrollbar ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap min-h-[36px] ${
              isActive
                ? "bg-white text-violet-600 shadow-sm dark:bg-violet-600 dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            {tab.icon && <tab.icon className="w-3.5 h-3.5" />}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`px-1.5 py-0.2 text-[10px] rounded-full ${
                  isActive
                    ? "bg-violet-100 text-violet-700 dark:bg-violet-700 dark:text-white"
                    : "bg-slate-200 text-slate-600 dark:bg-violet-900 dark:text-slate-300"
                }`}
              >
                {tab.badge}
              </span>
            )}
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
        <label htmlFor={inputId} className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <div className="relative flex items-center w-full">
        {LeftIcon && (
          <div className="absolute left-3.5 text-slate-400 dark:text-violet-400 pointer-events-none">
            <LeftIcon className="w-4 h-4" />
          </div>
        )}
        <input
          id={inputId}
          className={`w-full rounded-xl bg-slate-50 dark:bg-[#181432] border border-slate-200 dark:border-violet-900/40 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:focus:ring-violet-400 min-h-[44px] ${
            LeftIcon ? "pl-10" : ""
          } ${RightIcon ? "pr-10" : ""} ${
            error ? "border-rose-500 focus:ring-rose-500" : ""
          }`}
          {...props}
        />
        {RightIcon && (
          <div className="absolute right-3.5 text-slate-400 dark:text-violet-400">
            <RightIcon className="w-4 h-4" />
          </div>
        )}
      </div>
      {error && <span className="text-xs text-rose-500 font-medium">{error}</span>}
    </div>
  );
}

export function Select({
  label,
  error,
  options = [],
  className = "",
  id,
  ...props
}) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {label && (
        <label htmlFor={selectId} className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`w-full rounded-xl bg-slate-50 dark:bg-[#181432] border border-slate-200 dark:border-violet-900/40 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 dark:focus:ring-violet-400 min-h-[44px] ${
          error ? "border-rose-500 focus:ring-rose-500" : ""
        }`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-rose-500 font-medium">{error}</span>}
    </div>
  );
}

export function Toast({ message, type = "info", onClose }) {
  if (!message) return null;

  const bgColors = {
    info: "bg-violet-600 text-white",
    success: "bg-emerald-600 text-white",
    error: "bg-rose-600 text-white",
  };

  return (
    <div className={`fixed bottom-6 right-6 z-[250] flex items-center justify-between gap-3 px-4 py-3 rounded-xl shadow-lg text-xs font-bold ${bgColors[type]}`}>
      <span>{message}</span>
      {onClose && (
        <button type="button" onClick={onClose} className="p-1 hover:opacity-80">
          ✕
        </button>
      )}
    </div>
  );
}

export function Tooltip({ children, text }) {
  return (
    <div className="relative group inline-block">
      {children}
      <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:block px-2.5 py-1 text-[11px] font-semibold text-white bg-slate-900 dark:bg-slate-800 rounded-md whitespace-nowrap shadow-md z-50 pointer-events-none">
        {text}
      </div>
    </div>
  );
}
