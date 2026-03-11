import { supabaseServiceClient } from '../config/supabase';

interface NotifyParams {
  userId: string;   // recipient
  type: 'like' | 'repost' | 'comment' | 'follow' | 'mention' | 'dm';
  title: string;
  message: string;
  data?: Record<string, any>;
  io?: any;
}

class NotificationService {
  async notify({ userId, type, title, message, data = {}, io }: NotifyParams): Promise<void> {
    try {
      const { data: notification, error } = await supabaseServiceClient
        .from('notifications')
        .insert({ user_id: userId, type, title, message, data, read: false })
        .select()
        .single();
      if (!error && notification && io) {
        io.to(`user:${userId}`).emit('notification', notification);
      }
    } catch (e) {
      console.error('NotificationService error:', e);
    }
  }
}

export default new NotificationService();
