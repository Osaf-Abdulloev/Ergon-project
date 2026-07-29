"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { WorkerProfile, Chat } from "@/types";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { MapPin, MessageSquare, Award } from "lucide-react";

export default function WorkerDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();

  const { data: worker, isLoading } = useQuery({
    queryKey: ["worker-detail", id],
    queryFn: async () => {
      const res = await api.get<WorkerProfile>(`/users/workers/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const startChatMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<Chat>("/chats", { participant_id: id });
      return res.data;
    },
    onSuccess: () => {
      router.push("/chat");
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-lg font-bold text-slate-700 dark:text-slate-300">Мутахассис пайдо нашуд</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <Card className="p-8 border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-black text-3xl shadow-xl shadow-indigo-500/20">
            {worker.user?.username?.charAt(0).toUpperCase()}
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              {worker.user?.username}
            </h1>
            <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
              {worker.desired_position || "Мутахассис"}
            </p>
            {worker.user?.city && (
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>{worker.user.city}</span>
              </p>
            )}
          </div>
        </div>

        {user && user.id !== worker.user_id && (
          <Button
            variant="gradient"
            size="lg"
            onClick={() => startChatMutation.mutate()}
            isLoading={startChatMutation.isPending}
            leftIcon={<MessageSquare className="w-4 h-4" />}
          >
            {t("workers.contact")}
          </Button>
        )}
      </Card>

      {worker.bio && (
        <Card className="p-8 border-slate-200/80 dark:border-slate-800/80 space-y-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Дар бораи худ</h2>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
            {worker.bio}
          </p>
        </Card>
      )}

      {worker.skills && worker.skills.length > 0 && (
        <Card className="p-8 border-slate-200/80 dark:border-slate-800/80 space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-500" />
            <span>Маҳоратҳо ва касбият</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {worker.skills.map((sk) => (
              <Badge key={sk.id || sk.name} variant="primary" size="md">
                {sk.name}
              </Badge>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
