// Composer entry screens for the interactive stickers (mention, question, slider, countdown),
// the audience picker and the close friends list. All are overlays inside the composer modal.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, TextInput, KeyboardAvoidingView, Platform, FlatList,
  ActivityIndicator, ScrollView, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import apiClient from '../../utils/apiClient';
import { StoryAudience } from '../../stores/storyStore';
import { UserAvatar } from '../social/UserAvatar';
import { VerifiedBadge } from '../social/VerifiedBadge';
import { SliderCard, CountdownCard, QUESTION_COLORS, SLIDER_EMOJIS, countdownLabel } from './StoryStickers';
import { CLOSE_RING } from './StoryParts';

type Person = { id: string; username: string; full_name?: string | null; avatar_url?: string | null; is_verified?: boolean };
const GREEN = CLOSE_RING[0];
const tap = () => { Haptics.selectionAsync().catch(() => {}); };

/** Springs in from slightly small, like the other composer overlays settling. */
function Pop({ children }: { children: React.ReactNode }) {
  const s = useRef(new Animated.Value(0.92)).current;
  const o = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(s, { toValue: 1, useNativeDriver: true, damping: 16, stiffness: 240 }),
      Animated.timing(o, { toValue: 1, duration: 140, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity: o, transform: [{ scale: s }], width: '100%', alignItems: 'center' }}>{children}</Animated.View>;
}

function Buttons({ onCancel, onDone, doneLabel, disabled }: { onCancel: () => void; onDone: () => void; doneLabel: string; disabled?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
      <Pressable style={[styles.btn, styles.btnGhost]} onPress={onCancel}>
        <Text style={[styles.btnText, { color: '#fff' }]}>Ghairi</Text>
      </Pressable>
      <Pressable style={[styles.btn, disabled && { opacity: 0.4 }]} onPress={onDone} disabled={disabled}>
        <Text style={styles.btnText}>{doneLabel}</Text>
      </Pressable>
    </View>
  );
}

/** Rows of people (avatar, name, @username) with a trailing element. */
function PersonRow({ p, right, onPress, dark = true }: { p: Person; right?: React.ReactNode; onPress: () => void; dark?: boolean }) {
  const name = p.full_name || p.username;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.person, pressed && { backgroundColor: dark ? '#1C1C1E' : '#F1F1F3' }]}
      accessibilityRole="button" accessibilityLabel={name}>
      <UserAvatar avatarUrl={p.avatar_url ?? undefined} size={42} name={name} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={styles.personName} numberOfLines={1}>{name}</Text>
          {p.is_verified && <VerifiedBadge size={13} />}
        </View>
        <Text style={styles.personSub} numberOfLines={1}>@{p.username}</Text>
      </View>
      {right}
    </Pressable>
  );
}

/** People search (debounced); empty query = some people you follow. */
function usePeople(q: string) {
  const [rows, setRows] = useState<Person[] | null>(null);
  useEffect(() => {
    let live = true;
    const t = setTimeout(() => {
      apiClient.searchStoryPeople(q.trim()).then((r: any) => { if (live) setRows(r?.success ? r.data || [] : []); }).catch(() => { if (live) setRows([]); });
    }, q ? 180 : 0);
    return () => { live = false; clearTimeout(t); };
  }, [q]);
  return rows;
}

// ── Mention ──
export function MentionEntry({ onPick, onCancel }: { onPick: (p: Person) => void; onCancel: () => void }) {
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const rows = usePeople(q.replace(/^@/, ''));
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[StyleSheet.absoluteFill, styles.dim, { paddingTop: insets.top + 12 }]}>
      <View style={styles.searchRow}>
        <View style={styles.searchPill}>
          <Text style={styles.at}>@</Text>
          <TextInput
            autoFocus value={q} onChangeText={setQ} placeholder="Search people…" placeholderTextColor="#8E8E93"
            style={styles.searchInput} autoCapitalize="none" autoCorrect={false} maxLength={30} returnKeyType="search"
          />
        </View>
        <Pressable onPress={onCancel} hitSlop={8} accessibilityLabel="Cancel"><Text style={styles.cancel}>Ghairi</Text></Pressable>
      </View>
      {rows === null ? <ActivityIndicator color="#fff" style={{ marginTop: 24 }} /> : (
        <FlatList
          data={rows}
          keyExtractor={p => p.id}
          keyboardShouldPersistTaps="always"
          contentContainerStyle={{ paddingVertical: 8 }}
          ListEmptyComponent={<Text style={styles.empty}>{q ? 'No one found' : 'Type a name or @username'}</Text>}
          renderItem={({ item }) => <PersonRow p={item} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); onPick(item); }} />}
        />
      )}
    </KeyboardAvoidingView>
  );
}

// ── Question box ──
export function QuestionEntry({ onDone, onCancel }: { onDone: (prompt: string, color: string) => void; onCancel: () => void }) {
  const [prompt, setPrompt] = useState('');
  const [color, setColor] = useState(QUESTION_COLORS[0]);
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[StyleSheet.absoluteFill, styles.dim, styles.center]}>
      <Pop>
        <View style={[styles.qEdit, { backgroundColor: color }]}>
          <TextInput
            autoFocus value={prompt} onChangeText={setPrompt} placeholder="Niulize swali" placeholderTextColor="rgba(255,255,255,0.7)"
            style={styles.qInput} multiline maxLength={90}
          />
          <View style={styles.qFake}><Text style={styles.qFakeText}>People type their answers here</Text></View>
        </View>
        <View style={styles.colorRow}>
          {QUESTION_COLORS.map(c => (
            <Pressable key={c} onPress={() => { tap(); setColor(c); }} accessibilityLabel={`Colour ${c}`}
              style={[styles.colorDot, { backgroundColor: c, borderWidth: color === c ? 3 : 2, borderColor: color === c ? '#fff' : 'rgba(255,255,255,0.5)' }]} />
          ))}
        </View>
      </Pop>
      <Buttons onCancel={onCancel} onDone={() => onDone(prompt.trim() || 'Niulize swali', color)} doneLabel="Weka swali" />
    </KeyboardAvoidingView>
  );
}

// ── Emoji slider ──
export function SliderEntry({ onDone, onCancel }: { onDone: (question: string, emoji: string) => void; onCancel: () => void }) {
  const [q, setQ] = useState('');
  const [emoji, setEmoji] = useState(SLIDER_EMOJIS[0]);
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[StyleSheet.absoluteFill, styles.dim, styles.center]}>
      <Pop>
        <View style={styles.sEdit}>
          <TextInput
            autoFocus value={q} onChangeText={setQ} placeholder="Ask something (optional)" placeholderTextColor="#8E8E93"
            style={styles.sInput} multiline maxLength={80}
          />
          <SliderCard emoji={emoji} k={0.9} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emojiRow} keyboardShouldPersistTaps="always">
          {SLIDER_EMOJIS.map(e => (
            <Pressable key={e} onPress={() => { tap(); setEmoji(e); }} style={[styles.emojiBtn, emoji === e && styles.emojiOn]} accessibilityLabel={`Emoji ${e}`}>
              <Text style={{ fontSize: 24 }} allowFontScaling={false}>{e}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </Pop>
      <Buttons onCancel={onCancel} onDone={() => onDone(q.trim(), emoji)} doneLabel="Weka slider" />
    </KeyboardAvoidingView>
  );
}

// ── Countdown ──
const MIN_MS = 5 * 60 * 1000;          // at least 5 minutes ahead
const MAX_MS = 30 * 24 * 3600 * 1000;  // at most 30 days
const at = (base: Date, days: number, h: number, m = 0) => { const d = new Date(base); d.setDate(d.getDate() + days); d.setHours(h, m, 0, 0); return d; };
function quickTimes(now = new Date()) {
  const inHour = new Date(Math.ceil((now.getTime() + 3600 * 1000) / (5 * 60 * 1000)) * 5 * 60 * 1000);
  const tonight = at(now, now.getHours() >= 20 ? 1 : 0, 20);
  const tomorrow = at(now, 1, 9);
  const toSat = (6 - now.getDay() + 7) % 7 || 7;
  return [
    { label: 'Baada ya saa 1', date: inHour },
    { label: now.getHours() >= 20 ? 'Kesho 8pm' : 'Leo 8pm', date: tonight },
    { label: 'Kesho 9am', date: tomorrow },
    { label: 'Jumamosi', date: at(now, toSat, 10) },
  ];
}
function fromNow(d: Date) {
  const ms = d.getTime() - Date.now();
  if (ms <= 0) return 'already passed';
  const h = Math.floor(ms / 3600000), m = Math.round((ms % 3600000) / 60000);
  if (h >= 24) return `in ${Math.floor(h / 24)}d${h % 24 ? ` ${h % 24}h` : ''}`;
  if (h > 0) return `in ${h}h${m ? ` ${m}m` : ''}`;
  return `in ${m}m`;
}

/** A step button that repeats while held. */
function Step({ icon, onStep, label }: { icon: 'chevron-back' | 'chevron-forward' | 'remove' | 'add'; onStep: () => void; label: string }) {
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stop = () => { if (timer.current) clearInterval(timer.current); timer.current = null; };
  useEffect(() => stop, []);
  return (
    <Pressable
      onPress={() => { tap(); onStep(); }}
      onLongPress={() => { stop(); timer.current = setInterval(() => { tap(); onStep(); }, 110); }}
      onPressOut={stop}
      delayLongPress={300}
      hitSlop={6}
      style={({ pressed }) => [styles.step, pressed && { backgroundColor: '#3A3A3C' }]}
      accessibilityRole="button" accessibilityLabel={label}
    >
      <Ionicons name={icon} size={18} color="#fff" />
    </Pressable>
  );
}

export function CountdownEntry({ onDone, onCancel }: { onDone: (title: string, endsAt: string) => void; onCancel: () => void }) {
  const quick = useMemo(() => quickTimes(), []);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState<Date>(quick[1].date);
  const ok = date.getTime() - Date.now() >= MIN_MS && date.getTime() - Date.now() <= MAX_MS;

  const shift = (ms: number) => setDate(d => {
    const n = new Date(d.getTime() + ms);
    const lo = Date.now() + MIN_MS, hi = Date.now() + MAX_MS;
    return n.getTime() < lo || n.getTime() > hi ? d : n;
  });
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[StyleSheet.absoluteFill, styles.dim, styles.center]}>
      <Pop>
        <TextInput
          value={title} onChangeText={setTitle} placeholder="Jina la countdown" placeholderTextColor="rgba(255,255,255,0.55)"
          style={styles.cTitle} maxLength={40} returnKeyType="done"
        />
        <CountdownCard title={title || 'Countdown'} endsAt={date.toISOString()} k={0.9} />

        <View style={styles.cPicker}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }} keyboardShouldPersistTaps="always">
            {quick.map(c => {
              const on = Math.abs(c.date.getTime() - date.getTime()) < 60000;
              return (
                <Pressable key={c.label} onPress={() => { tap(); setDate(c.date); }} style={[styles.chip, on && styles.chipOn]}
                  accessibilityRole="button" accessibilityState={{ selected: on }}>
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{c.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={styles.stepRow}>
            <Step icon="chevron-back" label="Previous day" onStep={() => shift(-86400000)} />
            <Text style={styles.stepValue} numberOfLines={1}>{countdownLabel(date.toISOString()).split(' · ')[0]}</Text>
            <Step icon="chevron-forward" label="Next day" onStep={() => shift(86400000)} />
          </View>
          <View style={styles.stepRow}>
            <Step icon="remove" label="Hour earlier" onStep={() => shift(-3600000)} />
            <Text style={styles.stepTime}>{pad(date.getHours())}</Text>
            <Step icon="add" label="Hour later" onStep={() => shift(3600000)} />
            <Text style={styles.stepColon}>:</Text>
            <Step icon="remove" label="15 minutes earlier" onStep={() => shift(-15 * 60000)} />
            <Text style={styles.stepTime}>{pad(date.getMinutes())}</Text>
            <Step icon="add" label="15 minutes later" onStep={() => shift(15 * 60000)} />
          </View>
          <Text style={styles.fromNow}>{ok ? `Ends ${fromNow(date)}` : 'Pick a time in the future'}</Text>
        </View>
      </Pop>
      <Buttons onCancel={onCancel} onDone={() => onDone(title.trim() || 'Countdown', date.toISOString())} doneLabel="Weka countdown" disabled={!ok} />
    </KeyboardAvoidingView>
  );
}

// ── Audience ──
export function AudienceSheet({ value, closeCount, onChange, onManage, onClose }: {
  value: StoryAudience; closeCount: number | null; onChange: (a: StoryAudience) => void; onManage: () => void; onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const y = useRef(new Animated.Value(320)).current;
  useEffect(() => { Animated.spring(y, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 240 }).start(); }, []);
  const opts: { id: StoryAudience; icon: any; title: string; sub: string }[] = [
    { id: 'everyone', icon: 'globe-outline', title: 'Kila mtu', sub: 'Yeyote anayeweza kuona akaunti yako' },
    { id: 'followers', icon: 'people-outline', title: 'Wafuasi', sub: 'Watu wanaokufuata tu' },
    { id: 'close_friends', icon: 'star', title: 'Close friends', sub: closeCount === null ? 'People you picked' : `${closeCount} people you picked` },
  ];
  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} onPress={onClose} accessibilityLabel="Close" />
      <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + 12, transform: [{ translateY: y }] }]}>
        <View style={styles.grabber} />
        <Text style={styles.sheetTitle}>Nani anaona story hii?</Text>
        {opts.map(o => {
          const on = value === o.id;
          const green = o.id === 'close_friends';
          return (
            <Pressable key={o.id} onPress={() => { tap(); onChange(o.id); }} style={({ pressed }) => [styles.aRow, pressed && { backgroundColor: '#1C1C1E' }]}
              accessibilityRole="radio" accessibilityState={{ selected: on }}>
              <View style={[styles.aIcon, green && { backgroundColor: GREEN }]}>
                <Ionicons name={o.icon} size={18} color="#fff" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.personName}>{o.title}</Text>
                <Text style={styles.personSub} numberOfLines={1}>{o.sub}</Text>
              </View>
              {green && (
                <Pressable onPress={onManage} hitSlop={8} style={styles.edit} accessibilityLabel="Edit close friends">
                  <Text style={styles.editText}>Badilisha</Text>
                </Pressable>
              )}
              <View style={[styles.radio, on && { borderColor: green ? GREEN : '#fff' }]}>
                {on && <View style={[styles.radioDot, { backgroundColor: green ? GREEN : '#fff' }]} />}
              </View>
            </Pressable>
          );
        })}
      </Animated.View>
    </View>
  );
}

// ── Close friends ──
/** Your close friends list: tap to add/remove (they are not told). Empty search = people you follow. */
export function CloseFriendsSheet({ onClose, onCount }: { onClose: () => void; onCount: (n: number) => void }) {
  const insets = useSafeAreaInsets();
  const [friends, setFriends] = useState<Person[] | null>(null);
  const [q, setQ] = useState('');
  const results = usePeople(q);
  const ids = useMemo(() => new Set((friends || []).map(f => f.id)), [friends]);

  useEffect(() => {
    apiClient.getCloseFriends().then((r: any) => setFriends(r?.success ? r.data || [] : [])).catch(() => setFriends([]));
  }, []);
  useEffect(() => { if (friends) onCount(friends.length); }, [friends?.length]);

  const toggle = async (p: Person) => {
    const has = ids.has(p.id);
    Haptics.impactAsync(has ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setFriends(f => (has ? (f || []).filter(x => x.id !== p.id) : [p, ...(f || [])]));
    const r: any = await (has ? apiClient.removeCloseFriend(p.id) : apiClient.addCloseFriend(p.id)).catch(() => null);
    if (!r?.success) setFriends(f => (has ? [p, ...(f || [])] : (f || []).filter(x => x.id !== p.id))); // undo
  };

  const check = (p: Person) => (
    <View style={[styles.check, ids.has(p.id) && { backgroundColor: GREEN, borderColor: GREEN }]}>
      {ids.has(p.id) && <Ionicons name="checkmark" size={16} color="#fff" />}
    </View>
  );
  // Searching: just results. Not searching: your list first, then suggestions you follow.
  const data = q.trim()
    ? (results || [])
    : [...(friends || []), ...(results || []).filter(p => !ids.has(p.id))];
  const sectionAt = q.trim() ? -1 : (friends || []).length;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[StyleSheet.absoluteFill, { backgroundColor: '#000', paddingTop: insets.top + 6 }]}>
      <View style={styles.cfHead}>
        <Pressable onPress={onClose} style={styles.cfBack} accessibilityLabel="Done"><Ionicons name="chevron-back" size={24} color="#fff" /></Pressable>
        <Text style={styles.cfTitle}>Close friends</Text>
        <View style={styles.cfStar}><Ionicons name="star" size={14} color="#fff" /></View>
      </View>
      <Text style={styles.cfSub}>Only these people see your close friends stories. They are not told when you add them.</Text>
      <View style={[styles.searchPill, { marginHorizontal: 16, marginVertical: 10 }]}>
        <Ionicons name="search" size={16} color="#8E8E93" />
        <TextInput value={q} onChangeText={setQ} placeholder="Search" placeholderTextColor="#8E8E93" style={styles.searchInput}
          autoCapitalize="none" autoCorrect={false} maxLength={30} />
      </View>
      {friends === null ? <ActivityIndicator color="#fff" style={{ marginTop: 24 }} /> : (
        <FlatList
          data={data}
          keyExtractor={p => p.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          ListHeaderComponent={!q.trim() && friends.length ? <Text style={styles.cfSection}>Kwenye orodha · {friends.length}</Text> : null}
          ListEmptyComponent={<Text style={styles.empty}>{q ? 'No one found' : 'Search for people to add'}</Text>}
          renderItem={({ item, index }) => (
            <>
              {index === sectionAt && <Text style={styles.cfSection}>Mapendekezo</Text>}
              <PersonRow p={item} onPress={() => toggle(item)} right={check(item)} />
            </>
          )}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  dim: { backgroundColor: 'rgba(0,0,0,0.78)' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, paddingHorizontal: 22, borderRadius: 24, backgroundColor: '#fff' },
  btnGhost: { backgroundColor: 'rgba(255,255,255,0.15)' },
  btnText: { color: '#000', fontWeight: '600', fontSize: 15 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  searchPill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, height: 42, borderRadius: 21, backgroundColor: '#1C1C1E', paddingHorizontal: 14 },
  at: { color: '#D9366F', fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold' },
  searchInput: { flex: 1, color: '#fff', fontSize: 16, paddingVertical: 0 },
  cancel: { color: '#fff', fontSize: 15, fontWeight: '600' },
  empty: { color: '#8E8E93', textAlign: 'center', marginTop: 28, fontSize: 15 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 8 },
  personName: { color: '#fff', fontSize: 15, fontWeight: '600', flexShrink: 1 },
  personSub: { color: '#8E8E93', fontSize: 13 },
  qEdit: { width: 280, borderRadius: 18, paddingTop: 20, paddingHorizontal: 14, paddingBottom: 12 },
  qInput: { color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center', minHeight: 30 },
  qFake: { marginTop: 14, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  qFakeText: { color: '#8E8E93', fontSize: 13, fontWeight: '600' },
  colorRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  colorDot: { width: 28, height: 28, borderRadius: 14 },
  sEdit: { alignItems: 'center', gap: 12 },
  sInput: { color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center', minHeight: 30, minWidth: 220 },
  emojiRow: { gap: 8, paddingHorizontal: 8, marginTop: 16 },
  emojiBtn: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  emojiOn: { backgroundColor: '#fff' },
  cTitle: { color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center', minWidth: 220, marginBottom: 12 },
  cPicker: { width: '100%', maxWidth: 340, marginTop: 16, gap: 10, alignItems: 'center' },
  chip: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 16, backgroundColor: '#1C1C1E' },
  chipOn: { backgroundColor: '#fff' },
  chipText: { color: '#E5E5EA', fontSize: 13, fontWeight: '600' },
  chipTextOn: { color: '#000' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#111', borderRadius: 22, paddingHorizontal: 6, height: 44 },
  step: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1C1C1E' },
  stepValue: { color: '#fff', fontSize: 15, fontWeight: '700', minWidth: 110, textAlign: 'center' },
  stepTime: { color: '#fff', fontSize: 18, fontWeight: '800', minWidth: 28, textAlign: 'center', fontVariant: ['tabular-nums'] },
  stepColon: { color: '#8E8E93', fontSize: 18, fontWeight: '800' },
  fromNow: { color: '#AEAEB2', fontSize: 13, fontWeight: '600' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#111', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 2 },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: '#3A3A3C', marginTop: 10 },
  sheetTitle: { color: '#fff', fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold', marginTop: 14, marginBottom: 6, paddingHorizontal: 20 },
  aRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 11 },
  aIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#2C2C2E', alignItems: 'center', justifyContent: 'center' },
  edit: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: '#1C1C1E' },
  editText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#48484A', alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: '#48484A', alignItems: 'center', justifyContent: 'center' },
  cfHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, height: 48 },
  cfBack: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  cfTitle: { color: '#fff', fontSize: 19, fontFamily: 'SpaceGrotesk_700Bold' },
  cfStar: { width: 22, height: 22, borderRadius: 11, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center' },
  cfSub: { color: '#8E8E93', fontSize: 13, lineHeight: 18, paddingHorizontal: 20 },
  cfSection: { color: '#8E8E93', fontSize: 12, fontWeight: '700', letterSpacing: 0.4, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4, textTransform: 'uppercase' },
});
