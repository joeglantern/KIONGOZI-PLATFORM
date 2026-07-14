import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../utils/apiClient';

const ARCHIVED_KEY = 'dm_archived_ids';

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
  reply_to_id?: string;
  _pending?: boolean;
  _edited?: boolean;
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
  messages: Record<string, DMMessage[]>;
  conversationsLoading: boolean;
  messagesLoading: Record<string, boolean>;
  messageCursors: Record<string, string | null>;
  archivedIds: string[];
  showArchived: boolean;

  fetchConversations: () => Promise<void>;
  fetchMessages: (conversationId: string, refresh?: boolean) => Promise<void>;
  appendMessage: (conversationId: string, message: DMMessage, skipUnreadIncrement?: boolean) => void;
  replaceMessage: (conversationId: string, tempId: string, real: DMMessage) => void;
  removeMessage: (conversationId: string, id: string) => void;
  unsendMessage: (conversationId: string, messageId: string) => Promise<void>;
  updateMessageContent: (conversationId: string, messageId: string, content: string) => Promise<void>;
  markRead: (conversationId: string) => void;
  archiveConversation: (id: string) => Promise<void>;
  unarchiveConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  setShowArchived: (v: boolean) => void;
  loadPersistedDMState: () => Promise<void>;
  reset: () => void;
}

export const useDMStore = create<DMState>((set, get) => ({
  conversations: [],
  messages: {},
  conversationsLoading: false,
  messagesLoading: {},
  messageCursors: {},
  archivedIds: [],
  showArchived: false,

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

  appendMessage: (conversationId: string, message: DMMessage, skipUnreadIncrement = false) => {
    set(s => ({
      messages: {
        ...s.messages,
        [conversationId]: [...(s.messages[conversationId] || []), message]
      },
      conversations: s.conversations.map(c =>
        c.id === conversationId
          ? {
              ...c,
              last_message: message,
              last_message_at: message.created_at,
              unread_count: skipUnreadIncrement ? c.unread_count : c.unread_count + 1,
            }
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

  unsendMessage: async (conversationId: string, messageId: string) => {
    get().removeMessage(conversationId, messageId);
    try {
      await apiClient.deleteDMMessage(conversationId, messageId);
    } catch {
      // Optimistic delete — silently ignore if backend isn't ready yet
    }
  },

  updateMessageContent: async (conversationId: string, messageId: string, content: string) => {
    set(s => ({
      messages: {
        ...s.messages,
        [conversationId]: (s.messages[conversationId] || []).map(m =>
          m.id === messageId ? { ...m, content, _edited: true } : m
        ),
      }
    }));
    try {
      await apiClient.editDMMessage(conversationId, messageId, content);
    } catch {
      // Optimistic edit — silently ignore if backend isn't ready yet
    }
  },

  markRead: (conversationId: string) => {
    set(s => ({
      conversations: s.conversations.map(c =>
        c.id === conversationId ? { ...c, unread_count: 0 } : c
      )
    }));
  },

  archiveConversation: async (id: string) => {
    const next = [...new Set([...get().archivedIds, id])];
    set({ archivedIds: next });
    await AsyncStorage.setItem(ARCHIVED_KEY, JSON.stringify(next));
  },

  unarchiveConversation: async (id: string) => {
    const next = get().archivedIds.filter(x => x !== id);
    set({ archivedIds: next });
    await AsyncStorage.setItem(ARCHIVED_KEY, JSON.stringify(next));
  },

  deleteConversation: async (id: string) => {
    // Remove from server — user leaves the conversation so a new one is created next time
    try { await apiClient.deleteDMConversation(id); } catch {}
    // Remove from local state immediately
    const nextArchived = get().archivedIds.filter(x => x !== id);
    set(s => ({
      conversations: s.conversations.filter(c => c.id !== id),
      messages: Object.fromEntries(Object.entries(s.messages).filter(([k]) => k !== id)),
      archivedIds: nextArchived,
    }));
    await AsyncStorage.setItem(ARCHIVED_KEY, JSON.stringify(nextArchived));
  },

  setShowArchived: (v: boolean) => set({ showArchived: v }),

  loadPersistedDMState: async () => {
    try {
      const archived = await AsyncStorage.getItem(ARCHIVED_KEY);
      set({ archivedIds: archived ? JSON.parse(archived) : [] });
    } catch {}
  },

  reset: () => set({
    conversations: [],
    messages: {},
    conversationsLoading: false,
    messagesLoading: {},
    messageCursors: {},
    archivedIds: [],
    showArchived: false,
  })
}));
