import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  CaretDown,
  CaretLeft,
  CaretRight,
  CaretUp,
  ClipboardText,
  MagnifyingGlass,
} from '@phosphor-icons/react'
import { getAuditLogs } from '../api/client'
import type { SystemLog } from '../types'
import { EmptyState } from '../components/ui/EmptyState'
import { cn, formatDateTime, formatRelativeTime } from '../lib/utils'

// ─── Level badge ──────────────────────────────────────────────────────────────

type LogLevel = SystemLog['level']

const LEVEL_STYLE: Record<LogLevel, string> = {
  debug:   'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  info:    'bg-blue-500/10 text-blue-400 border-blue-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  error:   'bg-red-500/10 text-red-400 border-red-500/20',
  success: 'bg-brand/10 text-brand border-brand/20',
}

function LevelBadge({ level }: { level: LogLevel }) {
  const cls = LEVEL_STYLE[level] ?? LEVEL_STYLE.info
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border capitalize',
      cls,
    )}>
      {level}
    </span>
  )
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-border">
      <td className="px-4 py-3">
        <div className="h-4 w-28 animate-pulse rounded bg-accent" />
        <div className="mt-1.5 h-3 w-20 animate-pulse rounded bg-accent" />
      </td>
      <td className="px-4 py-3">
        <div className="h-5 w-16 animate-pulse rounded-full bg-accent" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 w-20 animate-pulse rounded bg-accent" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 w-48 animate-pulse rounded bg-accent" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 w-8 animate-pulse rounded bg-accent" />
      </td>
    </tr>
  )
}

// ─── Log row ──────────────────────────────────────────────────────────────────

function LogRow({ log }: { log: SystemLog }) {
  const [expanded, setExpanded] = useState(false)
  const hasDetails = log.details != null && Object.keys(log.details).length > 0
  const hasStack = !!log.stack_trace

  return (
    <>
      <tr
        className={cn(
          'border-b border-border transition-colors',
          (hasDetails || hasStack) && 'cursor-pointer hover:bg-accent/40',
        )}
        onClick={() => (hasDetails || hasStack) && setExpanded(p => !p)}
      >
        {/* Timestamp */}
        <td className="whitespace-nowrap px-4 py-3">
          <p className="text-sm text-foreground">{formatRelativeTime(log.created_at)}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{formatDateTime(log.created_at)}</p>
        </td>

        {/* Level */}
        <td className="px-4 py-3">
          <LevelBadge level={log.level} />
        </td>

        {/* Category */}
        <td className="px-4 py-3">
          <span className="text-sm text-muted-foreground font-mono">{log.category ?? '—'}</span>
        </td>

        {/* Message */}
        <td className="max-w-[320px] px-4 py-3">
          <p className="text-sm text-foreground truncate">{log.message}</p>
          {log.user_id && (
            <p className="text-[11px] text-muted-foreground mt-0.5 font-mono truncate">
              user: {log.user_id}
            </p>
          )}
        </td>

        {/* Expand toggle */}
        <td className="px-4 py-3">
          {(hasDetails || hasStack) ? (
            <button
              type="button"
              className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              aria-label={expanded ? 'Collapse' : 'Expand'}
              onClick={e => { e.stopPropagation(); setExpanded(p => !p) }}
            >
              {expanded ? <CaretUp size={14} /> : <CaretDown size={14} />}
            </button>
          ) : (
            <span className="select-none text-xs text-muted-foreground">—</span>
          )}
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={5} className="bg-accent/20 px-4 pb-3 pt-1">
            <pre className="overflow-x-auto rounded bg-accent p-3 text-[11px] font-mono leading-relaxed text-muted-foreground">
              {log.stack_trace
                ? log.stack_trace
                : JSON.stringify(log.details, null, 2)}
            </pre>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const LEVEL_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Error', value: 'error' },
  { label: 'Warning', value: 'warning' },
  { label: 'Info', value: 'info' },
  { label: 'Success', value: 'success' },
]

interface LogsResponse {
  logs: SystemLog[]
  pagination?: { totalPages: number; totalCount: number; currentPage: number }
}

export default function AuditLogPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState('')

  const { data, isLoading } = useQuery<LogsResponse>({
    queryKey: ['audit-logs', page, levelFilter],
    queryFn: () => getAuditLogs({
      page,
      limit: 25,
      level: levelFilter || undefined,
    }),
    placeholderData: prev => prev,
  })

  const logs: SystemLog[] = data?.logs ?? []
  const totalPages = data?.pagination?.totalPages ?? 1

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return logs
    return logs.filter(log =>
      log.message.toLowerCase().includes(q) ||
      (log.category ?? '').toLowerCase().includes(q) ||
      (log.user_id ?? '').toLowerCase().includes(q),
    )
  }, [logs, search])

  const showEmpty = !isLoading && filtered.length === 0
  const showPagination = !isLoading && totalPages > 1 && !search.trim()

  return (
    <div className="space-y-5">
      {/* Toolbar: level filter + search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Level filter — text tabs */}
        <div className="flex items-center gap-0.5">
          {LEVEL_FILTERS.map(f => (
            <button
              key={f.value}
              type="button"
              onClick={() => { setLevelFilter(f.value); setPage(1) }}
              className={cn(
                'px-3 py-1.5 text-[12px] font-medium rounded transition-colors',
                levelFilter === f.value
                  ? 'text-foreground bg-accent'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <MagnifyingGlass
            size={15}
            weight="duotone"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Search message, category…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-base h-8 text-[13px] w-52 pl-8"
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="data-table w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-border bg-accent/50">
                {['Timestamp', 'Level', 'Category', 'Message', ''].map((col, i) => (
                  <th
                    key={i}
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 8 }, (_, i) => <SkeletonRow key={i} />)
                : showEmpty
                ? (
                  <tr>
                    <td colSpan={5} className="py-16">
                      <EmptyState
                        icon={<ClipboardText size={40} weight="duotone" className="text-muted-foreground" />}
                        title={search || levelFilter ? 'No matching logs' : 'No system logs yet'}
                        description={
                          search || levelFilter
                            ? 'Try a different filter or search term.'
                            : 'System events will appear here once recorded.'
                        }
                      />
                    </td>
                  </tr>
                )
                : filtered.map(log => <LogRow key={log.id} log={log} />)
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {showPagination && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page <span className="font-medium text-foreground">{page}</span> of{' '}
            <span className="font-medium text-foreground">{totalPages}</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-secondary flex items-center gap-1.5"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <CaretLeft size={13} />
              Previous
            </button>
            <button
              type="button"
              className="btn-secondary flex items-center gap-1.5"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
              <CaretRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
