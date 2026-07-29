"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { api } from "@/lib/api";
import { useLanguage } from "@/providers/LanguageProvider";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Briefcase, MapPin, Banknote, AlertCircle, PlusCircle } from "lucide-react";

const createJobSchema = z.object({
  title: z.string().min(3, "Омӯзиши номи эълон камаш 3 аломат"),
  category: z.string().min(2, "Категорияро интихоб кунед"),
  description: z.string().min(10, "Тавсиф камаш 10 аломат"),
  location: z.string().min(2, "Шаҳрро ворид кунед"),
  salary_min: z.coerce.number().optional(),
  salary_max: z.coerce.number().optional(),
  employment_type: z.enum(["full_time", "part_time", "remote", "contract", "internship"]),
});

type CreateJobFormValues = z.infer<typeof createJobSchema>;

export default function CreateJobPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateJobFormValues>({
    resolver: zodResolver(createJobSchema),
    defaultValues: {
      employment_type: "full_time",
    },
  });

  const onSubmit = async (values: CreateJobFormValues) => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      const res = await api.post("/jobs", values);
      router.push(`/jobs/${res.data.id}`);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || t("common.error"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          {t("nav.create_job")}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Эълони кории навро барои ҷалби мутахассисон эҷод кунед
        </p>
      </div>

      <Card className="p-8 border-slate-200/80 dark:border-slate-800/80">
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 flex items-center gap-3 text-xs text-rose-600 dark:text-rose-400 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Input
            label="Номи эълони кор (Job Title)"
            placeholder="Senior Python / FastAPI Developer"
            leftIcon={<Briefcase className="w-4 h-4" />}
            error={errors.title?.message}
            {...register("title")}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Категория
              </label>
              <select
                {...register("category")}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="IT & Барномасозӣ">IT & Барномасозӣ</option>
                <option value="Молия ва Банк">Молия ва Банк</option>
                <option value="Сохтмон ва Муҳандисӣ">Сохтмон ва Муҳандисӣ</option>
                <option value="Тандурустӣ ва Тиб">Тандурустӣ ва Тиб</option>
                <option value="Маркетинг ва Борфурӯшӣ">Маркетинг ва Борфурӯшӣ</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Намуди кор
              </label>
              <select
                {...register("employment_type")}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="remote">Remote</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Шаҳр"
              placeholder="Душанбе"
              leftIcon={<MapPin className="w-4 h-4" />}
              error={errors.location?.message}
              {...register("location")}
            />
            <Input
              label="Маоши минималӣ (TJS)"
              type="number"
              placeholder="10000"
              leftIcon={<Banknote className="w-4 h-4" />}
              {...register("salary_min")}
            />
            <Input
              label="Маоши максималӣ (TJS)"
              type="number"
              placeholder="15000"
              leftIcon={<Banknote className="w-4 h-4" />}
              {...register("salary_max")}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Тавсифи кор ва талабот
            </label>
            <textarea
              rows={6}
              placeholder="Масъулиятҳо, талаботҳо ва шароитҳо..."
              {...register("description")}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {errors.description && <p className="text-xs text-rose-500">{errors.description.message}</p>}
          </div>

          <Button type="submit" variant="gradient" size="lg" className="w-full" isLoading={isLoading} leftIcon={<PlusCircle className="w-4 h-4" />}>
            Эълонро нашр кардан
          </Button>
        </form>
      </Card>
    </div>
  );
}
