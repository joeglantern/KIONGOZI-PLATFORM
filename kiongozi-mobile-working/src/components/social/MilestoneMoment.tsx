// A milestone moment: "Your post passed 100 likes" on cream paper, the number on a torn ink strip,
// a cut-paper heart (star for views, sun for followers, bubble for a first post) breathing in stop-motion.
// Calm on purpose: the card fades up, the strip rips in, nothing bounces. Share draws a 9:16 card on the
// server (only for milestones you really reached); See the post opens it.
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Cutout, Boil, TornStrip, PAPER, AR } from '../wrapped/paper';
import { enterUp, enterFade } from '../../theme/motion';
import { CardImageSheet } from './CardImageSheet';
import apiClient from '../../utils/apiClient';

export type MilestoneData = { milestone: 'first_post' | 'followers' | 'likes' | 'views'; value: number; post_id?: string; snippet?: string };

const INK = '#1B1712', CREAM = '#F3EBDD', SUB = '#6B6258';

export const fmtMilestone = (n: number) => (n >= 1000 ? `${n / 1000}K` : String(n));

/** Same sentences the server sends (MilestoneService.milestoneTitle) */
export function milestoneTitle(m: Pick<MilestoneData, 'milestone' | 'value'>) {
  const v = Number(m.value) || 0;
  if (m.milestone === 'first_post') return 'Your first post is up';
  if (m.milestone === 'followers') return v === 1 ? 'You got your first follower' : `You reached ${fmtMilestone(v)} followers`;
  if (m.milestone === 'likes') return `Your post passed ${fmtMilestone(v)} likes`;
  return `Your post passed ${fmtMilestone(v)} views`;
}

function line(m: MilestoneData) {
  if (m.milestone === 'first_post') return 'Welcome to the conversation. People can see it, like it and reply now.';
  if (m.milestone === 'followers') return m.value === 1 ? 'Someone wants to hear what you have to say.' : 'People keep pulling up to hear what you say.';
  if (m.milestone === 'likes') return 'People are feeling this one.';
  return 'People keep watching this one.';
}

export function milestoneArt(kind: MilestoneData['milestone']) {
  if (kind === 'likes') return { src: PAPER.heart, ar: AR.heart };
  if (kind === 'views') return { src: PAPER.star, ar: AR.star };
  if (kind === 'followers') return { src: PAPER.sun, ar: AR.sun };
  return { src: PAPER.bubble, ar: AR.bubble };
}

export function MilestoneMoment({ data, onClose, onSeePost }: { data: MilestoneData | null; onClose: () => void; onSeePost?: (postId: string) => void }) {
  const insets = useSafeAreaInsets();
  const { width: W } = useWindowDimensions();
  const reduce = useReducedMotion();
  const [shown, setShown] = useState<MilestoneData | null>(data);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (data) { setShown(data); setSharing(false); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); }
  }, [data]);

  if (!shown) return null;
  const m = shown;
  const art = milestoneArt(m.milestone);
  const artW = Math.min(170, W * 0.42);
  const stripW = Math.min(W - 80, 330);
  const big = m.milestone === 'first_post' ? '1st' : fmtMilestone(Number(m.value) || 0);

  const close = () => { setShown(null); onClose(); };
  // One modal at a time: the moment steps aside, then the card sheet opens
  const share = () => { Haptics.selectionAsync().catch(() => {}); setSharing(true); };

  return (
    <>
      <Modal visible={!!data && !sharing} animationType="fade" presentationStyle="overFullScreen" transparent statusBarTranslucent onRequestClose={close}>
        <View style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
          <Pressable onPress={close} hitSlop={12} style={styles.close} accessibilityRole="button" accessibilityLabel="Close">
            <Ionicons name="close" size={20} color={INK} />
          </Pressable>

          <View style={styles.middle}>
            <Animated.View entering={enterFade(360)} style={{ transform: [{ rotate: '-8deg' }] }}>
              <Boil reduce={reduce} amp={1.2} drift={3}>
                <Cutout source={art.src} w={artW} h={artW * art.ar} />
              </Boil>
            </Animated.View>

            <TornStrip source={PAPER.stripInk} w={stripW} h={Math.max(84, stripW * 0.26)} delay={260} reduce={reduce} style={{ marginTop: 34 }}>
              <Animated.Text entering={enterFade(240).delay(620)} style={styles.big} maxFontSizeMultiplier={1.1}>{big}</Animated.Text>
            </TornStrip>

            <Animated.View entering={enterUp(320).delay(520)} style={styles.copy}>
              <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={1.3}>{milestoneTitle(m)}</Text>
              {m.snippet ? <Text style={styles.snippet} numberOfLines={2} maxFontSizeMultiplier={1.3}>"{m.snippet}"</Text> : null}
              <Text style={styles.line} maxFontSizeMultiplier={1.3}>{line(m)}</Text>
            </Animated.View>
          </View>

          <Animated.View entering={enterUp(320).delay(700)} style={styles.actions}>
            <Pressable onPress={share} style={({ pressed }) => [styles.primary, pressed && { opacity: 0.85 }]} accessibilityRole="button">
              <Text style={styles.primaryText} maxFontSizeMultiplier={1.2}>Share</Text>
            </Pressable>
            {m.post_id && onSeePost ? (
              <Pressable onPress={() => { const id = m.post_id!; close(); onSeePost(id); }} style={({ pressed }) => [styles.secondary, pressed && { opacity: 0.7 }]} accessibilityRole="button">
                <Text style={styles.secondaryText} maxFontSizeMultiplier={1.2}>See the post</Text>
              </Pressable>
            ) : null}
          </Animated.View>
        </View>
      </Modal>

      <CardImageSheet
        visible={!!data && sharing}
        title="Share your moment"
        ratio={9 / 16}
        cacheKey={`milestone:${m.milestone}:${m.value}:${m.post_id || ''}`}
        load={preview => apiClient.getMilestoneCard({ kind: m.milestone, value: Number(m.value) || 0, post_id: m.post_id }, preview) as any}
        shareText={milestoneTitle(m).replace(/^Your /, 'My ').replace(/^You /, 'I ') + ' on KChat'}
        onClose={close}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CREAM, paddingHorizontal: 24 },
  close: { alignSelf: 'flex-end', width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(27,23,18,0.08)', alignItems: 'center', justifyContent: 'center' },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  big: { color: CREAM, fontSize: 54, fontWeight: '900', letterSpacing: -1 },
  copy: { alignItems: 'center', marginTop: 30, paddingHorizontal: 8 },
  title: { color: INK, fontSize: 26, lineHeight: 32, fontWeight: '800', textAlign: 'center' },
  snippet: { color: INK, fontSize: 15, lineHeight: 21, marginTop: 10, textAlign: 'center', opacity: 0.8 },
  line: { color: SUB, fontSize: 15, lineHeight: 21, marginTop: 8, textAlign: 'center' },
  actions: { gap: 10 },
  primary: { height: 52, borderRadius: 26, backgroundColor: INK, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: CREAM, fontSize: 16, fontWeight: '700' },
  secondary: { height: 52, borderRadius: 26, borderWidth: 1.5, borderColor: 'rgba(27,23,18,0.25)', alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: INK, fontSize: 16, fontWeight: '700' },
});
