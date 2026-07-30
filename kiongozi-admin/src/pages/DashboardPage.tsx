import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Users,
  Lightning,
  Article,
  Warning,
  AndroidLogo,
  AppleLogo,
  UserPlus,
  Flag,
  ChatCircle,
  Star,
  Trash,
} from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { getDashboardStats, getAnalytics } from '../api/client';
import { StatCard } from '../components/ui/StatCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { formatNumber } from '../lib/utils';
import type { DashboardStats, AnalyticsPoint } from '../types';

// ─── Hardcoded recent activity ────────────────────────────────────────────────
const RECENT_ACTIVITY = [
  {
    id: 1,
    icon: UserPlus,
    color: '#5CB85C',
    label: 'New user joined',
    detail: 'fatuma.ali@example.com',
    time: '2 min ago',
  },
  {
    id: 2,
    icon: Flag,
    color: '#EF4444',
    label: 'Post flagged for review',
    detail: 'Post #4821 — hate speech',
    time: '11 min ago',
  },
  {
    id: 3,
    icon: UserPlus,
    color: '#5CB85C',
    label: 'New user joined',
    detail: 'john.doe@example.com',
    time: '25 min ago',
  },
  {
    id: 4,
    icon: ChatCircle,
    color: '#3B82F6',
    label: 'Comment reported',
    detail: 'Comment #9204 — spam',
    time: '1 hr ago',
  },
  {
    id: 5,
    icon: Star,
    color: '#F59E0B',
    label: 'App review received',
    detail: '5 stars — "Amazing app!"',
    time: '2 hr ago',
  },
  {
    id: 6,
    icon: Trash,
    color: '#8B5CF6',
    label: 'Account deleted',
    detail: 'user_id: 00f3a91c',
    time: '3 hr ago',
  },
];

// ─── Skeleton helpers ─────────────────────────────────────────────────────────
function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={`bg-accent animate-pulse rounded-md ${className ?? ''}`} />
  );
}

function StatCardSkeleton() {
  return (
    <div className="card flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-4 w-24" />
        <SkeletonBlock className="h-9 w-9 rounded-lg" />
      </div>
      <SkeletonBlock className="h-8 w-20 mt-1" />
      <SkeletonBlock className="h-3 w-16" />
    </div>
  );
}

// ─── Custom recharts tooltip ──────────────────────────────────────────────────
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="text-muted-foreground mb-1.5 font-medium">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: entry.color }}
          />
          <span className="text-foreground capitalize">{entry.name}:</span>
          <span className="text-foreground font-semibold">
            {formatNumber(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── App status row ───────────────────────────────────────────────────────────
function AppStatusRow({
  platform,
  icon: Icon,
  forceUpdate,
  version,
}: {
  platform: string;
  icon: typeof AndroidLogo;
  forceUpdate: boolean;
  version?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent">
          <Icon weight="duotone" size={18} className="text-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{platform}</p>
          {version && (
            <p className="text-xs text-muted-foreground">v{version}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <StatusBadge
          status={forceUpdate ? 'warning' : 'success'}
          label={forceUpdate ? 'Update required' : 'Up to date'}
        />
        {/* Visual-only force update toggle */}
        <button
          type="button"
          aria-label={`Toggle force update for ${platform}`}
          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
            forceUpdate ? 'bg-amber-500' : 'bg-zinc-600'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
              forceUpdate ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const {
    data: stats,
    isLoading: statsLoading,
  } = useQuery<DashboardStats>({
    queryKey: ['stats'],
    queryFn: getDashboardStats,
    staleTime: 30_000,
  });

  const {
    data: analytics,
    isLoading: analyticsLoading,
  } = useQuery<AnalyticsPoint[]>({
    queryKey: ['analytics', '7d'],
    queryFn: () => getAnalytics('7d'),
    staleTime: 60_000,
  });

  const isLoadingAll = statsLoading || analyticsLoading;

  return (
    <div className="space-y-5">
      {/* ── Stats grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {isLoadingAll ? (
          Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label="Total Users"
              value={stats?.totalUsers ?? 0}
              icon={<Users weight="duotone" size={19} />}
              accent
            />
            <StatCard
              label="Active (30d)"
              value={stats?.activeUsers ?? 0}
              icon={<Lightning weight="duotone" size={19} />}
            />
            <StatCard
              label="New (7d)"
              value={stats?.recentRegistrations ?? 0}
              icon={<UserPlus weight="duotone" size={19} />}
            />
            <StatCard
              label="Total Messages"
              value={stats?.totalMessages ?? 0}
              icon={<Article weight="duotone" size={19} />}
            />
            <StatCard
              label="Banned Users"
              value={stats?.bannedUsers ?? 0}
              icon={<Warning weight="duotone" size={19} />}
              danger={(stats?.bannedUsers ?? 0) > 0}
            />
          </>
        )}
      </div>

      {/* ── Area chart: User Growth ── */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              User Growth
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Last 7 days — total vs. active
            </p>
          </div>
        </div>

        {analyticsLoading ? (
          <SkeletonBlock className="h-[260px] w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart
              data={analytics ?? []}
              margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
            >
              <defs>
                <linearGradient id="brandGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(92,184,92,0.3)" />
                  <stop offset="100%" stopColor="rgba(92,184,92,0)" />
                </linearGradient>
                <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(59,130,246,0.25)" />
                  <stop offset="100%" stopColor="rgba(59,130,246,0)" />
                </linearGradient>
              </defs>

              <CartesianGrid
                stroke="var(--color-border)"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) =>
                  v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)
                }
              />
              <Tooltip content={<ChartTooltip />} />

              <Area
                type="monotone"
                dataKey="users"
                name="users"
                stroke="#5CB85C"
                strokeWidth={2}
                fill="url(#brandGradient)"
                dot={false}
                activeDot={{ r: 4, fill: '#5CB85C', strokeWidth: 0 }}
              />
              <Area
                type="monotone"
                dataKey="active"
                name="active"
                stroke="#3B82F6"
                strokeWidth={2}
                fill="url(#blueGradient)"
                dot={false}
                activeDot={{ r: 4, fill: '#3B82F6', strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {/* Chart legend */}
        <div className="flex items-center gap-5 mt-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-3 h-0.5 rounded bg-brand inline-block" />
            Total users
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-3 h-0.5 rounded bg-blue-500 inline-block" />
            Active users
          </div>
        </div>
      </div>

      {/* ── Two-column section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Activity */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">
              Recent Activity
            </h2>
            <button
              type="button"
              className="text-xs text-brand hover:underline"
            >
              View all
            </button>
          </div>

          {isLoadingAll ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <SkeletonBlock className="h-8 w-8 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <SkeletonBlock className="h-3 w-40" />
                    <SkeletonBlock className="h-2.5 w-28" />
                  </div>
                  <SkeletonBlock className="h-2.5 w-14" />
                </div>
              ))}
            </div>
          ) : (
            <ul className="space-y-1 -mx-1">
              {RECENT_ACTIVITY.map((item) => {
                const Icon = item.icon;
                return (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-accent transition-colors"
                  >
                    {/* Colored dot indicator */}
                    <div
                      className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0"
                      style={{ background: `${item.color}18` }}
                    >
                      <Icon
                        weight="duotone"
                        size={17}
                        style={{ color: item.color }}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {item.label}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.detail}
                      </p>
                    </div>

                    <span className="text-xs text-muted-foreground flex-shrink-0 tabular-nums">
                      {item.time}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* App Status */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">
              App Status
            </h2>
            <span className="text-[11px] text-muted-foreground">Force update control</span>
          </div>

          {statsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-border">
                  <div className="flex items-center gap-3">
                    <SkeletonBlock className="h-8 w-8 rounded-lg" />
                    <div className="space-y-1.5">
                      <SkeletonBlock className="h-3.5 w-20" />
                      <SkeletonBlock className="h-2.5 w-12" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <SkeletonBlock className="h-5 w-24 rounded-full" />
                    <SkeletonBlock className="h-5 w-9 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <AppStatusRow
                platform="Android"
                icon={AndroidLogo}
                forceUpdate={stats?.android?.forceUpdate ?? false}
                version={stats?.android?.latestVersion}
              />
              <AppStatusRow
                platform="iOS"
                icon={AppleLogo}
                forceUpdate={stats?.ios?.forceUpdate ?? false}
                version={stats?.ios?.latestVersion}
              />
            </div>
          )}

          {/* Post-status info card */}
          <div className="mt-4 rounded-lg bg-accent border border-border p-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Enabling{' '}
              <span className="text-amber-400 font-medium">Force Update</span>{' '}
              will prompt all users on older versions to update before
              continuing. Changes take effect within 60 seconds.
            </p>
          </div>

          {/* Additional metric: Post breakdown bar chart */}
          {!statsLoading && analytics && analytics.length > 0 && (
            <div className="mt-5">
              <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                Daily posts (7d)
              </p>
              <ResponsiveContainer width="100%" height={80}>
                <BarChart
                  data={analytics}
                  margin={{ top: 0, right: 0, left: -32, bottom: 0 }}
                  barSize={10}
                >
                  <CartesianGrid
                    stroke="var(--color-border)"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar
                    dataKey="posts"
                    name="posts"
                    fill="#5CB85C"
                    radius={[3, 3, 0, 0]}
                    opacity={0.85}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
