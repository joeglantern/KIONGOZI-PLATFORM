import { useLocation } from 'react-router-dom'
import { Bell } from '@phosphor-icons/react'
import { useAuthStore } from '../../stores/authStore'
import { useSocketStore } from '../../stores/socketStore'
import { UserAvatar } from '../ui/UserAvatar'
import { RoleBadge } from '../ui/RoleBadge'

const PAGE_TITLES: Record<string, { title: string; desc: string }> = {
  '/dashboard': { title: 'Dashboard', desc: 'Platform overview and key metrics' },
  '/users': { title: 'Users', desc: 'Manage accounts, roles, and verification' },
  '/content': { title: 'Content & Reports', desc: 'Flagged posts and moderation queue' },
  '/analytics': { title: 'Analytics', desc: 'Growth trends and engagement data' },
  '/app': { title: 'App Management', desc: 'Force update, OTA, and release control' },
  '/notifications': { title: 'Notifications', desc: 'Send push notifications to users' },
  '/audit': { title: 'Audit Log', desc: 'Admin action history and accountability' },
  '/settings': { title: 'Settings', desc: 'Platform configuration and system settings' },
}

export function Header() {
  const { user } = useAuthStore()
  const connected = useSocketStore(s => s.connected)
  const { pathname } = useLocation()
  const page = PAGE_TITLES[pathname] ?? { title: 'Kiongozi Admin', desc: '' }

  return (
    <header className="h-[56px] flex items-center justify-between gap-4 px-5 border-b border-border bg-background/80 backdrop-blur-sm shrink-0">
      <div>
        <h1 className="text-[15px] font-bold text-foreground leading-tight">{page.title}</h1>
        {page.desc && (
          <p className="text-[11px] text-muted-foreground leading-tight hidden sm:block">{page.desc}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Connection status — minimal dot only */}
        <div className="hidden sm:flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-brand animate-pulse' : 'bg-zinc-600'}`}
          />
          <span className={`text-[11px] font-medium ${connected ? 'text-brand' : 'text-zinc-500'}`}>
            {connected ? 'Live' : 'Offline'}
          </span>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <Bell weight="duotone" size={17} />
          </button>
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-brand" />
        </div>

        {/* User */}
        {user && (
          <div className="flex items-center gap-2 pl-3 border-l border-border">
            <UserAvatar name={user.full_name} src={user.avatar_url} size="sm" />
            <div className="hidden md:block">
              <p className="text-[12px] font-semibold text-foreground leading-tight">{user.full_name.split(' ')[0]}</p>
              <RoleBadge role={user.role} />
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
