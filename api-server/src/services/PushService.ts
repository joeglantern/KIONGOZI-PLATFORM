import { supabaseServiceClient } from '../config/supabase';

/** 23:00–06:59 in Nairobi: pushes still arrive, but silently (no sound). */
export function isQuietHours(now = new Date()) {
  const hour = Number(now.toLocaleString('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Africa/Nairobi' }));
  return hour >= 23 || hour < 7;
}

export async function sendExpoPush(
  tokens: string[],
  title: string,
  body: string,
  data?: object,
  opts: { silent?: boolean } = {}
): Promise<void> {
  if (!tokens.length) return;

  const messages = tokens.map(to => ({
    to,
    title,
    body,
    data: data || {},
    ...(opts.silent ? {} : { sound: 'default' }),
  }));

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      console.error('Expo push failed:', response.status, await response.text());
      return;
    }
    // Drop tokens for uninstalled apps so we stop pushing to them
    const json: any = await response.json().catch(() => null);
    const dead = (json?.data || [])
      .map((t: any, i: number) => (t?.details?.error === 'DeviceNotRegistered' ? tokens[i] : null))
      .filter(Boolean);
    if (dead.length && supabaseServiceClient) {
      await supabaseServiceClient.from('push_tokens').delete().in('token', dead);
    }
  } catch (err) {
    console.error('PushService error:', err);
  }
}
