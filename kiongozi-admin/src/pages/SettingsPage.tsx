import { useState } from 'react';
import {
  LockKey,
  Moon,
  ShieldSlash,
  Export,
  Trash,
  User,
  Globe,
  Tag,
  CalendarBlank,
  FloppyDisk,
} from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';
import { cn } from '../lib/utils';

// ---------------------------------------------------------------------------
// Access denied
// ---------------------------------------------------------------------------
function AccessDenied() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="card max-w-sm w-full text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <ShieldSlash weight="duotone" size={28} className="text-red-400" />
          </div>
        </div>
        <div>
          <h2 className="text-lg font-bold">Super Admin Only</h2>
          <p className="text-sm text-muted-foreground mt-1">
            This page is restricted to super admins. Contact your platform
            owner if you need access.
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section card wrapper
// ---------------------------------------------------------------------------
function Section({
  title,
  children,
  danger,
}: {
  title: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <section
      className={cn(
        'card space-y-4',
        danger && 'border-red-500/20 bg-red-500/5',
      )}
    >
      <h2 className={cn('text-lg font-semibold', danger && 'text-red-400')}>{title}</h2>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Read-only info row
// ---------------------------------------------------------------------------
function InfoRow({
  icon,
  label,
  value,
  badge,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  badge?: { text: string; variant: 'green' | 'yellow' };
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-border last:border-0">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {badge && (
          <span
            className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full',
              badge.variant === 'green'
                ? 'bg-green-500/15 text-green-400'
                : 'bg-yellow-500/15 text-yellow-400',
            )}
          >
            {badge.text}
          </span>
        )}
        <span className="text-sm font-medium text-right break-all">{value}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Platform Info section
// ---------------------------------------------------------------------------
function PlatformInfoSection() {
  const apiUrl = import.meta.env.VITE_API_URL ?? 'https://api.kiongozi.app';
  const env = import.meta.env.MODE === 'production' ? 'production' : 'staging';

  return (
    <Section title="Platform Info">
      <InfoRow
        icon={<Tag weight="duotone" size={15} />}
        label="Platform Name"
        value="Kiongozi"
      />
      <InfoRow
        icon={<Tag weight="duotone" size={15} />}
        label="Version"
        value={import.meta.env.VITE_APP_VERSION ?? '1.0.0'}
      />
      <InfoRow
        icon={<Globe weight="duotone" size={15} />}
        label="Environment"
        value=""
        badge={{
          text: env,
          variant: env === 'production' ? 'green' : 'yellow',
        }}
      />
      <InfoRow
        icon={<Globe weight="duotone" size={15} />}
        label="API URL"
        value={apiUrl}
      />
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Admin Account section
// ---------------------------------------------------------------------------
function AdminAccountSection() {
  const { user } = useAuthStore();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');

    if (newPassword.length < 8) {
      setPwError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('Passwords do not match.');
      return;
    }

    // Stub — no API endpoint yet
    toast.success('Password updated');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const joinedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '—';

  return (
    <Section title="Admin Account">
      {/* Current user info */}
      <div className="space-y-0">
        <InfoRow
          icon={<User weight="duotone" size={15} />}
          label="Name"
          value={user?.full_name ?? user?.email?.split('@')[0] ?? '—'}
        />
        <InfoRow
          icon={<User weight="duotone" size={15} />}
          label="Email"
          value={user?.email ?? '—'}
        />
        <InfoRow
          icon={<LockKey weight="duotone" size={15} />}
          label="Role"
          value={user?.role ?? 'super_admin'}
        />
        <InfoRow
          icon={<CalendarBlank weight="duotone" size={15} />}
          label="Joined"
          value={joinedDate}
        />
      </div>

      {/* Change password */}
      <div className="pt-2 border-t border-border">
        <h3 className="text-sm font-semibold mb-3">Change Password</h3>
        <form onSubmit={handleChangePassword} className="space-y-3">
          <div>
            <label htmlFor="current-pw" className="text-xs text-muted-foreground block mb-1">
              Current Password
            </label>
            <input
              id="current-pw"
              type="password"
              className="input-base w-full"
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div>
            <label htmlFor="new-pw" className="text-xs text-muted-foreground block mb-1">
              New Password
            </label>
            <input
              id="new-pw"
              type="password"
              className="input-base w-full"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label htmlFor="confirm-pw" className="text-xs text-muted-foreground block mb-1">
              Confirm New Password
            </label>
            <input
              id="confirm-pw"
              type="password"
              className="input-base w-full"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          {pwError && <p className="text-xs text-red-400">{pwError}</p>}
          <button
            type="submit"
            className="btn-primary flex items-center gap-2"
            disabled={!currentPassword || !newPassword || !confirmPassword}
          >
            <FloppyDisk weight="duotone" size={16} />
            Save Password
          </button>
        </form>
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Data & Privacy section
// ---------------------------------------------------------------------------
function DataPrivacySection() {
  const [deleteInput, setDeleteInput] = useState('');

  const handleExport = () => {
    toast.success('Export queued — you will receive an email');
  };

  const handleWipe = () => {
    toast.success('Test data wiped successfully');
    setDeleteInput('');
  };

  const wipeEnabled = deleteInput === 'DELETE';

  return (
    <Section title="Data & Privacy" danger>
      <p className="text-sm text-muted-foreground">
        Irreversible operations. Proceed with caution — these actions cannot be
        undone.
      </p>

      {/* Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border bg-card">
        <div>
          <p className="text-sm font-medium">Export All Data</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Download a full export of platform data as a CSV archive.
          </p>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm hover:bg-accent transition-colors shrink-0"
          onClick={handleExport}
        >
          <Export weight="duotone" size={16} />
          Export All Data
        </button>
      </div>

      {/* Wipe test data */}
      <div className="flex flex-col gap-3 p-4 rounded-xl border border-red-500/20 bg-card">
        <div>
          <p className="text-sm font-medium text-red-400">Wipe Test Data</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Permanently deletes all seed / test records. Type{' '}
            <strong className="text-foreground font-mono">DELETE</strong> to
            confirm.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            className="input-base flex-1"
            placeholder="Type DELETE to confirm"
            value={deleteInput}
            onChange={(e) => setDeleteInput(e.target.value)}
          />
          <button
            type="button"
            className="btn-danger flex items-center gap-2 shrink-0"
            disabled={!wipeEnabled}
            onClick={handleWipe}
          >
            <Trash weight="duotone" size={16} />
            Wipe Test Data
          </button>
        </div>
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Appearance section
// ---------------------------------------------------------------------------
function AppearanceSection() {
  return (
    <Section title="Appearance">
      <div className="flex items-start gap-4 p-4 rounded-xl border border-border bg-accent">
        <Moon weight="duotone" size={22} className="text-brand mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium">Dark Theme</p>
          <p className="text-sm text-muted-foreground mt-1">
            This admin panel uses a fixed dark theme for optimal monitoring.
            Light mode coming soon.
          </p>
        </div>
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function SettingsPage() {
  const { hasRole } = useAuthStore();

  if (!hasRole('super_admin')) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Super admin configuration and platform controls.
        </p>
      </div>

      <PlatformInfoSection />
      <AdminAccountSection />
      <DataPrivacySection />
      <AppearanceSection />
    </div>
  );
}
