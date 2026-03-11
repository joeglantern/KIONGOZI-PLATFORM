import { create } from 'zustand';
import apiClient from '../utils/apiClient';

export interface DMParticipant {
  id: string;
  full_name: string;
  username: string;
  avatar_url?: string;
  is_verified?: boolean;
  is_bot?: boolean;
}

export interface DMMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content?: string;
  media_url?: string;
  media_type?: 'image' | 'video';
  is_read: boolean;
  read_at?: string;
  created_at: string;
  sender?: DMParticipant;
  _pending?: boolean;
}

export interface DMConversation {
  id: string;
  last_message_at?: string;
  last_read_at?: string;
  last_message?: DMMessage;
  unread_count: number;
  participants: DMParticipant[];
}

interface DMState {
  conversations: DMConversation[];
  messages: Record<string, DMMessage[]>; // conversationId -> messages
  conversationsLoading: boolean;
  messagesLoading: Record<string, boolean>;
  messageCursors: Record<string, string | null>;

  fetchConversations: () => Promise<void>;
  fetchMessages: (conversationId: string, refresh?: boolean) => Promise<void>;
  appendMessage: (conversationId: string, message: DMMessage) => void;
  replaceMessage: (conversationId: string, tempId: string, real: DMMessage) => void;
  removeMessage: (conversationId: string, id: string) => void;
  markRead: (conversationId: string) => void;
  reset: () => void;
}

export const useDMStore = create<DMState>((set, get) => ({
  conversations: [],
  messages: {},
  conversationsLoading: false,
  messagesLoading: {},
  messageCursors: {},

  fetchConversations: async () => {
    set({ conversationsLoading: true });
    try {
      const res = await apiClient.getDMConversations();
      if (res.success && res.data) {
        set({ conversations: res.data });
      }
    } catch (e) {
      console.error('fetchConversations error:', e);
    } finally {
      set({ conversationsLoading: false });
    }
  },

  fetchMessages: async (conversationId: string, refresh = false) => {
    const state = get();
    if (state.messagesLoading[conversationId]) return;

    set(s => ({ messagesLoading: { ...s.messagesLoading, [conversationId]: true } }));

    try {
      const cursor = refresh ? undefined : state.messageCursors[conversationId] ?? undefined;
      const res = await apiClient.getDMMessages(conversationId, cursor);
      if (res.success && res.data) {
        set(s => ({
          messages: {
            ...s.messages,
            [conversationId]: refresh
              ? res.data
              : [...(res.data), ...(s.messages[conversationId] || [])]
          },
          messageCursors: { ...s.messageCursors, [conversationId]: res.nextCursor || null }
        }));
      }
    } catch (e) {
      console.error('fetchMessages error:', e);
    } finally {
      set(s => ({ messagesLoading: { ...s.messagesLoading, [conversationId]: false } }));
    }
  },

  appendMessage: (conversationId: string, message: DMMessage) => {
    set(s => ({
      messages: {
        ...s.messages,
        [conversationId]: [...(s.messages[conversationId] || []), message]
      },
      conversations: s.conversations.map(c =>
        c.id === conversationId
          ? { ...c, last_message: message, last_message_at: message.created_at, unread_count: c.unread_count + 1 }
          : c
      )
    }));
  },

  replaceMessage: (conversationId: string, tempId: string, real: DMMessage) => {
    set(s => ({
      messages: {
        ...s.messages,
        [conversationId]: (s.messages[conversationId] || []).map(m => m.id === tempId ? real : m),
      }
    }));
  },

  removeMessage: (conversationId: string, id: string) => {
    set(s => ({
      messages: {
        ...s.messages,
        [conversationId]: (s.messages[conversationId] || []).filter(m => m.id !== id),
      }
    }));
  },

  markRead: (conversationId: string) => {
    set(s => ({
      conversations: s.conversations.map(c =>
        c.id === conversationId ? { ...c, unread_count: 0 } : c
      )
    }));
  },

  reset: () => set({
    conversations: [],
    messages: {},
    conversationsLoading: false,
    messagesLoading: {},
    messageCursors: {}
  })
}));
