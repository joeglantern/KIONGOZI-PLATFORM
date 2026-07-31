import axios from 'axios'

const API_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || 'https://api.kiongozi.org')

export const api = axios.create({ baseURL: API_URL })

api.interceptors.request.use(cfg => {
  try {
    const raw = localStorage.getItem('kiongozi-admin-auth')
    if (raw) {
      const token = JSON.parse(raw)?.state?.token
      if (token) cfg.headers.Authorization = `Bearer ${token}`
    }
  } catch {}
  return cfg
})

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('kiongozi-admin-auth')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ─── Users ───────────────────────────────────────────────────────────────────
export const getUsers = (params?: { search?: string; page?: number; limit?: number; status?: string; role?: string }) =>
  api.get('/api/v1/admin/users', { params }).then(r => r.data?.data ?? r.data)

// status: 'banned' | 'active' | 'inactive'
export const setUserStatus = (id: string, status: 'banned' | 'active' | 'inactive', reason?: string) =>
  api.patch(`/api/v1/admin/users/${id}/status`, { status, reason }).then(r => r.data)

export const banUser   = (id: string, reason?: string) => setUserStatus(id, 'banned', reason)
export const unbanUser = (id: string) => setUserStatus(id, 'active')

export const verifyUser   = (id: string) => api.patch(`/api/v1/admin/users/${id}/verify`).then(r => r.data)
export const unverifyUser = (id: string) => api.delete(`/api/v1/admin/users/${id}/verify`).then(r => r.data)

export const updateUserRole = (id: string, role: string) =>
  api.patch(`/api/v1/admin/users/${id}/role`, { role }).then(r => r.data)

export const createUser = (payload: { email: string; full_name: string; password: string; role?: string }) =>
  api.post('/api/v1/admin/users', payload).then(r => r.data)

export const getUserDetail = (id: string) =>
  api.get(`/api/v1/admin/users/${id}`).then(r => r.data?.data ?? r.data)

// ─── Dashboard & analytics ────────────────────────────────────────────────────
export const getDashboardStats = () =>
  api.get('/api/v1/admin/dashboard/stats').then(r => r.data?.data ?? r.data)

export const getAnalytics = (range: '7d' | '30d' | '90d') =>
  api.get('/api/v1/admin/analytics', { params: { range } }).then(r => (r.data?.data?.points ?? []) as AnalyticsPoint[])

// ─── System logs (mapped to audit log UI) ────────────────────────────────────
export const getAuditLogs = (params?: { page?: number; limit?: number; level?: string; category?: string; startDate?: string; endDate?: string }) =>
  api.get('/api/v1/admin/logs', { params: { ...params, limit: params?.limit ?? 25 } }).then(r => r.data?.data ?? r.data)

// ─── App config (public read via health, admin write) ────────────────────────
export const getAppConfig = () =>
  api.get('/api/v1/health/app-config').then(r => r.data?.data ?? r.data)
export const updateAppConfig = (data: Record<string, unknown>) =>
  api.patch('/api/v1/admin/app-config', data).then(r => r.data)

// ─── Live connections ─────────────────────────────────────────────────────────
export const getConnectedUsers = () =>
  api.get('/api/v1/websocket/connected-users').then(r => r.data?.data ?? r.data)

// ─── Content / reports ────────────────────────────────────────────────────────
export const getReports = (params?: { status?: string; limit?: number }) =>
  api.get('/api/v1/admin/reports', { params }).then(r => r.data?.data ?? [])
export const resolveReport = (id: string, action: string) =>
  api.post(`/api/v1/admin/reports/${id}/resolve`, { action }).then(r => r.data)
export const getFlaggedPosts = (params?: { limit?: number }) =>
  api.get('/api/v1/admin/content/flagged', { params }).then(r => r.data?.data ?? [])
export const removePost = (id: string) =>
  api.delete(`/api/v1/admin/posts/${id}`).then(r => r.data)

// ─── Notifications (not yet on backend) ──────────────────────────────────────
export const sendPushNotification = (payload: { title: string; body: string; target: string; user_id?: string }) =>
  api.post('/api/v1/admin/notifications/push', payload).then(r => r.data)

// ─── Health ───────────────────────────────────────────────────────────────────
export const getHealthDetailed = () =>
  api.get('/api/v1/health/detailed').then(r => r.data)

export interface AnalyticsPoint {
  date: string
  newUsers: number
  activeUsers: number
  messages: number
}
