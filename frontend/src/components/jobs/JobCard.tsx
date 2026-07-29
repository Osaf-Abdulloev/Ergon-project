"use client";

import React from "react";
import Link from "next/link";
import { Job } from "@/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/providers/LanguageProvider";
import { Building2, MapPin, Banknote, Clock, Bookmark } from "lucide-react";

interface JobCardProps {
  job: Job;
  isFavorite?: boolean;
  onToggleFavorite?: (jobId: string) => void;
}

export const JobCard = ({ job, isFavorite = false, onToggleFavorite }: JobCardProps) => {
  const { t } = useLanguage();

  const typeVariants: Record<string, "primary" | "info" | "success" | "warning" | "neutral"> = {
    full_time: "primary",
    part_time: "info",
    remote: "success",
    contract: "warning",
    internship: "neutral",
  };

  return (
    <Card hoverable className="group relative flex flex-col justify-between h-full p-4 border-slate-200 dark:border-slate-800">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-slate-800 border border-blue-200/50 dark:border-slate-700/50 flex items-center justify-center text-blue-600 dark:text-sky-400 font-bold text-sm shrink-0">
              {job.company?.logo_url ? (
                <img src={job.company.logo_url} alt={job.company.company_name} className="w-full h-full object-cover rounded-lg" />
              ) : (
                <Building2 className="w-4.5 h-4.5" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-sky-400 transition-colors line-clamp-1">
                {job.title}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {job.company?.company_name || "Company"}
              </p>
            </div>
          </div>

          {onToggleFavorite && (
            <button
              onClick={() => onToggleFavorite(job.id)}
              className={`p-1.5 rounded-lg border transition-colors ${
                isFavorite
                  ? "bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-500"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isFavorite ? "fill-rose-500" : ""}`} />
            </button>
          )}
        </div>

        <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-snug">
          {job.description}
        </p>

        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <Badge variant={typeVariants[job.employment_type] || "neutral"} size="sm">
            <Clock className="w-2.5 h-2.5" />
            <span className="capitalize text-[10px]">{job.employment_type.replace("_", " ")}</span>
          </Badge>

          <Badge variant="info" size="sm">
            <MapPin className="w-2.5 h-2.5" />
            <span className="text-[10px]">{job.location}</span>
          </Badge>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
          <Banknote className="w-3.5 h-3.5" />
          <span>
            {job.salary_min ? `${job.salary_min.toLocaleString()} ${job.currency}` : "Договорная"}
          </span>
        </div>

        <Link href={`/jobs/${job.id}`}>
          <Button variant="primary" size="sm" className="text-[11px] py-1 px-2.5">
            {t("jobs.details")}
          </Button>
        </Link>
      </div>
    </Card>
  );
};
