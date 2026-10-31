// "Your week" recap (Spotify Wrapped idea). The sheet draws this week's numbers itself on a deep green
// board (GET /social/recap); sharing still uses the server-drawn 1080x1920 card (POST /social/recap/card),
// which goes to your story, your feed, or any other app.
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Image, Modal, Pressable, StyleSheet, ActivityIndicator, Share, ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiClient from '../../utils/apiClient';
import { useStoryStore } from '../../stores/storyStore';
import { useSocialStore } from '../../stores/socialStore';

const GREEN = '#0E3B2C';
const LIME = '#B6E36A';
const WHITE = '#FFFFFF';
const TILE = 'rgba(255,255,255,0.08)';

type WeekStats = {
  since: string; until: string;
  posts: number; likes: number; comments: number; followers: number; storyViews: number;
  activeDays: number; streak: number;
  topPost: { id: string; content: string; likes: number } | null;
  topTag: string | null;
  /** not counted by the server yet */
  barazas?: number;
};

let cachedStats: { at: number; stats: WeekStats } | null = null; // the week changes slowly; reuse for 10 min

const fmt = (n: number) => n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M` : n >= 1e4 ? `${Math.round(n / 1e3)}K` : n >= 1e3 ? `${(n / 1e3).toFixed(1).replace(/\.0$/, '')}K` : String(n);

/** "24 TO 30 OCT" or "28 OCT TO 3 NOV", Nairobi time */
function rangeLabel(since?: string, until?: string) {
  const end = until ? new Date(until) : new Date();
  const start = since ? new Date(since) : new Date(end.getTime() - 6 * 24 * 3600 * 1000);
  const m = (d: Date) => d.toLocaleString('en-GB', { month: 'short', timeZone: 'Africa/Nairobi' });
  const day = (d: Date) => Number(d.toLocaleString('en-GB', { day: 'numeric', timeZone: 'Africa/Nairobi' }));
  return (m(start) === m(end) ? `${day(start)} to ${day(end)} ${m(end)}` : `${day(start)} ${m(start)} to ${day(end)} ${m(end)}`).toUpperCase();
}

export function RecapSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<WeekStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | 'story' | 'post' | 'more'>(null);
  const [done, setDone] = useState<string | null>(null);
  const [run, setRun] = useState(0); // bump to replay the numbers

  const load = () => {
    if (cachedStats && Date.now() - cachedStats.at < 10 * 60 * 1000) { setStats(cachedStats.stats); setRun(r => r + 1); return; }
    setLoading(true);
    setError(null);
    apiClient.getRecap().then((r: any) => {
      if (r?.success && r.data) { cachedStats = { at: Date.now(), stats: r.data }; setStats(r.data); setRun(x => x + 1); }
      else setError(r?.error || 'Could not load your week');
    }).catch(() => setError('Could not load your week')).finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!visible) { setDone(null); setBusy(null); return; }
    load();
  }, [visible]);

  const finish = (msg: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setDone(msg);
    setTimeout(onClose, 900);
  };

  const makeFull = async () => {
    const r: any = await apiClient.getRecapCard(false);
    if (!r?.success || !r.data?.url) throw new Error(r?.error || 'Could not make your recap');
    return r.data as { url: string; storage_path: string; width: number; height: number };
  };

  const toStory = async () => {
    setBusy('story');
    try {
      const c = await makeFull();
      const res: any = await apiClient.createStory({
        media_type: 'image', media_url: c.url, storage_path: c.storage_path, width: c.width, height: c.height, overlays: [], audience: 'everyone',
      });
      if (!res?.success) throw new Error(res?.error || 'Could not post');
      useStoryStore.getState().fetchFeed().catch(() => {});
      finish('Added to your story');
    } catch (e: any) { setDone(e?.message || 'Something went wrong'); setBusy(null); }
  };

  const toPost = async () => {
    setBusy('post');
    try {
      const c = await makeFull();
      const res: any = await apiClient.createPost('My week on KChat #WikiYangu', [{ media_type: 'image', url: c.url, storage_path: c.storage_path, width: c.width, height: c.height }]);
      if (!res?.success) throw new Error(res?.error || 'Could not post');
      if (res.data) useSocialStore.getState().prependPost(res.data);
      finish('Posted to your feed');
    } catch (e: any) { setDone(e?.message || 'Something went wrong'); setBusy(null); }
  };

  const toMore = async () => {
    setBusy('more');
    try {
      const c = await makeFull();
      setBusy(null);
      await Share.share({ url: c.url, message: `My week on KChat\n${c.url}` });
    } catch { setBusy(null); }
  };

  // Hero: the biggest audience number we have. Post views are not counted yet, so story views stand in when they beat likes.
  const hero = stats
    ? stats.storyViews > stats.likes ? { n: stats.storyViews, label: 'people saw your stories' } : { n: stats.likes, label: stats.likes === 1 ? 'like this week' : 'likes this week' }
    : null;

  const tiles = stats ? [
    { n: `+${fmt(stats.followers)}`, label: stats.followers === 1 ? 'new follower' : 'new followers' },
    { n: fmt(stats.likes), label: stats.likes === 1 ? 'like' : 'likes' },
    { n: fmt(stats.barazas ?? 0), label: 'barazas joined' },
    { n: `${stats.streak} ${stats.streak === 1 ? 'day' : 'days'}`, label: 'posting streak' },
  ] : [];

  // A picture for the top post, if the feed already has it
  const topThumb = useMemo(() => {
    const id = stats?.topPost?.id;
    if (!id) return null;
    const s = useSocialStore.getState();
    const all = [...s.feedPosts, ...s.explorePosts, ...s.forYouPosts, ...s.bookmarkPosts];
    const p = all.find(x => x.id === id);
    const m = p?.post_media?.[0];
    return m ? (m.thumbnail_url || (m.media_type === 'image' ? m.url : null)) : null;
  }, [stats?.topPost?.id]);

  const stagger = (i: number) => FadeInDown.delay(i * 100).duration(420).springify().damping(18);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.root, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.head}>
          <Text style={styles.caption}>YOUR WEEK · {rangeLabel(stats?.since, stats?.until)}</Text>
          <Pressable onPress={onClose} hitSlop={10} style={styles.close} accessibilityLabel="Close">
            <Ionicons name="close" size={18} color={WHITE} />
          </Pressable>
        </View>

        {loading && !stats ? (
          <View style={styles.center}><ActivityIndicator color={WHITE} /></View>
        ) : error && !stats ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={load} style={({ pressed }) => [styles.retry, pressed && { opacity: 0.8 }]} accessibilityRole="button">
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : stats && hero ? (
          <ScrollView key={run} style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
            <Animated.View entering={stagger(0)}>
              <Text style={styles.hero} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} maxFontSizeMultiplier={1}>{fmt(hero.n)}</Text>
            </Animated.View>
            <Animated.View entering={stagger(1)}>
              <Text style={styles.heroLabel} maxFontSizeMultiplier={1.2}>{hero.label}</Text>
            </Animated.View>

            <View style={styles.grid}>
              {tiles.map((t, i) => (
                <Animated.View key={t.label} entering={stagger(2 + i)} style={styles.tile}>
                  <Text style={styles.tileNum} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.1}>{t.n}</Text>
                  <Text style={styles.tileLabel} maxFontSizeMultiplier={1.2}>{t.label}</Text>
                </Animated.View>
              ))}
            </View>

            <Animated.View entering={stagger(6)} style={[styles.tile, styles.topTile]}>
              <Text style={styles.tileCaption}>YOUR TOP POST</Text>
              {stats.topPost ? (
                <View style={styles.topRow}>
                  {topThumb ? (
                    <Image source={{ uri: topThumb }} style={styles.thumb} />
                  ) : (
                    <View style={[styles.thumb, styles.thumbEmpty]}><Ionicons name="chatbubble-ellipses" size={22} color={LIME} /></View>
                  )}
                  <View style={styles.topBody}>
                    <Text style={styles.topText} numberOfLines={2}>{stats.topPost.content}</Text>
                    <Text style={styles.topMeta}>{fmt(stats.topPost.likes)} {stats.topPost.likes === 1 ? 'like' : 'likes'}</Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.topText}>Nothing posted this week yet. Say something and it will show up here.</Text>
              )}
            </Animated.View>
          </ScrollView>
        ) : <View style={styles.body} />}

        {done ? (
          <View style={styles.doneRow}>
            <Ionicons name="checkmark-circle" size={20} color={LIME} />
            <Text style={styles.doneText}>{done}</Text>
          </View>
        ) : (
          <View style={styles.actionsWrap}>
            <View style={styles.actions}>
              <Pressable onPress={toStory} disabled={!!busy || !stats} style={({ pressed }) => [styles.primary, (pressed || !!busy || !stats) && { opacity: 0.8 }]} accessibilityRole="button">
                {busy === 'story' ? <ActivityIndicator color={GREEN} /> : <Text style={styles.primaryText}>Share to story</Text>}
              </Pressable>
              <Pressable onPress={toMore} disabled={!!busy || !stats} style={({ pressed }) => [styles.round, (pressed || !!busy) && { opacity: 0.8 }]} accessibilityRole="button" accessibilityLabel="Share to other apps">
                {busy === 'more' ? <ActivityIndicator color={WHITE} /> : <Ionicons name="arrow-redo-outline" size={22} color={WHITE} />}
              </Pressable>
            </View>
            <Pressable onPress={toPost} disabled={!!busy || !stats} style={styles.postLink} hitSlop={6} accessibilityRole="button">
              <Text style={styles.postLinkText}>{busy === 'post' ? 'Posting' : 'Post it to your feed instead'}</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 20, backgroundColor: GREEN },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 18, paddingBottom: 8 },
  caption: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
  close: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  errorText: { color: 'rgba(255,255,255,0.8)', fontSize: 15, textAlign: 'center' },
  retry: { height: 40, paddingHorizontal: 18, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  retryText: { color: WHITE, fontSize: 15, fontWeight: '600' },
  body: { flex: 1 },
  bodyContent: { paddingTop: 18, paddingBottom: 12 },
  hero: { color: LIME, fontSize: 112, lineHeight: 118, fontWeight: '900', letterSpacing: -5, includeFontPadding: false },
  heroLabel: { color: WHITE, fontSize: 20, lineHeight: 26, fontWeight: '700', marginTop: -2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 24 },
  tile: { backgroundColor: TILE, borderRadius: 18, padding: 16, width: '48%', flexGrow: 1 },
  tileNum: { color: WHITE, fontSize: 32, lineHeight: 38, fontWeight: '800', letterSpacing: -0.8 },
  tileLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13.5, lineHeight: 18, marginTop: 2 },
  topTile: { width: '100%', marginTop: 10 },
  tileCaption: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700', letterSpacing: 1.2, marginBottom: 12 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 56, height: 56, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)' },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(182,227,106,0.16)' },
  topBody: { flex: 1, minWidth: 0 },
  topText: { color: WHITE, fontSize: 15, lineHeight: 20 },
  topMeta: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4 },
  actionsWrap: { marginTop: 12 },
  actions: { flexDirection: 'row', gap: 10 },
  primary: { flex: 1, height: 52, borderRadius: 26, backgroundColor: LIME, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: GREEN, fontSize: 16, fontWeight: '700' },
  round: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  postLink: { alignSelf: 'center', paddingVertical: 10 },
  postLinkText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' },
  doneRow: { height: 52, marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  doneText: { color: WHITE, fontSize: 16, fontWeight: '600' },
});
