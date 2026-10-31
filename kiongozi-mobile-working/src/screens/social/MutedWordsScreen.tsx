// Muted words: words, phrases and #tags you don't want to see. Posts with them leave your feed,
// replies fold away and notifications skip them. Add lands at once and rolls back if the server says no.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { toast } from '../../utils/alert';
import { Section, Card, Row, Segmented, useKitColors } from '../../components/settings/SettingsKit';
import { useMutedWords, MuteDuration, MutedWord } from '../../stores/mutedWordsStore';

const DURATIONS: { id: MuteDuration; label: string }[] = [
  { id: '24h', label: '24 hours' },
  { id: '7d', label: '7 days' },
  { id: 'forever', label: 'Forever' },
];

function ends(w: MutedWord) {
  if (!w.expires_at) return 'Forever';
  const ms = new Date(w.expires_at).getTime() - Date.now();
  if (ms < 3600_000) return 'Ends in under an hour';
  if (ms < 48 * 3600_000) return `Ends in ${Math.round(ms / 3600_000)} h`;
  return `Ends in ${Math.round(ms / 86400_000)} days`;
}

export default function MutedWordsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const C = useKitColors();
  const { words, loaded, load, add, remove } = useMutedWords();
  const [text, setText] = useState('');
  const [duration, setDuration] = useState<MuteDuration>('forever');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => { load().catch(() => {}); }, [load]);

  const phrase = text.replace(/\s+/g, ' ').trim();
  const canAdd = phrase.length > 0 && phrase.length <= 60;

  const submit = async () => {
    if (!canAdd) return;
    Haptics.selectionAsync().catch(() => {});
    setText('');
    const ok = await add(phrase, duration);
    if (!ok) {
      setText(t => t || phrase);
      toast('Couldn’t mute that', { kind: 'error', message: 'Check your connection and try again.' });
    }
  };

  const unmute = async (w: MutedWord) => {
    Haptics.selectionAsync().catch(() => {});
    const ok = await remove(w.id);
    if (!ok) toast('Couldn’t unmute that', { kind: 'error', message: 'Check your connection and try again.' });
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.page }}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [styles.back, pressed && { opacity: 0.5 }]} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={26} color={C.T.text} />
        </Pressable>
        <Text style={[styles.title, { color: C.T.text }]} accessibilityRole="header">Muted words</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <Section order={0} note="Hidden from your feed, replies and notifications. Capitals don’t matter. No one is told.">
            <View style={[styles.addCard, { backgroundColor: C.card }]}>
              <TextInput
                ref={inputRef}
                value={text}
                onChangeText={setText}
                placeholder="A word, phrase or #tag"
                placeholderTextColor={C.T.textMuted}
                style={[styles.input, { backgroundColor: C.isDark ? '#2C2C2E' : '#F2F2F7', color: C.T.text }]}
                maxLength={60}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={submit}
                accessibilityLabel="Word to mute"
              />
              <View style={{ marginHorizontal: -16 }}>
                <Segmented options={DURATIONS} value={duration} onChange={setDuration} label="How long" />
              </View>
              <Pressable
                onPress={submit}
                disabled={!canAdd}
                accessibilityRole="button"
                accessibilityState={{ disabled: !canAdd }}
                style={({ pressed }) => [
                  styles.button,
                  { backgroundColor: C.T.text, opacity: canAdd ? (pressed ? 0.8 : 1) : 0.35 },
                ]}
              >
                <Text style={[styles.buttonText, { color: C.T.bg }]}>Mute</Text>
              </Pressable>
            </View>
          </Section>

          <Section title="Muted" order={1}>
            <Card>
              {words.length ? words.map(w => (
                <Row
                  key={w.id}
                  title={w.phrase}
                  sub={ends(w)}
                  right={
                    <Pressable onPress={() => unmute(w)} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Unmute ${w.phrase}`}>
                      <Text style={[styles.remove, { color: C.T.textMuted }]}>Remove</Text>
                    </Pressable>
                  }
                />
              )) : (
                <Row
                  icon="volume-mute-outline"
                  title={loaded ? 'Nothing muted yet' : 'Loading'}
                  sub={loaded ? 'Mute a word and posts with it go quiet' : undefined}
                />
              )}
            </Card>
          </Section>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6, paddingBottom: 6 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '700' },
  addCard: { borderRadius: 14, padding: 16, paddingBottom: 16 },
  input: { height: 44, borderRadius: 10, paddingHorizontal: 12, fontSize: 16, marginBottom: 10 },
  button: { height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 16, fontWeight: '700' },
  remove: { fontSize: 14, fontWeight: '600', marginLeft: 8 },
});
