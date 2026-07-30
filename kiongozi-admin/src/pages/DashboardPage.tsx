import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  AndroidLogo,
  AppleLogo,
  UserPlus,
  Flag,
  ChatCircle,
  Star,
  Trash,
} from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { getDashboardStats } from '../api/client';
import { formatNumber } from '../lib/utils';
import type { DashboardStats, AnalyticsPoint } from '../types';

// ─── Demo analytics data (backend not yet built) ──────────────────────────────
function buildDemoData(days: number): AnalyticsPoint[] {
  const pts: AnalyticsPoint[] = [];
  let userBase = 1180;
  let postBase = 44;
  const now = new Date('2026-07-30');
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const seed = (i * 137 + days * 17) % 100;
    userBase += 12 + Math.floor(seed * 0.28);
    const active = Math.round(userBase * (0.58 + (seed % 18) * 0.002));
    postBase = Math.max(30, postBase + Math.floor((seed % 20) - 9));
    pts.push({ date: iso, users: userBase, active, posts: postBase });
  }
  return pts;
}
const DEMO_7D = buildDemoData(7);

// ─── Activity feed ────────────────────────────────────────────────────────────
const ACTIVITY = [
  { id: 1, icon: UserPlus, color: '#5CB85C', label: 'New user joined',        detail: 'fatuma.ali@example.com',      time: '2 min ago'  },
  { id: 2, icon: Flag,     color: '#EF4444', label: 'Post flagged for review', detail: 'Post #4821 — hate speech',    time: '11 min ago' },
  { id: 3, icon: UserPlus, color: '#5CB85C', label: 'New user joined',         detail: 'john.doe@example.com',        time: '25 min ago' },
  { id: 4, icon: ChatCircle, color: '#3B82F6', label: 'Comment reported',      detail: 'Comment #9204 — spam',        time: '1 hr ago'   },
  { id: 5, icon: Star,     color: '#F59E0B', label: 'App review received',     detail: '5 stars — "Amazing app!"',   time: '2 hr ago'   },
  { id: 6, icon: Trash,    color: '#8B5CF6', label: 'Account deleted',         detail: 'user_id: 00f3a91c',          time: '3 hr ago'   },
];

// ─── Custom tooltip ───────────────────────────────────────────────────────────
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
  const d = new Date(String(label));
  const dateStr = `${d.toLocaleString('en', { month: 'short' })} ${d.getDate()}`;
  return (
    <div style={{
      background: 'hsl(240 6% 10%)',
      border: '1px solid hsl(240 3.7% 18%)',
      borderRadius: 8,
      padding: '9px 13px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      minWidth: 130,
    }}>
      <p style={{ fontSize: 11, color: 'hsl(240 5% 50%)', marginBottom: 7, fontWeight: 500 }}>{dateStr}</p>
      {payload.map((e, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: i < payload.length - 1 ? 5 : 0 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: e.color, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: 'hsl(240 5% 65%)' }}>{e.name}</span>
          <span style={{ fontSize: 12, color: 'hsl(0 0% 96%)', fontWeight: 600, marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>
            {formatNumber(e.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skel({ w, h, className = '' }: { w?: string; h?: string; className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-accent ${className}`}
      style={{ width: w, height: h }}
    />
  );
}

// ─── App platform row ─────────────────────────────────────────────────────────
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
      <div className="flex items-center gap-3">
        <span className={`text-[11px] font-medium tabular-nums ${forceUpdate ? 'text-amber-400' : 'text-brand'}`}>
          {forceUpdate ? 'Update required' : 'Up to date'}
        </span>
        <button
          type="button"
          aria-label={`Toggle force update for ${label}`}
          className={`relative inline-flex h-[18px] w-8 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
            forceUpdate ? 'bg-amber-500' : 'bg-zinc-600'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition duration-200 ${
              forceUpdate ? 'translate-x-[14px]' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['stats'],
    queryFn: getDashboardStats,
    staleTime: 30_000,
  });

  const TICK = { fontSize: 11, fill: 'hsl(240 5% 46%)' } as const;

  return (
    <div>
      {/* ── Stats strip ── */}
      <div className="flex items-start gap-0 mb-8 flex-wrap">
        {[
          { label: 'Total Users',    value: stats?.totalUsers          },
          { label: 'Active (30d)',   value: stats?.activeUsers         },
          { label: 'New (7d)',       value: stats?.recentRegistrations },
          { label: 'Messages',       value: stats?.totalMessages       },
          { label: 'Banned',         value: stats?.bannedUsers, danger: true },
        ].map((s, i) => (
          <div key={s.label} className={`pr-8 ${i > 0 ? 'pl-8 border-l border-border' : ''}`}>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.08em] mb-0.5">
              {s.label}
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

      {/* ── User growth chart ── */}
      <div className="border-t border-border pt-5 mb-8">
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.08em]">User Growth</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Last 7 days — registered vs. active</p>
          </div>
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
              <span style={{ display: 'inline-block', width: 16, height: 2, background: '#5CB85C', borderRadius: 1 }} />
              <span className="text-[11px] text-muted-foreground">Total</span>
            </div>
            <div className="flex items-center gap-2">
              <span style={{ display: 'inline-block', width: 16, height: 2, background: '#60A5FA', borderRadius: 1 }} />
              <span className="text-[11px] text-muted-foreground">Active</span>
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={DEMO_7D} margin={{ top: 4, right: 2, left: -22, bottom: 0 }}>
            <defs>
              <linearGradient id="dbGradUsers" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5CB85C" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#5CB85C" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="dbGradActive" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#60A5FA" stopOpacity={0.16} />
                <stop offset="100%" stopColor="#60A5FA" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={TICK} axisLine={false} tickLine={false}
              tickFormatter={(d: string) => { const dt = new Date(d); return `${dt.toLocaleString('en',{month:'short'})} ${dt.getDate()}`; }}
            />
            <YAxis tick={TICK} axisLine={false} tickLine={false}
              tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : String(v)}
            />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="users" name="Total" stroke="#5CB85C" strokeWidth={1.5} fill="url(#dbGradUsers)" dot={false} activeDot={{ r: 4, fill: '#5CB85C', strokeWidth: 0 }} />
            <Area type="monotone" dataKey="active" name="Active" stroke="#60A5FA" strokeWidth={1.5} fill="url(#dbGradActive)" dot={false} activeDot={{ r: 4, fill: '#60A5FA', strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Two column ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-8">

        {/* Activity feed */}
        <div className="border-t border-border pt-5">
          <div className="flex items-baseline justify-between mb-4">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.08em]">Recent Activity</p>
            <button type="button" className="text-[11px] text-brand hover:text-brand/80 transition-colors">View all</button>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skel w="6px" h="6px" className="rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skel w="140px" h="11px" />
                    <Skel w="100px" h="10px" />
                  </div>
                  <Skel w="48px" h="10px" />
                </div>
              ))}
            </div>
          ) : (
            <ul className="space-y-0">
              {ACTIVITY.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.id} className="flex items-start gap-3 py-2.5 border-b border-border/40 last:border-0 group">
                    <span
                      className="mt-[5px] w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: item.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-foreground leading-snug truncate">{item.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{item.detail}</p>
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums pt-0.5">{item.time}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* App status + post volume mini chart */}
        <div className="border-t border-border pt-5 space-y-7">

          {/* Platform status */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.08em] mb-1">App Status</p>
            {isLoading ? (
              <div className="space-y-3 mt-3">
                {[0,1].map(i => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-border/60">
                    <div className="flex items-center gap-2.5">
                      <Skel w="16px" h="16px" />
                      <div className="space-y-1.5"><Skel w="60px" h="13px" /><Skel w="36px" h="10px" /></div>
                    </div>
                    <div className="flex items-center gap-3"><Skel w="72px" h="11px" /><Skel w="32px" h="18px" className="rounded-full" /></div>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <PlatformRow label="Android" icon={AndroidLogo} forceUpdate={stats?.android?.forceUpdate ?? false} version={stats?.android?.latestVersion} />
                <PlatformRow label="iOS"     icon={AppleLogo}   forceUpdate={stats?.ios?.forceUpdate    ?? false} version={stats?.ios?.latestVersion}     />
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
              Force update prompts users on older versions to update before continuing. Takes effect within 60 s.
            </p>
          </div>

          {/* Posts mini chart */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.08em] mb-3">Daily Posts (7d)</p>
            <ResponsiveContainer width="100%" height={88}>
              <BarChart data={DEMO_7D} margin={{ top: 0, right: 2, left: -28, bottom: 0 }} barSize={14}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(240 5% 46%)' }} axisLine={false} tickLine={false}
                  tickFormatter={(d: string) => { const dt = new Date(d); return `${dt.toLocaleString('en',{month:'short'})} ${dt.getDate()}`; }}
                />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(240 5% 46%)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="posts" name="Posts" fill="#5CB85C" radius={[2, 2, 0, 0]} opacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>
      </div>
    </div>
  );
}
