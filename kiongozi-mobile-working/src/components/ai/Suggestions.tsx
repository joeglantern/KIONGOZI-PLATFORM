// Welcome screen for Kiongozi AI: animated orb, greeting, and four illustrated starter cards.
import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import Reanimated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { AIOrb } from './AIOrb';

export const SUGGESTIONS: { key: string; title: string; hint: string; prompt: string; art: any }[] = [
  { key: 'green', title: 'Green careers', hint: 'Jobs in the green economy', prompt: 'What green jobs can a young person in Kenya start preparing for this year?', art: require('../../../assets/ai/green.png') },
  { key: 'rights', title: 'Know your rights', hint: 'Civic rights, simply put', prompt: 'Explain my key civic rights as a young Kenyan in simple terms.', art: require('../../../assets/ai/rights.png') },
  { key: 'digital', title: 'Digital skills', hint: 'Learn something new', prompt: 'Which digital skills should I learn first to get online work, and where can I start for free?', art: require('../../../assets/ai/digital.png') },
  { key: 'community', title: 'Community action', hint: 'Start something local', prompt: 'Give me a simple plan to start a climate action project in my community.', art: require('../../../assets/ai/community.png') },
];

type Colors = { text: string; textSub: string; textMuted: string; surface: string; border: string };

export function AIWelcome({ name, C, onPick }: { name?: string; C: Colors; onPick: (prompt: string) => void }) {
  const first = (name || '').trim().split(/\s+/)[0];
  return (
    <View style={styles.wrap}>
      <Reanimated.View entering={FadeInDown.duration(420)} style={{ alignItems: 'center' }}>
        <AIOrb size={92} />
        <Text style={[styles.hello, { color: C.textSub }]}>{first ? `Habari, ${first}` : 'Habari'}</Text>
        <Text style={[styles.title, { color: C.text }]}>How can I help today?</Text>
      </Reanimated.View>

      <View style={styles.grid}>
        {SUGGESTIONS.map((s, i) => (
          <Reanimated.View key={s.key} entering={FadeInDown.delay(120 + i * 70).duration(380)} style={styles.cell}>
            <Pressable
              onPress={() => { Haptics.selectionAsync(); onPick(s.prompt); }}
              style={({ pressed }) => [styles.card, { backgroundColor: C.surface, borderColor: C.border }, pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 }]}
              accessibilityRole="button"
              accessibilityLabel={`${s.title}. ${s.hint}`}
            >
              <Image source={s.art} style={styles.art} resizeMode="contain" />
              <Text style={[styles.cardTitle, { color: C.text }]} numberOfLines={1}>{s.title}</Text>
              <Text style={[styles.cardHint, { color: C.textMuted }]} numberOfLines={1}>{s.hint}</Text>
            </Pressable>
          </Reanimated.View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', paddingBottom: 24 },
  hello: { marginTop: 22, fontSize: 16, fontWeight: '500' },
  title: { marginTop: 4, fontSize: 30, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: -0.8, textAlign: 'center', lineHeight: 36 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 28 },
  cell: { width: '48.5%' },
  card: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: 14, minHeight: 150, justifyContent: 'flex-end' },
  art: { width: 64, height: 64, marginBottom: 'auto' },
  cardTitle: { fontSize: 15, fontWeight: '700', marginTop: 10 },
  cardHint: { fontSize: 13, marginTop: 2 },
});
