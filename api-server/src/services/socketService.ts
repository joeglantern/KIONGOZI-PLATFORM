import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface AuthenticatedSocket extends SocketIOServer {
  userId?: string;
  userRole?: string;
}

class SocketService {
  private io: SocketIOServer;
  private connectedUsers: Map<string, string[]> = new Map(); // userId -> socketIds[]

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3002'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket: any, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        
        // Get user details from database
        const { data: user, error } = await supabase
          .from('profiles')
          .select('id, role')
          .eq('id', decoded.userId)
          .single();

        if (error || !user) {
          return next(new Error('Authentication error: Invalid user'));
        }

        socket.userId = user.id;
        socket.userRole = user.role;
        next();
      } catch (error) {
        next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: any) => {
      console.log(`User ${socket.userId} connected`);

      // Join user-specific room
      socket.join(`user:${socket.userId}`);
      
      // Join role-specific room
      if (socket.userRole) {
        socket.join(`role:${socket.userRole}`);
      }

      // Track connected users
      const userSockets = this.connectedUsers.get(socket.userId) || [];
      userSockets.push(socket.id);
      this.connectedUsers.set(socket.userId, userSockets);

      // Send connection confirmation
      socket.emit('connected', {
        message: 'Successfully connected to real-time updates',
        userId: socket.userId,
        role: socket.userRole
      });

      // Handle ping/pong for connection health
      socket.on('ping', () => {
        socket.emit('pong');
      });

      // Handle notification acknowledgment
      socket.on('notification_ack', async (data: { notificationId: string }) => {
        try {
          await supabase
            .from('notifications')
            .update({ read: true, read_at: new Date().toISOString() })
            .eq('id', data.notificationId)
            .eq('user_id', socket.userId);
        } catch (error) {
          console.error('Failed to acknowledge notification:', error);
        }
      });

      // Handle admin events subscription
      socket.on('subscribe_admin_events', () => {
        if (socket.userRole === 'admin') {
          socket.join('admin_events');
          console.log(`Admin ${socket.userId} subscribed to admin events`);
        }
      });

      // Handle security events subscription
      socket.on('subscribe_security_events', () => {
        if (socket.userRole === 'admin') {
          socket.join('security_events');
          console.log(`Admin ${socket.userId} subscribed to security events`);
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`User ${socket.userId} disconnected`);
        
        // Remove from connected users
        const userSockets = this.connectedUsers.get(socket.userId) || [];
        const updatedSockets = userSockets.filter(id => id !== socket.id);
        
        if (updatedSockets.length === 0) {
          this.connectedUsers.delete(socket.userId);
        } else {
          this.connectedUsers.set(socket.userId, updatedSockets);
        }
      });
    });
  }

  // Public methods for sending notifications
  public sendNotificationToUser(userId: string, notification: any) {
    this.io.to(`user:${userId}`).emit('notification', notification);
  }

  public sendNotificationToRole(role: string, notification: any) {
    this.io.to(`role:${role}`).emit('notification', notification);
  }

  public sendSecurityAlert(alert: any) {
    this.io.to('security_events').emit('security_alert', alert);
    this.io.to('role:admin').emit('notification', {
      id: `security_${Date.now()}`,
      title: 'Security Alert',
      message: alert.message,
      type: 'security',
      priority: 'high',
      data: alert,
      created_at: new Date().toISOString()
    });
  }

  public sendAdminEvent(event: any) {
    this.io.to('admin_events').emit('admin_event', event);
  }

  public broadcastSystemUpdate(update: any) {
    this.io.emit('system_update', update);
  }

  public getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  public getConnectedUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  public isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  public getSocketServer(): SocketIOServer {
    return this.io;
  }
}

export default SocketService;