"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Job, Application } from "@/types";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { Building2, MapPin, Banknote, Clock, Send, AlertCircle, CheckCircle } from "lucide-react";

export default function JobDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [coverNote, setCoverNote] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: job, isLoading } = useQuery({
    queryKey: ["job-detail", id],
    queryFn: async () => {
      const res = await api.get<Job>(`/jobs/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<Application>("/applications", {
        job_id: id,
        cover_note: coverNote,
      });
      return res.data;
    },
    onSuccess: () => {
      setSuccessMessage("Дархости шумо бо муваффақият фиристода шуд!");
      setErrorMessage(null);
      setIsApplyModalOpen(false);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.detail || "Хатогӣ ҳангоми фиристодани дархост");
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-lg font-bold text-slate-700 dark:text-slate-300">Кор пайдо нашуд</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-3 text-sm text-emerald-600 dark:text-emerald-400 font-bold">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <Card className="p-8 border-slate-200/80 dark:border-slate-800/80 space-y-6">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-2xl">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {job.title}
              </h1>
              <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                {job.company?.company_name || "Company"}
              </p>
            </div>
          </div>

          {user?.role === "worker" && (
            <Button variant="gradient" size="lg" onClick={() => setIsApplyModalOpen(true)} leftIcon={<Send className="w-4 h-4" />}>
              {t("jobs.apply")}
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
          <Badge variant="primary" size="md">
            <Clock className="w-3.5 h-3.5" />
            <span className="capitalize">{job.employment_type.replace("_", " ")}</span>
          </Badge>
          <Badge variant="info" size="md">
            <MapPin className="w-3.5 h-3.5" />
            <span>{job.location}</span>
          </Badge>
          <div className="flex items-center gap-1.5 text-sm font-black text-emerald-600 dark:text-emerald-400 ml-auto">
            <Banknote className="w-4 h-4" />
            <span>
              {job.salary_min ? `${job.salary_min.toLocaleString()} ${job.currency}` : "Agreeable"}
              {job.salary_max ? ` - ${job.salary_max.toLocaleString()}` : ""}
            </span>
          </div>
        </div>
      </Card>

      <Card className="p-8 border-slate-200/80 dark:border-slate-800/80 space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Тавсифи кор ва талабот</h2>
        <div className="prose dark:prose-invert text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-line">
          {job.description}
        </div>
      </Card>

      <Modal isOpen={isApplyModalOpen} onClose={() => setIsApplyModalOpen(false)} title="Фиристодани дархост">
        <div className="space-y-5">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Номаи ҳамроҳӣ (Совар ноте - ихтиёрӣ)
            </label>
            <textarea
              rows={4}
              value={coverNote}
              onChange={(e) => setCoverNote(e.target.value)}
              placeholder="Чаро шумо барои ин вазифа мувофиқ ҳастед..."
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" size="sm" onClick={() => setIsApplyModalOpen(false)}>
              Бекор кардан
            </Button>
            <Button
              variant="gradient"
              size="sm"
              isLoading={applyMutation.isPending}
              onClick={() => applyMutation.mutate()}
            >
              Фиристодан
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
