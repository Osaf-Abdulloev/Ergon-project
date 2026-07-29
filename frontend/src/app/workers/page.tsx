"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { WorkerProfile, PaginatedResponse } from "@/types";
import { useLanguage } from "@/providers/LanguageProvider";
import { WorkerCard } from "@/components/workers/WorkerCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { Input } from "@/components/ui/Input";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

export default function WorkersPage() {
  const { t } = useLanguage();
  const [skill, setSkill] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["workers-search", skill, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "12");
      if (skill) params.set("skill", skill);

      const res = await api.get<PaginatedResponse<WorkerProfile>>(`/users/workers?${params.toString()}`);
      return res.data;
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {t("nav.workers")}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Мутахассисон ва номзадҳои ботаҷриба дар Тоҷикистон
          </p>
        </div>

        <div className="w-full sm:w-72">
          <Input
            placeholder={t("workers.search_placeholder")}
            value={skill}
            onChange={(e) => { setSkill(e.target.value); setPage(1); }}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      ) : data?.items && data.items.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {data.items.map((worker) => (
              <WorkerCard key={worker.id} worker={worker} />
            ))}
          </div>

          {data.pages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-6">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                {page} / {data.pages}
              </span>
              <button
                disabled={page >= data.pages}
                onClick={() => setPage((p) => p + 1)}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="p-16 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 space-y-2">
          <p className="text-base font-bold text-slate-700 dark:text-slate-300">Ҳеҷ мутахассисе пайдо нашуд</p>
        </div>
      )}
    </div>
  );
}
