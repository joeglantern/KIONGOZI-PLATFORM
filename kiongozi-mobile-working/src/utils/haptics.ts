// One haptic vocabulary for the whole app, so the same kind of action always feels the same:
//   tap      - selection tick: tabs, chips, opening things, share, pin
//   like     - light impact: like, repost, bookmark, follow, send, vote (a small commitment)
//   success  - notification success: posted, edit saved, request accepted
//   warning  - notification warning: confirming something destructive (delete, block, remove)
//   error    - notification error: something failed
// Every call swallows errors (no haptics engine, web, simulator).
import * as Haptics from 'expo-haptics';

const quiet = (p: Promise<unknown>) => { p.catch(() => {}); };

export const haptic = {
  tap: () => quiet(Haptics.selectionAsync()),
  like: () => quiet(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  success: () => quiet(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => quiet(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => quiet(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
