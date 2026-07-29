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
  Building2, Users, ShieldCheck, ArrowRight
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
    { title: "IT & Барномасозӣ", count: "120+", icon: Briefcase, color: "from-blue-500 to-indigo-600" },
    { title: "Молия ва Банк", count: "80+", icon: TrendingUp, color: "from-emerald-500 to-teal-600" },
    { title: "Сохтмон ва Муҳандисӣ", count: "150+", icon: Building2, color: "from-amber-500 to-orange-600" },
    { title: "Тандурустӣ ва Тиб", count: "65+", icon: ShieldCheck, color: "from-rose-500 to-pink-600" },
  ];

  return (
    <div className="space-y-20 pb-16">
      <section className="relative pt-12 pb-20 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-950/40 backdrop-blur-md text-xs font-bold text-indigo-600 dark:text-indigo-300">
            <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
            <span>Платформаи зеҳнии насли нав дар Тоҷикистон</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-tight">
            Ояндаи кори худро бо{" "}
            <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Ergon AI
            </span>{" "}
            пайдо кунед
          </h1>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            {t("tagline")}. Ҷойҳои кории беҳтарин ва мутахассисони касбиро дар Душанбе, Хҷаанд ва тамоми кишвар пайваст мекунем.
          </p>

          <form onSubmit={handleSearchSubmit} className="max-w-3xl mx-auto p-3 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder={t("jobs.search_placeholder")}
                value={searchTitle}
                onChange={(e) => setSearchTitle(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
                className="border-0 bg-transparent shadow-none"
              />
            </div>
            <div className="w-full sm:w-48 border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-800">
              <Input
                placeholder="Душанбе, Хуҷанд..."
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                leftIcon={<MapPin className="w-4 h-4" />}
                className="border-0 bg-transparent shadow-none"
              />
            </div>
            <Button type="submit" variant="gradient" size="lg" className="w-full sm:w-auto">
              Ҷустуҷӯ
            </Button>
          </form>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Категорияҳои маъмул
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Соҳаи дилхоҳи худро интихоб намоед
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((cat, idx) => {
            const Icon = cat.icon;
            return (
              <Link key={idx} href={`/jobs?category=${encodeURIComponent(cat.title)}`}>
                <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 hover:border-indigo-500/50 transition-all duration-300 group shadow-lg hover:-translate-y-1">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${cat.color} flex items-center justify-center text-white mb-4 shadow-md group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {cat.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">{cat.count} эълонҳо</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Ҷойҳои кории навтарин
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Эълонҳои фаъол аз ширкатҳои пешрафта
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
          <div className="p-12 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
            <p className="text-sm font-semibold text-slate-500">Дар ҳоли ҳозир эълони фаъол пайдо нашуд.</p>
          </div>
        )}
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Мутахассисони пешқадам
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
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
          <div className="p-12 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
            <p className="text-sm font-semibold text-slate-500">Мутахассисон пайдо нашуданд.</p>
          </div>
        )}
      </section>
    </div>
  );
}
