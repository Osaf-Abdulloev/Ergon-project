"use client";

import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  glass?: boolean;
}

export const Card = ({ className = "", hoverable = false, glass = true, children, ...props }: CardProps) => {
  const glassStyle = glass
    ? "bg-white/90 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-xl shadow-slate-950/5 dark:shadow-black/20"
    : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md";

  const hoverStyle = hoverable ? "transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:border-indigo-500/40 dark:hover:border-indigo-500/40" : "";

  return (
    <div className={`rounded-2xl p-6 ${glassStyle} ${hoverStyle} ${className}`} {...props}>
      {children}
    </div>
  );
};
