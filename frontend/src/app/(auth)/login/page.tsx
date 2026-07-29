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
import { TokenResponse } from "@/types";
import { Mail, Lock, Sparkles, AlertCircle } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Почтаи электронӣ нодуруст аст"),
  password: z.string().min(6, "Рамз бояд камаш 6 аломат бошад"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { t } = useLanguage();
  const { login } = useAuth();
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      const res = await api.post<TokenResponse>("/auth/login", values);
      login(res.data);
      router.push("/dashboard");
    } catch (err: any) {
      const detail = err.response?.data?.detail || t("common.error");
      setErrorMessage(detail);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-pink-500 mx-auto flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {t("auth.welcome_back")}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t("auth.login_sub")}
          </p>
        </div>

        <Card className="p-8 border-slate-200/80 dark:border-slate-800/80">
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 flex items-center gap-3 text-xs text-rose-600 dark:text-rose-400 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label={t("auth.email")}
              placeholder="name@example.com"
              type="email"
              leftIcon={<Mail className="w-4 h-4" />}
              error={errors.email?.message}
              {...register("email")}
            />

            <Input
              label={t("auth.password")}
              placeholder="••••••••"
              type="password"
              leftIcon={<Lock className="w-4 h-4" />}
              error={errors.password?.message}
              {...register("password")}
            />

            <Button type="submit" variant="gradient" size="lg" className="w-full" isLoading={isLoading}>
              {t("auth.submit_login")}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800/80 text-center text-xs text-slate-500">
            <span>{t("auth.no_account")} </span>
            <Link href="/register" className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
              {t("auth.submit_register")}
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
