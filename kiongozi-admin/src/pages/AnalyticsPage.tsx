import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartLine, FileText, Heartbeat, Users } from '@phosphor-icons/react';
import { getAnalytics } from '../api/client';
import { AnalyticsPoint } from '../types';
import { cn, formatDate, formatNumber } from '../lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

type Range = '7d' | '30d' | '90d';

const RANGE_LABELS: Record<Range, string> = {
  '7d': 'last 7 days',
  '30d': 'last 30 days',
  '90d': 'last 90 days',
};

// ─── Chart constants ─────────────────────────────────────────────────────────

const TICK_STYLE = { fontSize: 11, fill: 'var(--color-muted-foreground)' } as const;

const GRID_PROPS = {
  stroke: 'var(--color-border)',
  strokeDasharray: '4 4',
  vertical: false,
} as const;

const TOOLTIP_CONTENT_STYLE = {
  background: 'var(--color-popover)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  fontSize: 12,
  color: 'var(--color-foreground)',
} as const;

// ─── Skeletons ────────────────────────────────────────────────────────────────

function ChartSkeleton({ height }: { height: number }) {
  return (
    <div
      className="animate-pulse rounded-lg bg-accent"
      style={{ height }}
    />
  );
}

function StatCardSkeleton() {
  return (
    <div className="card space-y-2">
      <div className="h-5 w-5 rounded bg-accent animate-pulse" />
      <div className="h-8 w-28 rounded bg-accent animate-pulse" />
      <div className="h-4 w-36 rounded bg-accent animate-pulse" />
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function RangeSelector({
  value,
  onChange,
}: {
  value: Range;
  onChange: (r: Range) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-accent p-1">
      {(['7d', '30d', '90d'] as Range[]).map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          className={cn(
            'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
            value === r
              ? 'bg-card text-brand shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {r}
        </button>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>('30d');

  const { data: analytics, isLoading } = useQuery<AnalyticsPoint[]>({
    queryKey: ['analytics', range],
    queryFn: () => getAnalytics(range),
    placeholderData: prev => prev,
  });

  // ── Derived data ────────────────────────────────────────────────────────────

  const engagementData = useMemo(
    () =>
      (analytics ?? []).map((p) => ({
        ...p,
        engagement:
          p.users > 0
            ? parseFloat(((p.active / p.users) * 100).toFixed(1))
            : 0,
      })),
    [analytics],
  );

  const stats = useMemo(() => {
    const points = analytics ?? [];
    if (points.length === 0) return { totalUsers: 0, totalPosts: 0, avgActive: 0 };
    const totalUsers = points.reduce((acc, p) => acc + p.users, 0);
    const totalPosts = points.reduce((acc, p) => acc + p.posts, 0);
    const avgActive = Math.round(
      points.reduce((acc, p) => acc + p.active, 0) / points.length,
    );
    return { totalUsers, totalPosts, avgActive };
  }, [analytics]);

  const dateRangeLabel = useMemo(() => {
    const points = analytics ?? [];
    if (points.length < 2) return '';
    return `${formatDate(points[0].date)} – ${formatDate(points[points.length - 1].date)}`;
  }, [analytics]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-header">Analytics</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Platform growth and engagement metrics
          </p>
        </div>
        <RangeSelector value={range} onChange={setRange} />
      </div>

      {/* ── User Growth (full width) ─────────────────────────────────────── */}
      <div className="card">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="font-semibold text-foreground">User Growth</h2>
            {dateRangeLabel && (
              <p className="mt-0.5 text-xs text-muted-foreground">{dateRangeLabel}</p>
            )}
          </div>
          <ChartLine size={18} weight="duotone" className="text-muted-foreground" />
        </div>

        {isLoading ? (
          <ChartSkeleton height={300} />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              data={analytics}
              margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="gradUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5CB85C" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#5CB85C" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradActive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis
                dataKey="date"
                tick={TICK_STYLE}
                axisLine={false}
                tickLine={false}
                tickFormatter={(d: string) => formatDate(d)}
              />
              <YAxis
                tick={TICK_STYLE}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => formatNumber(v)}
              />
              <Tooltip
                contentStyle={TOOLTIP_CONTENT_STYLE}
                labelFormatter={(d) => formatDate(String(d))}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Area
                type="monotone"
                dataKey="users"
                name="New Users"
                stroke="#5CB85C"
                strokeWidth={2}
                fill="url(#gradUsers)"
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="active"
                name="Active Users"
                stroke="#3B82F6"
                strokeWidth={2}
                fill="url(#gradActive)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Post Volume + Engagement Rate (two-column) ───────────────────── */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Post Volume */}
        <div className="card">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="font-semibold text-foreground">Post Volume</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Daily posts created</p>
            </div>
            <FileText size={18} weight="duotone" className="text-muted-foreground" />
          </div>

          {isLoading ? (
            <ChartSkeleton height={220} />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={analytics}
                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
              >
                <CartesianGrid {...GRID_PROPS} />
                <XAxis
                  dataKey="date"
                  tick={TICK_STYLE}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(d: string) => formatDate(d)}
                />
                <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={TOOLTIP_CONTENT_STYLE}
                  labelFormatter={(d) => formatDate(String(d))}
                />
                <Bar
                  dataKey="posts"
                  name="Posts"
                  fill="#5CB85C"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Engagement Rate */}
        <div className="card">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="font-semibold text-foreground">Engagement Rate</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Active users as % of total
              </p>
            </div>
            <Heartbeat size={18} weight="duotone" className="text-muted-foreground" />
          </div>

          {isLoading ? (
            <ChartSkeleton height={220} />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart
                data={engagementData}
                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
              >
                <CartesianGrid {...GRID_PROPS} />
                <XAxis
                  dataKey="date"
                  tick={TICK_STYLE}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(d: string) => formatDate(d)}
                />
                <YAxis
                  tick={TICK_STYLE}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip
                  contentStyle={TOOLTIP_CONTENT_STYLE}
                  labelFormatter={(d) => formatDate(String(d))}
                  formatter={(v: number) => [`${v}%`, 'Engagement']}
                />
                <Line
                  type="monotone"
                  dataKey="engagement"
                  name="Engagement %"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#3B82F6', strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Summary stats (3-col) ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <div className="card">
              <Users size={20} weight="duotone" className="mb-2 text-brand" />
              <p className="text-3xl font-bold text-foreground">
                {formatNumber(stats.totalUsers)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                New users in {RANGE_LABELS[range]}
              </p>
            </div>

            <div className="card">
              <FileText size={20} weight="duotone" className="mb-2 text-brand" />
              <p className="text-3xl font-bold text-foreground">
                {formatNumber(stats.totalPosts)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">Total posts created</p>
            </div>

            <div className="card">
              <Heartbeat size={20} weight="duotone" className="mb-2 text-brand" />
              <p className="text-3xl font-bold text-foreground">
                {formatNumber(stats.avgActive)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">Avg daily active users</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
