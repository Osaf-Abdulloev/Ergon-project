"use client";

import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  elevation?: 1 | 2 | 3;
}

export const Card = ({ className = "", hoverable = false, elevation = 1, children, ...props }: CardProps) => {
  const elevations = {
    1: "bg-white dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800/80 shadow-sm",
    2: "bg-white dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800/80 shadow-[0px_12px_32px_rgba(0,0,0,0.08)]",
    3: "bg-white/95 dark:bg-[#131b2e]/95 backdrop-blur-xl border border-slate-200 dark:border-slate-700 shadow-2xl",
  };

  const hoverStyle = hoverable ? "transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-[#0052ff]/40 dark:hover:border-[#0052ff]/40" : "";

  return (
    <div className={`rounded-xl p-6 ${elevations[elevation]} ${hoverStyle} ${className}`} {...props}>
      {children}
    </div>
  );
};
