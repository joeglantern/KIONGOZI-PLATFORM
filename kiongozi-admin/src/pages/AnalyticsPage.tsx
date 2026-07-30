import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cn, formatNumber } from '../lib/utils';
import type { AnalyticsPoint } from '../types';

// ─── Types ──────────────────────────────────────────────────────────────────

type Range = '7d' | '30d' | '90d';

// ─── Demo data (backend endpoint not yet built) ───────────────────────────────

function buildDemoData(days: number): AnalyticsPoint[] {
  const pts: AnalyticsPoint[] = [];
  let userBase = 1180;
  let postBase = 44;
  const now = new Date('2026-07-30');

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);

    // Seed-based pseudo-random that stays deterministic
    const seed = (i * 137 + days * 17) % 100;
    const growth = 12 + Math.floor(seed * 0.28);
    userBase += growth;
    const active = Math.round(userBase * (0.58 + (seed % 18) * 0.002));
    postBase = Math.max(30, postBase + Math.floor((seed % 20) - 9));

    pts.push({ date: iso, users: userBase, active, posts: postBase });
  }
  return pts;
}

const DEMO: Record<Range, AnalyticsPoint[]> = {
  '7d':  buildDemoData(7),
  '30d': buildDemoData(30),
  '90d': buildDemoData(90),
};

// ─── Custom tooltip ───────────────────────────────────────────────────────────

interface TooltipEntry {
  name: string;
  value: number;
  color: string;
  unit?: string;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: 'hsl(240 6% 10%)',
        border: '1px solid hsl(240 3.7% 18%)',
        borderRadius: 8,
        padding: '9px 13px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        minWidth: 140,
      }}
    >
      <p style={{ fontSize: 11, color: 'hsl(240 5% 50%)', marginBottom: 7, fontWeight: 500 }}>
        {label}
      </p>
      {payload.map((e, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: i < payload.length - 1 ? 5 : 0 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: e.color, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: 'hsl(240 5% 65%)' }}>{e.name}</span>
          <span style={{ fontSize: 12, color: 'hsl(0 0% 96%)', fontWeight: 600, marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>
            {formatNumber(e.value)}{e.unit ?? ''}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Chart axis constants ────────────────────────────────────────────────────

const TICK = { fontSize: 11, fill: 'hsl(240 5% 46%)' } as const;

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleString('en', { month: 'short' })} ${d.getDate()}`;
}

// ─── Range selector ──────────────────────────────────────────────────────────

function RangeSelector({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  const ranges: Range[] = ['7d', '30d', '90d'];
  return (
    <div className="flex items-center gap-3">
      {ranges.map((r, i) => (
        <div key={r} className="flex items-center gap-3">
          {i > 0 && <span className="text-border text-[10px] select-none">|</span>}
          <button
            onClick={() => onChange(r)}
            className={cn(
              'text-[12px] font-medium transition-colors leading-none',
              value === r ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {r}
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Section header ──────────────────────────────────────────────────────────

function SectionHead({ label, sub, value }: { label: string; sub?: string; value?: string }) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.08em]">{label}</p>
        {value && (
          <p className="text-2xl font-bold text-foreground tabular-nums leading-tight mt-0.5">{value}</p>
        )}
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>('30d');
  const data = DEMO[range];

  const engagementData = useMemo(
    () =>
      data.map((p) => ({
        ...p,
        engagement: p.users > 0 ? parseFloat(((p.active / p.users) * 100).toFixed(1)) : 0,
      })),
    [data],
  );

  const totals = useMemo(() => {
    const first = data[0]?.users ?? 0;
    const last  = data[data.length - 1]?.users ?? 0;
    const newUsers = last - first;
    const totalPosts = data.reduce((s, p) => s + p.posts, 0);
    const avgActive = Math.round(data.reduce((s, p) => s + p.active, 0) / (data.length || 1));
    const avgEngagement = data.length
      ? parseFloat((data.reduce((s, p) => s + (p.users > 0 ? (p.active / p.users) * 100 : 0), 0) / data.length).toFixed(1))
      : 0;
    return { newUsers, totalPosts, avgActive, avgEngagement };
  }, [data]);

  return (
    <div className="space-y-0">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between mb-7">
        <div className="flex gap-6">
          {/* Mini stats */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.08em]">New Users</p>
            <p className="text-[22px] font-bold text-foreground tabular-nums leading-tight">+{formatNumber(totals.newUsers)}</p>
          </div>
          <div className="border-l border-border pl-6">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.08em]">Posts</p>
            <p className="text-[22px] font-bold text-foreground tabular-nums leading-tight">{formatNumber(totals.totalPosts)}</p>
          </div>
          <div className="border-l border-border pl-6">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.08em]">Avg Active / day</p>
            <p className="text-[22px] font-bold text-foreground tabular-nums leading-tight">{formatNumber(totals.avgActive)}</p>
          </div>
          <div className="border-l border-border pl-6">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.08em]">Avg Engagement</p>
            <p className="text-[22px] font-bold text-foreground tabular-nums leading-tight">{totals.avgEngagement}%</p>
          </div>
        </div>

        <RangeSelector value={range} onChange={setRange} />
      </div>

      {/* ── User growth — full width ── */}
      <div className="border-t border-border pt-5 mb-8">
        <SectionHead
          label="User Growth"
          sub="Total registered vs. daily active"
        />
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data} margin={{ top: 4, right: 2, left: -22, bottom: 0 }}>
            <defs>
              <linearGradient id="gUsers" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5CB85C" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#5CB85C" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gActive" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#60A5FA" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#60A5FA" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tick={TICK}
              axisLine={false}
              tickLine={false}
              tickFormatter={fmtDate}
              interval={Math.max(0, Math.floor(data.length / 6) - 1)}
            />
            <YAxis
              tick={TICK}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
            />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="users" name="Total" stroke="#5CB85C" strokeWidth={1.5} fill="url(#gUsers)" dot={false} activeDot={{ r: 4, fill: '#5CB85C', strokeWidth: 0 }} />
            <Area type="monotone" dataKey="active" name="Active" stroke="#60A5FA" strokeWidth={1.5} fill="url(#gActive)" dot={false} activeDot={{ r: 4, fill: '#60A5FA', strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex items-center gap-5 mt-3">
          <div className="flex items-center gap-2">
            <span style={{ display: 'inline-block', width: 20, height: 2, background: '#5CB85C', borderRadius: 1 }} />
            <span className="text-[11px] text-muted-foreground">Total registered</span>
          </div>
          <div className="flex items-center gap-2">
            <span style={{ display: 'inline-block', width: 20, height: 2, background: '#60A5FA', borderRadius: 1 }} />
            <span className="text-[11px] text-muted-foreground">Daily active</span>
          </div>
        </div>
      </div>

      {/* ── Two-column: Post Volume + Engagement ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
        {/* Post Volume */}
        <div className="border-t border-border pt-5">
          <SectionHead label="Post Volume" sub="Posts created per day" />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} margin={{ top: 4, right: 2, left: -22, bottom: 0 }} barSize={range === '7d' ? 28 : range === '30d' ? 10 : 5}>
              <XAxis
                dataKey="date"
                tick={TICK}
                axisLine={false}
                tickLine={false}
                tickFormatter={fmtDate}
                interval={Math.max(0, Math.floor(data.length / 5) - 1)}
              />
              <YAxis tick={TICK} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="posts" name="Posts" fill="#5CB85C" radius={[2, 2, 0, 0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Engagement Rate */}
        <div className="border-t border-border pt-5">
          <SectionHead label="Engagement Rate" sub="Active users as % of total" />
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={engagementData} margin={{ top: 4, right: 2, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="gEng" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#A78BFA" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#A78BFA" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={TICK}
                axisLine={false}
                tickLine={false}
                tickFormatter={fmtDate}
                interval={Math.max(0, Math.floor(data.length / 5) - 1)}
              />
              <YAxis
                tick={TICK}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${v}%`}
                domain={['auto', 'auto']}
              />
              <Tooltip content={<ChartTooltip />} formatter={(v: number) => `${v}%`} />
              <Line
                type="monotone"
                dataKey="engagement"
                name="Engagement"
                stroke="#A78BFA"
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 4, fill: '#A78BFA', strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
