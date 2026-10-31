import { create } from 'zustand';
import apiClient from '../utils/apiClient';
import { saveSnap, readSnap } from '../utils/snapshot';
import { useProfileStore } from './profileStore';
import { toast } from '../utils/alert';

export interface SocialNotification {
  id: string;
  type: 'like' | 'comment' | 'repost' | 'mention' | 'follow' | 'follow_request' | 'dm' | 'info' | 'warning' | 'error' | 'baraza_live' | 'quote' | 'invite_joined' | 'milestone';
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
  /** Swipe to remove: local only (the API has no delete for a notification yet), marked read on the server */
  dismiss: (id: string) => void;
  /** Accept / decline a follow request: the row goes at once; it comes back with a toast if the server says no */
  respondToFollowRequest: (n: SocialNotification, kind: 'accept' | 'decline') => Promise<void>;
  markAllRead: () => void;
  markRead: (id: string) => void;
  hydrate: () => Promise<void>;
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
    // Only show loading indicator when there's nothing cached yet
    if (state.notifications.length === 0) set({ isLoading: true });
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
        if (refresh) saveSnap('notifications', fetched);
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

  dismiss: (id: string) => {
    const n = get().notifications.find(x => x.id === id);
    if (n && !n.read) apiClient.markNotificationRead(id).catch(() => {});
    get().removeNotification(id);
  },

  respondToFollowRequest: async (item, kind) => {
    const requestId = item.data?.request_id as string | undefined;
    const fromUserId = (item.data?.from_user_id as string | undefined) || item.fromUserId;
    if (!requestId && !fromUserId) return;
    const snapshot = get().notifications;
    if (!item.read) apiClient.markNotificationRead(item.id).catch(() => {});
    get().removeNotification(item.id);
    const profile = useProfileStore.getState();
    const me = profile.currentUserProfile;
    if (kind === 'accept' && me) profile.updateCurrentUserProfile({ follower_count: (me.follower_count || 0) + 1 });
    const r: any = kind === 'accept'
      ? await apiClient.acceptFollowRequest(requestId, fromUserId).catch(() => null)
      : await apiClient.declineFollowRequest(requestId, fromUserId).catch(() => null);
    if (r?.success || /not found/i.test(r?.error || '')) return;
    // Put the request back
    set({ notifications: snapshot, unreadCount: snapshot.filter(n => !n.read).length });
    if (kind === 'accept') {
      const cur = useProfileStore.getState().currentUserProfile;
      if (cur) useProfileStore.getState().updateCurrentUserProfile({ follower_count: Math.max(0, (cur.follower_count || 0) - 1) });
    }
    toast(kind === 'accept' ? "Couldn't accept" : "Couldn't decline", { kind: 'error' });
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

  hydrate: async () => {
    if (get().notifications.length) return;
    const list = await readSnap<SocialNotification[]>('notifications');
    if (Array.isArray(list) && list.length && !get().notifications.length) {
      set({ notifications: list, unreadCount: list.filter(n => !n.read).length });
    }
  },

  reset: () => set({ notifications: [], unreadCount: 0, isLoading: false, nextCursor: null, hasMore: true }),
}));
