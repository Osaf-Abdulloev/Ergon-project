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
    <Card hoverable className="group relative flex flex-col justify-between h-full border-slate-200/80 dark:border-slate-800/80">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg shadow-sm">
              {job.company?.logo_url ? (
                <img src={job.company.logo_url} alt={job.company.company_name} className="w-full h-full object-cover rounded-2xl" />
              ) : (
                <Building2 className="w-6 h-6" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                {job.title}
              </h3>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {job.company?.company_name || "Company"}
              </p>
            </div>
          </div>

          {onToggleFavorite && (
            <button
              onClick={() => onToggleFavorite(job.id)}
              className={`p-2 rounded-xl border transition-colors ${
                isFavorite
                  ? "bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800/60 text-rose-500"
                  : "bg-white/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isFavorite ? "fill-rose-500" : ""}`} />
            </button>
          )}
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
          {job.description}
        </p>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Badge variant={typeVariants[job.employment_type] || "neutral"}>
            <Clock className="w-3 h-3" />
            <span className="capitalize">{job.employment_type.replace("_", " ")}</span>
          </Badge>

          <Badge variant="info">
            <MapPin className="w-3 h-3" />
            <span>{job.location}</span>
          </Badge>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-sm font-bold text-emerald-600 dark:text-emerald-400">
          <Banknote className="w-4 h-4" />
          <span>
            {job.salary_min ? `${job.salary_min.toLocaleString()} ${job.currency}` : "Agreeable"}
            {job.salary_max ? ` - ${job.salary_max.toLocaleString()}` : ""}
          </span>
        </div>

        <Link href={`/jobs/${job.id}`}>
          <Button variant="primary" size="sm">
            {t("jobs.details")}
          </Button>
        </Link>
      </div>
    </Card>
  );
};
