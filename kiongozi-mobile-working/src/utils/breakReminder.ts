// A gentle "you've been scrolling a while" note. Counts only time spent actually scrolling the
// feed (pauses longer than 20s don't count), nudges once after 30 minutes, then not again until
// you've been away from the app for 10 minutes. Can be turned off in Settings.
import { AppState } from 'react-native';
import { toast } from './alert';
import { usePrefs } from '../stores/prefsStore';

const LIMIT_MS = 30 * 60 * 1000;
const GAP_MS = 20 * 1000;
const AWAY_RESET_MS = 10 * 60 * 1000;

let total = 0;
let last = 0;
let nudged = false;
let leftAt = 0;
let watching = false;

function watch() {
  if (watching) return;
  watching = true;
  AppState.addEventListener('change', st => {
    if (st !== 'active') { leftAt = Date.now(); return; }
    if (leftAt && Date.now() - leftAt > AWAY_RESET_MS) { total = 0; nudged = false; last = 0; }
  });
}

/** Call from the feed's onScroll (cheap: a few number checks) */
export function noteFeedScroll() {
  watch();
  const now = Date.now();
  if (last && now - last < GAP_MS) total += now - last;
  last = now;
  if (nudged || total < LIMIT_MS) return;
  const p = usePrefs.getState();
  if (!p.breakReminder || (p.features as any).break_reminder === false) return;
  nudged = true;
  toast('You’ve been scrolling for 30 minutes', {
    message: 'Good time to stretch, drink some water, or text a friend.',
    duration: 7000,
    action: { label: 'Thanks', onPress: () => {} },
  });
}
