"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Job, WorkerProfile, PaginatedResponse } from "@/types";
import { useLanguage } from "@/providers/LanguageProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { JobCard } from "@/components/jobs/JobCard";
import { WorkerCard } from "@/components/workers/WorkerCard";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Sparkles, Search, MapPin, Briefcase, TrendingUp,
  Building2, ArrowRight, ShieldCheck
} from "lucide-react";

export default function HomePage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [searchTitle, setSearchTitle] = useState("");
  const [searchLocation, setSearchLocation] = useState("");

  const { data: jobsData, isLoading: isJobsLoading } = useQuery({
    queryKey: ["home-jobs"],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Job>>("/jobs?limit=6");
      return res.data;
    },
  });

  const { data: workersData, isLoading: isWorkersLoading } = useQuery({
    queryKey: ["home-workers"],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<WorkerProfile>>("/users/workers?limit=4");
      return res.data;
    },
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = new URLSearchParams();
    if (searchTitle) query.set("title", searchTitle);
    if (searchLocation) query.set("location", searchLocation);
    router.push(`/jobs?${query.toString()}`);
  };

  const categories = [
    { title: "IT & Барномасозӣ", count: "120+", icon: Briefcase, color: "bg-[#0052ff]" },
    { title: "Молия ва Банк", count: "80+", icon: TrendingUp, color: "bg-[#10b981]" },
    { title: "Сохтмон ва Муҳандисӣ", count: "150+", icon: Building2, color: "bg-[#bf3003]" },
    { title: "Тандурустӣ ва Тиб", count: "65+", icon: ShieldCheck, color: "bg-[#003ec7]" },
  ];

  return (
    <div className="space-y-16 pb-16 pt-6">
      <section className="relative pt-8 pb-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#0052ff]/30 bg-[#0052ff]/10 text-xs font-bold text-[#0052ff] dark:text-[#6cf8bb]">
            <Sparkles className="w-4 h-4 text-[#0052ff] dark:text-[#6cf8bb] animate-pulse" />
            <span>Stitch Design System — Ergon Marketplace</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-3xl mx-auto leading-tight">
            Ояндаи кори худро бо{" "}
            <span className="text-[#0052ff] dark:text-[#6cf8bb]">
              Ergon AI
            </span>{" "}
            пайдо кунед
          </h1>

          <p className="text-base text-slate-600 dark:text-slate-300 max-w-xl mx-auto">
            {t("tagline")}. Платформаи дутарафа барои мутахассисон ва корфармоён дар Тоҷикистон.
          </p>

          <form onSubmit={handleSearchSubmit} className="max-w-3xl mx-auto p-2 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-[0px_12px_32px_rgba(0,0,0,0.08)] flex flex-col sm:flex-row items-center gap-2">
            <div className="flex-1 w-full">
              <Input
                placeholder={t("jobs.search_placeholder")}
                value={searchTitle}
                onChange={(e) => setSearchTitle(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-[#0052ff]" />}
                className="border-0 bg-transparent shadow-none"
              />
            </div>
            <div className="w-full sm:w-56 border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-800">
              <Input
                placeholder="Душанбе, Хуҷанд..."
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                leftIcon={<MapPin className="w-4 h-4 text-[#0052ff]" />}
                className="border-0 bg-transparent shadow-none"
              />
            </div>
            <Button type="submit" variant="primary" size="lg" className="w-full sm:w-auto bg-[#0052ff] hover:bg-[#003ec7]">
              Ҷустуҷӯ
            </Button>
          </form>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Категорияҳои маъмул
            </h2>
            <p className="text-xs text-slate-500">
              Соҳаи дилхоҳи худро интихоб намоед
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((cat, idx) => {
            const Icon = cat.icon;
            return (
              <Link key={idx} href={`/jobs?category=${encodeURIComponent(cat.title)}`}>
                <div className="p-5 rounded-xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 hover:border-[#0052ff] transition-all duration-200 group shadow-sm hover:-translate-y-1">
                  <div className={`w-10 h-10 rounded-lg ${cat.color} flex items-center justify-center text-white mb-3 shadow-md group-hover:scale-105 transition-transform`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-[#0052ff] transition-colors">
                    {cat.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{cat.count} эълонҳо</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Ҷойҳои кории навтарин
            </h2>
            <p className="text-xs text-slate-500">
              Эълонҳои фаъол аз ширкатҳои муътамад
            </p>
          </div>
          <Link href="/jobs">
            <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Ҳама эълонҳо
            </Button>
          </Link>
        </div>

        {isJobsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-56 w-full" />
            ))}
          </div>
        ) : jobsData?.items && jobsData.items.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobsData.items.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        ) : (
          <div className="p-12 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
            <p className="text-sm font-semibold text-slate-500">Дар ҳоли ҳозир эълони фаъол пайдо нашуд.</p>
          </div>
        )}
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Мутахассисони пешқадам
            </h2>
            <p className="text-xs text-slate-500">
              Номзадҳо барои ҳамкорӣ ва истихдор
            </p>
          </div>
          <Link href="/workers">
            <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Ҳама мутахассисон
            </Button>
          </Link>
        </div>

        {isWorkersLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        ) : workersData?.items && workersData.items.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {workersData.items.map((worker) => (
              <WorkerCard key={worker.id} worker={worker} />
            ))}
          </div>
        ) : (
          <div className="p-12 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
            <p className="text-sm font-semibold text-slate-500">Мутахассисон пайдо нашуданд.</p>
          </div>
        )}
      </section>
    </div>
  );
}
