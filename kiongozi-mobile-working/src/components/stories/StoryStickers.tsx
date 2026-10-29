// Interactive story stickers: mention, question box, emoji slider, countdown and a shared post.
// Each one draws the same in the composer and the viewer; the viewer passes the handlers that
// make it live. Sizes are at scale 1 on a 390-wide canvas, times k (screen scale).
import React, { useEffect, useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import Reanimated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { StoryOverlay, StoryPostCard } from '../../stores/storyStore';
import { UserAvatar } from '../social/UserAvatar';
import { VerifiedBadge } from '../social/VerifiedBadge';

export const QUESTION_W = 260;
export const SLIDER_W = 260;
export const COUNTDOWN_W = 270;
export const POST_W = 240;
export const MENTION_H = 44;

/** Question box header colours (picked in the composer, stored as `bg`). */
export const QUESTION_COLORS = ['#D9366F', '#14653F', '#1D4E89', '#F5A33D', '#6A2C82', '#111111'];
export const SLIDER_EMOJIS = ['😍', '😂', '🔥', '😮', '😢', '👏', '💯', '🇰🇪'];
const MENTION_COLOR = '#D9366F';
const SPRING = { damping: 16, stiffness: 220 };

/** Approx. size (unscaled, unrotated) of an overlay, for hit boxes and placement. */
export function stickerSize(o: StoryOverlay, k: number): { w: number; h: number } | null {
  switch (o.type) {
    case 'mention': return { w: (28 + ((o.text || '').length + 1) * 11.5) * k, h: MENTION_H * k };
    case 'question': return { w: QUESTION_W * k, h: 128 * k };
    case 'slider': return { w: SLIDER_W * k, h: (o.text ? 112 : 76) * k };
    case 'countdown': return { w: COUNTDOWN_W * k, h: 132 * k };
    case 'post': return { w: POST_W * k, h: (o.post?.image ? 330 : 150) * k };
    default: return null;
  }
}
export const isInteractive = (o: StoryOverlay) => ['mention', 'question', 'slider', 'countdown', 'post'].includes(o.type);

// ── Mention ──
export function MentionPill({ username, k }: { username: string; k: number }) {
  return (
    <View style={[styles.mention, { height: MENTION_H * k, paddingHorizontal: 14 * k, borderRadius: 12 * k }]}>
      <Text style={[styles.mentionText, { fontSize: 19 * k }]} numberOfLines={1}>@{username.toUpperCase()}</Text>
    </View>
  );
}

// ── Question box ──
export function QuestionCard({ prompt, color, avatarUrl, name, k, onPress }: {
  prompt: string; color?: string; avatarUrl?: string | null; name?: string; k: number; onPress?: () => void;
}) {
  const bg = color || QUESTION_COLORS[0];
  const body = (
    <View style={[styles.qCard, { width: QUESTION_W * k, borderRadius: 18 * k }]}>
      <View style={[styles.qHead, { backgroundColor: bg, borderTopLeftRadius: 18 * k, borderTopRightRadius: 18 * k, paddingTop: 22 * k, paddingBottom: 14 * k, paddingHorizontal: 16 * k }]}>
        <Text style={[styles.qPrompt, { fontSize: 18 * k, lineHeight: 23 * k }]} numberOfLines={3}>{prompt || 'Niulize swali'}</Text>
      </View>
      <View style={[styles.qField, { margin: 10 * k, height: 40 * k, borderRadius: 12 * k }]}>
        <Text style={[styles.qFieldText, { fontSize: 14 * k }]}>Andika jibu…</Text>
      </View>
      <View style={[styles.qAvatar, { top: -14 * k, width: 32 * k, height: 32 * k, borderRadius: 16 * k, borderColor: bg }]}>
        <UserAvatar avatarUrl={avatarUrl ?? undefined} size={28 * k} name={name} />
      </View>
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={() => { Haptics.selectionAsync().catch(() => {}); onPress(); }}
      style={({ pressed }) => pressed && { transform: [{ scale: 0.97 }] }}
      accessibilityRole="button" accessibilityLabel={`Answer: ${prompt}`}>
      {body}
    </Pressable>
  );
}

// ── Emoji slider ──
/**
 * Drag the emoji along the track (it grows as you go, with a light tick every 10%); letting go
 * sends the value. Afterwards (or on your own story) a marker shows the average.
 */
export function SliderCard({ question, emoji, k, mine, avg, count, showResults, onSlide, onTouch }: {
  question?: string; emoji?: string; k: number;
  mine?: number | null; avg?: number | null; count?: number;
  showResults?: boolean; onSlide?: (v: number) => void; onTouch?: (down: boolean) => void;
}) {
  const e = emoji || SLIDER_EMOJIS[0];
  const pad = 18 * k;
  const trackW = SLIDER_W * k - pad * 2;
  const knob = 40 * k;
  const answered = mine !== null && mine !== undefined;
  const canSlide = !!onSlide && !answered && !showResults;
  const revealed = showResults || answered;

  const pos = useSharedValue(answered ? (mine as number) : 0);
  const start = useSharedValue(0);
  const active = useSharedValue(0);
  const lastTick = useSharedValue(-1);
  const avgP = useSharedValue(0);

  // Back to the start if a failed send rolled the answer back
  useEffect(() => { pos.value = withSpring(answered ? (mine as number) : 0, SPRING); }, [mine]);
  useEffect(() => { avgP.value = revealed && avg !== null && avg !== undefined ? withSpring(1, SPRING) : 0; }, [revealed, avg]);

  const tick = () => { Haptics.selectionAsync().catch(() => {}); };
  const down = (d: boolean) => onTouch?.(d);
  const submit = (v: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onSlide?.(Math.round(v * 1000) / 1000);
  };

  const pan = Gesture.Pan()
    .enabled(canSlide)
    .activeOffsetX([-3, 3])
    .failOffsetY([-30, 30])
    .onBegin(() => { start.value = pos.value; active.value = withSpring(1, SPRING); runOnJS(down)(true); })
    .onUpdate(ev => {
      const v = Math.min(1, Math.max(0, start.value + ev.translationX / trackW));
      pos.value = v;
      const b = Math.floor(v * 10);
      if (b !== lastTick.value) { lastTick.value = b; runOnJS(tick)(); }
    })
    // Cancelled (e.g. the viewer took the touch) or barely moved: nothing is sent, the emoji goes back
    .onEnd((_, success) => { if (success && pos.value > 0.02) runOnJS(submit)(pos.value); else pos.value = withSpring(0, SPRING); })
    .onFinalize(() => { active.value = withSpring(0, SPRING); runOnJS(down)(false); });

  const knobStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: pos.value * trackW - knob / 2 },
      { scale: 1 + active.value * 0.35 + pos.value * 0.45 },
      { translateY: -active.value * 6 },
    ],
  }));
  const fillStyle = useAnimatedStyle(() => ({ width: Math.max(0, pos.value * trackW) }));
  const avgStyle = useAnimatedStyle(() => ({
    opacity: avgP.value,
    transform: [{ translateX: (avg ?? 0) * trackW - 13 * k }, { scale: 0.4 + avgP.value * 0.6 }],
  }));

  return (
    <View style={[styles.sCard, { width: SLIDER_W * k, borderRadius: 18 * k, paddingHorizontal: pad, paddingTop: question ? 16 * k : 10 * k, paddingBottom: 14 * k }]}>
      {!!question && <Text style={[styles.sQ, { fontSize: 17 * k, lineHeight: 22 * k, marginBottom: 12 * k }]} numberOfLines={2}>{question}</Text>}
      <GestureDetector gesture={pan}>
        <View style={{ height: knob + 8 * k, justifyContent: 'center' }} collapsable={false}
          accessibilityRole="adjustable" accessibilityLabel={`${question || 'Slider'}. Drag the ${e} to answer.`}>
          <View style={[styles.sTrack, { height: 8 * k, borderRadius: 4 * k }]}>
            <Reanimated.View style={[{ height: '100%', overflow: 'hidden', borderRadius: 4 * k }, fillStyle]}>
              <LinearGradient colors={['#F5B83D', '#FF5A5F', '#D9366F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: trackW, height: '100%' }} />
            </Reanimated.View>
          </View>
          {revealed && avg !== null && avg !== undefined && (
            <Reanimated.View pointerEvents="none" style={[styles.sAvg, { width: 26 * k, height: 26 * k, borderRadius: 13 * k }, avgStyle]}>
              <Text style={{ fontSize: 14 * k }} allowFontScaling={false}>{e}</Text>
            </Reanimated.View>
          )}
          <Reanimated.View pointerEvents="none" style={[styles.sKnob, { width: knob, height: knob }, knobStyle]}>
            <Text style={{ fontSize: 30 * k }} allowFontScaling={false}>{e}</Text>
          </Reanimated.View>
        </View>
      </GestureDetector>
      {revealed && (
        <Text style={[styles.sMeta, { fontSize: 12 * k, marginTop: 6 * k }]}>
          {avg === null || avg === undefined ? 'Bado hakuna jibu' : `Wastani ${Math.round(avg * 100)}% · ${count ?? 0} ${count === 1 ? 'jibu' : 'majibu'}`}
        </Text>
      )}
    </View>
  );
}

// ── Countdown ──
const pad2 = (n: number) => String(n).padStart(2, '0');
const DAYS = ['Jpi', 'Jtt', 'Jnn', 'Jtn', 'Alh', 'Ijm', 'Jms'];
const MONTHS = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ago', 'Sep', 'Okt', 'Nov', 'Des'];
/** "Alh 30 Okt · 20:00" */
export function countdownLabel(iso: string) {
  const d = new Date(iso);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} · ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Ticks every second while mounted. */
function useNow(on = true) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [on]);
  return now;
}

export function CountdownCard({ title, endsAt, k, reminded, onToggleRemind, live = true }: {
  title?: string; endsAt: string; k: number; reminded?: boolean; onToggleRemind?: () => void; live?: boolean;
}) {
  const now = useNow(live);
  const left = Math.max(0, new Date(endsAt).getTime() - now);
  const ended = left <= 0;
  const s = Math.floor(left / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const parts: [string, string][] = d > 0
    ? [[pad2(d), 'siku'], [pad2(h), 'saa'], [pad2(m), 'dak']]
    : [[pad2(h), 'saa'], [pad2(m), 'dak'], [pad2(sec), 'sek']];

  return (
    <LinearGradient colors={['#2E1A47', '#6A2C82']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={[styles.cCard, { width: COUNTDOWN_W * k, borderRadius: 18 * k, padding: 14 * k }]}>
      <Text style={[styles.cTitle, { fontSize: 15 * k, marginBottom: 8 * k }]} numberOfLines={1}>{(title || 'Countdown').toUpperCase()}</Text>
      {ended ? (
        <Text style={[styles.cEnded, { fontSize: 26 * k, marginVertical: 8 * k }]}>Imefika! 🎉</Text>
      ) : (
        <View style={[styles.cRow, { gap: 6 * k }]} accessibilityLabel={`${d ? `${d} days ` : ''}${h} hours ${m} minutes left`}>
          {parts.map(([v, label], i) => (
            <React.Fragment key={label}>
              {i > 0 && <Text style={[styles.cColon, { fontSize: 26 * k }]}>:</Text>}
              <View style={{ alignItems: 'center' }}>
                <View style={[styles.cBox, { width: 52 * k, height: 50 * k, borderRadius: 10 * k }]}>
                  <Text style={[styles.cDigit, { fontSize: 28 * k }]} allowFontScaling={false}>{v}</Text>
                </View>
                <Text style={[styles.cLabel, { fontSize: 10 * k, marginTop: 3 * k }]}>{label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      )}
      <View style={[styles.cFoot, { marginTop: 10 * k }]}>
        <Text style={[styles.cWhen, { fontSize: 12 * k }]} numberOfLines={1}>{countdownLabel(endsAt)}</Text>
        {onToggleRemind && !ended && (
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); onToggleRemind(); }}
            style={({ pressed }) => [styles.cRemind, { height: 30 * k, paddingHorizontal: 11 * k, borderRadius: 15 * k, gap: 5 * k }, reminded && styles.cRemindOn, pressed && { transform: [{ scale: 0.95 }] }]}
            accessibilityRole="switch" accessibilityState={{ checked: !!reminded }} accessibilityLabel="Remind me"
          >
            <Ionicons name={reminded ? 'notifications' : 'notifications-outline'} size={14 * k} color={reminded ? '#2E1A47' : '#fff'} />
            <Text style={[styles.cRemindText, { fontSize: 12 * k }, reminded && { color: '#2E1A47' }]}>{reminded ? 'Utakumbushwa' : 'Nikumbushe'}</Text>
          </Pressable>
        )}
      </View>
    </LinearGradient>
  );
}

// ── Shared post ──
export function PostSticker({ post, k }: { post: StoryPostCard; k: number }) {
  const w = POST_W * k;
  return (
    <View style={[styles.pCard, { width: w, borderRadius: 18 * k }]}>
      <View style={[styles.pHead, { padding: 10 * k, gap: 8 * k }]}>
        <UserAvatar avatarUrl={post.avatar_url ?? undefined} size={28 * k} name={post.full_name || post.username} />
        <Text style={[styles.pName, { fontSize: 14 * k }]} numberOfLines={1}>{post.username}</Text>
        {post.is_verified && <VerifiedBadge size={13 * k} />}
      </View>
      {!!post.image && <Image source={{ uri: post.image }} style={{ width: w, height: w * 0.9, backgroundColor: '#EEE' }} resizeMode="cover" />}
      {!!post.text && (
        <Text style={[styles.pText, { fontSize: 14 * k, lineHeight: 19 * k, padding: 10 * k }]} numberOfLines={post.image ? 2 : 4}>{post.text}</Text>
      )}
    </View>
  );
}

const shadow = { shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8 };
const styles = StyleSheet.create({
  mention: { backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', ...shadow, shadowOpacity: 0.18, shadowRadius: 8, elevation: 3 },
  mentionText: { color: MENTION_COLOR, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 0.2 },
  qCard: { backgroundColor: '#FFFFFF', ...shadow },
  qHead: { alignItems: 'center' },
  qPrompt: { color: '#FFFFFF', fontWeight: '800', textAlign: 'center' },
  qField: { backgroundColor: '#F1F1F3', alignItems: 'center', justifyContent: 'center' },
  qFieldText: { color: '#8E8E93', fontWeight: '600' },
  qAvatar: { position: 'absolute', alignSelf: 'center', borderWidth: 2, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  sCard: { backgroundColor: '#FFFFFF', ...shadow },
  sQ: { color: '#111111', fontWeight: '800', textAlign: 'center' },
  sTrack: { backgroundColor: '#E5E5EA', overflow: 'hidden' },
  sKnob: { position: 'absolute', left: 0, alignItems: 'center', justifyContent: 'center' },
  sAvg: { position: 'absolute', left: 0, top: 0, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#D9366F' },
  sMeta: { color: '#6B6B70', textAlign: 'center', fontWeight: '600' },
  cCard: { ...shadow, alignItems: 'center' },
  cTitle: { color: '#FFFFFF', fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 },
  cRow: { flexDirection: 'row', alignItems: 'flex-start' },
  cBox: { backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  cDigit: { color: '#FFFFFF', fontWeight: '800', fontVariant: ['tabular-nums'] },
  cColon: { color: 'rgba(255,255,255,0.6)', fontWeight: '800', marginTop: 6 },
  cLabel: { color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  cEnded: { color: '#FFFFFF', fontWeight: '800' },
  cFoot: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', justifyContent: 'space-between', gap: 8 },
  cWhen: { color: 'rgba(255,255,255,0.75)', fontWeight: '600', flexShrink: 1 },
  cRemind: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
  cRemindOn: { backgroundColor: '#FFFFFF' },
  cRemindText: { color: '#FFFFFF', fontWeight: '700' },
  pCard: { backgroundColor: '#FFFFFF', overflow: 'hidden', ...shadow },
  pHead: { flexDirection: 'row', alignItems: 'center' },
  pName: { color: '#111111', fontWeight: '700', flexShrink: 1 },
  pText: { color: '#111111' },
});
