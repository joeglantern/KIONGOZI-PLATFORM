// Starting a baraza, the way X Spaces and Instagram Live do it: full screen, one big question per step,
// a preview of exactly what people will see on Explore, then 3, 2, 1 and the stick is handed over.
// Turn length is not asked here (2 minutes to start); the host changes it from the room.
// Motion is calm on purpose: steps slide 24px and fade, nothing bounces.
import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, TextInput, KeyboardAvoidingView, Platform, Image, useWindowDimensions, ScrollView, StatusBar } from 'react-native';
import Animated, {
  FadeIn, FadeOut, useSharedValue, useAnimatedStyle, withTiming, Easing, cancelAnimation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBarazaStore } from '../../stores/barazaStore';
import { useAuthStore } from '../../stores/authStore';
import { useProfileStore } from '../../stores/profileStore';
import apiClient from '../../utils/apiClient';
import { audioAvailable } from './barazaAudio';
import { ART, MiniStick, PaintedStick } from './barazaArt';
import { useBT } from './barazaTheme';
import { chime } from './chime';
import { UserAvatar } from '../social/UserAvatar';

const EASE = Easing.bezier(0.2, 0.9, 0.3, 1);
const FIRST_TURN = 120;
const EVERGREEN = ['Side hustles that actually work', 'Matatu fares this month', 'Finding your first job', 'What should our county fix first?'];
const BEADS = ['#D9483B', '#F6EEDC', '#E9A23B', '#16130F'];

/** A step slides in from 24px to the side and fades, the way iOS pushes a view (no spring). */
const enterFrom = (dx: number) => () => {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ translateX: dx }] },
    animations: {
      opacity: withTiming(1, { duration: 240, easing: EASE }),
      transform: [{ translateX: withTiming(0, { duration: 280, easing: EASE }) }],
    },
  };
};

type Step = 'title' | 'ready' | 'count';

export function StartFlow() {
  const t = useBT();
  const insets = useSafeAreaInsets();
  const busy = useBarazaStore(s => s.busy);
  const error = useBarazaStore(s => s.error);
  const [step, setStep] = useState<Step>('title');
  const [dir, setDir] = useState(1);
  const [title, setTitle] = useState('');
  const [topics, setTopics] = useState<string[]>(EVERGREEN);
  const close = () => useBarazaStore.getState().closeStart();
  const go = (s: Step, d = 1) => { Haptics.selectionAsync().catch(() => {}); setDir(d); setStep(s); };

  // Topic ideas: what is trending now, then a few that always work
  useEffect(() => {
    apiClient.getTrending().then((r: any) => {
      const tags: string[] = (r?.data?.hashtags || []).slice(0, 3).map((h: any) => `#${String(h.tag).replace(/^#/, '')}`);
      if (tags.length) setTopics([...tags, ...EVERGREEN].slice(0, 6));
    }).catch(() => {});
  }, []);

  const clean = title.trim();
  const bg = t.dark ? ['#1B2140', '#141A33'] : ['#FFFFFF', '#FBF7F1', '#F6EEDC'];

  return (
    <Modal visible animationType="slide" statusBarTranslucent onRequestClose={() => (step === 'title' ? close() : go(step === 'count' ? 'ready' : 'title', -1))}>
      <StatusBar barStyle={t.dark ? 'light-content' : 'dark-content'} />
      <LinearGradient colors={bg as any} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {step !== 'count' && (
          <View style={[styles.top, { paddingTop: insets.top + 10 }]}>
            <Pressable onPress={step === 'title' ? close : () => go('title', -1)} hitSlop={10} style={[styles.round, { backgroundColor: t.soft }]}
              accessibilityRole="button" accessibilityLabel={step === 'title' ? 'Close' : 'Back'}>
              <Ionicons name={step === 'title' ? 'close' : 'chevron-back'} size={20} color={t.ink} />
            </Pressable>
            <View style={styles.dots}>
              {[0, 1].map(i => {
                const on = (step === 'title' ? 0 : 1) >= i;
                const cur = (step === 'title' ? 0 : 1) === i;
                return <View key={i} style={[styles.dot, { width: cur ? 22 : 8, backgroundColor: on ? t.ink : t.line }]} />;
              })}
            </View>
            <View style={{ width: 36 }} />
          </View>
        )}

        {!audioAvailable ? (
          <View style={[styles.body, { justifyContent: 'center', flex: 1 }]}>
            <PaintedStick height={72} tilt={-18} />
            <Text style={[styles.h1, { color: t.ink, marginTop: 18 }]}>Update KChat to start a baraza</Text>
            <Text style={[styles.lead, { color: t.sub }]}>This version can't record sound. Get the latest KChat from the store, then come back.</Text>
          </View>
        ) : step === 'title' ? (
          <Animated.View key="title" entering={enterFrom(24 * dir)} exiting={FadeOut.duration(120)} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
              <PaintedStick height={64} tilt={-18} />
              <Text style={[styles.kicker, { color: t.sub }]}>Start a baraza</Text>
              <Text style={[styles.h1, { color: t.ink }]}>What are we talking about?</Text>
              <TextInput
                value={title}
                onChangeText={v => setTitle(v.replace(/\n/g, ' '))}
                placeholder="Youth jobs in Kibra: what next?"
                placeholderTextColor={t.faint}
                style={[styles.bigInput, { color: t.ink }]}
                maxLength={80}
                multiline
                autoFocus
                selectionColor={t.accent}
                blurOnSubmit
                returnKeyType="next"
                onSubmitEditing={() => clean && go('ready')}
              />
              <View style={[styles.rule, { backgroundColor: t.line }]} />
              <View style={styles.metaRow}>
                <Text style={[styles.meta, { color: t.sub }]}>A question pulls more people in</Text>
                <Text style={[styles.meta, { color: title.length > 70 ? t.danger : t.sub }]}>{title.length}/80</Text>
              </View>
              <Text style={[styles.label, { color: t.sub }]}>Or pick up a topic</Text>
              <View style={styles.chips}>
                {topics.map(x => (
                  <Pressable key={x} onPress={() => { Haptics.selectionAsync().catch(() => {}); setTitle(x); }}
                    style={({ pressed }) => [styles.chip, { backgroundColor: t.soft }, pressed && { opacity: 0.7 }]} accessibilityRole="button">
                    <Text style={[styles.chipText, { color: t.ink }]} numberOfLines={1}>{x}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
              <Pressable onPress={() => clean && go('ready')} disabled={!clean}
                style={({ pressed }) => [styles.primary, { backgroundColor: t.ink, opacity: clean ? 1 : 0.3 }, pressed && { transform: [{ scale: 0.98 }] }]}
                accessibilityRole="button" accessibilityLabel="Next">
                <Text style={[styles.primaryText, { color: t.bg === '#FFFFFF' || !t.dark ? '#FFFFFF' : '#141A33' }]}>Next</Text>
              </Pressable>
            </View>
          </Animated.View>
        ) : step === 'ready' ? (
          <Animated.View key="ready" entering={enterFrom(24 * dir)} exiting={FadeOut.duration(120)} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.body}>
              <Text style={[styles.h1, { color: t.ink }]}>Here's how people will see it</Text>
              <PreviewCard title={clean} />
              <View style={{ gap: 12, marginTop: 20, marginBottom: 12 }}>
                <Fact n="1" t={t} bold="You hold the stick first." rest="Pass it when you're done." />
                <Fact n="2" t={t} bold="Turns are 2 minutes." rest="Change it any time from the room." />
                <Fact n="rec" t={t} bold="It's recorded for minutes." rest="Everyone sees this before joining, and you choose whether to post them." />
              </View>
            </ScrollView>
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
              {error ? <Text style={[styles.err, { color: t.danger }]}>{error}</Text> : null}
              <Pressable onPress={() => go('count')} style={({ pressed }) => [styles.primary, styles.honey, { backgroundColor: t.accent, shadowColor: t.accent }, pressed && { transform: [{ scale: 0.98 }] }]}
                accessibilityRole="button" accessibilityLabel="Go live">
                <PaintedStick height={30} tilt={-32} />
                <Text style={[styles.primaryText, { color: t.accentInk }]}>Go live</Text>
              </Pressable>
            </View>
          </Animated.View>
        ) : (
          <Countdown title={clean} busy={busy} onCancel={() => go('ready', -1)} />
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Fact({ n, bold, rest, t }: { n: string; bold: string; rest: string; t: ReturnType<typeof useBT> }) {
  const rec = n === 'rec';
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <View style={[styles.factNum, { backgroundColor: rec ? t.dangerSoft : t.soft }]}>
        {rec ? <View style={[styles.recDot, { backgroundColor: t.danger }]} /> : <Text style={{ color: t.ink, fontWeight: '800', fontSize: 13 }}>{n}</Text>}
      </View>
      <Text style={{ flex: 1, color: t.sub, fontSize: 15, lineHeight: 21 }}>
        <Text style={{ color: t.ink, fontWeight: '700' }}>{bold}</Text> {rest}
      </Text>
    </View>
  );
}

/** The Explore "Happening now" card with their own title, so they know exactly what they're putting out */
function PreviewCard({ title }: { title: string }) {
  const { width } = useWindowDimensions();
  const user = useAuthStore(s => s.user) as any;
  const prof = useProfileStore(s => s.currentUserProfile) as any;
  const me = { avatar_url: prof?.avatar_url || user?.avatar_url, full_name: prof?.full_name || user?.full_name, username: prof?.username || user?.username };
  const W = width - 48;
  return (
    <View style={[styles.card, { width: W }]}>
      <LinearGradient colors={['#C9C6F2', '#FFD9A8']} style={StyleSheet.absoluteFill} />
      <View style={{ paddingHorizontal: 18, paddingTop: 16 }}>
        <Text style={styles.cardKicker}>HAPPENING NOW</Text>
        <Text style={styles.cardTitle} numberOfLines={2}>{title}</Text>
      </View>
      <Image source={ART.island} style={{ width: W, height: W * 0.5, marginTop: 8 }} resizeMode="contain" fadeDuration={0} />
      <View style={styles.cardStrip}>
        <UserAvatar avatarUrl={me?.avatar_url || me?.user_metadata?.avatar_url} size={34} name={me?.full_name || me?.username} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#16130F' }} numberOfLines={1}>You have the stick</Text>
          <Text style={{ fontSize: 12.5, color: '#5E574F' }}>Starting now</Text>
        </View>
        <View style={styles.join}><Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>JOIN</Text></View>
      </View>
    </View>
  );
}

/**
 * 3, 2, 1 on the stage. Each second the ring drains with a light tap; at zero the stick flies in, turns
 * once and lands with the three-note chime, and the room is created behind it.
 */
function Countdown({ title, busy, onCancel }: { title: string; busy: boolean; onCancel: () => void }) {
  const t = useBT();
  const insets = useSafeAreaInsets();
  const { width: W } = useWindowDimensions();
  const [n, setN] = useState(3);
  const [handed, setHanded] = useState(false);
  const fly = useSharedValue(0);
  const cancelled = useRef(false);
  const R = 92, NB = 30;
  const [lit, setLit] = useState(NB);

  useEffect(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const t0s = Date.now();
    const tick = setInterval(() => setLit(Math.max(0, Math.ceil(NB * (1 - (Date.now() - t0s) / 3000)))), 50);
    setTimeout(() => clearInterval(tick), 3100);
    const t2 = setTimeout(() => { if (!cancelled.current) { setN(2); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); } }, 1000);
    const t1 = setTimeout(() => { if (!cancelled.current) { setN(1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); } }, 2000);
    const t0 = setTimeout(async () => {
      if (cancelled.current) return;
      setHanded(true);
      fly.value = withTiming(1, { duration: 720, easing: EASE });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      chime('turn');
      const [id] = await Promise.all([
        useBarazaStore.getState().create(title, FIRST_TURN),
        new Promise(r => setTimeout(r, 900)), // let the stick land before the room slides up
      ]);
      if (!id && !cancelled.current) onCancel();
    }, 3000);
    return () => { cancelled.current = true; clearTimeout(t2); clearTimeout(t1); clearTimeout(t0); };
  }, []);

  const stickStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, fly.value * 3),
    transform: [
      { translateX: (1 - fly.value) * W * 0.7 },
      { translateY: (1 - fly.value) * -120 },
      { rotate: `${(1 - fly.value) * 300}deg` },
    ],
  }));

  return (
    <Animated.View entering={FadeIn.duration(220)} style={[StyleSheet.absoluteFill, { alignItems: 'center' }]}>
      <Text style={[styles.countLead, { color: t.sub, marginTop: insets.top + 90 }]}>{handed ? 'The stick is yours' : "Get comfortable. You're first."}</Text>
      <View style={styles.countStage}>
        <Image source={ART.empty} style={{ position: 'absolute', width: 230, height: 230 * 512 / 720, top: 232, opacity: 0.9 }} resizeMode="contain" fadeDuration={0} />
        {!handed ? (
          <>
            {/* a ring of beads that go out one by one, clockwise from the top */}
            <View style={{ position: 'absolute', top: 0, width: 200, height: 200 }} pointerEvents="none">
              {Array.from({ length: NB }, (_, i) => {
                const a = (i / NB) * Math.PI * 2 - Math.PI / 2;
                const on = i >= NB - lit;
                return <View key={i} style={{ position: 'absolute', left: 100 + Math.cos(a) * R - 6, top: 100 + Math.sin(a) * R - 6, width: 12, height: 12, borderRadius: 6,
                  backgroundColor: on ? BEADS[i % 4] : t.line, borderWidth: on && i % 4 === 1 ? StyleSheet.hairlineWidth * 2 : 0, borderColor: t.line }} />;
              })}
            </View>
            <Animated.Text key={n} entering={FadeIn.duration(180)} style={[styles.countNum, { color: t.ink }]} accessibilityLiveRegion="assertive">{n}</Animated.Text>
          </>
        ) : (
          <Animated.View style={[{ position: 'absolute', top: 6 }, stickStyle]}>
            <MiniStick height={190} />
          </Animated.View>
        )}
      </View>
      <Text style={[styles.countTitle, { color: t.ink }]} numberOfLines={2}>{title}</Text>
      {!handed ? (
        <Pressable onPress={onCancel} hitSlop={12} style={{ marginTop: 18, padding: 10 }} accessibilityRole="button">
          <Text style={{ color: t.sub, fontSize: 15, fontWeight: '700' }}>Cancel</Text>
        </Pressable>
      ) : (
        <Text style={{ color: t.sub, fontSize: 15, fontWeight: '600', marginTop: 28 }}>{busy ? 'Opening the room' : ' '}</Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 6 },
  round: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { height: 8, borderRadius: 4 },
  body: { paddingHorizontal: 24, paddingTop: 22, paddingBottom: 24 },
  kicker: { fontSize: 15, fontWeight: '700', marginTop: 14 },
  h1: { fontSize: 32, lineHeight: 37, fontWeight: '800', letterSpacing: -0.8, marginTop: 6 },
  lead: { fontSize: 16, lineHeight: 22, marginTop: 10 },
  bigInput: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.6, marginTop: 24, paddingVertical: 6, minHeight: 84, textAlignVertical: 'top' },
  rule: { height: StyleSheet.hairlineWidth * 2, marginTop: 10 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  meta: { fontSize: 13 },
  label: { fontSize: 13, fontWeight: '700', marginTop: 26, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, height: 38, borderRadius: 19, justifyContent: 'center', maxWidth: '100%' },
  chipText: { fontSize: 15, fontWeight: '600' },
  footer: { paddingHorizontal: 20, paddingTop: 8 },
  primary: { height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  honey: { shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  primaryText: { fontSize: 17, fontWeight: '800' },
  err: { fontSize: 13, textAlign: 'center', marginBottom: 10 },
  factNum: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  recDot: { width: 9, height: 9, borderRadius: 5 },
  card: { marginTop: 18, borderRadius: 22, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 4 },
  cardKicker: { fontSize: 12, fontWeight: '700', color: 'rgba(22,19,15,0.6)' },
  cardTitle: { fontSize: 22, lineHeight: 26, fontWeight: '800', color: '#16130F', marginTop: 2 },
  cardStrip: { backgroundColor: '#FFF8EE', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  join: { backgroundColor: '#0A84FF', borderRadius: 15, paddingHorizontal: 14, height: 30, justifyContent: 'center' },
  countLead: { fontSize: 15, fontWeight: '700' },
  countStage: { width: 300, height: 410, alignItems: 'center', marginTop: 34 },
  countNum: { position: 'absolute', top: 18, fontSize: 140, lineHeight: 160, fontWeight: '900', letterSpacing: -6, includeFontPadding: false },
  countTitle: { fontSize: 20, lineHeight: 26, fontWeight: '800', textAlign: 'center', paddingHorizontal: 32, marginTop: 6 },
});
