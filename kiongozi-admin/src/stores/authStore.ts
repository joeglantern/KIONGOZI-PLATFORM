import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'
import { api } from '../api/client'
import type { AdminUser, Role } from '../types'

interface AuthState {
  user: AdminUser | null
  token: string | null
  isAuthenticated: boolean
  _hasHydrated: boolean
  setHasHydrated: (v: boolean) => void
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  hasRole: (required: Role | Role[]) => boolean
}

const ROLE_LEVELS: Record<Role, number> = {
  support: 1,
  moderator: 2,
  admin: 3,
  super_admin: 4,
}

// Map DB roles → admin panel roles
const DB_ROLE_MAP: Record<string, Role> = {
  org_admin: 'super_admin',
  super_admin: 'super_admin',
  admin: 'admin',
  moderator: 'moderator',
  support: 'support',
}

const ALLOWED_DB_ROLES = new Set(['admin', 'org_admin', 'super_admin', 'moderator', 'support'])

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      _hasHydrated: false,
      setHasHydrated: (v) => set({ _hasHydrated: v }),

      login: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error || !data.session) {
          throw new Error(error?.message || 'Login failed')
        }

        const token = data.session.access_token

        // Fetch full profile from API
        const profileRes = await api.get('/api/v1/auth/user', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const profile = profileRes.data?.data

        if (!profile) throw new Error('Could not load user profile')

        const dbRole: string = profile.role || 'user'
        if (!ALLOWED_DB_ROLES.has(dbRole)) {
          await supabase.auth.signOut()
          throw new Error('You do not have admin access to this panel.')
        }

        const role: Role = DB_ROLE_MAP[dbRole] ?? 'support'

        const user: AdminUser = {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name || `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim(),
          username: profile.username || profile.email?.split('@')[0] || 'admin',
          avatar_url: profile.avatar_url,
          role,
          created_at: profile.created_at,
        }

        set({ user, token, isAuthenticated: true })
      },

      logout: async () => {
        await supabase.auth.signOut()
        set({ user: null, token: null, isAuthenticated: false })
      },

      hasRole: (required) => {
        const user = get().user
        if (!user) return false
        const roles = Array.isArray(required) ? required : [required]
        const userLevel = ROLE_LEVELS[user.role] ?? 0
        return roles.some(r => userLevel >= ROLE_LEVELS[r])
      },
    }),
    {
      name: 'kiongozi-admin-auth',
      partialize: s => ({ user: s.user, token: s.token, isAuthenticated: s.isAuthenticated }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)
