import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Avatar({
  src,
  name,
  username,
  size = "md",
  userId,
  level,
  className = "",
  onClick,
}) {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);

  const displayName = name || username || "Learner";
  const initial = displayName.charAt(0).toUpperCase();

  const sizeClasses = {
    xs: "h-6 w-6 text-[10px]",
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-14 w-14 text-base",
    xl: "h-20 w-20 text-xl",
  };

  const currentSizeClass = sizeClasses[size] || sizeClasses.md;

  const handleClick = (e) => {
    if (onClick) {
      onClick(e);
      return;
    }
    if (userId) {
      e.stopPropagation();
      navigate(`/community/u/${userId}`);
    }
  };

  const isClickable = Boolean(onClick || userId);

  return (
    <div
      onClick={isClickable ? handleClick : undefined}
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full font-bold select-none transition-transform ${
        isClickable ? "cursor-pointer hover:scale-105 active:scale-95" : ""
      } ${currentSizeClass} ${className}`}
    >
      {src && !imgError ? (
        <img
          src={src}
          alt={displayName}
          onError={() => setImgError(true)}
          className="h-full w-full rounded-full object-cover shadow-surface"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-surface">
          <span>{initial}</span>
        </div>
      )}

      {level !== undefined && level !== null && (
        <span
          className="absolute -bottom-1 -right-1 flex items-center justify-center rounded-full bg-amber-500 text-[9px] font-black text-slate-950 shadow-surface px-1 py-0.2 min-w-[16px] h-[16px]"
          title={`Level ${level}`}
        >
          {level}
        </span>
      )}
    </div>
  );
}
