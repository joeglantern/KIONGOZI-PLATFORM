import { create } from 'zustand';
import apiClient from '../utils/apiClient';

export interface SocialNotification {
  id: string;
  type: 'like' | 'comment' | 'repost' | 'mention' | 'follow' | 'follow_request' | 'dm' | 'info' | 'warning' | 'error';
  postId?: string;
  conversationId?: string;
  fromUserId?: string;
  fromUsername?: string;
  fromAvatar?: string;
  message: string;
  read: boolean;
  created_at: string;
  data?: Record<string, any>;
}

/** Map raw DB notification row → SocialNotification */
function mapNotification(raw: any): SocialNotification {
  return {
    id: raw.id,
    type: raw.type ?? 'info',
    postId: raw.data?.post_id ?? undefined,
    conversationId: raw.data?.conversation_id ?? undefined,
    fromUserId: raw.data?.from_user_id ?? undefined,
    fromUsername: raw.data?.from_username ?? undefined,
    fromAvatar: raw.data?.from_avatar_url ?? undefined,
    message: raw.message ?? raw.title ?? '',
    read: raw.read ?? false,
    created_at: raw.created_at,
    data: raw.data,
  };
}

interface NotificationState {
  notifications: SocialNotification[];
  unreadCount: number;
  isLoading: boolean;
  nextCursor: string | null;
  hasMore: boolean;

  fetchNotifications: (refresh?: boolean) => Promise<void>;
  addNotification: (rawOrNotification: any) => void;
  removeNotification: (id: string) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
  reset: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  nextCursor: null,
  hasMore: true,

  fetchNotifications: async (refresh = false) => {
    const state = get();
    if (state.isLoading) return;
    if (!refresh && !state.hasMore) return;
    set({ isLoading: true });
    try {
      const offset = refresh ? 0 : state.notifications.length;
      const res = await apiClient.getNotifications({ limit: 30, offset }) as any;
      if (res.success && Array.isArray(res.data)) {
        const fetched = (res.data as any[]).map(mapNotification);
        const notifications = refresh ? fetched : [...state.notifications, ...fetched];
        set({
          notifications,
          unreadCount: notifications.filter((n: any) => !n.read).length,
          nextCursor: res.nextCursor || null,
          hasMore: fetched.length === 30,
        });
      }
    } catch {}
    set({ isLoading: false });
  },

  addNotification: (raw) => {
    const notification = raw.id && raw.created_at ? mapNotification(raw) : raw as SocialNotification;
    set(s => {
      // Deduplicate: ignore if already in the list (global + screen subscriptions both fire)
      if (s.notifications.some(n => n.id === notification.id)) return s;
      return {
        notifications: [notification, ...s.notifications].slice(0, 100),
        unreadCount: s.unreadCount + (notification.read ? 0 : 1),
      };
    });
  },

  removeNotification: (id: string) => {
    set(s => {
      const notifications = s.notifications.filter(n => n.id !== id);
      return {
        notifications,
        unreadCount: notifications.filter(n => !n.read).length,
      };
    });
  },

  markAllRead: () => {
    apiClient.markAllNotificationsRead().catch(() => {});
    set(s => ({
      notifications: s.notifications.map(n => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },

  markRead: (id) => {
    apiClient.markNotificationRead(id).catch(() => {});
    set(s => {
      const notifications = s.notifications.map(n =>
        n.id === id ? { ...n, read: true } : n
      );
      return {
        notifications,
        unreadCount: notifications.filter(n => !n.read).length,
      };
    });
  },

  reset: () => set({ notifications: [], unreadCount: 0, isLoading: false, nextCursor: null, hasMore: true }),
}));
