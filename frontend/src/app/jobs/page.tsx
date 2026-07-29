"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Job, PaginatedResponse } from "@/types";
import { useLanguage } from "@/providers/LanguageProvider";
import { JobCard } from "@/components/jobs/JobCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Search, MapPin, Filter, ChevronLeft, ChevronRight } from "lucide-react";

export default function JobsPage() {
  const { t } = useLanguage();
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["jobs", title, location, category, employmentType, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "12");
      if (title) params.set("title", title);
      if (location) params.set("location", location);
      if (category) params.set("category", category);
      if (employmentType) params.set("employment_type", employmentType);

      const res = await api.get<PaginatedResponse<Job>>(`/jobs?${params.toString()}`);
      return res.data;
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          {t("nav.jobs")}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Ҷои кории беҳтаринро дар Тоҷикистон пайдо кунед
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-5">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
              <Filter className="w-4 h-4 text-indigo-500" />
              <span>Филтрҳо</span>
            </div>

            <Input
              label={t("jobs.search_placeholder")}
              placeholder="Номи кор..."
              value={title}
              onChange={(e) => { setTitle(e.target.value); setPage(1); }}
              leftIcon={<Search className="w-4 h-4" />}
            />

            <Input
              label={t("jobs.location")}
              placeholder="Шаҳр..."
              value={location}
              onChange={(e) => { setLocation(e.target.value); setPage(1); }}
              leftIcon={<MapPin className="w-4 h-4" />}
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                {t("jobs.category")}
              </label>
              <select
                value={category}
                onChange={(e) => { setCategory(e.target.value); setPage(1); }}
                className="w-full bg-white dark:bg-slate-900/80 border border-slate-300 dark:border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">{t("jobs.all_categories")}</option>
                <option value="IT & Барномасозӣ">IT & Барномасозӣ</option>
                <option value="Молия ва Банк">Молия ва Банк</option>
                <option value="Сохтмон ва Муҳандисӣ">Сохтмон ва Муҳандисӣ</option>
                <option value="Тандурустӣ ва Тиб">Тандурустӣ ва Тиб</option>
                <option value="Маориф ва Таълим">Маориф ва Таълим</option>
                <option value="Маркетинг ва Борфурӯшӣ">Маркетинг ва Борфурӯшӣ</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                {t("jobs.employment_type")}
              </label>
              <select
                value={employmentType}
                onChange={(e) => { setEmploymentType(e.target.value); setPage(1); }}
                className="w-full bg-white dark:bg-slate-900/80 border border-slate-300 dark:border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Ҳама намудҳо</option>
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="remote">Remote</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
              </select>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-60 w-full" />
              ))}
            </div>
          ) : data?.items && data.items.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {data.items.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>

              {data.pages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    leftIcon={<ChevronLeft className="w-4 h-4" />}
                  >
                    Қаблӣ
                  </Button>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Саҳифаи {page} аз {data.pages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= data.pages}
                    onClick={() => setPage((p) => p + 1)}
                    rightIcon={<ChevronRight className="w-4 h-4" />}
                  >
                    Баъдӣ
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="p-16 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 space-y-2">
              <p className="text-base font-bold text-slate-700 dark:text-slate-300">Ҳеҷ эълоне пайдо нашуд</p>
              <p className="text-xs text-slate-500">Филтрҳоро тағйир диҳед ё калидвожаи дигар ворид кунед.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
