import { cn } from '../../lib/utils'

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default'

const variants: Record<BadgeVariant, string> = {
  success: 'bg-brand/10 text-brand border-brand/20',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  danger:  'bg-red-500/10 text-red-400 border-red-500/20',
  info:    'bg-blue-500/10 text-blue-400 border-blue-500/20',
  default: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
}

interface StatusBadgeProps {
  variant?: BadgeVariant
  /** Alias for variant — accepted for backwards compatibility */
  status?: BadgeVariant
  label?: string
  children?: React.ReactNode
  dot?: boolean
  className?: string
}

export function StatusBadge({ variant, status, label, children, dot, className }: StatusBadgeProps) {
  const resolvedVariant: BadgeVariant = variant ?? status ?? 'default'
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border whitespace-nowrap',
      variants[resolvedVariant], className
    )}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />}
      {label ?? children}
    </span>
  )
}
