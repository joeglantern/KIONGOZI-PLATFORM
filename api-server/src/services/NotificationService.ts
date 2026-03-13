import { supabaseServiceClient } from '../config/supabase';
import { sendExpoPush } from './PushService';

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

            const { data: tokenRows } = await supabaseServiceClient
              .from('push_tokens')
              .select('token')
              .eq('user_id', userId);
            const tokens = (tokenRows || []).map((r: any) => r.token);
            if (tokens.length > 0) {
              await sendExpoPush(tokens, title, message, { ...data, type });
            }
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
