"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Mail, Lock, User, Phone, MapPin, Building2, Sparkles, AlertCircle, Briefcase } from "lucide-react";

const workerSchema = z.object({
  email: z.string().email("Почтаи электронӣ нодуруст аст"),
  username: z.string().min(3, "Номи корбарӣ камаш 3 аломат"),
  password: z.string().min(6, "Рамз камаш 6 аломат"),
  phone: z.string().optional(),
  city: z.string().optional(),
});

const employerSchema = z.object({
  email: z.string().email("Почтаи электронӣ нодуруст аст"),
  username: z.string().min(3, "Номи корбарӣ камаш 3 аломат"),
  password: z.string().min(6, "Рамз камаш 6 аломат"),
  company_name: z.string().min(2, "Номи ширкатро ворид кунед"),
  industry: z.string().optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
});

export default function RegisterPage() {
  const { t } = useLanguage();
  const { login } = useAuth();
  const router = useRouter();
  const [role, setRole] = useState<"worker" | "employer">("worker");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const workerForm = useForm<z.infer<typeof workerSchema>>({
    resolver: zodResolver(workerSchema),
  });

  const employerForm = useForm<z.infer<typeof employerSchema>>({
    resolver: zodResolver(employerSchema),
  });

  const onWorkerSubmit = async (values: z.infer<typeof workerSchema>) => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      await api.post("/auth/register/worker", values);
      const loginRes = await api.post("/auth/login", { email: values.email, password: values.password });
      login(loginRes.data);
      router.push("/dashboard");
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || t("common.error"));
    } finally {
      setIsLoading(false);
    }
  };

  const onEmployerSubmit = async (values: z.infer<typeof employerSchema>) => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      await api.post("/auth/register/employer", values);
      const loginRes = await api.post("/auth/login", { email: values.email, password: values.password });
      login(loginRes.data);
      router.push("/dashboard");
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || t("common.error"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-pink-500 mx-auto flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {t("auth.register_title")}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t("auth.register_sub")}
          </p>
        </div>

        <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-slate-200/80 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-800">
          <button
            onClick={() => setRole("worker")}
            className={`flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all ${
              role === "worker"
                ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-md"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <User className="w-4 h-4" />
            <span>{t("auth.worker")}</span>
          </button>
          <button
            onClick={() => setRole("employer")}
            className={`flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all ${
              role === "employer"
                ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-md"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>{t("auth.employer")}</span>
          </button>
        </div>

        <Card className="p-8 border-slate-200/80 dark:border-slate-800/80">
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 flex items-center gap-3 text-xs text-rose-600 dark:text-rose-400 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {role === "worker" ? (
            <form onSubmit={workerForm.handleSubmit(onWorkerSubmit)} className="space-y-4">
              <Input
                label={t("auth.username")}
                placeholder="johndoe"
                leftIcon={<User className="w-4 h-4" />}
                error={workerForm.formState.errors.username?.message}
                {...workerForm.register("username")}
              />

              <Input
                label={t("auth.email")}
                placeholder="name@example.com"
                type="email"
                leftIcon={<Mail className="w-4 h-4" />}
                error={workerForm.formState.errors.email?.message}
                {...workerForm.register("email")}
              />

              <Input
                label={t("auth.password")}
                placeholder="••••••••"
                type="password"
                leftIcon={<Lock className="w-4 h-4" />}
                error={workerForm.formState.errors.password?.message}
                {...workerForm.register("password")}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label={t("auth.city")}
                  placeholder="Душанбе"
                  leftIcon={<MapPin className="w-4 h-4" />}
                  {...workerForm.register("city")}
                />
                <Input
                  label={t("auth.phone")}
                  placeholder="+992 900..."
                  leftIcon={<Phone className="w-4 h-4" />}
                  {...workerForm.register("phone")}
                />
              </div>

              <Button type="submit" variant="gradient" size="lg" className="w-full mt-2" isLoading={isLoading}>
                {t("auth.submit_register")}
              </Button>
            </form>
          ) : (
            <form onSubmit={employerForm.handleSubmit(onEmployerSubmit)} className="space-y-4">
              <Input
                label={t("auth.company_name")}
                placeholder="Tech Solutions LLC"
                leftIcon={<Building2 className="w-4 h-4" />}
                error={employerForm.formState.errors.company_name?.message}
                {...employerForm.register("company_name")}
              />

              <Input
                label={t("auth.username")}
                placeholder="company_admin"
                leftIcon={<User className="w-4 h-4" />}
                error={employerForm.formState.errors.username?.message}
                {...employerForm.register("username")}
              />

              <Input
                label={t("auth.email")}
                placeholder="hr@company.com"
                type="email"
                leftIcon={<Mail className="w-4 h-4" />}
                error={employerForm.formState.errors.email?.message}
                {...employerForm.register("email")}
              />

              <Input
                label={t("auth.password")}
                placeholder="••••••••"
                type="password"
                leftIcon={<Lock className="w-4 h-4" />}
                error={employerForm.formState.errors.password?.message}
                {...employerForm.register("password")}
              />

              <Input
                label={t("auth.industry")}
                placeholder="IT / Software / Fintech"
                leftIcon={<Briefcase className="w-4 h-4" />}
                {...employerForm.register("industry")}
              />

              <Button type="submit" variant="gradient" size="lg" className="w-full mt-2" isLoading={isLoading}>
                {t("auth.submit_register")}
              </Button>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800/80 text-center text-xs text-slate-500">
            <span>{t("auth.have_account")} </span>
            <Link href="/login" className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
              {t("auth.submit_login")}
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
