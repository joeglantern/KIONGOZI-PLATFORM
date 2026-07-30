import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AndroidLogo,
  AppleLogo,
  Info,
  Clipboard,
  CheckCircle,
  XCircle,
  Warning,
} from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import { getAppConfig, updateAppConfig, getHealthDetailed } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { AppConfig } from '../types';
import { cn } from '../lib/utils';

// ---------------------------------------------------------------------------
// Toggle pill
// ---------------------------------------------------------------------------
interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}

function Toggle({ checked, onChange, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex w-11 h-6 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand',
        checked ? 'bg-brand' : 'bg-zinc-600',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      <span
        className={cn(
          'absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Terminal command block
// ---------------------------------------------------------------------------
interface CommandBlockProps {
  command: string;
}

function CommandBlock({ command }: CommandBlockProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    toast.success('Copied!');
  };

  return (
    <div className="flex items-center gap-3 bg-zinc-900 border border-border rounded-lg px-4 py-3 font-mono text-sm">
      <span className="flex-1 text-green-400 break-all">{command}</span>
      <button
        type="button"
        onClick={handleCopy}
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        title="Copy to clipboard"
      >
        <Clipboard weight="duotone" size={18} />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Platform toggle card
// ---------------------------------------------------------------------------
interface PlatformCardProps {
  platform: 'android' | 'ios';
  config: AppConfig;
  isAdmin: boolean;
  onToggleForceUpdate: (platform: 'android' | 'ios', value: boolean) => void;
  isPending: boolean;
}

function PlatformCard({
  platform,
  config,
  isAdmin,
  onToggleForceUpdate,
  isPending,
}: PlatformCardProps) {
  const isAndroid = platform === 'android';
  const Icon = isAndroid ? AndroidLogo : AppleLogo;
  const label = isAndroid ? 'Android' : 'iOS';

  const forceUpdateEnabled = isAndroid
    ? config.android?.force_update_required ?? false
    : config.ios?.force_update_required ?? false;

  const buildLabel = isAndroid ? 'Min Version Code' : 'Min Build Number';
  const buildValue = isAndroid
    ? config.android?.min_version_code
    : config.ios?.min_build_number;

  const version = isAndroid ? config.android?.current_version : config.ios?.current_version;

  return (
    <div className="bg-accent border border-border rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Icon weight="duotone" size={28} className="text-brand" />
        <span className="font-semibold text-lg">{label}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground">Current Version</p>
          <p className="font-medium">{version ?? '—'}</p>
        </div>
        <div>
          <p className="text-muted-foreground">{buildLabel}</p>
          <p className="font-medium">{buildValue ?? '—'}</p>
        </div>
      </div>

      {isAdmin && (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Force Update Required</p>
            <p className="text-xs text-muted-foreground">
              Block users on older builds
            </p>
          </div>
          <Toggle
            checked={forceUpdateEnabled}
            onChange={(val) => onToggleForceUpdate(platform, val)}
            disabled={isPending}
          />
        </div>
      )}

      {!isAdmin && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Force Update</span>
          <span
            className={cn(
              'font-medium',
              forceUpdateEnabled ? 'text-brand' : 'text-muted-foreground',
            )}
          >
            {forceUpdateEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function AppManagementPage() {
  const { hasRole } = useAuthStore();
  const isAdmin = hasRole('admin');
  const queryClient = useQueryClient();

  const [forceUpdateMessage, setForceUpdateMessage] = useState('');

  const {
    data: config,
    isLoading,
    isError,
  } = useQuery<AppConfig>({
    queryKey: ['appConfig'],
    queryFn: getAppConfig,
  });

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: getHealthDetailed,
    enabled: isAdmin,
    refetchInterval: 30_000,
  });

  // Populate the message input when config loads for the first time
  useEffect(() => {
    if (config?.force_update_message) {
      setForceUpdateMessage(config.force_update_message)
    }
  }, [config?.force_update_message])

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<AppConfig>) => updateAppConfig(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appConfig'] });
      toast.success('Config updated');
    },
    onError: () => {
      toast.error('Failed to update config');
    },
  });

  const handleToggleForceUpdate = (
    platform: 'android' | 'ios',
    value: boolean,
  ) => {
    if (!config) return;
    updateMutation.mutate({
      [platform]: {
        ...config[platform],
        force_update_required: value,
      },
    });
  };

  const handleSaveMessage = () => {
    updateMutation.mutate({ force_update_message: forceUpdateMessage });
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading app config…
      </div>
    );
  }

  if (isError || !config) {
    return (
      <div className="flex items-center justify-center h-64 text-red-400">
        Failed to load app configuration.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">App Management</h1>
        <p className="text-muted-foreground mt-1">
          Control mobile releases, force-update flags, and OTA deployments.
        </p>
      </div>

      {/* ── 1. Force Update Control ── */}
      <section className="card space-y-5">
        <h2 className="text-lg font-semibold">Force Update Control</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PlatformCard
            platform="android"
            config={config}
            isAdmin={isAdmin}
            onToggleForceUpdate={handleToggleForceUpdate}
            isPending={updateMutation.isPending}
          />
          <PlatformCard
            platform="ios"
            config={config}
            isAdmin={isAdmin}
            onToggleForceUpdate={handleToggleForceUpdate}
            isPending={updateMutation.isPending}
          />
        </div>

        {isAdmin && (
          <div className="space-y-2">
            <label className="text-sm font-medium block" htmlFor="force-msg">
              Force Update Message
            </label>
            <div className="flex gap-3">
              <input
                id="force-msg"
                type="text"
                className="input-base flex-1"
                value={forceUpdateMessage}
                onChange={(e) => setForceUpdateMessage(e.target.value)}
                placeholder="Please update the app to continue."
              />
              <button
                type="button"
                className="btn-primary shrink-0"
                onClick={handleSaveMessage}
                disabled={updateMutation.isPending}
              >
                Save
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── 2. App Config Details ── */}
      <section className="card space-y-4">
        <h2 className="text-lg font-semibold">App Config Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
              <AndroidLogo weight="duotone" size={16} />
              Android
            </div>
            <InfoRow label="Min Version Code" value={config.android?.min_version_code ?? '—'} />
            <InfoRow label="Store URL" value={config.android?.store_url ?? '—'} truncate />
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
              <AppleLogo weight="duotone" size={16} />
              iOS
            </div>
            <InfoRow label="Min Build Number" value={config.ios?.min_build_number ?? '—'} />
            <InfoRow label="Store URL" value={config.ios?.store_url ?? '—'} truncate />
          </div>
        </div>
      </section>

      {/* ── 3. OTA Instructions ── */}
      <section className="card space-y-4">
        <div className="flex items-center gap-2">
          <Info weight="duotone" size={20} className="text-brand" />
          <h2 className="text-lg font-semibold">Deploy OTA Update</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Run these commands from your project root to push an over-the-air
          update to production without a store release.
        </p>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <AppleLogo weight="duotone" size={13} /> iOS
            </p>
            <CommandBlock command="eas update --branch production --platform ios" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <AndroidLogo weight="duotone" size={13} /> Android
            </p>
            <CommandBlock command="eas update --branch production --platform android" />
          </div>
        </div>
      </section>

      {/* ── 4. System Health ── */}
      {isAdmin && health && (
        <section className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">System Health</h2>
            <span className="text-xs text-muted-foreground">
              {health.timestamp ? new Date(health.timestamp as string).toLocaleTimeString() : ''}
            </span>
          </div>

          {/* Overall + services */}
          <div className="flex flex-wrap gap-3">
            <HealthPill service="overall" status={health.status as string} />
            {health.services && typeof health.services === 'object' &&
              Object.entries(health.services as Record<string, string>).map(([svc, st]) => (
                <HealthPill key={svc} service={svc} status={st} />
              ))
            }
          </div>

          {/* Runtime info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <InfoRow label="Uptime" value={
              typeof health.uptime === 'number'
                ? `${Math.floor((health.uptime as number) / 3600)}h ${Math.floor(((health.uptime as number) % 3600) / 60)}m`
                : '—'
            } />
            <InfoRow label="Node" value={(health.nodeVersion as string) ?? '—'} />
            <InfoRow label="Env" value={(health.environment as string) ?? '—'} />
            <InfoRow label="Platform" value={(health.platform as string) ?? '—'} />
          </div>

          {/* Memory */}
          {health.memory && typeof health.memory === 'object' && (() => {
            const m = health.memory as { heapUsed: number; heapTotal: number; rss: number }
            const toMB = (n: number) => `${Math.round(n / 1024 / 1024)} MB`
            return (
              <div className="grid grid-cols-3 gap-3 text-sm">
                <InfoRow label="Heap Used" value={toMB(m.heapUsed)} />
                <InfoRow label="Heap Total" value={toMB(m.heapTotal)} />
                <InfoRow label="RSS" value={toMB(m.rss)} />
              </div>
            )
          })()}

          {/* Errors */}
          {Array.isArray(health.errors) && (health.errors as string[]).length > 0 && (
            <div className="space-y-1">
              {(health.errors as string[]).map((e, i) => (
                <p key={i} className="text-xs text-red-400 font-mono">{e}</p>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
function InfoRow({
  label,
  value,
  truncate,
}: {
  label: string;
  value: string | number;
  truncate?: boolean;
}) {
  return (
    <div className="flex justify-between items-start gap-4 text-sm border-b border-border pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span
        className={cn('text-right font-medium', truncate && 'truncate max-w-[200px]')}
        title={String(value)}
      >
        {value}
      </span>
    </div>
  );
}

function HealthPill({ service, status }: { service: string; status: string }) {
  const ok = status === 'ok' || status === 'healthy' || status === 'up';
  const warn = status === 'degraded' || status === 'slow';

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border',
        ok
          ? 'bg-green-500/10 border-green-500/30 text-green-400'
          : warn
          ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
          : 'bg-red-500/10 border-red-500/30 text-red-400',
      )}
    >
      {ok ? (
        <CheckCircle weight="duotone" size={14} />
      ) : warn ? (
        <Warning weight="duotone" size={14} />
      ) : (
        <XCircle weight="duotone" size={14} />
      )}
      <span className="capitalize">{service.replace(/_/g, ' ')}</span>
      <span className="opacity-70">· {status}</span>
    </div>
  );
}
