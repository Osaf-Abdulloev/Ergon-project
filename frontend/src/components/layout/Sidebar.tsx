"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage, Language } from "@/providers/LanguageProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { Button } from "@/components/ui/Button";
import {
  Briefcase, Users, Building2, Sparkles, MessageSquare,
  Bookmark, Bell, LogOut, Settings, Sun, Moon, Globe, Menu, X, ArrowRight
} from "lucide-react";

export const Sidebar = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { href: "/jobs", label: t("nav.jobs"), icon: Briefcase },
    { href: "/workers", label: t("nav.workers"), icon: Users },
    { href: "/companies", label: t("nav.companies"), icon: Building2 },
    { href: "/ai", label: t("nav.ai_assistant"), icon: Sparkles, badge: "AI" },
    { href: "/chat", label: t("nav.chat"), icon: MessageSquare },
    { href: "/favorites", label: t("nav.favorites"), icon: Bookmark },
    { href: "/notifications", label: t("nav.notifications"), icon: Bell },
    { href: "/settings", label: t("nav.settings"), icon: Settings },
  ];

  const langs: { code: Language; label: string }[] = [
    { code: "ru", label: "RU" },
    { code: "en", label: "EN" },
    { code: "tg", label: "TG" },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between select-none">
      <div className="flex flex-col gap-4">
        <Link href="/" className="flex items-center gap-3 px-2 py-1 group">
          <div className="w-9 h-9 rounded-xl bg-blue-600 dark:bg-sky-500 flex items-center justify-center text-white font-extrabold text-lg shadow-sm group-hover:scale-105 transition-transform shrink-0">
            E
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
              {t("brand")}
            </span>
            <span className="text-[9px] font-semibold text-blue-600 dark:text-purple-400 tracking-wider uppercase -mt-0.5">
              Marketplace
            </span>
          </div>
        </Link>

        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
            <span className="text-[10px] uppercase font-bold">{language.toUpperCase()}</span>
          </div>
          <div className="flex gap-1">
            {langs.map((l) => (
              <button
                key={l.code}
                onClick={() => setLanguage(l.code)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                  language === l.code
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <nav className="flex flex-col gap-0.5">
          <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Навигация
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/" && pathname ? pathname.startsWith(item.href) : false);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`relative flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all duration-200 ${
                  isActive
                    ? "bg-blue-50 dark:bg-sky-500/10 text-blue-600 dark:text-sky-400 font-bold border-l-3 border-blue-600 dark:border-sky-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 font-medium"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? "text-blue-600 dark:text-sky-400" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.2 text-[9px] font-extrabold rounded-full bg-emerald-500 text-white uppercase">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-col gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={toggleTheme}
          className="flex items-center justify-between px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs font-medium"
        >
          <div className="flex items-center gap-2">
            {theme === "dark" ? <Moon className="w-3.5 h-3.5 text-purple-400" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
            <span className="text-[11px] font-semibold">{theme === "dark" ? "Dark Mode" : "Light Mode"}</span>
          </div>
          <span className="w-7 h-3.5 rounded-full bg-slate-200 dark:bg-slate-700 relative p-0.5 flex items-center transition-colors">
            <span className={`w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-sky-400 transition-transform ${theme === "dark" ? "translate-x-3.5" : "translate-x-0"}`}></span>
          </span>
        </button>

        {user ? (
          <div className="flex flex-col gap-2 bg-slate-100 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs uppercase shrink-0">
                {user.username.charAt(0)}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{user.username}</span>
                <span className="text-[9px] uppercase font-bold text-purple-600 dark:text-purple-300 tracking-wider">{user.role}</span>
              </div>
            </Link>
            <button
              onClick={() => logout()}
              className="w-full py-1 px-2 rounded-lg border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors mt-1"
            >
              <LogOut className="w-3 h-3" />
              <span>{t("nav.logout")}</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <Link href="/login">
              <Button variant="outline" size="sm" className="w-full text-xs py-1.5">
                {t("nav.login")}
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="primary" size="sm" className="w-full text-xs py-1.5 bg-blue-600 hover:bg-blue-700" rightIcon={<ArrowRight className="w-3 h-3" />}>
                {t("nav.register")}
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md z-40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">E</div>
          <span className="font-bold text-sm text-slate-900 dark:text-white">{t("brand")}</span>
        </Link>
        <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-lg text-slate-700 dark:text-slate-200">
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 max-w-[80%] bg-white dark:bg-slate-900 h-full p-4 shadow-2xl flex flex-col z-10">
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 text-slate-400">
              <X className="w-5 h-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-60 border-r border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl z-40 p-4 shadow-xs">
        {sidebarContent}
      </aside>
    </>
  );
};
