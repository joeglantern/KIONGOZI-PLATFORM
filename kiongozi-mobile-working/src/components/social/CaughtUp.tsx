// "You're all caught up" (Instagram): in Following, a calm marker after the posts that are new since your
// last visit, then "Older posts" and the feed carries on. Last visit is kept on the phone per account.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { enterFade } from '../../theme/motion';

const DAY = 24 * 60 * 60 * 1000;
const MAX_DAYS = 3;
const keyFor = (userId: string) => `kchat:following_seen:${userId}`;

export type CaughtUpRow = { __caughtUp: true; text: string };

/**
 * Rows for the Following list with the marker in place. `active` is true while Following is on screen:
 * the first time it is, this visit is saved as the new "last seen" (the marker itself stays put for the session).
 */
export function useCaughtUpRows<T extends { id: string; created_at?: string }>(userId: string | undefined, posts: T[], active: boolean) {
  const [seenAt, setSeenAt] = useState<number | null>(null);
  const saved = useRef(false);

  useEffect(() => {
    if (!userId) return;
    saved.current = false;
    AsyncStorage.getItem(keyFor(userId))
      .then(v => { const t = v ? Date.parse(v) : NaN; setSeenAt(isNaN(t) ? null : t); })
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    if (!active || !userId || saved.current) return;
    saved.current = true;
    AsyncStorage.setItem(keyFor(userId), new Date().toISOString()).catch(() => {});
  }, [active, userId]);

  return useMemo(() => {
    if (!seenAt || posts.length < 2) return posts as (T | CaughtUpRow)[];
    const now = Date.now();
    const floor = now - MAX_DAYS * DAY;
    const boundary = Math.max(seenAt, floor);
    const at = posts.findIndex(p => {
      const t = p.created_at ? Date.parse(p.created_at) : NaN;
      return !isNaN(t) && t <= boundary;
    });
    // Only when there were new posts above and older ones below
    if (at <= 0) return posts as (T | CaughtUpRow)[];
    const days = Math.ceil((now - boundary) / DAY);
    const text = boundary === floor
      ? `You've seen all new posts from the past ${MAX_DAYS} days.`
      : now - boundary < DAY
        ? "You've seen all new posts since your last visit."
        : `You've seen all new posts from the past ${days} days.`;
    const row: CaughtUpRow = { __caughtUp: true, text };
    return [...posts.slice(0, at), row, ...posts.slice(at)];
  }, [posts, seenAt]);
}

export function CaughtUp({ text }: { text: string }) {
  const T = useTheme();
  const styles = useMemo(() => makeStyles(T), [T]);
  return (
    <Animated.View entering={enterFade(220)} accessible accessibilityRole="text" accessibilityLabel={`You're all caught up. ${text} Older posts below.`}>
      <View style={styles.wrap}>
        <View style={styles.circle}>
          <Ionicons name="checkmark" size={26} color={T.accent} />
        </View>
        <Text style={styles.title} maxFontSizeMultiplier={1.4}>You're all caught up</Text>
        <Text style={styles.sub} maxFontSizeMultiplier={1.4}>{text}</Text>
      </View>
      <View style={styles.older}>
        <View style={styles.rule} />
        <Text style={styles.olderText} maxFontSizeMultiplier={1.3}>Older posts</Text>
        <View style={styles.rule} />
      </View>
    </Animated.View>
  );
}

function makeStyles(T: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    wrap: { alignItems: 'center', paddingTop: 30, paddingBottom: 22, paddingHorizontal: 24, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.border },
    circle: {
      width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center',
      borderWidth: 1.5, borderColor: T.accent + '73', backgroundColor: T.accent + '1A',
    },
    title: { fontSize: 17, fontWeight: '700', color: T.text, marginTop: 12, textAlign: 'center' },
    sub: { fontSize: 14, color: T.textSub, marginTop: 4, textAlign: 'center' },
    older: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 8 },
    rule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: T.border },
    olderText: { fontSize: 12.5, fontWeight: '600', color: T.textMuted, textTransform: 'uppercase', letterSpacing: 0.2 },
  });
}
