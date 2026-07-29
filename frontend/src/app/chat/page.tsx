"use client";

import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, API_BASE_URL } from "@/lib/api";
import { Chat, Message, PaginatedResponse } from "@/types";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { MessageSquare, Send, User as UserIcon, CheckCheck } from "lucide-react";

export default function ChatPage() {
  const { user, token } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const wsRef = useRef<WebSocket | null>(null);

  const { data: chatsData } = useQuery({
    queryKey: ["chats"],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Chat>>("/chats");
      return res.data;
    },
    enabled: !!token,
  });

  const { data: messagesData } = useQuery({
    queryKey: ["chat-messages", selectedChatId],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Message>>(`/chats/${selectedChatId}/messages`);
      return res.data;
    },
    enabled: !!selectedChatId,
  });

  useEffect(() => {
    if (!token) return;
    const wsUrl = API_BASE_URL.replace("http", "ws") + `/chats/ws?token=${token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.chat_id === selectedChatId) {
          queryClient.invalidateQueries({ queryKey: ["chat-messages", selectedChatId] });
        }
        queryClient.invalidateQueries({ queryKey: ["chats"] });
      } catch (err) {
      }
    };

    return () => {
      ws.close();
    };
  }, [token, selectedChatId, queryClient]);

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await api.post<Message>(`/chats/${selectedChatId}/messages`, {
        chat_id: selectedChatId,
        type: "text",
        content,
      });
      return res.data;
    },
    onSuccess: () => {
      setMessageInput("");
      queryClient.invalidateQueries({ queryKey: ["chat-messages", selectedChatId] });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });

  const handleSend = () => {
    if (!messageInput.trim() || !selectedChatId) return;
    sendMessageMutation.mutate(messageInput);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white">
          <MessageSquare className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {t("chat.title")}
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px]">
        <Card className="md:col-span-1 p-4 border-slate-200/80 dark:border-slate-800/80 flex flex-col">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 px-2">
            Муколамаҳо
          </h2>
          <div className="flex-1 overflow-y-auto space-y-2">
            {chatsData?.items && chatsData.items.length > 0 ? (
              chatsData.items.map((chat) => {
                const partner = chat.participants.find((p) => p.user_id !== user?.id)?.user;
                const isSelected = selectedChatId === chat.id;

                return (
                  <button
                    key={chat.id}
                    onClick={() => setSelectedChatId(chat.id)}
                    className={`w-full p-3 rounded-2xl flex items-center gap-3 text-left transition-all ${
                      isSelected
                        ? "bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                      {partner?.username?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <div className="flex-1 truncate">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {partner?.username || "Корбар"}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {chat.last_message?.content || "Оғози чат"}
                      </p>
                    </div>
                  </button>
                );
              })
            ) : (
              <p className="text-xs text-slate-500 text-center py-8">Ҳеҷ чате нест</p>
            )}
          </div>
        </Card>

        <Card className="md:col-span-2 p-4 border-slate-200/80 dark:border-slate-800/80 flex flex-col">
          {selectedChatId ? (
            <>
              <div className="flex-1 overflow-y-auto p-2 space-y-3">
                {messagesData?.items?.map((msg) => {
                  const isMine = msg.sender_id === user?.id;
                  return (
                    <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[75%] p-3 rounded-2xl text-xs ${
                          isMine
                            ? "bg-indigo-600 text-white font-medium shadow-md"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        <p>{msg.content}</p>
                        <div className="flex items-center justify-end gap-1 mt-1 text-[9px] opacity-75">
                          <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          {isMine && <CheckCheck className="w-3 h-3" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex gap-2">
                <Input
                  placeholder={t("chat.type_message")}
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                />
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleSend}
                  isLoading={sendMessageMutation.isPending}
                  leftIcon={<Send className="w-4 h-4" />}
                >
                  Фиристодан
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-8 text-xs text-slate-500">
              Барои оғози муколама ягон чатро интихоб кунед
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
