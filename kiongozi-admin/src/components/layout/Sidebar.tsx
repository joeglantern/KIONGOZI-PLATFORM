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
  SignOut,
  CaretLeft,
  CaretRight,
  X,
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
  const { sidebarCollapsed, toggleSidebar, mobileSidebarOpen, setMobileSidebarOpen } = useUiStore()

  const visibleNav = NAV.filter(item => {
    const userLevel = user ? ROLE_LEVELS[user.role] ?? 0 : 0
    return userLevel >= ROLE_LEVELS[item.minRole]
  })

  const handleNavClick = () => {
    // Close mobile sidebar when navigating
    setMobileSidebarOpen(false)
  }

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-card border-r border-border transition-all duration-200 ease-in-out shrink-0',
        // Desktop: always shown, collapsible
        'hidden md:flex',
        sidebarCollapsed ? 'md:w-[60px]' : 'md:w-[220px]',
        // Mobile: fixed overlay, triggered by mobileSidebarOpen
        mobileSidebarOpen && 'fixed inset-y-0 left-0 z-50 flex w-[260px]',
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex items-center gap-2.5 h-[56px] border-b border-border shrink-0 px-3',
          sidebarCollapsed && !mobileSidebarOpen && 'justify-center'
        )}
      >
        <div className="rounded-xl overflow-hidden shrink-0" style={{ width: '32px', height: '32px' }}>
          <img
            src="/KchatLogo.png"
            alt="Kiongozi Chat"
            width={32}
            height={32}
            style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
        {(!sidebarCollapsed || mobileSidebarOpen) && (
          <div className="min-w-0 flex-1">
            <span className="block text-[13px] font-bold text-foreground tracking-tight leading-none truncate">
              Kiongozi
            </span>
            <span className="block text-[10px] text-muted-foreground leading-none mt-0.5 tracking-wide uppercase">
              Control Center
            </span>
          </div>
        )}
        {/* Mobile close button */}
        {mobileSidebarOpen && (
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 min-h-0">
        {visibleNav.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={handleNavClick}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-100 cursor-pointer select-none',
                isActive
                  ? 'text-brand bg-brand/8'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                sidebarCollapsed && !mobileSidebarOpen && 'justify-center px-0'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (!sidebarCollapsed || mobileSidebarOpen) && (
                  <span
                    className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-brand"
                    aria-hidden="true"
                  />
                )}
                <span className={cn('shrink-0 transition-colors', isActive ? 'text-brand' : 'text-muted-foreground group-hover:text-foreground')}>
                  {item.icon}
                </span>
                {(!sidebarCollapsed || mobileSidebarOpen) && (
                  <span className="truncate">{item.label}</span>
                )}
                {sidebarCollapsed && !mobileSidebarOpen && (
                  <div className="pointer-events-none absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 z-50 px-2.5 py-1.5 rounded-md bg-popover border border-border shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-[12px] font-medium text-foreground">
                    {item.label}
                  </div>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      {user && (
        <div className={cn('border-t border-border p-2.5 shrink-0', sidebarCollapsed && !mobileSidebarOpen && 'px-2')}>
          {sidebarCollapsed && !mobileSidebarOpen ? (
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

      {/* Collapse toggle — desktop only */}
      {!mobileSidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-[70px] z-10 hidden md:flex items-center justify-center w-6 h-6 rounded-full bg-card border border-border text-muted-foreground hover:text-foreground hover:border-zinc-600 transition-all shadow-sm"
        >
          {sidebarCollapsed ? <CaretRight size={11} /> : <CaretLeft size={11} />}
        </button>
      )}
    </aside>
  )
}
