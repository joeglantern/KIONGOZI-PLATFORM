// Post insights (like Instagram Insights / X analytics) for the author: views, likes, replies,
// reposts and quotes, shares, and views per day for the last 7 days. Only numbers the server really
// counts: views are video plays past 2 seconds, so a text or photo post shows none; shares are share taps.
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Animated from 'react-native-reanimated';
import { BottomSheet } from './BottomSheet';
import { useTheme } from '../../hooks/useTheme';
import { enterFade } from '../../theme/motion';
import apiClient from '../../utils/apiClient';

type Insights = {
  content: string; views: number | null; likes: number; replies: number; reposts: number; quotes: number;
  shares: number | null; days: { day: string; views: number }[] | null;
};

const cache = new Map<string, Insights>();
const fmt = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M` : n >= 1e4 ? `${Math.round(n / 1e3)}K` : n.toLocaleString('en-US'));
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const weekday = (d: string) => new Date(`${d}T12:00:00Z`).getUTCDay();

export function PostInsightsSheet({ postId, visible, onClose }: { postId: string; visible: boolean; onClose: () => void }) {
  const T = useTheme();
  const [data, setData] = useState<Insights | null>(cache.get(postId) ?? null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    let live = true;
    setErr(null);
    apiClient.getPostInsights(postId).then((r: any) => {
      if (!live) return;
      if (r?.success && r.data) { cache.set(postId, r.data); setData(r.data); }
      else if (!cache.get(postId)) setErr(r?.error || 'Could not load insights');
    }).catch(() => { if (live && !cache.get(postId)) setErr('Could not load insights'); });
    return () => { live = false; };
  }, [visible, postId]);

  const tiles = data ? [
    ...(data.views != null ? [{ n: data.views, l: data.views === 1 ? 'View' : 'Views' }] : []),
    { n: data.likes, l: data.likes === 1 ? 'Like' : 'Likes' },
    { n: data.replies, l: data.replies === 1 ? 'Reply' : 'Replies' },
    { n: data.reposts + data.quotes, l: 'Reposts and quotes' },
    ...(data.shares != null ? [{ n: data.shares, l: data.shares === 1 ? 'Share' : 'Shares' }] : []),
  ] : [];
  const max = data?.days ? Math.max(1, ...data.days.map(d => d.views)) : 1;
  const best = data?.days ? [...data.days].sort((a, b) => b.views - a.views)[0] : null;
  const todayIdx = data?.days ? data.days.length - 1 : -1;

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Post insights" subtitle={data?.content ? data.content.replace(/\s+/g, ' ').slice(0, 80) : undefined} actions={[]}>
      <View style={styles.body}>
        {!data ? (
          <View style={styles.center}>
            {err ? <Text style={{ color: T.textSub, fontSize: 15 }}>{err}</Text> : <ActivityIndicator color={T.textSub} />}
          </View>
        ) : (
          <Animated.View entering={enterFade(200)}>
            <View style={styles.grid}>
              {tiles.map(t => (
                <View key={t.l} style={[styles.tile, { backgroundColor: T.surface2 }]} accessible accessibilityLabel={`${t.n} ${t.l}`}>
                  <Text style={[styles.num, { color: T.text }]} maxFontSizeMultiplier={1.2}>{fmt(t.n)}</Text>
                  <Text style={[styles.lbl, { color: T.textSub }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>{t.l}</Text>
                </View>
              ))}
            </View>
            {data.views == null && (
              <Text style={[styles.note, { color: T.textMuted }]}>Views are counted on videos.</Text>
            )}
            {data.days && (
              <View style={{ marginTop: 18 }}>
                <Text style={[styles.h, { color: T.text }]}>Views, last 7 days</Text>
                <View style={styles.bars} accessible accessibilityLabel={`Views per day: ${data.days.map(d => `${FULL[weekday(d.day)]} ${d.views}`).join(', ')}`}>
                  {data.days.map((d, i) => (
                    <View key={d.day} style={styles.barCol}>
                      <View style={[styles.bar, { height: Math.max(4, (d.views / max) * 92), backgroundColor: best && d.day === best.day && d.views > 0 ? T.accent : T.surface2 }]} />
                      <Text style={[styles.day, { color: T.textMuted }]} maxFontSizeMultiplier={1.1}>{i === todayIdx ? 'Today' : DAYS[weekday(d.day)]}</Text>
                    </View>
                  ))}
                </View>
                {best && best.views > 0 && (
                  <Text style={[styles.note, { color: T.textSub }]}>{`Best day: ${FULL[weekday(best.day)]}, ${fmt(best.views)} ${best.views === 1 ? 'view' : 'views'}.`}</Text>
                )}
              </View>
            )}
          </Animated.View>
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 20, paddingBottom: 12, minHeight: 160 },
  center: { height: 160, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { flexGrow: 1, flexBasis: '30%', minWidth: 96, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14 },
  num: { fontSize: 24, fontWeight: '800' },
  lbl: { fontSize: 13, marginTop: 2 },
  note: { fontSize: 13, marginTop: 12 },
  h: { fontSize: 15, fontWeight: '700' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 118, marginTop: 12 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  bar: { width: '100%', borderRadius: 6 },
  day: { fontSize: 11 },
});
