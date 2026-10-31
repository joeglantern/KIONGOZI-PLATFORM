// Mounted once in AppNavigator (like MzingaHost): the start sheet, the room, and the minutes,
// all opened from anywhere through the baraza store.
import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, TextInput, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBarazaStore } from '../../stores/barazaStore';
import { setFeedPaused } from '../social/videoPlayback';
import { BarazaRoom } from './BarazaRoom';
import { BarazaMinutesView } from './BarazaMinutes';
import { audioAvailable } from './barazaAudio';
import { Stick, PillButton, TreeShade } from './barazaUi';
import { useBT } from './barazaTheme';

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
          <RoomStatusBar />
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

/** Dark icons on the light rooms, light icons on the night room. */
function RoomStatusBar() {
  const t = useBT();
  return <StatusBar barStyle={t.dark ? 'light-content' : 'dark-content'} animated />;
}

function StartSheet() {
  const t = useBT();
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
        <Animated.View entering={FadeInDown.springify().damping(17)} style={[styles.sheet, { backgroundColor: t.dark ? '#1B2140' : '#FFFFFF', borderColor: t.line, paddingBottom: insets.bottom + 18 }]}>
          <View style={[styles.grab, { backgroundColor: t.line }]} />
          <View style={styles.headRow}>
            <Stick size={48} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.h1, { color: t.ink }]}>Start a baraza</Text>
              <Text style={[styles.h2, { color: t.sub }]}>You hold the stick first and pass it on.</Text>
            </View>
          </View>

          {!audioAvailable ? (
            <Text style={[styles.update, { color: t.sub }]}>Update KChat to start a baraza. This version can't record sound.</Text>
          ) : (
            <>
              <Text style={[styles.label, { color: t.sub }]}>What are we talking about?</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Youth jobs in Kibra: what next?"
                placeholderTextColor={t.faint}
                style={[styles.input, { color: t.ink, backgroundColor: t.soft }]}
                maxLength={80}
                autoFocus
                returnKeyType="go"
                onSubmitEditing={start}
              />

              <Text style={[styles.label, { color: t.sub }]}>Each turn with the stick</Text>
              <View style={styles.seg}>
                {TURNS.map(s => (
                  <Pressable key={s} onPress={() => { setTurn(s); Haptics.selectionAsync().catch(() => {}); }}
                    style={[styles.segBtn, { backgroundColor: turn === s ? t.accent : t.soft }]} accessibilityRole="radio" accessibilityState={{ selected: turn === s }}>
                    <Text style={[styles.segText, { color: turn === s ? t.accentInk : t.ink }]}>{s / 60} min</Text>
                  </Pressable>
                ))}
              </View>

              <View style={[styles.consent, { backgroundColor: t.soft }]}>
                <View style={[styles.recDot, { backgroundColor: t.danger }]} />
                <Text style={[styles.consentText, { color: t.sub }]}>Barazas are recorded for minutes. Everyone sees this before joining. When you end it, you get the minutes and choose whether to post them.</Text>
              </View>

              {error ? <Text style={[styles.err, { color: t.danger }]}>{error}</Text> : null}
              <PillButton label={busy ? 'Starting…' : 'Start the baraza'} left={<Stick size={26} />} tone="honey" onPress={start} disabled={!title.trim() || busy} />
            </>
          )}
          <Pressable onPress={close} style={styles.cancel} accessibilityRole="button">
            <Text style={[styles.cancelText, { color: t.sub }]}>Cancel</Text>
          </Pressable>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  grab: { alignSelf: 'center', width: 38, height: 5, borderRadius: 3, marginBottom: 16 },
  headRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  h1: { fontSize: 22, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: -0.4 },
  h2: { fontSize: 13.5, marginTop: 2 },
  label: { fontSize: 13, fontWeight: '600', marginTop: 18, marginBottom: 8 },
  input: { fontSize: 17, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 13 },
  seg: { flexDirection: 'row', gap: 8 },
  segBtn: { flex: 1, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  segText: { fontSize: 15, fontWeight: '700' },
  consent: { flexDirection: 'row', gap: 10, marginTop: 18, marginBottom: 16, padding: 12, borderRadius: 14 },
  recDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  consentText: { flex: 1, fontSize: 12.5, lineHeight: 18 },
  err: { fontSize: 13, textAlign: 'center', marginBottom: 10 },
  update: { fontSize: 15, lineHeight: 21, marginVertical: 18 },
  cancel: { alignSelf: 'center', paddingVertical: 12, marginTop: 4 },
  cancelText: { fontSize: 15, fontWeight: '600' },
});
