// Mounted once in AppNavigator (like MzingaHost): the start sheet, the room, and the minutes,
// all opened from anywhere through the baraza store.
import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBarazaStore } from '../../stores/barazaStore';
import { setFeedPaused } from '../social/videoPlayback';
import { NoiseOverlay } from '../social/NoiseOverlay';
import { BarazaRoom } from './BarazaRoom';
import { BarazaMinutesView } from './BarazaMinutes';
import { audioAvailable } from './barazaAudio';
import { HONEY, INK, EMBER, Stick, PillButton, TreeShade } from './barazaUi';

export function BarazaHost() {
  const openId = useBarazaStore(s => s.openId);
  const startOpen = useBarazaStore(s => s.startOpen);
  const minutesId = useBarazaStore(s => s.minutesId);
  useEffect(() => { setFeedPaused('baraza', !!openId); }, [openId]);
  return (
    <>
      {startOpen && <StartSheet />}
      {openId && (
        <Modal visible transparent animationType="slide" statusBarTranslucent onRequestClose={() => useBarazaStore.getState().close()}>
          <BarazaRoom />
        </Modal>
      )}
      {minutesId && !openId && (
        <Modal visible animationType="slide" statusBarTranslucent onRequestClose={() => useBarazaStore.getState().closeMinutes()}>
          <View style={{ flex: 1 }}>
            <TreeShade cy={200} />
            <BarazaMinutesView roomId={minutesId} onClose={() => useBarazaStore.getState().closeMinutes()} />
          </View>
        </Modal>
      )}
    </>
  );
}

const TURNS = [60, 120, 180];

function StartSheet() {
  const insets = useSafeAreaInsets();
  const busy = useBarazaStore(s => s.busy);
  const error = useBarazaStore(s => s.error);
  const [title, setTitle] = useState('');
  const [turn, setTurn] = useState(120);
  const close = () => useBarazaStore.getState().closeStart();
  const start = async () => {
    if (!title.trim() || busy) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    await useBarazaStore.getState().create(title.trim(), turn);
  };

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
      <Pressable style={styles.scrim} onPress={close} accessibilityLabel="Close" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetWrap} pointerEvents="box-none">
        <Animated.View entering={FadeInDown.springify().damping(17)} style={[styles.sheet, { paddingBottom: insets.bottom + 18 }]}>
          <NoiseOverlay opacity={0.06} />
          <View style={styles.grab} />
          <View style={styles.headRow}>
            <Stick size={40} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.h1}>Start a baraza</Text>
              <Text style={styles.h2}>You hold the stick first and pass it on.</Text>
            </View>
          </View>

          {!audioAvailable ? (
            <Text style={styles.update}>Update KChat to start a baraza. This version can't record sound.</Text>
          ) : (
            <>
              <Text style={styles.label}>What are we talking about?</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Youth jobs in Kibra: what next?"
                placeholderTextColor="rgba(255,255,255,0.3)"
                style={styles.input}
                maxLength={80}
                autoFocus
                returnKeyType="go"
                onSubmitEditing={start}
              />

              <Text style={styles.label}>Each turn with the stick</Text>
              <View style={styles.seg}>
                {TURNS.map(s => (
                  <Pressable key={s} onPress={() => { setTurn(s); Haptics.selectionAsync().catch(() => {}); }}
                    style={[styles.segBtn, turn === s && styles.segOn]} accessibilityRole="radio" accessibilityState={{ selected: turn === s }}>
                    <Text style={[styles.segText, turn === s && { color: INK }]}>{s / 60} min</Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.consent}>
                <View style={styles.recDot} />
                <Text style={styles.consentText}>Barazas are recorded for minutes. Everyone sees this before joining. When you end it, the minutes are posted from your account.</Text>
              </View>

              {error ? <Text style={styles.err}>{error}</Text> : null}
              <PillButton label={busy ? 'Starting…' : 'Start the baraza'} icon="radio-outline" tone="honey" onPress={start} disabled={!title.trim() || busy} />
            </>
          )}
          <Pressable onPress={close} style={styles.cancel} accessibilityRole="button">
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#15110B', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10, overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(242,181,68,0.2)',
  },
  grab: { alignSelf: 'center', width: 38, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.18)', marginBottom: 16 },
  headRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  h1: { color: '#fff', fontSize: 22, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: -0.4 },
  h2: { color: 'rgba(255,255,255,0.55)', fontSize: 13.5, marginTop: 2 },
  label: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600', marginTop: 18, marginBottom: 8 },
  input: { color: '#fff', fontSize: 17, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 13 },
  seg: { flexDirection: 'row', gap: 8 },
  segBtn: { flex: 1, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: HONEY },
  segText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  consent: { flexDirection: 'row', gap: 10, marginTop: 18, marginBottom: 16, padding: 12, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)' },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: EMBER, marginTop: 5 },
  consentText: { flex: 1, color: 'rgba(255,255,255,0.6)', fontSize: 12.5, lineHeight: 18 },
  err: { color: '#FF9A73', fontSize: 13, textAlign: 'center', marginBottom: 10 },
  update: { color: 'rgba(255,255,255,0.75)', fontSize: 15, lineHeight: 21, marginVertical: 18 },
  cancel: { alignSelf: 'center', paddingVertical: 12, marginTop: 4 },
  cancelText: { color: 'rgba(255,255,255,0.55)', fontSize: 15, fontWeight: '600' },
});
