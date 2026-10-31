import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../utils/apiClient';
import { saveSnap, readSnap } from '../utils/snapshot';
import { queuedDMs } from '../utils/outbox';
import { toast, withUndo } from '../utils/alert';
import { supabase } from '../utils/supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

/** Messages still waiting in the outbox, added after what the server/snapshot returned */
function withQueued(conversationId: string, list: DMMessage[]): DMMessage[] {
  const have = new Set(list.map(m => m.id));
  const extra = queuedDMs(conversationId)
    .filter(j => !have.has(j.tempId))
    .map(j => ({
      id: j.tempId, conversation_id: j.conversationId, sender_id: j.senderId,
      content: j.content || undefined, media_url: j.mediaUrl || j.mediaUri,
      media_type: (j.mediaUri || j.mediaUrl) ? (j.mediaType || 'image') : undefined,
      duration_ms: j.durationMs,
      reply_to_id: j.replyToId, is_read: false, created_at: j.createdAt, _pending: true,
    } as DMMessage));
  return extra.length ? [...list, ...extra] : list;
}

// Offline: chats list + the last 40 messages of each chat are kept on the phone
const persistConvs = () => saveSnap('dm.convs', useDMStore.getState().conversations);
const persistMsgs = (id: string) =>
  saveSnap(`dm.msgs.${id}`, (useDMStore.getState().messages[id] || []).filter(m => !m._pending).slice(-40));

const ARCHIVED_KEY = 'dm_archived_ids';
const PINNED_KEY = 'dm_pinned_ids';
const MUTED_KEY = 'dm_muted_ids';

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
  media_type?: 'image' | 'video' | 'audio';
  /** voice notes */
  duration_ms?: number | null;
  /** voice notes: written by the server; '' = nothing to show */
  transcript?: string | null;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  sender?: DMParticipant;
  reply_to_id?: string;
  _pending?: boolean;
  /** The server refused it: shown as 'Not sent · Tap to retry' */
  _failed?: boolean;
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
  /** Chats kept at the top of the list (on this phone) */
  pinnedIds: string[];
  /** Chats whose time and badge stay grey (on this phone) */
  mutedIds: string[];
  showArchived: boolean;
  /** Unsent text per chat (WhatsApp "Draft:"), kept across restarts */
  drafts: Record<string, string>;
  /** Chats where the other person is typing right now (cleared 4s after the last beat) */
  typing: Record<string, true>;

  setDraft: (conversationId: string, text: string) => void;
  hydrateMessages: (conversationId: string) => Promise<void>;
  fetchConversations: () => Promise<void>;
  fetchMessages: (conversationId: string, refresh?: boolean) => Promise<void>;
  appendMessage: (conversationId: string, message: DMMessage, skipUnreadIncrement?: boolean) => void;
  replaceMessage: (conversationId: string, tempId: string, real: DMMessage) => void;
  removeMessage: (conversationId: string, id: string) => void;
  markMessageFailed: (conversationId: string, id: string) => void;
  unsendMessage: (conversationId: string, messageId: string) => Promise<void>;
  updateMessageContent: (conversationId: string, messageId: string, content: string) => Promise<void>;
  markRead: (conversationId: string) => void;
  archiveConversation: (id: string) => Promise<void>;
  unarchiveConversation: (id: string) => Promise<void>;
  togglePin: (id: string) => void;
  toggleMute: (id: string) => void;
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
  pinnedIds: [],
  mutedIds: [],
  showArchived: false,
  drafts: {},
  typing: {},

  setDraft: (conversationId, text) => {
    const cur = get().drafts[conversationId] || '';
    if (cur === text) return;
    const drafts = { ...get().drafts };
    if (text.trim()) drafts[conversationId] = text; else delete drafts[conversationId];
    set({ drafts });
    saveSnap('dm.drafts', drafts, 500);
  },

  hydrateMessages: async (conversationId) => {
    if (get().messages[conversationId]?.length) return;
    const saved = await readSnap<DMMessage[]>(`dm.msgs.${conversationId}`);
    const list = withQueued(conversationId, Array.isArray(saved) ? saved : []);
    if (list.length && !get().messages[conversationId]?.length) {
      set(s => ({ messages: { ...s.messages, [conversationId]: list } }));
    }
  },

  fetchConversations: async () => {
    // Only show the loading spinner on the very first fetch (no cached data yet).
    // Subsequent refreshes happen silently in the background.
    const hasCached = get().conversations.length > 0;
    if (!hasCached) set({ conversationsLoading: true });
    try {
      const res = await apiClient.getDMConversations();
      if (res.success && res.data) {
        set({ conversations: res.data });
        persistConvs();
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
              ? withQueued(conversationId, [
                  ...(res.data as DMMessage[]),
                  // keep messages that failed to send so they can be retried
                  ...(s.messages[conversationId] || []).filter(m => m._failed),
                ])
              : [...(res.data as DMMessage[]), ...(s.messages[conversationId] || [])]
          },
          messageCursors: { ...s.messageCursors, [conversationId]: (res as any).nextCursor || null }
        }));
        if (refresh) persistMsgs(conversationId);
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
    if (!message._pending) { persistMsgs(conversationId); persistConvs(); }
  },

  replaceMessage: (conversationId: string, tempId: string, real: DMMessage) => {
    set(s => ({
      messages: {
        ...s.messages,
        [conversationId]: (s.messages[conversationId] || []).map(m => m.id === tempId ? real : m),
      },
      conversations: s.conversations.map(c => c.id === conversationId ? { ...c, last_message: real, last_message_at: real.created_at } : c),
    }));
    persistMsgs(conversationId);
    persistConvs();
  },

  markMessageFailed: (conversationId: string, id: string) => {
    set(s => ({
      messages: {
        ...s.messages,
        [conversationId]: (s.messages[conversationId] || []).map(m => m.id === id ? { ...m, _pending: false, _failed: true } : m),
      },
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

  // Unsend: the message goes at once; it comes back with a toast if the server says no
  unsendMessage: async (conversationId: string, messageId: string) => {
    const before = get().messages[conversationId] || [];
    get().removeMessage(conversationId, messageId);
    persistMsgs(conversationId);
    const r: any = await apiClient.deleteDMMessage(conversationId, messageId).catch(() => null);
    if (r?.success || /not found/i.test(r?.error || '')) return;
    set(s => ({ messages: { ...s.messages, [conversationId]: before } }));
    persistMsgs(conversationId);
    toast("Couldn't unsend", { kind: 'error' });
  },

  // Edit: the new text shows at once; the old text comes back with a toast if the server says no
  updateMessageContent: async (conversationId: string, messageId: string, content: string) => {
    const old = (get().messages[conversationId] || []).find(m => m.id === messageId);
    set(s => ({
      messages: {
        ...s.messages,
        [conversationId]: (s.messages[conversationId] || []).map(m =>
          m.id === messageId ? { ...m, content, _edited: true } : m
        ),
      }
    }));
    const r: any = await apiClient.editDMMessage(conversationId, messageId, content).catch(() => null);
    if (r?.success) { persistMsgs(conversationId); return; }
    if (old) {
      set(s => ({
        messages: {
          ...s.messages,
          [conversationId]: (s.messages[conversationId] || []).map(m => (m.id === messageId ? old : m)),
        }
      }));
    }
    toast("Couldn't edit", { kind: 'error' });
  },

  // Read: the badge clears at once; the server is told in the background
  markRead: (conversationId: string) => {
    set(s => ({
      conversations: s.conversations.map(c =>
        c.id === conversationId ? { ...c, unread_count: 0 } : c
      )
    }));
    apiClient.markDMRead(conversationId).catch(() => {});
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

  // Pin / mute live on this phone only: they flip at once and are saved in the background
  togglePin: (id: string) => {
    const on = get().pinnedIds.includes(id);
    const next = on ? get().pinnedIds.filter(x => x !== id) : [...get().pinnedIds, id];
    set({ pinnedIds: next });
    AsyncStorage.setItem(PINNED_KEY, JSON.stringify(next)).catch(() => {});
  },

  toggleMute: (id: string) => {
    const on = get().mutedIds.includes(id);
    const next = on ? get().mutedIds.filter(x => x !== id) : [...get().mutedIds, id];
    set({ mutedIds: next });
    AsyncStorage.setItem(MUTED_KEY, JSON.stringify(next)).catch(() => {});
  },

  // Delete: the chat leaves the list at once with "Chat deleted · Undo"; the server is told
  // (you leave the conversation, a new one is created next time) once the Undo window closes
  deleteConversation: async (id: string) => {
    const snap = { conversations: get().conversations, messages: get().messages, archivedIds: get().archivedIds };
    const saveArchived = (ids: string[]) => AsyncStorage.setItem(ARCHIVED_KEY, JSON.stringify(ids)).catch(() => {});
    withUndo('Chat deleted', {
      hide: () => {
        const nextArchived = get().archivedIds.filter(x => x !== id);
        set(s => ({
          conversations: s.conversations.filter(c => c.id !== id),
          messages: Object.fromEntries(Object.entries(s.messages).filter(([k]) => k !== id)),
          archivedIds: nextArchived,
        }));
        saveArchived(nextArchived);
        persistConvs();
      },
      restore: () => {
        set(s => ({
          conversations: s.conversations.some(c => c.id === id) ? s.conversations : [...s.conversations, ...snap.conversations.filter(c => c.id === id)]
            .sort((a, b) => new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime()),
          messages: snap.messages[id] ? { ...s.messages, [id]: snap.messages[id] } : s.messages,
          archivedIds: snap.archivedIds.includes(id) ? [...new Set([...s.archivedIds, id])] : s.archivedIds,
        }));
        saveArchived(get().archivedIds);
        persistConvs();
      },
      commit: async () => {
        const r: any = await apiClient.deleteDMConversation(id);
        if (!r?.success && !/not found/i.test(r?.error || '')) throw new Error(r?.error || 'Delete failed');
      },
    });
  },

  setShowArchived: (v: boolean) => set({ showArchived: v }),

  loadPersistedDMState: async () => {
    try {
      const [archived, pinned, muted, convs, drafts] = await Promise.all([
        AsyncStorage.getItem(ARCHIVED_KEY),
        AsyncStorage.getItem(PINNED_KEY),
        AsyncStorage.getItem(MUTED_KEY),
        readSnap<DMConversation[]>('dm.convs'),
        readSnap<Record<string, string>>('dm.drafts'),
      ]);
      const ids = (raw: string | null) => { try { const v = raw ? JSON.parse(raw) : []; return Array.isArray(v) ? v : []; } catch { return []; } };
      set(s => ({
        archivedIds: ids(archived),
        pinnedIds: ids(pinned),
        mutedIds: ids(muted),
        conversations: s.conversations.length || !Array.isArray(convs) ? s.conversations : convs,
        drafts: drafts && typeof drafts === 'object' ? drafts : s.drafts,
      }));
    } catch {}
  },

  reset: () => set({
    conversations: [],
    messages: {},
    conversationsLoading: false,
    messagesLoading: {},
    messageCursors: {},
    archivedIds: [],
    pinnedIds: [],
    mutedIds: [],
    showArchived: false,
    drafts: {},
    typing: {},
  })
}));

// ─── "typing…" in the chats list ─────────────────────────────────────────────
// The open chat broadcasts typing on its own channel (dm-conv-<id>) and on the other person's
// inbox (dm-inbox-<their id>). The list listens on my inbox: one channel for every row, and it
// never shares a topic with the chat screen (realtime-js tears down every channel on a topic
// together, so two screens on one topic would cut each other off).
const typingTimers: Record<string, ReturnType<typeof setTimeout>> = {};
let inbox: RealtimeChannel | null = null;
let inboxUsers = 0;

function setTyping(conversationId: string, on: boolean) {
  if (typingTimers[conversationId]) { clearTimeout(typingTimers[conversationId]); delete typingTimers[conversationId]; }
  const cur = useDMStore.getState().typing;
  if (on) {
    if (!cur[conversationId]) useDMStore.setState({ typing: { ...cur, [conversationId]: true } });
    typingTimers[conversationId] = setTimeout(() => setTyping(conversationId, false), 4000);
  } else if (cur[conversationId]) {
    const next = { ...cur };
    delete next[conversationId];
    useDMStore.setState({ typing: next });
  }
}

/** Mount this from the chats list; returns the detach function. Shared when the list is open in several tabs. */
export function attachTypingInbox(myId: string): () => void {
  inboxUsers++;
  if (!inbox) {
    inbox = supabase
      .channel(`dm-inbox-${myId}`)
      .on('broadcast', { event: 'typing' }, ({ payload }: any) => {
        const id = payload?.conversation_id;
        if (!id || payload.user_id === myId) return;
        setTyping(String(id), !!payload.on);
      })
      .subscribe();
  }
  return () => {
    if (--inboxUsers > 0) return;
    inboxUsers = 0;
    if (inbox) supabase.removeChannel(inbox);
    inbox = null;
    Object.keys(typingTimers).forEach(k => { clearTimeout(typingTimers[k]); delete typingTimers[k]; });
    if (Object.keys(useDMStore.getState().typing).length) useDMStore.setState({ typing: {} });
  };
}

/** Called by the open chat when a message from them arrives: they are no longer typing */
export const clearTyping = (conversationId: string) => setTyping(conversationId, false);
