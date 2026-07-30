import { useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line,
} from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { getAnalytics } from '../api/client'
import type { AnalyticsPoint } from '../api/client'
import { cn, formatNumber } from '../lib/utils'

type Range = '7d' | '30d' | '90d'

const RANGES: { label: string; value: Range }[] = [
  { label: '7d',  value: '7d'  },
  { label: '30d', value: '30d' },
  { label: '90d', value: '90d' },
]

function fmt(d: string) {
  const dt = new Date(d)
  return `${dt.toLocaleString('en', { month: 'short' })} ${dt.getDate()}`
}

function ChartTooltip({
  active, payload, label,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'hsl(var(--card))',
      border: '1px solid hsl(var(--border))',
      borderRadius: 8,
      padding: '9px 13px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
      minWidth: 140,
    }}>
      <p style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', marginBottom: 7, fontWeight: 500 }}>
        {label ? fmt(String(label)) : ''}
      </p>
      {payload.map((e, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: i < payload.length - 1 ? 5 : 0 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: e.color, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>{e.name}</span>
          <span style={{ fontSize: 12, color: 'hsl(var(--foreground))', fontWeight: 600, marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>
            {formatNumber(e.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

function Skeleton({ h }: { h: number }) {
  return <div className="w-full animate-pulse rounded bg-accent" style={{ height: h }} />
}

function SectionHead({ label, sublabel }: { label: string; sublabel?: string }) {
  return (
    <div className="mb-4">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.08em]">{label}</p>
      {sublabel && <p className="text-[11px] text-muted-foreground mt-0.5">{sublabel}</p>}
    </div>
  )
}

function StatStrip({ data, range }: { data: AnalyticsPoint[]; range: Range }) {
  const totalNew     = data.reduce((s, p) => s + p.newUsers, 0)
  const avgActive    = data.length ? Math.round(data.reduce((s, p) => s + p.activeUsers, 0) / data.length) : 0
  const totalMsgs    = data.reduce((s, p) => s + p.messages, 0)
  const label        = range === '7d' ? '7 days' : range === '30d' ? '30 days' : '90 days'

  const stats = [
    { label: `New Users (${label})`, value: totalNew },
    { label: `Avg Active / Day`,     value: avgActive },
    { label: `Messages (${label})`,  value: totalMsgs },
  ]

  return (
    <div className="flex items-start gap-0 mb-8 flex-wrap">
      {stats.map((s, i) => (
        <div key={s.label} className={`pr-8 ${i > 0 ? 'pl-8 border-l border-border' : ''}`}>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.08em] mb-0.5">{s.label}</p>
          <p className="text-[22px] font-bold tabular-nums leading-tight text-foreground">{formatNumber(s.value)}</p>
        </div>
      ))}
    </div>
  )
}

const TICK = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' } as const

export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>('7d')

  const { data = [], isLoading } = useQuery<AnalyticsPoint[]>({
    queryKey: ['analytics', range],
    queryFn: () => getAnalytics(range),
    staleTime: 60_000,
  })

  const isEmpty = !isLoading && data.every(p => p.newUsers === 0 && p.activeUsers === 0 && p.messages === 0)

  return (
    <div>
      {/* Range selector */}
      <div className="flex items-center gap-4 mb-6">
        {RANGES.map((r, i) => (
          <span key={r.value} className="flex items-center gap-4">
            {i > 0 && <span className="text-border select-none">|</span>}
            <button
              onClick={() => setRange(r.value)}
              className={cn(
                'text-[13px] font-medium transition-colors',
                range === r.value ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {r.label}
            </button>
          </span>
        ))}
      </div>

      {/* Stats strip */}
      {isLoading ? (
        <div className="flex items-start gap-8 mb-8">
          {[0, 1, 2].map(i => (
            <div key={i} className={i > 0 ? 'pl-8 border-l border-border' : ''}>
              <div className="h-2.5 w-24 rounded bg-accent animate-pulse mb-1.5" />
              <div className="h-7 w-16 rounded bg-accent animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <StatStrip data={data} range={range} />
      )}

      {isEmpty && (
        <p className="text-[13px] text-muted-foreground mb-6">
          No activity recorded in this period yet. Charts will populate as users sign up and interact.
        </p>
      )}

      {/* User Growth */}
      <div className="border-t border-border pt-5 mb-8">
        <div className="flex items-end justify-between">
          <SectionHead label="User Growth" sublabel="New registrations vs. daily active" />
          <div className="flex items-center gap-5 mb-4">
            <div className="flex items-center gap-2">
              <span style={{ display: 'inline-block', width: 16, height: 2, background: '#5CB85C', borderRadius: 1 }} />
              <span className="text-[11px] text-muted-foreground">New</span>
            </div>
            <div className="flex items-center gap-2">
              <span style={{ display: 'inline-block', width: 16, height: 2, background: '#60A5FA', borderRadius: 1 }} />
              <span className="text-[11px] text-muted-foreground">Active</span>
            </div>
          </div>
        </div>
        {isLoading ? <Skeleton h={200} /> : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data} margin={{ top: 4, right: 2, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="gradNew" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5CB85C" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#5CB85C" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradActive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#60A5FA" stopOpacity={0.16} />
                  <stop offset="100%" stopColor="#60A5FA" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={TICK} axisLine={false} tickLine={false} tickFormatter={fmt} />
              <YAxis tick={TICK} axisLine={false} tickLine={false} tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : String(v)} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="newUsers"    name="New"    stroke="#5CB85C" strokeWidth={1.5} fill="url(#gradNew)"    dot={false} activeDot={{ r: 4, fill: '#5CB85C',    strokeWidth: 0 }} />
              <Area type="monotone" dataKey="activeUsers" name="Active" stroke="#60A5FA" strokeWidth={1.5} fill="url(#gradActive)" dot={false} activeDot={{ r: 4, fill: '#60A5FA', strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Messages */}
      <div className="border-t border-border pt-5 mb-8">
        <SectionHead label="Messages" sublabel="Total messages sent per day" />
        {isLoading ? <Skeleton h={160} /> : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={data} margin={{ top: 0, right: 2, left: -28, bottom: 0 }} barSize={range === '90d' ? 4 : range === '30d' ? 8 : 14}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={fmt} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="messages" name="Messages" fill="#5CB85C" radius={[2, 2, 0, 0]} opacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Active users line */}
      <div className="border-t border-border pt-5">
        <SectionHead label="Daily Active Users" sublabel="Unique users with activity each day" />
        {isLoading ? <Skeleton h={140} /> : (
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={data} margin={{ top: 4, right: 2, left: -22, bottom: 0 }}>
              <XAxis dataKey="date" tick={TICK} axisLine={false} tickLine={false} tickFormatter={fmt} />
              <YAxis tick={TICK} axisLine={false} tickLine={false} tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : String(v)} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="activeUsers" name="Active" stroke="#A78BFA" strokeWidth={1.5} dot={false} activeDot={{ r: 4, fill: '#A78BFA', strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
