import { AndroidLogo, AppleLogo } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { getDashboardStats, getAppConfig } from '../api/client';
import { formatNumber } from '../lib/utils';
import type { DashboardStats, AppConfig } from '../types';

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
