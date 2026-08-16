import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Circle, Image as ImageIcon, RefreshCw } from 'lucide-react';
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
  const [wsClient, setWsClient] = useState<{ send: (chatId: string, content: string, type?: 'text' | 'image' | 'voice', clientMsgId?: string) => void; close: () => void } | null>(null);
  
  // Image Upload state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Lightbox state
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Initialize Chat & WebSocket Connection
  useEffect(() => {
    let wsInstance: any = null;

    const initChat = async () => {
      setConnectionStatus('connecting');
      try {
        const chatRoom = await chatService.getOrCreateChat(recipient.id);
        const cId = chatRoom?.id || `chat-${recipient.id}-${user?.id || 'guest'}`;
        setChatId(cId);

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

        const token = localStorage.getItem('ergon_access_token') || localStorage.getItem('ergon_token') || '';
        wsInstance = chatService.connectWebSocket(
          token,
          (newMsg) => {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id || (m.client_msg_id && m.client_msg_id === newMsg.client_msg_id))) return prev;
              return [...prev, newMsg];
            });
            scrollToBottom();
          },
          (status) => setConnectionStatus(status)
        );
        setWsClient(wsInstance);

      } catch (err) {
        console.error('Chat init error:', err);
        setConnectionStatus('connected');
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

    const clientMsgId = `cli-${Date.now()}`;
    const tempMsg: ChatMessage = {
      id: `tmp-${Date.now()}`,
      chat_id: chatId,
      sender_id: user?.id || 'me',
      type: 'text',
      content: textToSend,
      client_msg_id: clientMsgId,
      created_at: new Date().toISOString()
    };

    setMessages((prev) => [...prev, tempMsg]);

    if (wsClient) {
      wsClient.send(chatId, textToSend, 'text', clientMsgId);
    } else {
      const sent = await chatService.sendMessageHttp(chatId, 'text', textToSend, clientMsgId);
      if (sent) {
        setMessages((prev) => prev.map((m) => (m.client_msg_id === clientMsgId ? sent : m)));
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        alert('Размер файла не должен превышать 10MB');
        return;
      }
      setSelectedImage(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSendImage = async () => {
    if (!selectedImage || !chatId) return;
    setIsUploadingImage(true);

    try {
      const uploadedUrl = await chatService.uploadFile(selectedImage, 'chat');
      if (uploadedUrl) {
        const clientMsgId = `cli-${Date.now()}`;
        const tempMsg: ChatMessage = {
          id: `tmp-${Date.now()}`,
          chat_id: chatId,
          sender_id: user?.id || 'me',
          type: 'image',
          content: uploadedUrl,
          client_msg_id: clientMsgId,
          created_at: new Date().toISOString()
        };

        setMessages((prev) => [...prev, tempMsg]);

        if (wsClient) {
          wsClient.send(chatId, uploadedUrl, 'image', clientMsgId);
        } else {
          const sent = await chatService.sendMessageHttp(chatId, 'image', uploadedUrl, clientMsgId);
          if (sent) {
            setMessages((prev) => prev.map((m) => (m.client_msg_id === clientMsgId ? sent : m)));
          }
        }
      }
    } catch (e) {
      console.error('Failed to send image:', e);
    } finally {
      setIsUploadingImage(false);
      setSelectedImage(null);
      setImagePreviewUrl(null);
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
                connectionStatus === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'
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
                <span>{connectionStatus === 'connected' ? 'В сети' : 'Подключение...'}</span>
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
              🔒 Защищенный чат HamKor
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
                  {msg.type === 'image' ? (
                    <img
                      src={msg.content}
                      alt="Вложенное изображение"
                      onClick={() => setLightboxImage(msg.content)}
                      className="max-h-60 rounded-xl object-cover cursor-pointer border border-white/20 hover:opacity-95 transition-opacity"
                    />
                  ) : (
                    <p className="whitespace-pre-wrap font-medium">{msg.content}</p>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 font-semibold mt-1 px-1">
                  {new Date(msg.created_at || Date.now()).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Selected Image Preview Modal Bar before send */}
        {selectedImage && imagePreviewUrl && (
          <div className="p-3 bg-indigo-50 border-t border-indigo-100 flex items-center justify-between gap-4 rounded-xl mx-4 mb-2 shadow-sm">
            <div className="flex items-center gap-3 overflow-hidden">
              <img src={imagePreviewUrl} alt="Preview" className="w-12 h-12 rounded-lg object-cover border border-indigo-200" />
              <div className="truncate">
                <p className="text-xs font-bold text-slate-900 truncate">{selectedImage.name}</p>
                <p className="text-[10px] text-slate-500">{(selectedImage.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setSelectedImage(null); setImagePreviewUrl(null); }}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                onClick={handleSendImage}
                disabled={isUploadingImage}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold flex items-center gap-1 hover:bg-indigo-700 disabled:opacity-50"
              >
                {isUploadingImage ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Отправить</span>
              </button>
            </div>
          </div>
        )}

        {/* Input Footer */}
        <form onSubmit={handleSendMessage} className="p-3 sm:p-4 bg-white border-t border-slate-200/80 flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Прикрепить изображение"
            className="p-2.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all shrink-0"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Напишите сообщение соискателю..."
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

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-6 right-6 p-2 rounded-full bg-white/20 text-white hover:bg-white/40 transition-all"
          >
            <X className="w-6 h-6" />
          </button>
          <img src={lightboxImage} alt="Full view" className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain" />
        </div>
      )}
    </div>
  );
};
