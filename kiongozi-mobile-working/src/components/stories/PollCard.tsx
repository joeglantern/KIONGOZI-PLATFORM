// Poll sticker: a question with two answers. Before voting you see two buttons;
// after voting (or on your own story) bars fill to show the live percentages.
import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';

export const POLL_W = 270; // card width at scale 1 on a 390-wide canvas

export function PollCard({ question, options, counts, mine, showResults, onVote, k = 1 }: {
  question: string;
  options: string[];
  counts?: [number, number];
  mine?: number | null;
  showResults?: boolean;
  onVote?: (option: number) => void;
  k?: number; // screen scale factor
}) {
  const total = (counts?.[0] ?? 0) + (counts?.[1] ?? 0);
  const revealed = showResults || mine === 0 || mine === 1;
  const pct = [0, 1].map(i => (total ? Math.round(((counts?.[i] ?? 0) / total) * 100) : 0));
  const fills = useRef([new Animated.Value(0), new Animated.Value(0)]).current;

  useEffect(() => {
    if (!revealed) return;
    Animated.parallel(fills.map((f, i) =>
      Animated.spring(f, { toValue: pct[i] / 100, useNativeDriver: false, damping: 18, stiffness: 120 }),
    )).start();
  }, [revealed, pct[0], pct[1]]);

  return (
    <View style={[styles.card, { width: POLL_W * k, padding: 14 * k, borderRadius: 20 * k }]}>
      <Text style={[styles.q, { fontSize: 18 * k, lineHeight: 23 * k, marginBottom: 10 * k }]}>{question}</Text>
      {[0, 1].map(i => {
        const chosen = mine === i;
        const body = (
          <View style={[styles.opt, { height: 44 * k, borderRadius: 22 * k }, chosen && styles.optChosen]}>
            {revealed && (
              <Animated.View style={[styles.fill, chosen && styles.fillChosen, {
                width: fills[i].interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              }]} />
            )}
            <Text style={[styles.optText, { fontSize: 15 * k }]} numberOfLines={1}>{options[i] || (i ? 'Hapana' : 'Ndiyo')}</Text>
            {revealed && <Text style={[styles.pct, { fontSize: 14 * k }]}>{pct[i]}%</Text>}
          </View>
        );
        if (!onVote || revealed) return <View key={i} style={{ marginTop: i ? 8 * k : 0 }}>{body}</View>;
        return (
          <Pressable
            key={i}
            style={({ pressed }) => [{ marginTop: i ? 8 * k : 0 }, pressed && { transform: [{ scale: 0.97 }] }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onVote(i); }}
            accessibilityRole="button"
            accessibilityLabel={`Vote ${options[i]}`}
          >
            {body}
          </Pressable>
        );
      })}
      {revealed && (
        <Text style={[styles.total, { fontSize: 12 * k, marginTop: 8 * k }]}>
          {total === 1 ? '1 vote' : `${total} votes`}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  q: { color: '#111111', fontWeight: '800', textAlign: 'center' },
  opt: {
    backgroundColor: '#F1F1F3', overflow: 'hidden', flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, borderWidth: 1.5, borderColor: 'transparent',
  },
  optChosen: { borderColor: '#5CB85C' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#E1E1E6' },
  fillChosen: { backgroundColor: '#CDEBCD' },
  optText: { flex: 1, color: '#111111', fontWeight: '700' },
  pct: { color: '#111111', fontWeight: '800', fontVariant: ['tabular-nums'] },
  total: { color: '#6B6B70', textAlign: 'center', fontWeight: '600' },
});
