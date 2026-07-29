"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Job, WorkerProfile, Company, PaginatedResponse } from "@/types";
import { useLanguage } from "@/providers/LanguageProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { JobCard } from "@/components/jobs/JobCard";
import { WorkerCard } from "@/components/workers/WorkerCard";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Sparkles, Search, MapPin, Briefcase, TrendingUp,
  Building2, ArrowRight, ShieldCheck, Zap, Users,
  CheckCircle2, Award, Clock, Star, Heart
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

  const { data: companiesData } = useQuery({
    queryKey: ["home-companies"],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Company>>("/companies?limit=4");
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
    { title: "IT & Барномасозӣ", count: "140+", icon: Briefcase, color: "bg-blue-600 dark:bg-sky-500" },
    { title: "Молия ва Банк", count: "95+", icon: TrendingUp, color: "bg-emerald-600 dark:bg-teal-500" },
    { title: "Сохтмон ва Муҳандисӣ", count: "180+", icon: Building2, color: "bg-amber-600 dark:bg-orange-500" },
    { title: "Тандурустӣ ва Тиб", count: "70+", icon: ShieldCheck, color: "bg-purple-600 dark:bg-indigo-500" },
    { title: "Маркетинг ва Борфурӯшӣ", count: "110+", icon: Zap, color: "bg-rose-600 dark:bg-pink-500" },
    { title: "Маориф ва Таълим", count: "85+", icon: Award, color: "bg-cyan-600 dark:bg-teal-400" },
  ];

  const quickTags = ["Python", "React", "Бухгалтер", "Инженер", "Душанбе", "Хуҷанд"];

  const stats = [
    { label: "Ҷои кории фаъол", value: "2,450+", icon: Briefcase },
    { label: "Мутахассисон", value: "18,200+", icon: Users },
    { label: "Ширкатҳои муътамад", value: "480+", icon: Building2 },
    { label: "Муваффақияти ИИ", value: "98.5%", icon: Sparkles },
  ];

  return (
    <div className="space-y-12 w-full">
      <section className="relative pt-2 pb-6 space-y-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-sky-500/10 border border-blue-200 dark:border-sky-500/20 text-xs font-semibold text-blue-600 dark:text-sky-400">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400 animate-pulse" />
            <span>Ergon Marketplace Tajikistan — AI Platform</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
            Ояндаи кори худро бо{" "}
            <span className="text-blue-600 dark:text-sky-400">Ergon AI</span> пайдо кунед
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
            {t("tagline")}. Истихдори босуръат ва кафолатноки мутахассисон дар Душанбе, Хуҷанд, Бохтар ва тамоми Тоҷикистон.
          </p>
        </div>

        <form onSubmit={handleSearchSubmit} className="p-2.5 rounded-xl bg-white dark:bg-[#111a2e] border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="flex-1 w-full">
              <Input
                placeholder={t("jobs.search_placeholder")}
                value={searchTitle}
                onChange={(e) => setSearchTitle(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-blue-600 dark:text-sky-400" />}
                className="border-0 bg-transparent shadow-none text-xs"
              />
            </div>
            <div className="w-full sm:w-56 border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-800">
              <Input
                placeholder="Душанбе, Хуҷанд..."
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                leftIcon={<MapPin className="w-4 h-4 text-blue-600 dark:text-sky-400" />}
                className="border-0 bg-transparent shadow-none text-xs"
              />
            </div>
            <Button type="submit" variant="primary" size="sm" className="w-full sm:w-auto bg-blue-600 dark:bg-sky-500 hover:bg-blue-700 text-xs py-2 px-5">
              Ҷустуҷӯ
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-1 px-2 border-t border-slate-100 dark:border-slate-800/60">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ҷустуҷӯи зуд:</span>
            {quickTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => { setSearchTitle(tag); router.push(`/jobs?title=${tag}`); }}
                className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-medium text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-sky-500/20 hover:text-blue-600 dark:hover:text-sky-400 transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
        </form>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((st, idx) => {
          const Icon = st.icon;
          return (
            <Card key={idx} className="p-4 flex items-center gap-3 border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111a2e]">
              <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-sky-500/10 text-blue-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                <Icon className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">{st.value}</p>
                <p className="text-[10px] font-semibold text-slate-500">{st.label}</p>
              </div>
            </Card>
          );
        })}
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

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {categories.map((cat, idx) => {
            const Icon = cat.icon;
            return (
              <Link key={idx} href={`/jobs?category=${encodeURIComponent(cat.title)}`}>
                <div className="p-3.5 rounded-xl bg-white dark:bg-[#111a2e] border border-slate-200 dark:border-slate-800/80 hover:border-blue-600 dark:hover:border-sky-400 transition-all duration-200 group shadow-xs">
                  <div className={`w-8 h-8 rounded-lg ${cat.color} flex items-center justify-center text-white mb-2 shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-sky-400 transition-colors truncate">
                    {cat.title}
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">{cat.count} эълонҳо</p>
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
              Ширкатҳои муътамад
            </h2>
            <p className="text-xs text-slate-500">Корфармоёни фаъол ва верификатсияшуда</p>
          </div>
          <Link href="/companies">
            <Button variant="ghost" size="sm" className="text-xs" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              Ҳама ширкатҳо
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {companiesData?.items && companiesData.items.length > 0 ? (
            companiesData.items.map((comp) => (
              <Link key={comp.id} href={`/companies/${comp.id}`}>
                <Card hoverable className="p-3.5 border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-white dark:bg-[#111a2e]">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-slate-800 border border-blue-200/50 dark:border-slate-700/50 flex items-center justify-center text-blue-600 dark:text-sky-400 font-bold text-xs shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1 truncate">
                      <span>{comp.company_name}</span>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    </h3>
                    <p className="text-[10px] text-slate-500 truncate">{comp.industry || "IT / Business"}</p>
                  </div>
                </Card>
              </Link>
            ))
          ) : (
            [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
          )}
        </div>
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

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6 border-blue-200 dark:border-blue-900/50 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-[#111a2e] dark:to-slate-900 space-y-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center">
            <Briefcase className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Шумо мутахассис меҷӯед?</h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Эълони кории худро нашр кунед ва номзадҳои беҳтаринро бо ёрии зеҳни сунъии Ergon пайдо намоед.
          </p>
          <Link href="/jobs/create">
            <Button variant="primary" size="sm" className="bg-blue-600 hover:bg-blue-700 text-xs mt-1">
              Разместить вакансию
            </Button>
          </Link>
        </Card>

        <Card className="p-6 border-purple-200 dark:border-purple-900/50 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-[#111a2e] dark:to-slate-900 space-y-3">
          <div className="w-9 h-9 rounded-lg bg-purple-600 text-white flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Шумо кор меҷӯед?</h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Профили худро созед, маҳоратҳо ва резюмеро илова кунед ва мустақиман бо корфармоён муколама кунед.
          </p>
          <Link href="/register">
            <Button variant="secondary" size="sm" className="bg-purple-600 hover:bg-purple-700 text-xs mt-1">
              Создать профиль
            </Button>
          </Link>
        </Card>
      </section>
    </div>
  );
}
