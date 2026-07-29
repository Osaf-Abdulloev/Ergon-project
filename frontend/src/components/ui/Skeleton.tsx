"use client";

import React from "react";

export const Skeleton = ({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div className={`animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800/80 ${className}`} {...props} />
  );
};
