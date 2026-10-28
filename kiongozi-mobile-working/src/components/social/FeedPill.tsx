// The feed's floating pill (X / Instagram): "New posts" with the authors' faces instead of
// shoving content in while you read, plus short notes after a pull-to-refresh
// ("3 new posts" / "You're up to date").
import React, { useEffect } from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { UserAvatar } from './UserAvatar';
import { useTheme } from '../../hooks/useTheme';

export type PillState =
  | { kind: 'new'; avatars: { url?: string | null; name?: string }[]; count: number }
  | { kind: 'note'; text: string }
  | null;

export function FeedPill({ state, top, onPress }: { state: PillState; top: number; onPress?: () => void }) {
  const T = useTheme();
  const y = useSharedValue(-24);
  const o = useSharedValue(0);
  const [shown, setShown] = React.useState<PillState>(state);

  useEffect(() => {
    if (state) {
      setShown(state);
      y.value = withSpring(0, { damping: 16, stiffness: 240 });
      o.value = withTiming(1, { duration: 160 });
    } else {
      y.value = withTiming(-24, { duration: 180 });
      o.value = withTiming(0, { duration: 160 });
    }
  }, [state, y, o]);

  const anim = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateY: y.value }] }));
  if (!shown) return null;

  // Solid accent for new content (it's an action), quiet ink for notes
  const isNew = shown.kind === 'new';
  const bg = isNew ? T.accent : T.text;
  const fg = isNew ? '#000000' : T.bg;

  return (
    <Animated.View pointerEvents={state ? 'box-none' : 'none'} style={[styles.wrap, { top }, anim]}>
      <Pressable
        onPress={isNew ? onPress : undefined}
        disabled={!isNew}
        accessibilityRole={isNew ? 'button' : 'text'}
        accessibilityLiveRegion="polite"
        accessibilityLabel={isNew ? `${shown.count} new posts. Show them.` : (shown as any).text}
        style={({ pressed }) => [styles.pill, { backgroundColor: bg }, pressed && { transform: [{ scale: 0.96 }] }]}
        hitSlop={8}
      >
        {isNew ? (
          <>
            <Ionicons name="arrow-up" size={15} color={fg} />
            <View style={styles.faces}>
              {shown.avatars.slice(0, 3).map((a, i) => (
                <View key={i} style={[styles.face, { marginLeft: i ? -8 : 0, borderColor: bg, zIndex: 3 - i }]}>
                  <UserAvatar avatarUrl={a.url || undefined} size={22} name={a.name} />
                </View>
              ))}
            </View>
            <Text style={[styles.text, { color: fg }]} maxFontSizeMultiplier={1.2}>
              {shown.count === 1 ? 'New post' : 'New posts'}
            </Text>
          </>
        ) : (
          <Text style={[styles.text, { color: fg }]} maxFontSizeMultiplier={1.2}>{(shown as any).text}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 20, elevation: 20 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    height: 36, paddingHorizontal: 14, borderRadius: 18,
    shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  faces: { flexDirection: 'row' },
  face: { borderWidth: 2, borderRadius: 13 },
  text: { fontSize: 14, fontWeight: '700' },
});
