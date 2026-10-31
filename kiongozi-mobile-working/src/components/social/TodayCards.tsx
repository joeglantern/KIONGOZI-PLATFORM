// App Store "Today"-style cards for Explore: one tall card, one strong image, a small caps label
// and a heavy title at the top, and a strip at the bottom with one clear action.
import React from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { UserAvatar } from './UserAvatar';

const commas = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/** #1 trending hashtag: the tag itself is the art. */
export function TrendCard({ tag, uses, posts, onOpen }: {
  tag: string; uses: number;
  posts: { id: string; content?: string | null; profiles?: any }[];
  onOpen: () => void;
}) {
  const { width } = useWindowDimensions();
  const W = width - 40;
  const quotes = posts.filter(p => (p.content || '').trim()).slice(0, 2);
  const authors = posts.map(p => p.profiles).filter(Boolean).slice(0, 3);
  return (
    <Pressable onPress={() => { Haptics.selectionAsync().catch(() => {}); onOpen(); }}
      accessibilityRole="button" accessibilityLabel={`Trending number one in Kenya: #${tag}, ${uses} posts`}
      style={({ pressed }) => [s.card, { width: W, height: quotes.length ? 352 : 268, backgroundColor: '#0E3B2C' }, pressed && s.pressed]}>
      <View style={s.top}>
        <Text style={[s.eyebrow, { color: 'rgba(255,255,255,0.62)' }]}>TRENDING IN KENYA · #1</Text>
        <Text style={s.tag} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.4}>#{tag}</Text>
      </View>
      {quotes.length > 0 && (
        <View style={s.quotes}>
          {quotes.map((p, i) => (
            <View key={p.id} style={[s.quote, { backgroundColor: i === 0 ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.05)' }]}>
              <Text style={[s.quoteText, { color: i === 0 ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.72)' }]} numberOfLines={2}>
                {p.content?.trim()}
              </Text>
            </View>
          ))}
        </View>
      )}
      <View style={[s.strip, s.darkStrip]}>
        <View style={{ flexDirection: 'row' }}>
          {authors.length ? authors.map((a: any, i: number) => (
            <View key={a.id || i} style={[s.stackAv, { marginLeft: i ? -10 : 0, borderColor: '#0E3B2C' }]}>
              <UserAvatar avatarUrl={a.avatar_url ?? undefined} name={a.full_name || a.username} size={26} />
            </View>
          )) : <Ionicons name="trending-up" size={22} color="#B6E36A" />}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[s.stripTitle, { color: '#FFFFFF' }]} numberOfLines={1}>{commas(uses)} {uses === 1 ? 'post' : 'posts'}</Text>
          <Text style={[s.stripSub, { color: 'rgba(255,255,255,0.62)' }]} numberOfLines={1}>See what people are saying</Text>
        </View>
        <View style={[s.cta, { backgroundColor: '#FFFFFF' }]}><Text style={[s.ctaText, { color: '#0E3B2C' }]}>VIEW</Text></View>
      </View>
    </Pressable>
  );
}

/** A collection of clips: dark card, grid of covers, Watch. `renderTile` draws one cover. */
export function WatchCard({ count, renderTile, onWatch }: {
  count: number;
  renderTile: (i: number, style: any) => React.ReactNode;
  onWatch: () => void;
}) {
  const { width } = useWindowDimensions();
  const W = width - 40;
  const n = Math.min(count, 6);
  const gap = 6;
  const tileW = (W - 40 - gap * 2) / 3;
  const rows = n > 3 ? 2 : 1;
  const H = 112 + (rows === 2 ? 150 + 110 + gap : 170) + 72 + 18;
  return (
    <View style={[s.card, { width: W, height: H, backgroundColor: '#111114' }]}>
      <View style={s.top}>
        <Text style={[s.eyebrow, { color: 'rgba(255,255,255,0.62)' }]}>WATCH & SEE</Text>
        <Text style={[s.title, { color: '#FFFFFF' }]} numberOfLines={2}>What Kenya is{'\n'}watching today</Text>
      </View>
      <View style={{ position: 'absolute', left: 20, right: 20, top: 112, flexDirection: 'row', flexWrap: 'wrap', gap }}>
        {Array.from({ length: n }, (_, i) => renderTile(i, { width: tileW, height: rows === 2 ? (i < 3 ? 150 : 110) : 170, borderRadius: 12 }))}
      </View>
      <Pressable onPress={() => { Haptics.selectionAsync().catch(() => {}); onWatch(); }} accessibilityRole="button" accessibilityLabel="Watch clips in Mitaa"
        style={[s.strip, s.darkStrip]}>
        <View style={[s.appIcon, { backgroundColor: '#FF6A3D' }]}><Ionicons name="play" size={20} color="#FFFFFF" /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[s.stripTitle, { color: '#FFFFFF' }]}>Mitaa</Text>
          <Text style={[s.stripSub, { color: 'rgba(255,255,255,0.62)' }]} numberOfLines={1}>Short clips from around you</Text>
        </View>
        <View style={[s.cta, { backgroundColor: '#FFFFFF' }]}><Text style={[s.ctaText, { color: '#111114' }]}>WATCH</Text></View>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    alignSelf: 'center', borderRadius: 22, overflow: 'hidden', marginTop: 22,
    shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 5,
  },
  pressed: { transform: [{ scale: 0.98 }] },
  top: { position: 'absolute', left: 20, right: 20, top: 18 },
  eyebrow: { fontSize: 13, fontWeight: '600', letterSpacing: -0.08 },
  title: { fontSize: 28, lineHeight: 32, fontWeight: '800', letterSpacing: 0.36, marginTop: 2 },
  tag: { fontSize: 96, lineHeight: 104, fontWeight: '900', letterSpacing: -3, color: '#B6E36A', marginTop: 8, marginLeft: -4 },
  quotes: { position: 'absolute', left: 20, right: 20, top: 158, gap: 8 },
  quote: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  quoteText: { fontSize: 14, lineHeight: 19 },
  strip: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: 72, paddingHorizontal: 16, gap: 12,
    flexDirection: 'row', alignItems: 'center',
  },
  darkStrip: { backgroundColor: 'rgba(255,255,255,0.08)', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.12)' },
  stackAv: { borderWidth: 2, borderRadius: 16, overflow: 'hidden' },
  appIcon: { width: 42, height: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  stripTitle: { fontSize: 15, fontWeight: '600', letterSpacing: -0.24 },
  stripSub: { fontSize: 13, letterSpacing: -0.08, marginTop: 1 },
  cta: { height: 30, borderRadius: 15, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: 15, fontWeight: '700' },
});
