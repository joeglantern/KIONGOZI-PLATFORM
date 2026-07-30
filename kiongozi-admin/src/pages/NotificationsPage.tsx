import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  BellRinging,
  PaperPlaneRight,
  Eye,
} from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import { sendPushNotification } from '../api/client';
import { NotificationPayload } from '../types';
import { cn } from '../lib/utils';

type Target = 'all' | 'android' | 'ios' | 'user';

const TARGET_LABELS: Record<Target, string> = {
  all: 'All Users',
  android: 'Android Only',
  ios: 'iOS Only',
  user: 'Specific User',
};

const BODY_MAX = 200;

// ---------------------------------------------------------------------------
// Phone mockup preview
// ---------------------------------------------------------------------------
interface PreviewProps {
  title: string;
  body: string;
}

function PhonePreview({ title, body }: PreviewProps) {
  const hasContent = title || body;

  return (
    <div className="border-2 border-border rounded-3xl p-4 bg-accent max-w-[240px] mx-auto select-none">
      {/* Status bar */}
      <div className="flex justify-between text-[10px] text-muted-foreground mb-3 px-1">
        <span>9:41</span>
        <span>●●●</span>
      </div>

      {/* Notification card */}
      <div
        className={cn(
          'rounded-2xl bg-card border border-border p-3 transition-opacity',
          !hasContent && 'opacity-40',
        )}
      >
        <div className="flex items-start gap-2">
          <div className="shrink-0 w-8 h-8 rounded-lg overflow-hidden">
            <img src="/KchatLogo.png" alt="Kiongozi" width={32} height={32} style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-1 mb-0.5">
              <span className="text-[11px] font-semibold text-muted-foreground">
                Kiongozi
              </span>
              <span className="text-[10px] text-muted-foreground shrink-0">now</span>
            </div>
            <p className="text-sm font-bold leading-snug truncate">
              {title || 'Notification Title'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-3 leading-relaxed">
              {body || 'Message body will appear here…'}
            </p>
          </div>
        </div>
      </div>

      {/* Home indicator */}
      <div className="mt-4 mx-auto w-16 h-1 rounded-full bg-border" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Confirmation banner
// ---------------------------------------------------------------------------
interface ConfirmBannerProps {
  target: Target;
  userId: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}

function ConfirmBanner({
  target,
  userId,
  onConfirm,
  onCancel,
  isPending,
}: ConfirmBannerProps) {
  const recipientLabel =
    target === 'user' && userId ? `user ${userId}` : TARGET_LABELS[target].toLowerCase();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/5 px-4 py-3">
      <div className="flex items-center gap-2 text-sm">
        <BellRinging weight="duotone" size={18} className="text-yellow-400 shrink-0" />
        <span>
          You&apos;re about to send to{' '}
          <strong className="text-foreground">{recipientLabel}</strong>. Confirm?
        </span>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          type="button"
          className="text-sm px-3 py-1.5 rounded-lg border border-border hover:bg-accent transition-colors"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn-primary text-sm"
          onClick={onConfirm}
          disabled={isPending}
        >
          {isPending ? 'Sending…' : 'Confirm'}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function NotificationsPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [target, setTarget] = useState<Target>('all');
  const [userId, setUserId] = useState('');
  const [confirming, setConfirming] = useState(false);

  const resetForm = () => {
    setTitle('');
    setBody('');
    setTarget('all');
    setUserId('');
    setConfirming(false);
  };

  const sendMutation = useMutation({
    mutationFn: (payload: NotificationPayload) => sendPushNotification(payload),
    onSuccess: (data: any) => {
      if (data?.sent === 0) {
        toast('No registered devices found for this target.', { icon: '📱' });
      } else {
        toast.success(data?.message ?? 'Notification sent!');
      }
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error ?? 'Failed to send notification');
      setConfirming(false);
    },
  });

  const handleSendConfirmed = () => {
    const payload: NotificationPayload = {
      title,
      body,
      target,
      ...(target === 'user' ? { user_id: userId } : {}),
    };
    sendMutation.mutate(payload);
  };

  const canSend =
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    (target !== 'user' || userId.trim().length > 0);

  const bodyOver = body.length > BODY_MAX;

  return (
    <div className="max-w-5xl">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* ── Compose form ── */}
        <div className="lg:col-span-3 card p-5 space-y-5">
          <h2 className="text-[15px] font-semibold text-foreground">Compose</h2>

          {/* Title */}
          <div className="space-y-1.5">
            <label htmlFor="notif-title" className="text-sm font-medium block">
              Notification Title
            </label>
            <input
              id="notif-title"
              type="text"
              className="input-base w-full"
              placeholder="e.g. New content available"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <label htmlFor="notif-body" className="text-sm font-medium block">
              Message Body
            </label>
            <textarea
              id="notif-body"
              rows={4}
              className={cn('input-base w-full resize-none', bodyOver && 'border-red-500')}
              placeholder="Write your notification message…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <p
              className={cn(
                'text-xs text-right',
                bodyOver ? 'text-red-400' : 'text-muted-foreground',
              )}
            >
              {body.length}/{BODY_MAX}
            </p>
          </div>

          {/* Target */}
          <div className="space-y-1.5">
            <label htmlFor="notif-target" className="text-sm font-medium block">
              Send To
            </label>
            <select
              id="notif-target"
              className="input-base w-full"
              value={target}
              onChange={(e) => {
                setTarget(e.target.value as Target);
                setUserId('');
              }}
            >
              {(Object.keys(TARGET_LABELS) as Target[]).map((t) => (
                <option key={t} value={t}>
                  {TARGET_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          {/* User ID — conditional */}
          {target === 'user' && (
            <div className="space-y-1.5">
              <label htmlFor="notif-userid" className="text-sm font-medium block">
                User ID
              </label>
              <input
                id="notif-userid"
                type="text"
                className="input-base w-full"
                placeholder="Enter user ID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              />
            </div>
          )}

          {/* Actions */}
          {!confirming ? (
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm transition-colors',
                  'hover:bg-accent',
                )}
                onClick={() => {}} // preview is always live; button is decorative hint
                disabled={!canSend}
              >
                <Eye weight="duotone" size={16} />
                Preview
              </button>
              <button
                type="button"
                className="btn-primary flex items-center gap-2"
                disabled={!canSend || bodyOver}
                onClick={() => setConfirming(true)}
              >
                <PaperPlaneRight weight="duotone" size={16} />
                Send
              </button>
            </div>
          ) : (
            <ConfirmBanner
              target={target}
              userId={userId}
              onConfirm={handleSendConfirmed}
              onCancel={() => setConfirming(false)}
              isPending={sendMutation.isPending}
            />
          )}
        </div>

        {/* ── Live Preview ── */}
        <div className="lg:col-span-2 card p-5 space-y-4">
          <h2 className="text-[15px] font-semibold text-foreground">Live Preview</h2>
          <p className="text-xs text-muted-foreground">
            Updates as you type — this is how the notification will appear on
            the device lock screen.
          </p>
          <PhonePreview title={title} body={body} />
        </div>
      </div>
    </div>
  );
}
