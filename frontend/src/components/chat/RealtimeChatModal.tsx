import React, { useState, useEffect, useRef } from 'react';
import { X, Send, User, Sparkles, CheckCircle2, Shield, Circle } from 'lucide-react';
import { chatService, ChatMessage } from '../../services/chatService';

interface RealtimeChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipient: {
    id: string;
    name: string;
    avatar?: string;
    role?: string;
    position?: string;
  } | null;
  user: any;
}

export const RealtimeChatModal: React.FC<RealtimeChatModalProps> = ({
  isOpen,
  onClose,
  recipient,
  user
}) => {
  if (!isOpen || !recipient) return null;

  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [wsClient, setWsClient] = useState<{ send: (chatId: string, content: string) => void; close: () => void } | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Initialize Chat & WebSocket
  useEffect(() => {
    let wsInstance: any = null;

    const initChat = async () => {
      setConnectionStatus('connecting');
      try {
        // 1. Get or Create Chat Room in Database
        const chatRoom = await chatService.getOrCreateChat(recipient.id);
        const cId = chatRoom?.id || `chat-${recipient.id}-${user?.id || 'guest'}`;
        setChatId(cId);

        // 2. Fetch existing history from DB
        if (chatRoom?.id) {
          const history = await chatService.getMessages(chatRoom.id);
          setMessages(history);
        } else {
          setMessages([
            {
              id: 'init-1',
              chat_id: cId,
              sender_id: recipient.id,
              type: 'text',
              content: `Здравствуйте! Вы можете написать мне напрямую в чате HamKor.`,
              created_at: new Date().toISOString()
            }
          ]);
        }

        // 3. Connect WebSocket for Real-time Messaging
        const token = localStorage.getItem('ergon_access_token') || 'demo_token';
        wsInstance = chatService.connectWebSocket(
          token,
          (newMsg) => {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            scrollToBottom();
          },
          (status) => setConnectionStatus(status)
        );
        setWsClient(wsInstance);

      } catch (err) {
        console.error('Chat init error:', err);
        setConnectionStatus('connected'); // Fallback
      }
    };

    initChat();

    return () => {
      if (wsInstance) wsInstance.close();
    };
  }, [recipient.id, user?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !chatId) return;

    const textToSend = inputText.trim();
    setInputText('');

    const tempMsg: ChatMessage = {
      id: `tmp-${Date.now()}`,
      chat_id: chatId,
      sender_id: user?.id || 'me',
      type: 'text',
      content: textToSend,
      created_at: new Date().toISOString()
    };

    setMessages((prev) => [...prev, tempMsg]);

    // Send via WebSocket or HTTP Fallback
    if (wsClient) {
      wsClient.send(chatId, textToSend);
    } else {
      await chatService.sendMessageHttp(chatId, 'text', textToSend);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="glass-card w-full max-w-2xl rounded-3xl shadow-2xl relative overflow-hidden border border-white/20 bg-white flex flex-col h-[650px] max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white flex items-center justify-between border-b border-indigo-700/40">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden font-black text-lg">
                {recipient.avatar ? (
                  <img src={recipient.avatar} alt={recipient.name} className="w-full h-full object-cover" />
                ) : (
                  recipient.name[0]?.toUpperCase() || 'C'
                )}
              </div>
              <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
                connectionStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`} />
            </div>

            <div>
              <h3 className="font-extrabold text-sm sm:text-base leading-tight flex items-center gap-2">
                <span>{recipient.name}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Соискатель
                </span>
              </h3>
              <p className="text-[11px] text-indigo-200 font-medium flex items-center gap-1.5 mt-0.5">
                <Circle className={`w-2 h-2 ${connectionStatus === 'connected' ? 'fill-emerald-400 text-emerald-400' : 'fill-amber-400 text-amber-400'}`} />
                <span>{connectionStatus === 'connected' ? 'Чат в реальном времени (WebSocket)' : 'Подключение к WebSocket...'}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Area */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-50/50">
          <div className="text-center py-2">
            <span className="text-[11px] font-bold text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-2xs">
              🔒 Прямой защищенный WebSocket чат HamKor
            </span>
          </div>

          {messages.map((msg) => {
            const isMe = msg.sender_id === user?.id || msg.sender_id === 'me';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-fade-in`}
              >
                <div
                  className={`max-w-[80%] p-3.5 rounded-2xl text-xs sm:text-sm font-medium shadow-2xs ${
                    isMe
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-none'
                  }`}
                >
                  {msg.content}
                </div>
                <span className="text-[10px] text-slate-400 font-semibold mt-1 px-1">
                  {new Date(msg.created_at || Date.now()).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Footer */}
        <form onSubmit={handleSendMessage} className="p-3 sm:p-4 bg-white border-t border-slate-200/80 flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Напишите сообщение соискателю через WebSocket..."
            className="flex-1 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-medium outline-none focus:border-indigo-600 focus:bg-white transition-all"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all active:scale-95 shrink-0"
          >
            <span>Отправить</span>
            <Send className="w-4 h-4" />
          </button>
        </form>

      </div>
    </div>
  );
};
