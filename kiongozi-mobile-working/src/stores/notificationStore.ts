import { create } from 'zustand';
import apiClient from '../utils/apiClient';

export interface SocialNotification {
  id: string;
  type: 'like' | 'comment' | 'repost' | 'mention' | 'follow' | 'dm' | 'info' | 'warning' | 'error';
  postId?: string;
  fromUserId?: string;
  fromUsername?: string;
  fromAvatar?: string;
  message: string;
  read: boolean;
  created_at: string;
}

/** Map raw DB notification row → SocialNotification */
function mapNotification(raw: any): SocialNotification {
  return {
    id: raw.id,
    type: raw.type ?? 'info',
    postId: raw.data?.post_id ?? undefined,
    fromUserId: raw.data?.from_user_id ?? undefined,
    fromUsername: raw.data?.from_username ?? undefined,
    fromAvatar: raw.data?.from_avatar_url ?? undefined,
    message: raw.title ? `${raw.title}: ${raw.message}` : (raw.message ?? ''),
    read: raw.read ?? false,
    created_at: raw.created_at,
  };
}

interface NotificationState {
  notifications: SocialNotification[];
  unreadCount: number;
  isLoading: boolean;

  fetchNotifications: () => Promise<void>;
  addNotification: (rawOrNotification: any) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
  reset: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const res = await apiClient.getNotifications({ limit: 50 });
      if (res.success && Array.isArray(res.data)) {
        const notifications = (res.data as any[]).map(mapNotification);
        set({
          notifications,
          unreadCount: notifications.filter(n => !n.read).length,
        });
      }
    } catch {}
    set({ isLoading: false });
  },

  addNotification: (raw) => {
    const notification = raw.id && raw.created_at ? mapNotification(raw) : raw as SocialNotification;
    set(s => ({
      notifications: [notification, ...s.notifications].slice(0, 100),
      unreadCount: s.unreadCount + (notification.read ? 0 : 1),
    }));
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

  reset: () => set({ notifications: [], unreadCount: 0, isLoading: false }),
}));
