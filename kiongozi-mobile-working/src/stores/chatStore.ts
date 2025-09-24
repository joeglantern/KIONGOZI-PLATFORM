import { create } from 'zustand';

export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp?: string;
  type?: string;
}

export interface Conversation {
  id: string;
  title?: string;
  messages: Message[];
  created_at?: string;
  updated_at?: string;
}

interface ChatState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  setConversations: (conversations: Conversation[]) => void;
  setCurrentConversation: (conversation: Conversation | null) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (conversationId: string, updates: Partial<Conversation>) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  currentConversation: null,

  setConversations: (conversations) => {
    set({ conversations });
  },

  setCurrentConversation: (conversation) => {
    set({ currentConversation: conversation });
  },

  addConversation: (conversation) => {
    set((state) => ({
      conversations: [conversation, ...state.conversations]
    }));
  },

  updateConversation: (conversationId, updates) => {
    set((state) => ({
      conversations: state.conversations.map(conv =>
        conv.id === conversationId ? { ...conv, ...updates } : conv
      ),
      currentConversation: state.currentConversation?.id === conversationId
        ? { ...state.currentConversation, ...updates }
        : state.currentConversation
    }));
  },
}));