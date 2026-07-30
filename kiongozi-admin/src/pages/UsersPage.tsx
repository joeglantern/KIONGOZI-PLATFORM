import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  MagnifyingGlass,
  CaretLeft,
  CaretRight,
} from '@phosphor-icons/react'
import toast from 'react-hot-toast'

import { getUsers, banUser, unbanUser, verifyUser, updateUserRole } from '../api/client'
import { StatusBadge } from '../components/ui/StatusBadge'
import { UserAvatar } from '../components/ui/UserAvatar'
import { RoleBadge } from '../components/ui/RoleBadge'
import { EmptyState } from '../components/ui/EmptyState'
import { useAuthStore } from '../stores/authStore'
import { cn, formatDate } from '../lib/utils'
import type { AppUser } from '../types'

type StatusFilter = 'all' | 'active' | 'banned' | 'inactive' | 'verified'

const STATUS_TABS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Banned', value: 'banned' },
  { label: 'Verified', value: 'verified' },
]

// Valid DB role values that can be assigned via the API
const DB_ROLE_OPTIONS = [
  { value: 'user',           label: 'User' },
  { value: 'content_editor', label: 'Editor' },
  { value: 'moderator',      label: 'Moderator' },
  { value: 'analyst',        label: 'Analyst' },
  { value: 'researcher',     label: 'Researcher' },
  { value: 'admin',          label: 'Admin' },
  { value: 'org_admin',      label: 'Org Admin' },
  { value: 'super_admin',    label: 'Super Admin' },
]

export default function UsersPage() {
  const { hasRole } = useAuthStore()
  const queryClient = useQueryClient()

  const [rawSearch, setRawSearch] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [page, setPage] = useState(1)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(rawSearch)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [rawSearch])

  // Reset page when filter changes
  useEffect(() => {
    setPage(1)
  }, [statusFilter])

  const { data, isLoading } = useQuery({
    queryKey: ['users', search, page, statusFilter],
    queryFn: () =>
      getUsers({
        search,
        page,
        // 'verified' is a boolean field, not a status value — don't pass it as status
        status: statusFilter !== 'all' && statusFilter !== 'verified' ? statusFilter : undefined,
      }),
    placeholderData: prev => prev,
  })

  const allUsers: AppUser[] = data?.users ?? []
  // Client-side filter for verified (backend doesn't support is_verified as a query param)
  const users = statusFilter === 'verified' ? allUsers.filter(u => u.is_verified) : allUsers
  const totalPages: number = data?.pagination?.totalPages ?? 1

  const invalidateUsers = () => queryClient.invalidateQueries({ queryKey: ['users'] })

  const banMutation = useMutation({
    mutationFn: (id: string) => banUser(id),
    onSuccess: () => {
      toast.success('User banned.')
      invalidateUsers()
    },
    onError: () => toast.error('Failed to ban user.'),
  })

  const unbanMutation = useMutation({
    mutationFn: (id: string) => unbanUser(id),
    onSuccess: () => {
      toast.success('User unbanned.')
      invalidateUsers()
    },
    onError: () => toast.error('Failed to unban user.'),
  })

  const verifyMutation = useMutation({
    mutationFn: (id: string) => verifyUser(id),
    onSuccess: () => {
      toast.success('User verified.')
      invalidateUsers()
    },
    onError: () => toast.error('Failed to verify user.'),
  })

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => updateUserRole(id, role),
    onSuccess: () => {
      toast.success('Role updated.')
      invalidateUsers()
    },
    onError: (error: any) => toast.error(error?.response?.data?.error ?? 'Failed to update role.'),
  })

  const isModerator = hasRole('moderator')
  const isAdmin = hasRole('admin')

  return (
    <div className="space-y-5">
      {/* Toolbar: search + filter tabs */}
      <div className="flex items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full max-w-[260px]">
          <MagnifyingGlass
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search users…"
            value={rawSearch}
            onChange={(e) => setRawSearch(e.target.value)}
            className="input-base pl-8 h-8 text-[13px]"
          />
        </div>
      </div>

      {/* Table card with underline tabs */}
      <div className="card overflow-hidden">
        {/* Underline tab strip */}
        <div className="flex border-b border-border px-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={cn(
                'relative px-3.5 py-2.5 text-[13px] font-medium transition-colors',
                statusFilter === tab.value
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
              {statusFilter === tab.value && (
                <span className="absolute bottom-0 left-2 right-2 h-px bg-brand rounded-full" />
              )}
            </button>
          ))}
        </div>

        <table className="data-table w-full">
          <thead>
            <tr>
              <th>User</th>
              <th>Username</th>
              <th>Status</th>
              <th>Role</th>
              <th className="text-right">Followers</th>
              <th className="text-right">Posts</th>
              <th>Joined</th>
              {isModerator && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-accent animate-pulse" />
                        <div className="h-4 w-28 rounded bg-accent animate-pulse" />
                      </div>
                    </td>
                    <td>
                      <div className="h-4 w-20 rounded bg-accent animate-pulse" />
                    </td>
                    <td>
                      <div className="h-5 w-16 rounded-full bg-accent animate-pulse" />
                    </td>
                    <td>
                      <div className="h-5 w-20 rounded-full bg-accent animate-pulse" />
                    </td>
                    <td>
                      <div className="h-4 w-10 rounded bg-accent animate-pulse ml-auto" />
                    </td>
                    <td>
                      <div className="h-4 w-10 rounded bg-accent animate-pulse ml-auto" />
                    </td>
                    <td>
                      <div className="h-4 w-24 rounded bg-accent animate-pulse" />
                    </td>
                    {isModerator && (
                      <td>
                        <div className="h-8 w-32 rounded bg-accent animate-pulse" />
                      </td>
                    )}
                  </tr>
                ))
              : users.length === 0
              ? null
              : users.map((user) => (
                  <tr key={user.id}>
                    {/* Avatar + Name */}
                    <td>
                      <div className="flex items-center gap-3">
                        <UserAvatar name={user.full_name} src={user.avatar_url} size="sm" />
                        <span className="font-medium text-foreground">
                          {user.full_name ?? user.username ?? user.email}
                        </span>
                      </div>
                    </td>

                    {/* Username */}
                    <td className="text-muted-foreground">@{user.username}</td>

                    {/* Status */}
                    <td>
                      {user.status === 'banned' ? (
                        <StatusBadge variant="danger" label="Banned" />
                      ) : user.is_verified ? (
                        <StatusBadge variant="success" label="Verified" />
                      ) : user.status === 'inactive' ? (
                        <StatusBadge variant="warning" label="Inactive" />
                      ) : (
                        <StatusBadge variant="default" label="Active" />
                      )}
                    </td>

                    {/* Role */}
                    <td>
                      <RoleBadge role={user.role} />
                    </td>

                    {/* Followers */}
                    <td className="text-right tabular-nums text-muted-foreground">
                      {(user.follower_count ?? 0).toLocaleString()}
                    </td>

                    {/* Posts */}
                    <td className="text-right tabular-nums text-muted-foreground">
                      {(user.post_count ?? 0).toLocaleString()}
                    </td>

                    {/* Joined */}
                    <td className="text-muted-foreground text-sm">
                      {formatDate(user.created_at)}
                    </td>

                    {/* Actions */}
                    {isModerator && (
                      <td>
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Ban / Unban */}
                          {user.status === 'banned' ? (
                            <button
                              onClick={() => unbanMutation.mutate(user.id)}
                              disabled={unbanMutation.isPending}
                              className="btn-secondary text-sm py-1 px-2.5 disabled:opacity-50"
                            >
                              Unban
                            </button>
                          ) : (
                            <button
                              onClick={() => banMutation.mutate(user.id)}
                              disabled={banMutation.isPending}
                              className="btn-danger text-sm py-1 px-2.5 disabled:opacity-50"
                            >
                              Ban
                            </button>
                          )}

                          {/* Verify */}
                          <button
                            onClick={() => verifyMutation.mutate(user.id)}
                            disabled={user.is_verified || verifyMutation.isPending}
                            className={cn(
                              'text-sm py-1 px-2.5 rounded border font-medium transition-colors',
                              user.is_verified
                                ? 'opacity-40 cursor-not-allowed bg-accent border-border text-muted-foreground'
                                : 'bg-brand/10 text-brand border-brand/20 hover:bg-brand/20',
                            )}
                          >
                            {user.is_verified ? 'Verified' : 'Verify'}
                          </button>

                          {/* Role dropdown — admin only */}
                          {isAdmin && (
                            <select
                              value={user.role ?? 'user'}
                              onChange={(e) =>
                                roleMutation.mutate({ id: user.id, role: e.target.value })
                              }
                              disabled={roleMutation.isPending}
                              className="input-base text-sm py-1 px-2 pr-7 disabled:opacity-50"
                            >
                              {DB_ROLE_OPTIONS.map((r) => (
                                <option key={r.value} value={r.value}>
                                  {r.label}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
          </tbody>
        </table>

        {/* Empty state inside table area */}
        {!isLoading && users.length === 0 && (
          <div className="py-16">
            <EmptyState
              icon={<MagnifyingGlass size={40} weight="duotone" className="text-muted-foreground" />}
              title="No users found"
              description={
                search
                  ? `No results for "${search}". Try a different search term.`
                  : 'No users match the selected filter.'
              }
            />
          </div>
        )}

        {/* Pagination — inside the card, above the bottom border */}
        {!isLoading && users.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-[12px] text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className={cn(
                  'flex items-center gap-1 rounded px-2.5 py-1 text-[12px] font-medium border transition-colors',
                  page <= 1
                    ? 'opacity-40 cursor-not-allowed border-border text-muted-foreground'
                    : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent',
                )}
              >
                <CaretLeft size={12} />
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className={cn(
                  'flex items-center gap-1 rounded px-2.5 py-1 text-[12px] font-medium border transition-colors',
                  page >= totalPages
                    ? 'opacity-40 cursor-not-allowed border-border text-muted-foreground'
                    : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent',
                )}
              >
                Next
                <CaretRight size={12} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
