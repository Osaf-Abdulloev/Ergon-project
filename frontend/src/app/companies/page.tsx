"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Company, PaginatedResponse } from "@/types";
import { useLanguage } from "@/providers/LanguageProvider";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Building2, ShieldCheck, ExternalLink } from "lucide-react";

export default function CompaniesPage() {
  const { t } = useLanguage();

  const { data, isLoading } = useQuery({
    queryKey: ["companies-list"],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Company>>("/companies");
      return res.data;
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          {t("nav.companies")}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Корфармоён ва ширкатҳои муътамад дар Тоҷикистон
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : data?.items && data.items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {data.items.map((comp) => (
            <Link key={comp.id} href={`/companies/${comp.id}`}>
              <Card hoverable className="h-full space-y-4 border-slate-200/80 dark:border-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <span>{comp.company_name}</span>
                      {comp.is_verified && <ShieldCheck className="w-4 h-4 text-emerald-500" />}
                    </h3>
                    <p className="text-xs text-slate-500">{comp.industry || "IT / Business"}</p>
                  </div>
                </div>

                {comp.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                    {comp.description}
                  </p>
                )}
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="p-16 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
          <p className="text-base font-bold text-slate-700 dark:text-slate-300">Ҳеҷ ширкате пайдо нашуд</p>
        </div>
      )}
    </div>
  );
}
