"use client";

import React from "react";
import Link from "next/link";
import { useLanguage } from "@/providers/LanguageProvider";
import { Sparkles, Heart } from "lucide-react";

export const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="w-full border-t border-slate-200/80 dark:border-slate-800/80 bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl transition-colors py-12 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
        <div className="flex flex-col items-center md:items-start gap-2">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-pink-500 flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
              {t("brand")}
            </span>
          </Link>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
            {t("tagline")}
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-6 text-xs font-semibold text-slate-600 dark:text-slate-400">
          <Link href="/jobs" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            {t("nav.jobs")}
          </Link>
          <Link href="/workers" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            {t("nav.workers")}
          </Link>
          <Link href="/companies" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            {t("nav.companies")}
          </Link>
          <Link href="/ai" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            {t("nav.ai_assistant")}
          </Link>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <span>Created with</span>
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
          <span>for Tajikistan</span>
        </div>
      </div>
    </footer>
  );
};
