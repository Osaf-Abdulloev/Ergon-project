import { api, getStoredToken } from './api';

export interface ChatUser {
  id: string;
  email: string;
  role: string;
  full_name?: string;
  avatar_url?: string;
}

export interface ChatParticipant {
  user_id: string;
  user?: ChatUser;
}

export interface ChatMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  type: 'text' | 'image' | 'voice';
  content: string;
  is_read?: boolean;
  is_edited?: boolean;
  is_deleted?: boolean;
  client_msg_id?: string;
  created_at: string;
}

export interface ChatConversation {
  id: string;
  created_at: string;
  participants: ChatParticipant[];
  last_message?: ChatMessage;
  unread_count?: number;
}

export const chatService = {
  // Fetch user chats from backend
  getChats: async (): Promise<ChatConversation[]> => {
    try {
      const response = await api.get('/chats');
      return response.data.items || [];
    } catch (err) {
      console.error('Error fetching chats:', err);
      return [];
    }
  },

  // Fetch messages for a specific chat
  getMessages: async (chatId: string, limit = 100): Promise<ChatMessage[]> => {
    try {
      const response = await api.get(`/chats/${chatId}/messages`, {
        params: { limit }
      });
      return response.data.items || [];
    } catch (err) {
      console.error('Error fetching chat messages:', err);
      return [];
    }
  },

  // Create or get existing chat with user
  getOrCreateChat: async (recipientUserId: string): Promise<ChatConversation | null> => {
    try {
      const response = await api.post('/chats', { recipient_user_id: recipientUserId });
      return response.data;
    } catch (err) {
      console.error('Error creating chat:', err);
      return null;
    }
  },

  // Delete entire chat conversation
  deleteChat: async (chatId: string): Promise<boolean> => {
    try {
      await api.delete(`/chats/${chatId}`);
      return true;
    } catch (err) {
      console.error('Error deleting chat:', err);
      return false;
    }
  },

  // Send message via HTTP fallback
  sendMessageHttp: async (chatId: string, type: 'text' | 'image' | 'voice', content: string, clientMsgId?: string): Promise<ChatMessage | null> => {
    try {
      const response = await api.post(`/chats/${chatId}/messages`, {
        chat_id: chatId,
        type,
        content,
        client_msg_id: clientMsgId
      });
      return response.data;
    } catch (err) {
      console.error('Error sending message via HTTP:', err);
      return null;
    }
  },

  // Edit message via HTTP
  editMessage: async (chatId: string, messageId: string, content: string): Promise<ChatMessage | null> => {
    try {
      const response = await api.patch(`/chats/${chatId}/messages/${messageId}`, { content });
      return response.data;
    } catch (err) {
      console.error('Error editing message:', err);
      return null;
    }
  },

  // Delete message via HTTP
  deleteMessage: async (chatId: string, messageId: string): Promise<ChatMessage | null> => {
    try {
      const response = await api.delete(`/chats/${chatId}/messages/${messageId}`);
      return response.data;
    } catch (err) {
      console.error('Error deleting message:', err);
      return null;
    }
  },

  // Mark chat as read
  markAsRead: async (chatId: string): Promise<boolean> => {
    try {
      await api.post(`/chats/${chatId}/read`);
      return true;
    } catch (err) {
      return false;
    }
  },

  // Upload file (image or audio voice blob)
  uploadFile: async (file: File | Blob, folder = 'chat'): Promise<string | null> => {
    try {
      const formData = new FormData();
      const fileName = file instanceof File ? file.name : `voice_${Date.now()}.webm`;
      formData.append('file', file, fileName);
      formData.append('folder', folder);

      const response = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': undefined }
      });

      return response.data.url || response.data.file_url || null;
    } catch (err) {
      console.error('Error uploading file:', err);
      return null;
    }
  },

  // Create WebSocket connection for real-time messaging with heartbeat
  connectWebSocket: (
    token: string,
    onMessage: (msg: ChatMessage) => void,
    onStatusChange?: (status: 'connected' | 'disconnected' | 'connecting') => void,
    onEvent?: (eventData: any) => void
  ): {
    send: (chatId: string, content: string, type?: 'text' | 'image' | 'voice', clientMsgId?: string) => void;
    sendTyping: (chatId: string, isTyping: boolean) => void;
    close: () => void;
  } => {
    const loc = window.location;
    const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
    
    let wsHost = loc.host;
    if (loc.port === '5173' || loc.port === '3000') {
      wsHost = `${loc.hostname}:8000`;
    }

    const authToken = token || getStoredToken();
    const wsUrl = `${protocol}//${wsHost}/api/v1/chats/ws?token=${encodeURIComponent(authToken)}`;

    let ws: WebSocket | null = null;
    let isClosedIntentionally = false;
    let pingInterval: any = null;

    const connect = () => {
      if (onStatusChange) onStatusChange('connecting');
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (onStatusChange) onStatusChange('connected');

          // Setup ping heartbeat every 25 seconds
          if (pingInterval) clearInterval(pingInterval);
          pingInterval = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ event: 'ping' }));
            }
          }, 25000);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (!data) return;

            if (data.event === 'pong') {
              return;
            }

            if (onEvent) onEvent(data);

            if (data.event === 'new_message' || (data.id && data.chat_id)) {
              onMessage(data as ChatMessage);
            }
          } catch (e) {
            console.error('Error parsing WebSocket message:', e);
          }
        };

        ws.onerror = () => {
          if (onStatusChange) onStatusChange('disconnected');
        };

        ws.onclose = () => {
          if (pingInterval) clearInterval(pingInterval);
          if (onStatusChange) onStatusChange('disconnected');
          if (!isClosedIntentionally) {
            setTimeout(connect, 3000);
          }
        };
      } catch (err) {
        console.error('Failed to create WebSocket instance:', err);
        if (onStatusChange) onStatusChange('disconnected');
      }
    };

    connect();

    return {
      send: (chatId: string, content: string, type: 'text' | 'image' | 'voice' = 'text', clientMsgId?: string) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            event: 'send_message',
            chat_id: chatId,
            type,
            content,
            client_msg_id: clientMsgId
          }));
        } else {
          chatService.sendMessageHttp(chatId, type, content, clientMsgId).then((msg) => {
            if (msg) onMessage(msg);
          });
        }
      },

      sendTyping: (chatId: string, isTyping: boolean) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            event: isTyping ? 'typing_start' : 'typing_stop',
            chat_id: chatId
          }));
        }
      },

      close: () => {
        isClosedIntentionally = true;
        if (pingInterval) clearInterval(pingInterval);
        if (ws) ws.close();
      }
    };
  }
};
