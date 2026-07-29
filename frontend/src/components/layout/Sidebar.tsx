"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/Button";
import {
  Briefcase, Users, Building2, Sparkles, MessageSquare,
  Bookmark, Bell, User as UserIcon, LogOut, PlusCircle, Settings
} from "lucide-react";

export const Sidebar = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t } = useLanguage();

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

  return (
    <aside className="hidden lg:flex flex-col fixed top-6 left-6 bottom-6 w-[280px] z-40 bg-white/95 dark:bg-[#131b2e]/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 shadow-[0px_12px_32px_rgba(0,0,0,0.08)] justify-between transition-colors">
      <div className="space-y-6">
        <Link href="/" className="flex items-center gap-3 px-2 group">
          <div className="w-10 h-10 rounded-xl bg-[#0052ff] flex items-center justify-center text-white font-black text-xl shadow-md group-hover:scale-105 transition-transform">
            E
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {t("brand")}
            </span>
            <span className="text-[10px] font-bold text-[#0052ff] dark:text-[#6cf8bb] tracking-wider uppercase -mt-1">
              Marketplace
            </span>
          </div>
        </Link>

        {user ? (
          <Link href="/dashboard" className="flex items-center gap-3 p-3 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 hover:border-[#0052ff] transition-all">
            <div className="w-10 h-10 rounded-full bg-[#0052ff] text-white font-bold text-sm flex items-center justify-center">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 truncate">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{user.username}</p>
              <p className="text-[10px] text-slate-500 capitalize">{user.role}</p>
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-2 p-2">
            <Link href="/login" className="flex-1">
              <Button variant="outline" size="sm" className="w-full">
                {t("nav.login")}
              </Button>
            </Link>
            <Link href="/register" className="flex-1">
              <Button variant="primary" size="sm" className="w-full">
                {t("nav.register")}
              </Button>
            </Link>
          </div>
        )}

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-[#0052ff] text-white shadow-md shadow-blue-500/20 font-bold"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[9px] font-extrabold rounded-full bg-emerald-500 text-white uppercase">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
        {user?.role === "employer" && (
          <Link href="/jobs/create">
            <Button variant="primary" size="md" className="w-full bg-[#0052ff] hover:bg-[#003ec7]" leftIcon={<PlusCircle className="w-4 h-4" />}>
              {t("nav.create_job")}
            </Button>
          </Link>
        )}

        <div className="flex items-center justify-between px-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>

        {user && (
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>{t("nav.logout")}</span>
          </button>
        )}
      </div>
    </aside>
  );
};
