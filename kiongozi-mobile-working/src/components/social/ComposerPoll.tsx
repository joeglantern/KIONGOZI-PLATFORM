// Poll editor for the post composer (like X): 2 to 4 choices of up to 25 characters
// and a length from 1 hour to 7 days (1 day by default). The post text is the question.
import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { enterFade } from '../../theme/motion';

export const POLL_CHOICE_MAX = 25;
export const POLL_LENGTHS = [
  { hours: 1, label: '1 hour' },
  { hours: 6, label: '6 hours' },
  { hours: 24, label: '1 day' },
  { hours: 72, label: '3 days' },
  { hours: 168, label: '7 days' },
];

export interface ComposerPollValue { options: string[]; hours: number }

export const newPoll = (): ComposerPollValue => ({ options: ['', ''], hours: 24 });

/** Choices to send: the first two are required, empty extra ones are dropped. Null if not ready. */
export function pollChoices(p: ComposerPollValue | null): string[] | null {
  if (!p) return null;
  const opts = p.options.map(o => o.trim());
  if (!opts[0] || !opts[1]) return null;
  const out = opts.filter(Boolean);
  if (out.some(o => [...o].length > POLL_CHOICE_MAX)) return null;
  if (new Set(out.map(o => o.toLowerCase())).size !== out.length) return null;
  return out;
}

const tap = () => Haptics.selectionAsync().catch(() => {});

export function ComposerPoll({ value, onChange, onRemove, disabled }: {
  value: ComposerPollValue;
  onChange: (v: ComposerPollValue) => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const T = useTheme();
  const setOption = (i: number, text: string) =>
    onChange({ ...value, options: value.options.map((o, k) => (k === i ? text : o)) });
  const lower = value.options.map(o => o.trim().toLowerCase());
  const isDup = (i: number) => !!lower[i] && lower.indexOf(lower[i]) !== i;

  return (
    <Animated.View entering={enterFade()} style={[st.card, { borderColor: T.border }]}>
      {value.options.map((o, i) => (
        <View key={i}>
          <View style={[st.inputWrap, { borderColor: isDup(i) ? T.error : T.border }]}>
            <TextInput
              value={o}
              onChangeText={t => setOption(i, t)}
              placeholder={i < 2 ? `Choice ${i + 1}` : `Choice ${i + 1} (optional)`}
              placeholderTextColor={T.placeholder}
              maxLength={POLL_CHOICE_MAX}
              editable={!disabled}
              style={[st.input, { color: T.text }]}
              selectionColor={T.accent}
              cursorColor={T.accent}
              accessibilityLabel={`Poll choice ${i + 1}${i < 2 ? '' : ', optional'}`}
              returnKeyType="next"
            />
            {o.length > 0 && (
              <Text style={[st.count, { color: o.length >= POLL_CHOICE_MAX ? T.error : T.textMuted }]}>
                {POLL_CHOICE_MAX - o.length}
              </Text>
            )}
          </View>
          {isDup(i) && <Text style={[st.dup, { color: T.error }]}>Same as another choice</Text>}
        </View>
      ))}

      {value.options.length < 4 && (
        <Pressable
          onPress={() => { tap(); onChange({ ...value, options: [...value.options, ''] }); }}
          disabled={disabled}
          style={({ pressed }) => [st.add, pressed && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityLabel="Add a choice"
        >
          <Ionicons name="add" size={18} color={T.accent} />
          <Text style={[st.addText, { color: T.accent }]}>Add a choice</Text>
        </Pressable>
      )}

      <Text style={[st.label, { color: T.textSub }]}>Poll length</Text>
      <View style={st.chips} accessibilityRole="radiogroup">
        {POLL_LENGTHS.map(l => {
          const on = l.hours === value.hours;
          return (
            <Pressable
              key={l.hours}
              onPress={() => { tap(); onChange({ ...value, hours: l.hours }); }}
              disabled={disabled}
              style={[st.chip, on ? { backgroundColor: T.accent, borderColor: T.accent } : { borderColor: T.border }]}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`Poll length ${l.label}`}
            >
              <Text style={[st.chipText, { color: on ? '#000' : T.text }]}>{l.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={() => { tap(); onRemove(); }}
        disabled={disabled}
        style={({ pressed }) => [st.remove, { borderTopColor: T.border }, pressed && { opacity: 0.6 }]}
        accessibilityRole="button"
        accessibilityLabel="Remove poll"
      >
        <Text style={[st.removeText, { color: T.error }]}>Remove poll</Text>
      </Pressable>
    </Animated.View>
  );
}

/** Toolbar icon: three bars, like a poll */
export function PollToolIcon({ color, size = 32 }: { color: string; size?: number }) {
  const h = Math.round(size * 0.15);
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', paddingLeft: size * 0.12, gap: h * 0.8 }}>
      {[0.72, 0.46, 0.6].map((w, i) => (
        <View key={i} style={{ width: size * w, height: h, borderRadius: h / 2, backgroundColor: color }} />
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 12, paddingTop: 4, marginTop: 4, marginBottom: 8 },
  inputWrap: {
    height: 46, borderRadius: 12, borderWidth: 1, marginTop: 8,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
  },
  input: { flex: 1, fontSize: 15, paddingVertical: 0 },
  count: { fontSize: 12, marginLeft: 8, fontVariant: ['tabular-nums'] },
  dup: { fontSize: 12, marginTop: 4, marginLeft: 4 },
  add: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, marginTop: 2 },
  addText: { fontSize: 14, fontWeight: '700' },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 4, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { height: 34, paddingHorizontal: 12, borderRadius: 17, borderWidth: 1, justifyContent: 'center' },
  chipText: { fontSize: 13, fontWeight: '600' },
  remove: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  removeText: { fontSize: 14, fontWeight: '600' },
});
