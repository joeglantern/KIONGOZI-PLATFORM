// In-app replacements for the grey system pop-ups.
//  - appAlert(title, message?, buttons?)  same arguments as Alert.alert.
//      No buttons / one button → a short toast at the bottom (one-button callbacks run straight away).
//      Two or more buttons → a sheet that slides up, styled like the rest of KChat.
//  - toast(text, { action })  e.g. toast('Post deleted', { action: { label: 'Undo', onPress } })
import { create } from 'zustand';

export type AlertButton = { text?: string; onPress?: (value?: string) => void; style?: 'default' | 'cancel' | 'destructive' };

export type ToastItem = {
  id: number;
  title: string;
  message?: string;
  kind: 'info' | 'error' | 'success';
  action?: { label: string; onPress: () => void };
  duration: number;
  /** An Ionicons name drawn in green at the left instead of the kind's icon (e.g. 'repeat' after a repost) */
  icon?: string;
};

export type SheetItem = {
  id: number;
  title: string;
  message?: string;
  buttons: AlertButton[];
  cancelable: boolean;
  /** Closed by tapping outside / back button */
  onDismiss?: () => void;
  /** A small painting above the title (require('…jpg')) */
  image?: any;
};

interface FeedbackState {
  toast: ToastItem | null;
  sheet: SheetItem | null;
  queue: ToastItem[];
  showToast: (t: Omit<ToastItem, 'id'>) => void;
  nextToast: () => void;
  openSheet: (s: Omit<SheetItem, 'id'>) => void;
  closeSheet: () => void;
}

let seq = 1;

export const useFeedback = create<FeedbackState>((set, get) => ({
  toast: null,
  sheet: null,
  queue: [],
  showToast: (t) => {
    const item = { ...t, id: seq++ };
    // A newer toast replaces one that's showing unless that one has an action (Undo) to keep
    const cur = get().toast;
    if (!cur || !cur.action) set({ toast: item });
    else set(s => ({ queue: [...s.queue, item].slice(-3) }));
  },
  nextToast: () => set(s => ({ toast: s.queue[0] ?? null, queue: s.queue.slice(1) })),
  openSheet: (s) => set({ sheet: { ...s, id: seq++ } }),
  closeSheet: () => set({ sheet: null }),
}));

const ERROR_WORDS = /error|failed|couldn.t|could not|can.t|cannot|invalid|wrong|denied|not allowed|too many|unable/i;
const SUCCESS_WORDS = /success|saved|sent|done|updated|copied|deleted|removed|posted|shared|reported|thanks/i;

/** Drop-in for Alert.alert */
export function appAlert(title: string, message?: string, buttons?: AlertButton[], options?: { cancelable?: boolean; onDismiss?: () => void }) {
  const list = (buttons ?? []).filter(Boolean);
  if (list.length <= 1) {
    const text = `${title} ${message ?? ''}`;
    const kind: ToastItem['kind'] = ERROR_WORDS.test(text) ? 'error' : SUCCESS_WORDS.test(title) ? 'success' : 'info';
    useFeedback.getState().showToast({
      title: title || message || '',
      message: title ? message : undefined,
      kind,
      duration: kind === 'error' || (message?.length ?? 0) > 60 ? 4200 : 2800,
    });
    try { list[0]?.onPress?.(); } catch {}
    return;
  }
  useFeedback.getState().openSheet({ title, message, buttons: list, cancelable: options?.cancelable ?? true, onDismiss: options?.onDismiss });
}

/** A choice sheet with a painting on top (e.g. the break reminder) */
export function appSheet(opts: { title: string; message?: string; buttons: AlertButton[]; image?: any; onDismiss?: () => void }) {
  useFeedback.getState().openSheet({ ...opts, cancelable: true });
}

/** Short message at the bottom of the screen, with an optional action like "Undo" */
export function toast(title: string, opts: { message?: string; kind?: ToastItem['kind']; action?: ToastItem['action']; duration?: number; icon?: string } = {}) {
  useFeedback.getState().showToast({
    title,
    message: opts.message,
    kind: opts.kind ?? 'info',
    action: opts.action,
    icon: opts.icon,
    duration: opts.duration ?? (opts.action ? 6000 : 3200),
  });
}

/**
 * "Undo" instead of "Are you sure?": hide it now, really do it after a few seconds unless Undo is tapped.
 * `hide` removes it from the screen, `restore` puts it back, `commit` does the real (server) work.
 */
export function withUndo(label: string, steps: { hide: () => void; restore: () => void; commit: () => Promise<unknown> | void }, ms = 6000) {
  let undone = false;
  steps.hide();
  const timer = setTimeout(() => {
    if (!undone) Promise.resolve(steps.commit()).catch(() => { steps.restore(); toast('Couldn’t do that. It’s back.', { kind: 'error' }); });
  }, ms);
  toast(label, {
    duration: ms,
    action: {
      label: 'Undo',
      onPress: () => {
        undone = true;
        clearTimeout(timer);
        steps.restore();
      },
    },
  });
}
