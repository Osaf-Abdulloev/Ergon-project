"use client";

import React from "react";
import Link from "next/link";
import { WorkerProfile } from "@/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/providers/LanguageProvider";
import { User, MapPin, Briefcase, Award } from "lucide-react";

interface WorkerCardProps {
  worker: WorkerProfile;
}

export const WorkerCard = ({ worker }: WorkerCardProps) => {
  const { t } = useLanguage();

  return (
    <Card hoverable className="flex flex-col justify-between h-full border-slate-200/80 dark:border-slate-800/80">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
            {worker.user?.avatar_url ? (
              <img src={worker.user.avatar_url} alt={worker.user.username} className="w-full h-full object-cover rounded-2xl" />
            ) : (
              <span>{worker.user?.username?.charAt(0).toUpperCase() || "W"}</span>
            )}
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
              {worker.user?.username}
            </h3>
            <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              {worker.desired_position || t("workers.desired_position")}
            </p>
            {worker.user?.city && (
              <p className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                <MapPin className="w-3 h-3" />
                <span>{worker.user.city}</span>
              </p>
            )}
          </div>
        </div>

        {worker.bio && (
          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
            {worker.bio}
          </p>
        )}

        {worker.skills && worker.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {worker.skills.slice(0, 4).map((sk) => (
              <Badge key={sk.id || sk.name} variant="neutral" size="sm">
                {sk.name}
              </Badge>
            ))}
            {worker.skills.length > 4 && (
              <Badge variant="neutral" size="sm">
                +{worker.skills.length - 4}
              </Badge>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
        <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
          {worker.desired_salary ? `${worker.desired_salary.toLocaleString()} TJS` : "Negotiable"}
        </div>
        <Link href={`/workers/${worker.user_id}`}>
          <Button variant="outline" size="sm">
            {t("workers.contact")}
          </Button>
        </Link>
      </div>
    </Card>
  );
};
