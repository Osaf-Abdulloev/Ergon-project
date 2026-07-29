"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Notification, PaginatedResponse } from "@/types";
import { useLanguage } from "@/providers/LanguageProvider";
import { Card } from "@/components/ui/Card";
import { Bell, CheckCircle } from "lucide-react";

export default function NotificationsPage() {
  const { t } = useLanguage();

  const { data, isLoading } = useQuery({
    queryKey: ["my-notifications"],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Notification>>("/notifications");
      return res.data;
    },
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white">
          <Bell className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {t("nav.notifications")}
          </h1>
        </div>
      </div>

      {isLoading ? (
        <Card className="p-8"><p className="text-xs text-slate-500">Боргирӣ...</p></Card>
      ) : data?.items && data.items.length > 0 ? (
        <div className="space-y-4">
          {data.items.map((notif) => (
            <Card key={notif.id} className="p-4 flex items-center justify-between border-slate-200/80 dark:border-slate-800/80">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {notif.type}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {new Date(notif.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="p-16 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
          <p className="text-base font-bold text-slate-700 dark:text-slate-300">Огоҳии нав нест</p>
        </div>
      )}
    </div>
  );
}
