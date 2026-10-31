// Invite links: https://api.kiongozi.org/i/<inviter> (older ones: /u/<inviter>?ref=<inviter>; the invite
// page's Open button uses kiongozi://u/<inviter>?ref=<inviter> so every app build credits it)
// Any link that opens the app with ?ref= is remembered on the phone (even before sign-up),
// then claimed once the person is signed in. The server only credits brand-new accounts.
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from './apiClient';
import { parseLink } from './links';

const KEY = 'kchat.inviteRef';

export function captureInviteRef(url?: string | null) {
  if (!url) return;
  const r = parseLink(url);
  const ref = r?.kind === 'profile' ? r.ref : undefined;
  if (ref) AsyncStorage.setItem(KEY, ref).catch(() => {});
}

export function watchInviteLinks() {
  Linking.getInitialURL().then(captureInviteRef).catch(() => {});
  const sub = Linking.addEventListener('url', e => captureInviteRef(e.url));
  return () => sub.remove();
}

export async function claimPendingInvite() {
  try {
    const ref = await AsyncStorage.getItem(KEY);
    if (!ref) return;
    const res: any = await apiClient.claimInvite(ref);
    if (res?.success) await AsyncStorage.removeItem(KEY);
  } catch {}
}
