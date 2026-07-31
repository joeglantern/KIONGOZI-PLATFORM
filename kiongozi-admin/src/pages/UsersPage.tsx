import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  MagnifyingGlass,
  CaretLeft,
  CaretRight,
  Plus,
  X,
  DownloadSimple,
} from '@phosphor-icons/react'
import toast from 'react-hot-toast'

import { getUsers, banUser, unbanUser, verifyUser, unverifyUser, updateUserRole, createUser } from '../api/client'
import { exportToExcel } from '../lib/exportExcel'
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

// ---------------------------------------------------------------------------
// Add User modal
// ---------------------------------------------------------------------------
function AddUserModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('user')

  const mutation = useMutation({
    mutationFn: () => createUser({ email, full_name: fullName, password, role }),
    onSuccess: () => {
      toast.success('User created.')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      onClose()
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.details ?? error?.response?.data?.error ?? 'Failed to create user.'),
  })

  const canSubmit = email.includes('@') && fullName.trim().length > 1 && password.length >= 8

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-card border border-border shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
          <h2 className="text-[15px] font-semibold text-foreground">Add User</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        <form
          className="p-5 space-y-3.5"
          onSubmit={e => {
            e.preventDefault()
            if (canSubmit) mutation.mutate()
          }}
        >
          <div>
            <label htmlFor="nu-name" className="text-xs text-muted-foreground block mb-1">Full Name</label>
            <input
              id="nu-name"
              type="text"
              className="input-base w-full"
              placeholder="Jane Wanjiku"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="nu-email" className="text-xs text-muted-foreground block mb-1">Email</label>
            <input
              id="nu-email"
              type="email"
              className="input-base w-full"
              placeholder="jane@example.org"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="nu-pw" className="text-xs text-muted-foreground block mb-1">
              Password <span className="opacity-60">(min 8 characters)</span>
            </label>
            <input
              id="nu-pw"
              type="password"
              className="input-base w-full"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label htmlFor="nu-role" className="text-xs text-muted-foreground block mb-1">Role</label>
            <select
              id="nu-role"
              className="input-base w-full"
              value={role}
              onChange={e => setRole(e.target.value)}
            >
              {DB_ROLE_OPTIONS.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary text-sm py-1.5 px-3">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit || mutation.isPending}
              className="btn-primary text-sm py-1.5 px-3 disabled:opacity-50"
            >
              {mutation.isPending ? 'Creating…' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function UsersPage() {
  const { hasRole } = useAuthStore()
  const queryClient = useQueryClient()

  const [rawSearch, setRawSearch] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [page, setPage] = useState(1)
  const [showAddUser, setShowAddUser] = useState(false)

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

  const unverifyMutation = useMutation({
    mutationFn: (id: string) => unverifyUser(id),
    onSuccess: () => {
      toast.success('Verification removed.')
      invalidateUsers()
    },
    onError: () => toast.error('Failed to remove verification.'),
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

  const [exporting, setExporting] = useState(false)
  const handleExport = async () => {
    setExporting(true)
    try {
      // Fetch everything matching the current search/filter, not just this page
      const full = await getUsers({
        search,
        page: 1,
        limit: 1000,
        status: statusFilter !== 'all' && statusFilter !== 'verified' ? statusFilter : undefined,
      })
      let rows: AppUser[] = full?.users ?? []
      if (statusFilter === 'verified') rows = rows.filter(u => u.is_verified)
      if (rows.length === 0) {
        toast.error('No users to export.')
        return
      }
      await exportToExcel({
        title: 'Kiongozi — Users',
        fileName: 'kiongozi-users',
        columns: [
          { header: 'Name', width: 26, value: u => u.full_name ?? '' },
          { header: 'Username', width: 18, value: u => u.username ?? '' },
          { header: 'Email', width: 30, value: u => u.email },
          { header: 'Role', width: 14, value: u => u.role },
          { header: 'Status', width: 10, value: u => u.status },
          { header: 'Verified', width: 10, value: u => (u.is_verified ? 'Yes' : 'No') },
          { header: 'Posts', width: 8, value: u => u.post_count },
          { header: 'Followers', width: 10, value: u => u.follower_count },
          { header: 'Joined', width: 12, value: u => formatDate(u.created_at) },
          { header: 'Last Active', width: 12, value: u => (u.last_login_at ? formatDate(u.last_login_at) : '') },
        ],
        rows,
      })
      toast.success(`Exported ${rows.length} users.`)
    } catch {
      toast.error('Export failed.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Toolbar: search + export + add user */}
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

        <div className="flex items-center gap-2 shrink-0">
          {isModerator && (
            <button
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 rounded border border-border bg-accent px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            >
              <DownloadSimple size={14} weight="duotone" />
              {exporting ? 'Exporting…' : 'Export Excel'}
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setShowAddUser(true)}
              className="btn-primary flex items-center gap-1.5 text-[13px] py-1.5 px-3 shrink-0"
            >
              <Plus weight="bold" size={14} />
              Add User
            </button>
          )}
        </div>
      </div>

      {showAddUser && <AddUserModal onClose={() => setShowAddUser(false)} />}

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

                          {/* Verify / Unverify toggle */}
                          <button
                            onClick={() =>
                              user.is_verified
                                ? unverifyMutation.mutate(user.id)
                                : verifyMutation.mutate(user.id)
                            }
                            disabled={verifyMutation.isPending || unverifyMutation.isPending}
                            title={user.is_verified ? 'Remove verification' : 'Verify user'}
                            className={cn(
                              'text-sm py-1 px-2.5 rounded border font-medium transition-colors disabled:opacity-50',
                              user.is_verified
                                ? 'bg-accent border-border text-muted-foreground hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10'
                                : 'bg-brand/10 text-brand border-brand/20 hover:bg-brand/20',
                            )}
                          >
                            {user.is_verified ? 'Unverify' : 'Verify'}
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
