"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Company } from "@/types";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Building2, ShieldCheck } from "lucide-react";

export default function CompanyDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const { data: company, isLoading } = useQuery({
    queryKey: ["company-detail", id],
    queryFn: async () => {
      const res = await api.get<Company>(`/companies/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-6">
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-lg font-bold text-slate-700 dark:text-slate-300">Ширкат пайдо нашуд</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <Card className="p-8 border-slate-200/80 dark:border-slate-800/80 space-y-6">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-2xl">
            <Building2 className="w-10 h-10" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>{company.company_name}</span>
              {company.is_verified && <ShieldCheck className="w-5 h-5 text-emerald-500" />}
            </h1>
            <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
              {company.industry || "IT / Business"}
            </p>
          </div>
        </div>

        {company.description && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Дар бораи ширкат</h2>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {company.description}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
