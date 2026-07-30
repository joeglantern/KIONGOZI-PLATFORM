import { AndroidLogo, AppleLogo } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { getDashboardStats, getAppConfig, getAnalytics, getConnectedUsers } from '../api/client';
import type { AnalyticsPoint } from '../api/client';
import { formatNumber } from '../lib/utils';
import type { DashboardStats, AppConfig } from '../types';

function fmt(d: string) {
  const dt = new Date(d);
  return `${dt.toLocaleString('en', { month: 'short' })} ${dt.getDate()}`;
}

function ChartTooltip({
  active, payload, label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
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
            {e.value}
          </span>
        </div>
      ))}
    </div>
  );
}

const TICK = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' } as const;

function Skel({ w, h, className = '' }: { w?: string; h?: string; className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-accent ${className}`}
      style={{ width: w, height: h }}
    />
  );
}

function PlatformRow({
  label,
  icon: Icon,
  version,
  forceUpdate,
}: {
  label: string;
  icon: typeof AndroidLogo;
  version?: string;
  forceUpdate: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-border/60 last:border-0">
      <div className="flex items-center gap-2.5">
        <Icon weight="duotone" size={16} className="text-muted-foreground shrink-0" />
        <div>
          <p className="text-[13px] font-medium text-foreground leading-none">{label}</p>
          {version && (
            <p className="text-[11px] text-muted-foreground mt-0.5">v{version}</p>
          )}
        </div>
      </div>
      <span className={`text-[12px] font-medium ${forceUpdate ? 'text-amber-400' : 'text-brand'}`}>
        {forceUpdate ? 'Update required' : 'Up to date'}
      </span>
    </div>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['stats'],
    queryFn: getDashboardStats,
    staleTime: 30_000,
  });

  const { data: appConfig } = useQuery<AppConfig>({
    queryKey: ['appConfig'],
    queryFn: getAppConfig,
    staleTime: 60_000,
  });

  const { data: analyticsData = [], isLoading: analyticsLoading } = useQuery<AnalyticsPoint[]>({
    queryKey: ['analytics', '7d'],
    queryFn: () => getAnalytics('7d'),
    staleTime: 60_000,
  });

  const { data: liveData } = useQuery<{ totalConnected: number }>({
    queryKey: ['connected-users'],
    queryFn: getConnectedUsers,
    refetchInterval: 30_000,
    retry: false,
  });

  return (
    <div>
      {/* ── Stats strip ── */}
      <div className="flex items-start gap-0 mb-8 flex-wrap">
        {[
          { label: 'Total Users',    value: stats?.totalUsers          },
          { label: 'Active (30d)',   value: stats?.activeUsers         },
          { label: 'New (7d)',       value: stats?.recentRegistrations },
          { label: 'Messages',       value: stats?.totalMessages       },
          { label: 'Online Now',     value: liveData?.totalConnected, live: true },
          { label: 'Banned',         value: stats?.bannedUsers, danger: true },
        ].map((s: { label: string; value?: number; danger?: boolean; live?: boolean }, i) => (
          <div key={s.label} className={`pr-8 ${i > 0 ? 'pl-8 border-l border-border' : ''}`}>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.08em] mb-0.5 flex items-center gap-1.5">
              {s.label}
              {s.live && (
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-60" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand" />
                </span>
              )}
            </p>
            {isLoading ? (
              <Skel w="52px" h="28px" className="mt-1" />
            ) : (
              <p className={`text-[22px] font-bold tabular-nums leading-tight ${s.danger && (s.value ?? 0) > 0 ? 'text-red-400' : 'text-foreground'}`}>
                {formatNumber(s.value ?? 0)}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* ── User Growth (7d) ── */}
      <div className="border-t border-border pt-5 mb-8">
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.08em]">User Growth</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">New & active users over the last 7 days</p>
          </div>
          <div className="flex items-center gap-5">
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
        {analyticsLoading ? (
          <div className="w-full animate-pulse rounded bg-accent" style={{ height: 160 }} />
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={analyticsData} margin={{ top: 4, right: 2, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="dashGradNew" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5CB85C" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#5CB85C" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="dashGradActive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#60A5FA" stopOpacity={0.16} />
                  <stop offset="100%" stopColor="#60A5FA" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={TICK} axisLine={false} tickLine={false} tickFormatter={fmt} />
              <YAxis tick={TICK} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="newUsers"    name="New"    stroke="#5CB85C" strokeWidth={1.5} fill="url(#dashGradNew)"    dot={false} activeDot={{ r: 4, fill: '#5CB85C',    strokeWidth: 0 }} />
              <Area type="monotone" dataKey="activeUsers" name="Active" stroke="#60A5FA" strokeWidth={1.5} fill="url(#dashGradActive)" dot={false} activeDot={{ r: 4, fill: '#60A5FA', strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── App Status ── */}
      <div className="border-t border-border pt-5 max-w-sm">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.08em] mb-1">
          App Status
        </p>
        {isLoading ? (
          <div className="space-y-3 mt-3">
            {[0, 1].map(i => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-border/60">
                <div className="flex items-center gap-2.5">
                  <Skel w="16px" h="16px" />
                  <Skel w="60px" h="13px" />
                </div>
                <Skel w="72px" h="12px" />
              </div>
            ))}
          </div>
        ) : (
          <div>
            <PlatformRow
              label="Android"
              icon={AndroidLogo}
              forceUpdate={appConfig?.android?.force_update_required ?? false}
              version={appConfig?.android?.current_version}
            />
            <PlatformRow
              label="iOS"
              icon={AppleLogo}
              forceUpdate={appConfig?.ios?.force_update_required ?? false}
              version={appConfig?.ios?.current_version}
            />
          </div>
        )}
        <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
          Force update prompts users on older builds to update before continuing.
        </p>
      </div>
    </div>
  );
}
