import { create } from 'zustand';

export interface SocialNotification {
  id: string;
  type: 'like' | 'comment' | 'repost' | 'mention' | 'follow' | 'dm';
  postId?: string;
  fromUserId?: string;
  fromUsername?: string;
  fromAvatar?: string;
  message: string;
  read: boolean;
  created_at: string;
}

interface NotificationState {
  notifications: SocialNotification[];
  unreadCount: number;

  addNotification: (notification: SocialNotification) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
  reset: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (notification) => {
    set(s => ({
      notifications: [notification, ...s.notifications].slice(0, 100),
      unreadCount: s.unreadCount + (notification.read ? 0 : 1)
    }));
  },

  markAllRead: () => {
    set(s => ({
      notifications: s.notifications.map(n => ({ ...n, read: true })),
      unreadCount: 0
    }));
  },

  markRead: (id) => {
    set(s => {
      const notifications = s.notifications.map(n =>
        n.id === id ? { ...n, read: true } : n
      );
      return {
        notifications,
        unreadCount: notifications.filter(n => !n.read).length
      };
    });
  },

  reset: () => set({ notifications: [], unreadCount: 0 })
}));
