import { cn } from '../../lib/utils'

interface RoleConfig { label: string; className: string }

const ROLE_CONFIG: Record<string, RoleConfig> = {
  // DB roles
  org_admin:      { label: 'Org Admin',  className: 'bg-brand/10 text-brand border-brand/20' },
  admin:          { label: 'Admin',       className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  moderator:      { label: 'Moderator',  className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  content_editor: { label: 'Editor',     className: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  analyst:        { label: 'Analyst',    className: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  researcher:     { label: 'Researcher', className: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
  user:           { label: 'User',       className: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
  // Admin UI roles (kept for AdminUser context)
  super_admin:    { label: 'Super Admin', className: 'bg-brand/10 text-brand border-brand/20' },
  support:        { label: 'Support',    className: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
}

export function RoleBadge({ role, className }: { role?: string | null; className?: string }) {
  const cfg = (role ? ROLE_CONFIG[role] : undefined) ?? ROLE_CONFIG.user
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border',
      cfg.className, className
    )}>
      {cfg.label}
    </span>
  )
}
