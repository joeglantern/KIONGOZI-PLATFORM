// The Replies, Mitaa and Barazas tabs, shared by your own profile and other people's.
// One hook loads each tab the first time it is opened (then keeps it), and one renderer draws
// the non-post rows: Mitaa as a 3-across grid of video tiles, Barazas as minutes cards.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Image, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import apiClient from '../../utils/apiClient';
import { useTheme } from '../../hooks/useTheme';
import { useBarazaStore } from '../../stores/barazaStore';

export type ExtraTab = 'replies' | 'mitaa' | 'barazas';
export const isExtraTab = (t: string): t is ExtraTab => t === 'replies' || t === 'mitaa' || t === 'barazas';

export const EXTRA_EMPTY: Record<ExtraTab, { icon: keyof typeof Ionicons.glyphMap; title: string; sub: (who: string | null) => string }> = {
  replies: { icon: 'chatbubble-outline', title: 'No replies yet', sub: who => (who ? `When @${who} replies to someone, it will show up here.` : 'Your replies to other posts will show up here.') },
  mitaa: { icon: 'play-circle-outline', title: 'No Mitaa yet', sub: who => (who ? `Videos @${who} posts will show up here.` : 'Videos you post will show up here.') },
  barazas: { icon: 'people-outline', title: 'No barazas yet', sub: who => (who ? `Barazas @${who} hosts and posts the minutes of will show up here.` : 'Barazas you host will show up here with their minutes.') },
};

export type BarazaItem = {
  id: string; title: string; created_at: string; ended_at: string | null;
  minutes_post_id: string | null; posted: boolean; summary: string | null;
  key_points: number; ahadi: number; people: number;
};
type Row = { __kind: 'mitaa'; id: string; posts: any[] } | ({ __kind: 'baraza' } & BarazaItem);

type State = { items: any[]; cursor: string | null; loading: boolean; loaded: boolean };
const blank: State = { items: [], cursor: null, loading: false, loaded: false };

/**
 * Data for the extra tabs. `data` is what the list shows when an extra tab is active: posts for
 * Replies (draw them with PostCard), rows with `__kind` for Mitaa and Barazas (draw with <ExtraTabRow>).
 */
export function useProfileExtraTabs(username: string | null | undefined, userId: string | null | undefined, active: string) {
  const [state, setState] = useState<Record<ExtraTab, State>>({ replies: blank, mitaa: blank, barazas: blank });
  const busy = useRef<Record<string, boolean>>({});
  const ref = useRef(state);
  ref.current = state;

  // A different person: start over
  useEffect(() => { setState({ replies: blank, mitaa: blank, barazas: blank }); }, [username, userId]);

  const load = useCallback(async (tab: ExtraTab, more = false) => {
    if (!username || (tab === 'barazas' && !userId)) return;
    const cur = ref.current[tab];
    if (busy.current[tab] || (more && !cur.cursor)) return;
    busy.current[tab] = true;
    setState(s => ({ ...s, [tab]: { ...s[tab], loading: true } }));
    try {
      const cursor = more ? cur.cursor ?? undefined : undefined;
      const res: any = tab === 'barazas'
        ? await apiClient.getUserBarazas(userId!, cursor)
        : await apiClient.getUserPostsByType(username, tab === 'replies' ? 'replies' : 'videos', cursor);
      const list: any[] = res?.success && Array.isArray(res.data) ? res.data : [];
      setState(s => ({
        ...s,
        [tab]: {
          items: more ? [...s[tab].items, ...list.filter(i => !s[tab].items.some(x => x.id === i.id))] : list,
          cursor: res?.nextCursor ?? null, loading: false, loaded: true,
        },
      }));
    } catch {
      setState(s => ({ ...s, [tab]: { ...s[tab], loading: false, loaded: true } }));
    } finally {
      busy.current[tab] = false;
    }
  }, [username, userId]);

  useEffect(() => {
    if (isExtraTab(active) && !state[active].loaded && !state[active].loading) load(active);
  }, [active, state, load]);

  const tab = isExtraTab(active) ? active : null;
  const s = tab ? state[tab] : blank;
  let data: any[] = s.items;
  if (tab === 'mitaa') {
    const rows: Row[] = [];
    for (let i = 0; i < s.items.length; i += 3) rows.push({ __kind: 'mitaa', id: `m${i}`, posts: s.items.slice(i, i + 3) });
    data = rows;
  } else if (tab === 'barazas') {
    data = s.items.map(b => ({ __kind: 'baraza', ...b }));
  }

  return {
    data,
    /** first load of the active extra tab still running */
    loading: !!tab && !s.loaded,
    loadingMore: !!tab && s.loaded && s.loading,
    loadMore: () => { if (tab) load(tab, true); },
    refresh: async () => { if (tab) await load(tab); },
    /** forget every tab (pull to refresh) */
    reset: () => setState({ replies: blank, mitaa: blank, barazas: blank }),
  };
}

/** Draws a Mitaa grid row or a baraza card; returns null for anything else (a post). */
export function ExtraTabRow({ item, onOpenPost }: { item: any; onOpenPost: (postId: string) => void }) {
  if (item?.__kind === 'mitaa') return <MitaaRow posts={item.posts} onOpenPost={onOpenPost} />;
  if (item?.__kind === 'baraza') return <BarazaCard b={item} />;
  return null;
}

function MitaaRow({ posts, onOpenPost }: { posts: any[]; onOpenPost: (id: string) => void }) {
  const T = useTheme();
  const { width } = useWindowDimensions();
  const gap = 2;
  const w = (width - gap * 2) / 3;
  return (
    <View style={{ flexDirection: 'row', gap, marginBottom: gap }}>
      {posts.map(p => {
        const v = (p.post_media || []).find((m: any) => m.media_type === 'video');
        const views = p.view_count ?? 0;
        return (
          <Pressable key={p.id} onPress={() => { Haptics.selectionAsync().catch(() => {}); onOpenPost(p.id); }}
            style={({ pressed }) => [{ width: w, height: w * 16 / 9, backgroundColor: T.surface2 }, pressed && { opacity: 0.8 }]}
            accessibilityRole="button" accessibilityLabel={p.content ? `Video: ${p.content.slice(0, 60)}` : 'Video'}>
            {v?.thumbnail_url ? <Image source={{ uri: v.thumbnail_url }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : (
              <View style={[StyleSheet.absoluteFill, styles.center]}><Ionicons name="play" size={26} color={T.textMuted} /></View>
            )}
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.55)']} style={styles.tileShade} pointerEvents="none" />
            <View style={styles.tileViews} pointerEvents="none">
              <Ionicons name="play-outline" size={13} color="#fff" />
              <Text style={styles.tileViewsText}>{fmt(views)}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const cloud = require('../../../assets/baraza/cloud.png');

function BarazaCard({ b }: { b: BarazaItem }) {
  const T = useTheme();
  const date = new Date(b.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  const meta = [date, `${b.people} ${b.people === 1 ? 'person' : 'people'}`, b.key_points ? `${b.key_points} key points` : null, b.ahadi ? `${b.ahadi} ahadi` : null]
    .filter(Boolean).join(' · ');
  return (
    <Pressable onPress={() => { Haptics.selectionAsync().catch(() => {}); useBarazaStore.getState().openMinutes(b.id); }}
      style={({ pressed }) => [styles.baraza, { borderBottomColor: T.border }, pressed && { opacity: 0.7 }]}
      accessibilityRole="button" accessibilityLabel={`Baraza minutes: ${b.title}`}>
      <LinearGradient colors={['#B9B4F0', '#E3CBEA', '#FBD3B0']} style={styles.sky}>
        <Image source={cloud} style={styles.cloud} resizeMode="contain" />
      </LinearGradient>
      <View style={{ flex: 1 }}>
        <Text style={[styles.bTitle, { color: T.text }]} numberOfLines={2}>{b.title}</Text>
        <Text style={[styles.bMeta, { color: T.textSub }]} numberOfLines={1}>{meta}</Text>
        {b.summary ? <Text style={[styles.bSummary, { color: T.text }]} numberOfLines={2}>{b.summary}</Text> : null}
        {!b.posted ? <Text style={[styles.bPrivate, { color: T.textMuted }]}>Only people who were there can see this</Text> : null}
      </View>
    </Pressable>
  );
}

const fmt = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1).replace(/\.0$/, '')}K` : String(n));

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  tileShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 48 },
  tileViews: { position: 'absolute', left: 6, bottom: 5, flexDirection: 'row', alignItems: 'center', gap: 3 },
  tileViewsText: { color: '#fff', fontSize: 12.5, fontWeight: '700' },
  baraza: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  sky: { width: 64, height: 64, borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  cloud: { width: 54, height: 32 },
  bTitle: { fontSize: 16, fontWeight: '700', lineHeight: 21 },
  bMeta: { fontSize: 13, marginTop: 2 },
  bSummary: { fontSize: 14.5, lineHeight: 20, marginTop: 6 },
  bPrivate: { fontSize: 12.5, marginTop: 6 },
});
