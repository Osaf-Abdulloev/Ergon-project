"use client";

import React from "react";
import Link from "next/link";
import { WorkerProfile } from "@/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/providers/LanguageProvider";
import { MapPin } from "lucide-react";

interface WorkerCardProps {
  worker: WorkerProfile;
}

export const WorkerCard = ({ worker }: WorkerCardProps) => {
  const { t } = useLanguage();

  return (
    <Card hoverable className="flex flex-col justify-between h-full p-4 border-slate-200 dark:border-slate-800">
      <div className="space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs">
            {worker.user?.avatar_url ? (
              <img src={worker.user.avatar_url} alt={worker.user.username} className="w-full h-full object-cover rounded-full" />
            ) : (
              <span>{worker.user?.username?.charAt(0).toUpperCase() || "W"}</span>
            )}
          </div>
          <div className="overflow-hidden">
            <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
              {worker.user?.username}
            </h3>
            <p className="text-[11px] font-semibold text-blue-600 dark:text-sky-400 truncate">
              {worker.desired_position || t("workers.desired_position")}
            </p>
            {worker.user?.city && (
              <p className="flex items-center gap-1 text-[10px] text-slate-400">
                <MapPin className="w-2.5 h-2.5" />
                <span>{worker.user.city}</span>
              </p>
            )}
          </div>
        </div>

        {worker.bio && (
          <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-snug">
            {worker.bio}
          </p>
        )}

        {worker.skills && worker.skills.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {worker.skills.slice(0, 3).map((sk) => (
              <Badge key={sk.id || sk.name} variant="neutral" size="sm" className="text-[9px] py-0.2 px-1.5">
                {sk.name}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
        <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
          {worker.desired_salary ? `${worker.desired_salary.toLocaleString()} TJS` : "Negotiable"}
        </div>
        <Link href={`/workers/${worker.user_id}`}>
          <Button variant="outline" size="sm" className="text-[11px] py-1 px-2.5">
            {t("workers.contact")}
          </Button>
        </Link>
      </div>
    </Card>
  );
};
