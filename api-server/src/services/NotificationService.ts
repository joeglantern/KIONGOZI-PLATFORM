import { supabaseServiceClient } from '../config/supabase';

interface NotifyParams {
  userId: string;   // recipient
  type: 'like' | 'repost' | 'comment' | 'follow' | 'mention' | 'dm';
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
