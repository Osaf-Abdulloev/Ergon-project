"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Favorite, PaginatedResponse } from "@/types";
import { useLanguage } from "@/providers/LanguageProvider";
import { Card } from "@/components/ui/Card";
import { Bookmark, Briefcase } from "lucide-react";

export default function FavoritesPage() {
  const { t } = useLanguage();

  const { data, isLoading } = useQuery({
    queryKey: ["my-favorites"],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Favorite>>("/favorites");
      return res.data;
    },
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-rose-500 flex items-center justify-center text-white">
          <Bookmark className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {t("nav.favorites")}
          </h1>
        </div>
      </div>

      {isLoading ? (
        <Card className="p-8"><p className="text-xs text-slate-500">Боргирӣ...</p></Card>
      ) : data?.items && data.items.length > 0 ? (
        <div className="space-y-4">
          {data.items.map((fav) => (
            <Card key={fav.id} className="p-4 flex items-center justify-between border-slate-200/80 dark:border-slate-800/80">
              <div className="flex items-center gap-3">
                <Briefcase className="w-5 h-5 text-indigo-500" />
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 capitalize">
                    {fav.target_type}: {fav.target_id}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Илова шуд: {new Date(fav.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="p-16 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
          <p className="text-base font-bold text-slate-700 dark:text-slate-300">Ҳеҷ интихобшудае пайдо нашуд</p>
        </div>
      )}
    </div>
  );
}
