import { supabaseServiceClient } from '../config/supabase';
import { sendExpoPush, isQuietHours } from './PushService';

const GROUP_WINDOW_MS = 20 * 60 * 1000;
// Types whose pushes are grouped, with the text after the person's name
const GROUPABLE: Partial<Record<string, string>> = {
  like: ' liked your post',
  repost: ' reposted your post',
  follow: ' started following you',
};

interface NotifyParams {
  userId: string;   // recipient
  type: 'like' | 'repost' | 'comment' | 'follow' | 'follow_request' | 'mention' | 'dm';
  title: string;
  message: string;
  data?: Record<string, any>;
  /** @deprecated Pass io via setIo() at startup instead */
  io?: any;
}

const MAX_RETRIES = 2;

class NotificationService {
  private io: any = null;

  // Grouping (Instagram style): the first like/repost/follow pushes at once; more of the same kind
  // within 20 minutes become one "Amina and 4 others liked your post" push when the window closes.
  private windows = new Map<string, { count: number; lastActor: string | null; title: string; data: any }>();

  private async tokens(userId: string) {
    const { data } = await supabaseServiceClient.from('push_tokens').select('token').eq('user_id', userId);
    return (data || []).map((r: any) => r.token);
  }

  /** Unread notifications (one per unread chat, since DM notifications are replaced per chat) */
  private async badge(userId: string) {
    const { count } = await supabaseServiceClient
      .from('social_notifications').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('read', false);
    return count ?? undefined;
  }

  private async push(userId: string, type: NotifyParams['type'], title: string, message: string, data: any) {
    const silent = type !== 'dm' && isQuietHours();
    const suffix = GROUPABLE[type];
    if (!suffix) {
      await sendExpoPush(await this.tokens(userId), title, message, data, { silent, badge: await this.badge(userId) });
      return;
    }
    const key = `${userId}:${type}:${data?.post_id || ''}`;
    const actor = message.endsWith(suffix) ? message.slice(0, -suffix.length) : null;
    const open = this.windows.get(key);
    if (open) { open.count++; open.lastActor = actor; open.data = data; return; }

    this.windows.set(key, { count: 0, lastActor: null, title, data });
    await sendExpoPush(await this.tokens(userId), title, message, data, { silent, badge: await this.badge(userId) });
    setTimeout(async () => {
      const w = this.windows.get(key);
      this.windows.delete(key);
      if (!w || w.count === 0) return;
      const others = w.count - 1;
      const who = w.lastActor ? (others > 0 ? `${w.lastActor} and ${others} other${others === 1 ? '' : 's'}` : w.lastActor) : `${w.count} more people`;
      await sendExpoPush(await this.tokens(userId), w.title, `${who}${suffix}`, w.data, { silent: isQuietHours(), badge: await this.badge(userId) }).catch(() => {});
    }, GROUP_WINDOW_MS).unref?.();
  }

  /** Call once at server startup with the Socket.IO server instance. */
  setIo(io: any): void {
    this.io = io;
  }

  async notify({ userId, type, title, message, data = {}, io }: NotifyParams): Promise<void> {
    // Accept io from param (legacy) or fall back to the singleton set at startup
    const ioInstance = io ?? this.io;
    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const { data: notification, error } = await supabaseServiceClient
          .from('social_notifications')
          .insert({ user_id: userId, type, title, message, data, read: false })
          .select()
          .single();

        if (error) {
          lastError = error;
          console.error(`NotificationService DB error (attempt ${attempt + 1}):`, error.message);
          continue;
        }

        if (notification && ioInstance) {
          ioInstance.to(`user:${userId}`).emit('notification', notification);
        }

        // Send push notification (non-blocking, non-critical)
        setImmediate(async () => {
          try {
            // Skip push if the sender is muted by the recipient
            if (data?.from_user_id) {
              const { data: muteRow } = await supabaseServiceClient
                .from('mutes')
                .select('id')
                .eq('muter_id', userId)
                .eq('muted_id', data.from_user_id)
                .maybeSingle();
              if (muteRow) return; // sender is muted — skip push, in-app notification already written
            }

            await this.push(userId, type, title, message, { ...data, type });
          } catch (pushErr) {
            console.error('Push send error:', pushErr);
          }
        });
        return; // success — exit retry loop
      } catch (e) {
        lastError = e;
        console.error(`NotificationService unexpected error (attempt ${attempt + 1}):`, e);
      }
    }

    // All retries exhausted
    console.error('NotificationService: failed to deliver notification after retries', {
      userId,
      type,
      title,
      error: lastError,
    });
  }
}

export default new NotificationService();
