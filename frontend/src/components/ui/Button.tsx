"use client";

import React from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "gradient";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", isLoading = false, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    const baseStyle = "inline-flex items-center justify-center font-medium transition-all duration-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95";

    const variants = {
      primary: "bg-[#0052ff] hover:bg-[#003ec7] text-white shadow-md shadow-blue-500/20 focus:ring-[#0052ff] border border-blue-500/30",
      secondary: "bg-[#10b981] hover:bg-[#006c49] text-white shadow-md shadow-emerald-500/20 focus:ring-emerald-500 border border-emerald-500/30",
      outline: "bg-transparent border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 focus:ring-[#0052ff]",
      ghost: "bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 focus:ring-[#0052ff]",
      danger: "bg-rose-600 hover:bg-rose-500 text-white shadow-md focus:ring-rose-500 border border-rose-500/30",
      gradient: "bg-gradient-to-r from-[#0052ff] to-[#10b981] hover:opacity-90 text-white shadow-md border-0",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-xs font-semibold gap-1.5",
      md: "px-4 py-2 text-sm font-semibold gap-2",
      lg: "px-6 py-3 text-base font-bold gap-2.5",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : leftIcon}
        <span>{children}</span>
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = "Button";
