"use client";

import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useLanguage } from "@/providers/LanguageProvider";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Sparkles, Send, Bot, User, FileText, Briefcase, Users, Loader2 } from "lucide-react";

interface AIMessage {
  sender: "user" | "ai";
  text: string;
}

export default function AIPage() {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      sender: "ai",
      text: "Салом! Ман ёрдамчии зеҳни сунъии Ergon мебошам. Ман метавонам ба шумо дар пайдо кардани кор, беҳтар кардани резюме ва интихоби мутахассисон кумак кунам.",
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState("");

  const chatMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const res = await api.post<{ result: string }>("/ai/chat", { prompt });
      return res.data;
    },
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { sender: "ai", text: data.result }]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: "Хатогӣ ҳангоми пайвастшавӣ ба хидмати ИИ. Лутфан дубора кӯшиш кунед." },
      ]);
    },
  });

  const handleSend = (textToSend?: string) => {
    const text = textToSend || inputPrompt;
    if (!text.trim()) return;

    setMessages((prev) => [...prev, { sender: "user", text }]);
    if (!textToSend) setInputPrompt("");
    chatMutation.mutate(text);
  };

  const quickPrompts = [
    { label: t("ai.quick_resume"), icon: FileText, prompt: "analyze resume Python developer" },
    { label: t("ai.quick_jobs"), icon: Briefcase, prompt: "search jobs Python developer" },
    { label: t("ai.quick_candidates"), icon: Users, prompt: "recommend candidates for IT company" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/25">
          <Sparkles className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {t("ai.title")}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Ёрдамчии доимии шумо барои ҷои кор ва касб
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 space-y-3">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Пешниҳодҳои зуд
          </p>
          {quickPrompts.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                onClick={() => handleSend(item.prompt)}
                className="w-full p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 flex items-center gap-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all shadow-sm group"
              >
                <Icon className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="md:col-span-3 flex flex-col h-[650px]">
          <Card className="flex-1 flex flex-col p-6 border-slate-200/80 dark:border-slate-800/80 overflow-hidden">
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-xs ${
                      msg.sender === "user"
                        ? "bg-indigo-600"
                        : "bg-gradient-to-tr from-purple-600 to-indigo-600"
                    }`}
                  >
                    {msg.sender === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  <div
                    className={`max-w-[80%] p-4 rounded-2xl text-xs leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-indigo-600 text-white font-medium shadow-md"
                        : "bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60"
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>
                  </div>
                </div>
              ))}

              {chatMutation.isPending && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-500 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                    <span>ИИ фикр карда истодааст...</span>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex gap-2">
              <Input
                placeholder={t("ai.placeholder")}
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
              />
              <Button
                variant="gradient"
                size="md"
                onClick={() => handleSend()}
                isLoading={chatMutation.isPending}
                leftIcon={<Send className="w-4 h-4" />}
              >
                Фиристодан
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
