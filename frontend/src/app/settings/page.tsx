"use client";

import React from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Card } from "@/components/ui/Card";
import { Settings, Globe, Moon } from "lucide-react";

export default function SettingsPage() {
  const { t } = useLanguage();
  const { theme } = useTheme();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {t("nav.settings")}
          </h1>
        </div>
      </div>

      <Card className="p-8 border-slate-200/80 dark:border-slate-800/80 space-y-6">
        <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-indigo-500" />
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Забони интерфейс</p>
              <p className="text-xs text-slate-500">Тоҷикӣ (бо пешфарз), Русский, English</p>
            </div>
          </div>
          <LanguageSwitcher />
        </div>

        <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Moon className="w-5 h-5 text-purple-500" />
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Темаи намоиш</p>
              <p className="text-xs text-slate-500">Ҳолати рӯшноӣ (Light) ё торикӣ (Dark)</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </Card>
    </div>
  );
}
