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
    { title: "IT & Барномасозӣ", count: "120+", icon: Briefcase, color: "bg-blue-600 dark:bg-sky-500" },
    { title: "Молия ва Банк", count: "80+", icon: TrendingUp, color: "bg-emerald-600 dark:bg-teal-500" },
    { title: "Сохтмон ва Муҳандисӣ", count: "150+", icon: Building2, color: "bg-amber-600 dark:bg-orange-500" },
    { title: "Тандурустӣ ва Тиб", count: "65+", icon: ShieldCheck, color: "bg-purple-600 dark:bg-indigo-500" },
  ];

  return (
    <div className="space-y-12 max-w-6xl mx-auto">
      <section className="relative pt-4 pb-8 space-y-6">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-sky-500/10 border border-blue-200 dark:border-sky-500/20 text-xs font-semibold text-blue-600 dark:text-sky-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ergon Marketplace Tajikistan</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-snug">
            Ояндаи кори худро бо{" "}
            <span className="text-blue-600 dark:text-sky-400">Ergon AI</span> пайдо кунед
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
            {t("tagline")}. Платформаи муосир барои мутахассисон ва корфармоён.
          </p>
        </div>

        <form onSubmit={handleSearchSubmit} className="p-2 rounded-xl bg-white dark:bg-[#111a2e] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center gap-2">
          <div className="flex-1 w-full">
            <Input
              placeholder={t("jobs.search_placeholder")}
              value={searchTitle}
              onChange={(e) => setSearchTitle(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-blue-600 dark:text-sky-400" />}
              className="border-0 bg-transparent shadow-none text-xs"
            />
          </div>
          <div className="w-full sm:w-48 border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-800">
            <Input
              placeholder="Душанбе, Хуҷанд..."
              value={searchLocation}
              onChange={(e) => setSearchLocation(e.target.value)}
              leftIcon={<MapPin className="w-4 h-4 text-blue-600 dark:text-sky-400" />}
              className="border-0 bg-transparent shadow-none text-xs"
            />
          </div>
          <Button type="submit" variant="primary" size="sm" className="w-full sm:w-auto bg-blue-600 dark:bg-sky-500 hover:bg-blue-700 text-xs py-2 px-4">
            Ҷустуҷӯ
          </Button>
        </form>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Категорияҳои маъмул
            </h2>
            <p className="text-xs text-slate-500">Соҳаи дилхоҳи худро интихоб кунед</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {categories.map((cat, idx) => {
            const Icon = cat.icon;
            return (
              <Link key={idx} href={`/jobs?category=${encodeURIComponent(cat.title)}`}>
                <div className="p-4 rounded-xl bg-white dark:bg-[#111a2e] border border-slate-200 dark:border-slate-800/80 hover:border-blue-600 dark:hover:border-sky-400 transition-all duration-200 group shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg ${cat.color} flex items-center justify-center text-white shrink-0`}>
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-sky-400 transition-colors">
                        {cat.title}
                      </h3>
                      <p className="text-[11px] text-slate-500">{cat.count} эълонҳо</p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Ҷойҳои кории навтарин
            </h2>
            <p className="text-xs text-slate-500">Эълонҳои фаъол аз ширкатҳои муътамад</p>
          </div>
          <Link href="/jobs">
            <Button variant="ghost" size="sm" className="text-xs" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              Ҳама эълонҳо
            </Button>
          </Link>
        </div>

        {isJobsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-44 w-full rounded-xl" />
            ))}
          </div>
        ) : jobsData?.items && jobsData.items.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobsData.items.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
            <p className="text-xs font-semibold text-slate-500">Дар ҳоли ҳозир эълони фаъол пайдо нашуд.</p>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Мутахассисони пешқадам
            </h2>
            <p className="text-xs text-slate-500">Номзадҳо барои ҳамкорӣ ва истихдор</p>
          </div>
          <Link href="/workers">
            <Button variant="ghost" size="sm" className="text-xs" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              Ҳама мутахассисон
            </Button>
          </Link>
        </div>

        {isWorkersLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-52 w-full rounded-xl" />
            ))}
          </div>
        ) : workersData?.items && workersData.items.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {workersData.items.map((worker) => (
              <WorkerCard key={worker.id} worker={worker} />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
            <p className="text-xs font-semibold text-slate-500">Мутахассисон пайдо нашуданд.</p>
          </div>
        )}
      </section>
    </div>
  );
}
