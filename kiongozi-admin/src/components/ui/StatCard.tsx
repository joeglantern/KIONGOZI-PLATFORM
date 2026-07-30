import type { ReactNode } from 'react'
import { TrendUp, TrendDown } from '@phosphor-icons/react'
import { cn, formatNumber } from '../../lib/utils'

interface StatCardProps {
  label: string
  value: number | string
  icon: ReactNode
  trend?: number
  trendLabel?: string
  accent?: boolean
  loading?: boolean
  danger?: boolean
}

export function StatCard({ label, value, icon, trend, trendLabel, accent, loading, danger }: StatCardProps) {
  const isUp = trend !== undefined && trend >= 0
  return (
    <div className={cn(
      'card p-5 flex flex-col gap-3 hover:border-zinc-700 transition-colors',
      accent && 'border-brand/25',
      danger && 'border-red-500/25',
    )}>
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-medium text-muted-foreground">{label}</p>
        <div className={cn(
          'p-2 rounded-lg',
          accent ? 'bg-brand/10 text-brand' : danger ? 'bg-red-500/10 text-red-400' : 'bg-accent text-muted-foreground'
        )}>
          {icon}
        </div>
      </div>

      {loading ? (
        <div className="h-7 w-24 rounded-md bg-accent animate-pulse" />
      ) : (
        <p className="text-2xl font-bold text-foreground tracking-tight">
          {typeof value === 'number' ? formatNumber(value) : value}
        </p>
      )}

      {trend !== undefined && !loading && (
        <div className="flex items-center gap-1.5">
          <span className={cn('flex items-center gap-0.5 text-[11px] font-semibold', isUp ? 'text-brand' : 'text-red-400')}>
            {isUp ? <TrendUp className="w-3.5 h-3.5" /> : <TrendDown className="w-3.5 h-3.5" />}
            {Math.abs(trend)}%
          </span>
          {trendLabel && <span className="text-[11px] text-muted-foreground">{trendLabel}</span>}
        </div>
      )}
    </div>
  )
}
