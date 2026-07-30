import { NavLink } from 'react-router-dom'
import {
  House,
  Users,
  Flag,
  ChartLine,
  DeviceMobile,
  Bell,
  Gear,
  ClipboardText,
  ArrowSquareOut,
  SignOut,
  CaretLeft,
  CaretRight,
} from '@phosphor-icons/react'
import { useAuthStore } from '../../stores/authStore'
import { useUiStore } from '../../stores/uiStore'
import { RoleBadge } from '../ui/RoleBadge'
import { UserAvatar } from '../ui/UserAvatar'
import { cn } from '../../lib/utils'
import type { Role } from '../../types'

interface NavItem {
  to: string
  icon: React.ReactNode
  label: string
  minRole: Role
}

const ROLE_LEVELS: Record<Role, number> = {
  support: 1,
  moderator: 2,
  admin: 3,
  super_admin: 4,
}

const NAV: NavItem[] = [
  { to: '/dashboard', icon: <House weight="duotone" size={18} />, label: 'Dashboard', minRole: 'support' },
  { to: '/users', icon: <Users weight="duotone" size={18} />, label: 'Users', minRole: 'support' },
  { to: '/content', icon: <Flag weight="duotone" size={18} />, label: 'Content & Reports', minRole: 'moderator' },
  { to: '/analytics', icon: <ChartLine weight="duotone" size={18} />, label: 'Analytics', minRole: 'admin' },
  { to: '/app', icon: <DeviceMobile weight="duotone" size={18} />, label: 'App Management', minRole: 'admin' },
  { to: '/notifications', icon: <Bell weight="duotone" size={18} />, label: 'Notifications', minRole: 'admin' },
  { to: '/audit', icon: <ClipboardText weight="duotone" size={18} />, label: 'Audit Log', minRole: 'admin' },
  { to: '/settings', icon: <Gear weight="duotone" size={18} />, label: 'Settings', minRole: 'super_admin' },
]

export function Sidebar() {
  const { user, logout } = useAuthStore()
  const { sidebarCollapsed, toggleSidebar } = useUiStore()

  const visibleNav = NAV.filter(item => {
    const userLevel = user ? ROLE_LEVELS[user.role] ?? 0 : 0
    return userLevel >= ROLE_LEVELS[item.minRole]
  })

  return (
    <aside
      className={cn(
        'relative flex flex-col h-screen bg-card border-r border-border transition-all duration-200 ease-in-out shrink-0',
        sidebarCollapsed ? 'w-[60px]' : 'w-[220px]'
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex items-center gap-2.5 h-[56px] border-b border-border shrink-0 px-3',
          sidebarCollapsed && 'justify-center'
        )}
      >
        <div
          className="rounded-xl overflow-hidden shrink-0"
          style={{ width: '32px', height: '32px' }}
        >
          <img
            src="/KchatLogo.png"
            alt="Kiongozi Chat"
            width={32}
            height={32}
            style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
        {!sidebarCollapsed && (
          <div className="min-w-0">
            <span className="block text-[13px] font-bold text-foreground tracking-tight leading-none truncate">
              Kiongozi
            </span>
            <span className="block text-[10px] text-muted-foreground leading-none mt-0.5 tracking-wide uppercase">
              Control Center
            </span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 min-h-0">
        {visibleNav.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-100 cursor-pointer select-none',
                isActive
                  ? 'text-brand bg-brand/8'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                sidebarCollapsed && 'justify-center px-0'
              )
            }
          >
            {({ isActive }) => (
              <>
                {/* Left accent line for active */}
                {isActive && !sidebarCollapsed && (
                  <span
                    className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-brand"
                    aria-hidden="true"
                  />
                )}
                <span className={cn('shrink-0 transition-colors', isActive ? 'text-brand' : 'text-muted-foreground group-hover:text-foreground')}>
                  {item.icon}
                </span>
                {!sidebarCollapsed && (
                  <span className="truncate">{item.label}</span>
                )}
                {sidebarCollapsed && (
                  <div className="pointer-events-none absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 z-50 px-2.5 py-1.5 rounded-md bg-popover border border-border shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-[12px] font-medium text-foreground">
                    {item.label}
                  </div>
                )}
              </>
            )}
          </NavLink>
        ))}

        <div className="border-t border-border my-2 mx-1" />

        <a
          href="https://kiongozi.app"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'group flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-100',
            sidebarCollapsed && 'justify-center px-0'
          )}
        >
          <ArrowSquareOut weight="duotone" size={18} className="shrink-0 transition-colors" />
          {!sidebarCollapsed && <span>View App</span>}
        </a>
      </nav>

      {/* User footer */}
      {user && (
        <div className={cn('border-t border-border p-2.5 shrink-0', sidebarCollapsed && 'px-2')}>
          {sidebarCollapsed ? (
            <div className="flex justify-center">
              <UserAvatar name={user.full_name} src={user.avatar_url} size="sm" />
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <UserAvatar name={user.full_name} src={user.avatar_url} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-foreground truncate leading-tight">{user.full_name}</p>
                <RoleBadge role={user.role} className="mt-0.5" />
              </div>
              <button
                onClick={() => void logout()}
                className="p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                title="Sign out"
              >
                <SignOut size={15} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-[70px] z-10 flex items-center justify-center w-6 h-6 rounded-full bg-card border border-border text-muted-foreground hover:text-foreground hover:border-zinc-600 transition-all shadow-sm"
      >
        {sidebarCollapsed ? <CaretRight size={11} /> : <CaretLeft size={11} />}
      </button>
    </aside>
  )
}
