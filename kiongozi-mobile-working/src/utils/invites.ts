// Invite links: https://api.kiongozi.org/u/<inviter>?ref=<inviter>
// Any link that opens the app with ?ref= is remembered on the phone (even before sign-up),
// then claimed once the person is signed in. The server only credits brand-new accounts.
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from './apiClient';

const KEY = 'kchat.inviteRef';

export function captureInviteRef(url?: string | null) {
  if (!url) return;
  const m = url.match(/[?&]ref=([a-z0-9_.]{1,30})/i);
  if (m) AsyncStorage.setItem(KEY, m[1].toLowerCase()).catch(() => {});
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
