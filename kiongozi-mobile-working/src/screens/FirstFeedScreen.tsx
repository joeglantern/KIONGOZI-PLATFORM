// Step 2 of 2, shown once right after an account is created: pick a county, a few topics and
// some people to follow, so the first feed is not empty. County and topics stay on the phone
// (prefsStore `county` / `interests`); the server has no field for them yet.
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image, Modal, FlatList, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../hooks/useTheme';
import { useAuthStore } from '../stores/authStore';
import { useSocialStore } from '../stores/socialStore';
import { usePrefs } from '../stores/prefsStore';
import { useFollowState, toggleFollow } from '../stores/followSync';
import { KENYA_COUNTIES } from '../components/baraza/kenyaMap';
import { UserAvatar } from '../components/social/UserAvatar';
import { VerifiedBadge } from '../components/social/VerifiedBadge';

const PIN = require('../../assets/baraza/pin.png');
const COMMON_COUNTIES = ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru'];
const TOPICS = ['Youth jobs', 'Climate', 'Music', 'Governance', 'Football', 'Campus', 'Business', 'Faith'];

type Person = { id: string; username: string; full_name?: string; avatar_url?: string; is_verified?: boolean; is_private?: boolean; county?: string | null };

interface Props {
  onDone: () => void;
}

export default function FirstFeedScreen({ onDone }: Props) {
  const T = useTheme();
  const insets = useSafeAreaInsets();
  const user = useAuthStore(s => s.user);
  const explorePosts = useSocialStore(s => s.explorePosts);
  const exploreLoading = useSocialStore(s => s.exploreLoading);
  const [county, setCounty] = useState<string | null>(null);
  const [topics, setTopics] = useState<string[]>([]);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    useSocialStore.getState().fetchExploreFeed(true).catch(() => {});
    // A county already chosen for Baraza is the obvious first guess
    AsyncStorage.getItem('baraza_from_v1').then(c => { if (c) setCounty(c); }).catch(() => {});
  }, []);

  const countyChips = useMemo(() => {
    const list = county && !COMMON_COUNTIES.includes(county) ? [county, ...COMMON_COUNTIES] : COMMON_COUNTIES;
    return list.slice(0, county && !COMMON_COUNTIES.includes(county) ? 5 : 4);
  }, [county]);

  // Up to six people from Explore, same source the Explore "People" row uses
  const people = useMemo<Person[]>(() => {
    const seen = new Set<string>();
    const out: Person[] = [];
    for (const p of explorePosts) {
      const a: any = p.profiles;
      const id = a?.id || p.user_id;
      if (!id || id === user?.id || seen.has(id) || a?.is_bot || !a?.username) continue;
      seen.add(id);
      out.push({ id, username: a.username, full_name: a.full_name, avatar_url: a.avatar_url, is_verified: a.is_verified, is_private: a.is_private, county: a.county ?? null });
      if (out.length >= 6) break;
    }
    return out;
  }, [explorePosts, user?.id]);

  const tick = () => Haptics.selectionAsync().catch(() => {});
  const pickCounty = (c: string) => { tick(); setCounty(cur => (cur === c ? null : c)); };
  const toggleTopic = (t: string) => { tick(); setTopics(cur => (cur.includes(t) ? cur.filter(x => x !== t) : [...cur, t])); };

  const finish = (save: boolean) => {
    if (save) {
      usePrefs.getState().setInterests(topics);
      usePrefs.getState().setCounty(county);
    }
    onDone();
  };

  const chip = (selected: boolean) => [styles.chip, { backgroundColor: selected ? T.text : T.surface, borderColor: selected ? T.text : T.borderLight }];
  const chipText = (selected: boolean) => [styles.chipText, { color: selected ? T.bg : T.text }];

  return (
    <View style={[styles.root, { backgroundColor: T.bg, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.step, { color: T.textSub }]}>STEP 2 OF 2</Text>
        <Text style={[styles.title, { color: T.text }]} maxFontSizeMultiplier={1.2}>Who should be in your feed?</Text>
        <Text style={[styles.sub, { color: T.textSub }]} maxFontSizeMultiplier={1.3}>Pick your county and a few topics. You can change these any time.</Text>

        <Text style={[styles.label, { color: T.textSub }]}>YOUR COUNTY</Text>
        <View style={styles.wrap}>
          {countyChips.map(c => (
            <Pressable key={c} onPress={() => pickCounty(c)} accessibilityRole="button" accessibilityState={{ selected: county === c }}
              style={({ pressed }) => [...chip(county === c), pressed && { opacity: 0.75 }]}>
              <Image source={PIN} style={[styles.pin, county === c && { tintColor: T.bg }]} />
              <Text style={chipText(county === c)}>{c}</Text>
            </Pressable>
          ))}
          <Pressable onPress={() => { tick(); setPicking(true); }} accessibilityRole="button"
            style={({ pressed }) => [...chip(false), pressed && { opacity: 0.75 }]}>
            <Text style={chipText(false)}>More</Text>
            <Ionicons name="chevron-down" size={14} color={T.textSub} />
          </Pressable>
        </View>

        <Text style={[styles.label, { color: T.textSub }]}>TOPICS</Text>
        <View style={styles.wrap}>
          {TOPICS.map(t => {
            const on = topics.includes(t);
            return (
              <Pressable key={t} onPress={() => toggleTopic(t)} accessibilityRole="button" accessibilityState={{ selected: on }}
                style={({ pressed }) => [...chip(on), pressed && { opacity: 0.75 }]}>
                <Text style={chipText(on)}>{t}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.label, { color: T.textSub }]}>PEOPLE TO FOLLOW</Text>
        {people.length === 0 ? (
          <View style={styles.peopleEmpty}>
            {exploreLoading ? <ActivityIndicator color={T.textSub} /> : <Text style={[styles.emptyText, { color: T.textSub }]}>No suggestions right now. Your feed will fill up as you follow people.</Text>}
          </View>
        ) : (
          people.map(p => <PersonRow key={p.id} person={p} />)
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 6, backgroundColor: T.bg, borderTopColor: T.borderLight }]}>
        <Pressable onPress={() => finish(true)} accessibilityRole="button"
          style={({ pressed }) => [styles.primary, { backgroundColor: T.text }, pressed && { opacity: 0.85 }]}>
          <Text style={[styles.primaryText, { color: T.bg }]} maxFontSizeMultiplier={1.2}>Show me my feed</Text>
        </Pressable>
        <Pressable onPress={() => finish(false)} style={styles.skip} hitSlop={8} accessibilityRole="button">
          <Text style={[styles.skipText, { color: T.textSub }]}>Skip for now</Text>
        </Pressable>
      </View>

      <CountyPicker visible={picking} current={county} onPick={c => { setCounty(c); setPicking(false); }} onClose={() => setPicking(false)} />
    </View>
  );
}

function PersonRow({ person }: { person: Person }) {
  const T = useTheme();
  const f = useFollowState(person.id, { is_private: person.is_private, username: person.username });
  const on = f.status !== 'none';
  const label = f.status === 'following' ? 'Following' : f.status === 'requested' ? 'Requested' : 'Follow';
  return (
    <View style={styles.person}>
      <UserAvatar avatarUrl={person.avatar_url} name={person.full_name || person.username} size={46} />
      <View style={styles.personBody}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: T.text }]} numberOfLines={1}>{person.full_name || person.username}</Text>
          {person.is_verified && <VerifiedBadge size={14} />}
        </View>
        <Text style={[styles.handle, { color: T.textSub }]} numberOfLines={1}>
          @{person.username}{person.county ? ` · ${person.county}` : ''}
        </Text>
      </View>
      <Pressable
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); toggleFollow(person.id, { is_private: person.is_private, username: person.username }); }}
        accessibilityRole="button"
        accessibilityLabel={`${label} ${person.username}`}
        style={({ pressed }) => [styles.follow, { backgroundColor: on ? T.surface : T.text, borderColor: on ? T.borderLight : T.text }, pressed && { opacity: 0.8 }]}
      >
        <Text style={[styles.followText, { color: on ? T.text : T.bg }]}>{label}</Text>
      </Pressable>
    </View>
  );
}

function CountyPicker({ visible, current, onPick, onClose }: { visible: boolean; current: string | null; onPick: (c: string) => void; onClose: () => void }) {
  const T = useTheme();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const list = useMemo(() => KENYA_COUNTIES.filter(c => c.toLowerCase().includes(q.trim().toLowerCase())), [q]);
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.pickerRoot, { backgroundColor: T.bg }]}>
        <View style={styles.pickerHead}>
          <Text style={[styles.pickerTitle, { color: T.text }]}>Your county</Text>
          <Pressable onPress={onClose} hitSlop={10} style={[styles.close, { backgroundColor: T.surface2 }]} accessibilityLabel="Close">
            <Ionicons name="close" size={18} color={T.text} />
          </Pressable>
        </View>
        <TextInput
          style={[styles.search, { backgroundColor: T.inputBg, color: T.text }]}
          placeholder="Search counties"
          placeholderTextColor={T.placeholder}
          value={q}
          onChangeText={setQ}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        <FlatList
          data={list}
          keyExtractor={c => c}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          renderItem={({ item }) => (
            <Pressable onPress={() => onPick(item)} accessibilityRole="button"
              style={({ pressed }) => [styles.pickerRow, { borderBottomColor: T.borderLight }, pressed && { backgroundColor: T.surface }]}>
              <Image source={PIN} style={styles.pinRow} />
              <Text style={[styles.pickerRowText, { color: T.text }]}>{item}</Text>
              {current === item && <Ionicons name="checkmark" size={18} color={T.text} />}
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 },
  step: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
  title: { fontSize: 28, lineHeight: 33, fontWeight: '800', letterSpacing: -0.6, marginTop: 8 },
  sub: { fontSize: 15, lineHeight: 21, marginTop: 8 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginTop: 28, marginBottom: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { height: 36, borderRadius: 18, borderWidth: 1, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipText: { fontSize: 14, fontWeight: '600' },
  pin: { width: 13, height: 13 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 },
  personBody: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { fontSize: 15, fontWeight: '600', flexShrink: 1 },
  handle: { fontSize: 13, marginTop: 2 },
  follow: { height: 34, paddingHorizontal: 16, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center', minWidth: 86 },
  followText: { fontSize: 14, fontWeight: '700' },
  peopleEmpty: { paddingVertical: 18, alignItems: 'center' },
  emptyText: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  footer: { paddingHorizontal: 24, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  primary: { height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: 17, fontWeight: '700' },
  skip: { alignSelf: 'center', paddingVertical: 12 },
  skipText: { fontSize: 14, fontWeight: '600' },
  pickerRoot: { flex: 1, paddingHorizontal: 16 },
  pickerHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 18, paddingBottom: 12 },
  pickerTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  close: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  search: { height: 44, borderRadius: 12, paddingHorizontal: 14, fontSize: 16, marginBottom: 8 },
  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: StyleSheet.hairlineWidth },
  pinRow: { width: 16, height: 16 },
  pickerRowText: { flex: 1, fontSize: 16 },
});
