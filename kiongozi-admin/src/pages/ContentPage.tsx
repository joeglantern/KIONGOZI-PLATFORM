import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Flag,
  Article,
  Trash,
  CheckCircle,
  XCircle,
  Warning,
} from '@phosphor-icons/react'
import toast from 'react-hot-toast'

import { getReports, resolveReport, getFlaggedPosts, removePost } from '../api/client'
import { StatusBadge } from '../components/ui/StatusBadge'
import { UserAvatar } from '../components/ui/UserAvatar'
import { EmptyState } from '../components/ui/EmptyState'
import { useAuthStore } from '../stores/authStore'
import { cn, formatDate, formatRelativeTime, truncate } from '../lib/utils'
import type { Report, Post } from '../types'

// ─── Tab Types ────────────────────────────────────────────────────────────────

type ContentTab = 'reports' | 'flagged'
type ReportStatusFilter = 'all' | 'pending' | 'resolved' | 'dismissed'

const CONTENT_TABS: { label: string; value: ContentTab }[] = [
  { label: 'Reports', value: 'reports' },
  { label: 'Flagged Posts', value: 'flagged' },
]

const REPORT_STATUS_TABS: { label: string; value: ReportStatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Dismissed', value: 'dismissed' },
]

// ─── Underline tab button ─────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative px-3.5 py-2.5 text-[13px] font-medium transition-colors',
        active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
      {active && (
        <span className="absolute bottom-0 left-2 right-2 h-px bg-brand rounded-full" />
      )}
    </button>
  )
}

// ─── Reports Tab ──────────────────────────────────────────────────────────────

function ReportsTab() {
  const { hasRole } = useAuthStore()
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<ReportStatusFilter>('all')

  const { data: reports, isLoading } = useQuery<Report[]>({
    queryKey: ['reports', statusFilter],
    queryFn: () =>
      getReports({ status: statusFilter === 'all' ? undefined : statusFilter }),
  })

  const resolveMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'dismiss' | 'remove' }) =>
      resolveReport(id, action),
    onSuccess: (_data, { action }) => {
      toast.success(action === 'dismiss' ? 'Report dismissed.' : 'Content removed.')
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    },
    onError: () => toast.error('Failed to resolve report.'),
  })

  const isModerator = hasRole('moderator')

  return (
    <div className="space-y-4">
      {/* Status filter — underline tabs */}
      <div className="flex border-b border-border -mx-0 px-0">
        {REPORT_STATUS_TABS.map((tab) => (
          <TabButton
            key={tab.value}
            active={statusFilter === tab.value}
            onClick={() => setStatusFilter(tab.value)}
          >
            {tab.label}
          </TabButton>
        ))}
      </div>

      {/* Report cards */}
      <div className="space-y-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card p-4 space-y-3 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-accent" />
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-32 rounded bg-accent" />
                    <div className="h-3 w-20 rounded bg-accent" />
                  </div>
                </div>
                <div className="h-4 w-3/4 rounded bg-accent" />
                <div className="h-4 w-1/2 rounded bg-accent" />
              </div>
            ))
          : !reports || reports.length === 0
          ? (
              <EmptyState
                icon={<Flag size={40} weight="duotone" className="text-muted-foreground" />}
                title="No reports"
                description="There are no reports matching the selected filter."
              />
            )
          : reports.map((report) => (
              <div key={report.id} className="card p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  {/* Left: reporter info + content */}
                  <div className="space-y-2 min-w-0">
                    {/* Reporter */}
                    <div className="flex items-center gap-2.5">
                      {report.reporter && (
                        <UserAvatar name={report.reporter?.full_name} src={report.reporter?.avatar_url} size="sm" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {report.reporter?.full_name ?? report.reporter?.username ?? 'Unknown user'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Reported {formatRelativeTime(report.created_at)}
                        </p>
                      </div>
                    </div>

                    {/* Report metadata */}
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-muted-foreground border border-border capitalize">
                        {report.type ?? 'post'}
                      </span>
                      {report.status && (
                        <StatusBadge
                          variant={
                            report.status === 'pending'
                              ? 'warning'
                              : report.status === 'resolved'
                              ? 'success'
                              : 'default'
                          }
                          label={report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                        />
                      )}
                    </div>

                    {/* Reason */}
                    {report.reason && (
                      <p className="text-sm text-foreground leading-snug">
                        <span className="font-medium">Reason: </span>
                        {report.reason}
                      </p>
                    )}

                    {/* Date */}
                    <p className="text-xs text-muted-foreground">
                      {formatDate(report.created_at)}
                    </p>
                  </div>

                  {/* Right: actions */}
                  {isModerator && report.status === 'pending' && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() =>
                          resolveMutation.mutate({ id: report.id, action: 'dismiss' })
                        }
                        disabled={resolveMutation.isPending}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded border border-border bg-accent px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50',
                        )}
                      >
                        <XCircle size={15} weight="duotone" />
                        Dismiss
                      </button>
                      <button
                        onClick={() =>
                          resolveMutation.mutate({ id: report.id, action: 'remove' })
                        }
                        disabled={resolveMutation.isPending}
                        className="btn-danger text-sm py-1.5 px-3 inline-flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <CheckCircle size={15} weight="duotone" />
                        Remove Content
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
      </div>
    </div>
  )
}

// ─── Flagged Posts Tab ────────────────────────────────────────────────────────

function FlaggedPostsTab() {
  const queryClient = useQueryClient()

  const { data: posts, isLoading } = useQuery<Post[]>({
    queryKey: ['flagged-posts'],
    queryFn: getFlaggedPosts,
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => removePost(id),
    onSuccess: () => {
      toast.success('Post removed.')
      queryClient.invalidateQueries({ queryKey: ['flagged-posts'] })
    },
    onError: () => toast.error('Failed to remove post.'),
  })

  const handleRemove = (post: Post) => {
    const confirmed = window.confirm(
      `Remove post by @${post.author?.username ?? 'unknown'}? This cannot be undone.`,
    )
    if (confirmed) removeMutation.mutate(post.id)
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card p-4 space-y-3 animate-pulse">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-accent" />
              <div className="space-y-1.5">
                <div className="h-3.5 w-24 rounded bg-accent" />
                <div className="h-3 w-16 rounded bg-accent" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="h-3 w-full rounded bg-accent" />
              <div className="h-3 w-5/6 rounded bg-accent" />
              <div className="h-3 w-3/4 rounded bg-accent" />
            </div>
            <div className="h-5 w-24 rounded-full bg-accent" />
          </div>
        ))}
      </div>
    )
  }

  if (!posts || posts.length === 0) {
    return (
      <EmptyState
        icon={<Article size={40} weight="duotone" className="text-muted-foreground" />}
        title="No flagged posts"
        description="There are no flagged posts requiring review right now."
      />
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => (
        <div key={post.id} className="card p-4 flex flex-col gap-3">
          {/* Author */}
          <div className="flex items-center gap-2.5">
            {post.author && <UserAvatar name={post.author?.full_name ?? post.author?.username} src={post.author?.avatar_url} size="sm" />}
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {post.author?.full_name ?? post.author?.username ?? 'Unknown'}
              </p>
              <p className="text-xs text-muted-foreground">
                @{post.author?.username ?? '—'}
              </p>
            </div>
          </div>

          {/* Post text */}
          {post.content && (
            <p className="text-sm text-foreground leading-relaxed flex-1">
              {truncate(post.content, 120)}
            </p>
          )}

          {/* Flag reason */}
          {post.flagReason && (
            <div className="inline-flex items-center gap-1.5 self-start rounded-full bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-0.5 text-xs font-medium text-yellow-500">
              <Warning size={12} weight="duotone" />
              {post.flagReason}
            </div>
          )}

          {/* Footer: date + remove */}
          <div className="flex items-center justify-between pt-1 border-t border-border mt-auto">
            <span className="text-xs text-muted-foreground">
              {formatDate(post.created_at)}
            </span>
            <button
              onClick={() => handleRemove(post)}
              disabled={removeMutation.isPending}
              className="btn-danger text-xs py-1 px-2.5 inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <Trash size={13} weight="duotone" />
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── ContentPage ──────────────────────────────────────────────────────────────

export default function ContentPage() {
  const [activeTab, setActiveTab] = useState<ContentTab>('reports')

  return (
    <div className="space-y-5">
      {/* Top tab strip */}
      <div className="flex border-b border-border">
        {CONTENT_TABS.map((tab) => (
          <TabButton
            key={tab.value}
            active={activeTab === tab.value}
            onClick={() => setActiveTab(tab.value)}
          >
            {tab.label}
          </TabButton>
        ))}
      </div>

      {activeTab === 'reports' ? <ReportsTab /> : <FlaggedPostsTab />}
    </div>
  )
}
