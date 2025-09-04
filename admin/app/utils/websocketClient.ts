/**
 * WebSocket Client for Kiongozi Platform
 * Provides real-time communication with the API server
 */

import { io, Socket } from 'socket.io-client';

export interface KiongoziNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'security';
  priority: 'low' | 'normal' | 'high' | 'critical';
  data?: any;
  created_at: string;
}

export interface SecurityAlert {
  id: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  metadata?: any;
  timestamp: string;
}

export interface AdminEvent {
  id: string;
  event_type: string;
  description: string;
  metadata?: any;
  timestamp: string;
}

export interface SystemUpdate {
  id: string;
  title: string;
  message: string;
  version?: string;
  maintenance: boolean;
  metadata?: any;
  timestamp: string;
}

class WebSocketClient {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private isConnecting = false;

  // Event handlers
  private eventHandlers: { [event: string]: Function[] } = {};

  constructor() {
    this.setupEventHandlers();
  }

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected || this.isConnecting) {
        resolve();
        return;
      }

      this.isConnecting = true;

      // Get auth token
      const token = this.getAuthToken();
      if (!token) {
        this.isConnecting = false;
        reject(new Error('No authentication token available'));
        return;
      }

      const serverUrl = process.env.NEXT_PUBLIC_API_BASE?.replace('/api/v1', '') || 'http://localhost:3002';

      this.socket = io(serverUrl, {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling'],
        timeout: 10000,
        forceNew: true
      });

      this.socket.on('connect', () => {
        console.log('✅ Connected to WebSocket server');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.emit('connected');
        resolve();
      });

      this.socket.on('connected', (data) => {
        console.log('🔌 WebSocket connection confirmed:', data);
        this.emit('connection_confirmed', data);
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ WebSocket connection error:', error);
        this.isConnecting = false;
        this.handleReconnection();
        reject(error);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('🔌 Disconnected from WebSocket server:', reason);
        this.emit('disconnected', reason);
        if (reason === 'io server disconnect') {
          // Server disconnected us, try to reconnect
          this.handleReconnection();
        }
      });

      // Set up message handlers
      this.setupMessageHandlers();
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnecting = false;
    this.reconnectAttempts = 0;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get authentication token
   */
  private getAuthToken(): string | null {
    if (typeof window !== 'undefined') {
      // Try to get from window object first
      const windowToken = (window as any).supabaseToken;
      if (windowToken) return windowToken;

      // Try localStorage
      const stored = localStorage.getItem('sb-jdncfyagppohtksogzkx-auth-token') || 
                    localStorage.getItem('supabase_token');
      
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          return parsed.access_token || parsed;
        } catch {
          return stored;
        }
      }
    }
    return null;
  }

  /**
   * Handle reconnection logic
   */
  private handleReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('🚫 Max reconnection attempts reached');
      this.emit('max_reconnect_attempts_reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);

    setTimeout(() => {
      if (!this.isConnected()) {
        this.connect().catch((error) => {
          console.error('Reconnection failed:', error);
        });
      }
    }, delay);
  }

  /**
   * Set up message handlers
   */
  private setupMessageHandlers(): void {
    if (!this.socket) return;

    this.socket.on('notification', (notification: KiongoziNotification) => {
      console.log('📨 Received notification:', notification);
      this.emit('notification', notification);
    });

    this.socket.on('security_alert', (alert: SecurityAlert) => {
      console.log('🚨 Received security alert:', alert);
      this.emit('security_alert', alert);
    });

    this.socket.on('admin_event', (event: AdminEvent) => {
      console.log('👨‍💼 Received admin event:', event);
      this.emit('admin_event', event);
    });

    this.socket.on('system_update', (update: SystemUpdate) => {
      console.log('🔄 Received system update:', update);
      this.emit('system_update', update);
    });

    this.socket.on('pong', () => {
      this.emit('pong');
    });
  }

  /**
   * Set up event handlers system
   */
  private setupEventHandlers(): void {
    this.eventHandlers = {
      connected: [],
      connection_confirmed: [],
      disconnected: [],
      max_reconnect_attempts_reached: [],
      notification: [],
      security_alert: [],
      admin_event: [],
      system_update: [],
      pong: []
    };
  }

  /**
   * Add event listener
   */
  on(event: string, handler: Function): void {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(handler);
  }

  /**
   * Remove event listener
   */
  off(event: string, handler?: Function): void {
    if (!this.eventHandlers[event]) return;

    if (handler) {
      this.eventHandlers[event] = this.eventHandlers[event].filter(h => h !== handler);
    } else {
      this.eventHandlers[event] = [];
    }
  }

  /**
   * Emit event to handlers
   */
  private emit(event: string, ...args: any[]): void {
    if (!this.eventHandlers[event]) return;

    this.eventHandlers[event].forEach(handler => {
      try {
        handler(...args);
      } catch (error) {
        console.error(`Error in ${event} handler:`, error);
      }
    });
  }

  /**
   * Admin-specific methods
   */

  // Subscribe to admin events
  subscribeToAdminEvents(): void {
    if (this.socket?.connected) {
      this.socket.emit('subscribe_admin_events');
    }
  }

  // Subscribe to security events
  subscribeToSecurityEvents(): void {
    if (this.socket?.connected) {
      this.socket.emit('subscribe_security_events');
    }
  }

  // Send ping to test connection
  ping(): void {
    if (this.socket?.connected) {
      this.socket.emit('ping');
    }
  }

  // Acknowledge notification
  acknowledgeNotification(notificationId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('notification_ack', { notificationId });
    }
  }
}

// Create singleton instance
const websocketClient = new WebSocketClient();

// Auto-connect when imported (can be disabled if needed)
if (typeof window !== 'undefined') {
  // Connect after a short delay to ensure auth is ready
  setTimeout(() => {
    websocketClient.connect().catch(error => {
      console.log('WebSocket auto-connect failed (this is normal if not authenticated):', error.message);
    });
  }, 1000);
}

export default websocketClient;

// Export convenience methods
export const {
  connect,
  disconnect,
  isConnected,
  on,
  off,
  ping,
  subscribeToAdminEvents,
  subscribeToSecurityEvents,
  acknowledgeNotification
} = websocketClient;