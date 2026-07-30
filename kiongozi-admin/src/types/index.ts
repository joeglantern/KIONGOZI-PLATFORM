export type Role = 'super_admin' | 'admin' | 'moderator' | 'support'

export interface AdminUser {
  id: string
  email: string
  full_name: string
  username: string
  avatar_url?: string
  role: Role
  created_at: string
}

export interface AppUser {
  id: string
  email: string
  full_name: string | null
  username: string | null
  avatar_url?: string | null
  banner_url?: string | null
  bio?: string | null
  role: string  // DB values: 'user' | 'admin' | 'org_admin' | 'moderator' | 'content_editor' | 'analyst' | 'researcher'
  status: 'active' | 'inactive' | 'banned' | 'pending'
  is_verified: boolean
  is_private?: boolean
  follower_count: number
  following_count: number
  post_count: number
  created_at: string
  updated_at?: string
  last_login_at?: string | null
  banned_at?: string | null
  ban_reason?: string | null
}

export interface Post {
  id: string
  user_id: string
  content: string
  like_count: number
  comment_count: number
  repost_count: number
  view_count: number
  created_at: string
  profiles: { full_name: string; username: string; avatar_url?: string }
  is_flagged?: boolean
  flag_reason?: string
}

export interface Report {
  id: string
  post_id?: string
  reported_user_id?: string
  reporter_id: string
  reason: string
  status: 'pending' | 'resolved' | 'dismissed'
  created_at: string
  post?: Post
  reported_user?: AppUser
  reporter?: AppUser
}

export interface DashboardStats {
  totalUsers: number
  activeUsers: number
  totalConversations: number
  totalMessages: number
  bannedUsers: number
  recentRegistrations: number
  timestamp: string
}

export interface AnalyticsPoint {
  date: string
  users: number
  posts: number
  active: number
}

// Maps to the system_logs table (GET /api/v1/admin/logs)
export interface SystemLog {
  id: string
  level: 'debug' | 'info' | 'warning' | 'error' | 'success'
  category: string
  message: string
  details?: Record<string, unknown> | null
  user_id?: string | null
  conversation_id?: string | null
  ip_address?: string | null
  user_agent?: string | null
  stack_trace?: string | null
  resolved_at?: string | null
  resolved_by?: string | null
  created_at: string
}

// Legacy alias kept for any remaining references
export type AuditLog = SystemLog

export interface NotificationPayload {
  title: string
  body: string
  target: 'all' | 'android' | 'ios' | 'user'
  user_id?: string
}

export interface AppConfig {
  android: {
    min_version_code: number
    force_update_required: boolean
    store_url: string
  }
  ios: {
    min_build_number: number
    force_update_required: boolean
    store_url: string
  }
  force_update_message: string
}
