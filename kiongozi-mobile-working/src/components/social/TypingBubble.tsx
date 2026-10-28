// iMessage-style "typing" bubble: three dots that rise in turn, in the same outline style as
// the other person's messages.
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withDelay, withSequence, FadeIn, FadeOut, Easing,
} from 'react-native-reanimated';
import { UserAvatar } from './UserAvatar';
import { useTheme } from '../../hooks/useTheme';
import { useThemeStore } from '../../stores/themeStore';

function Dot({ delay, color }: { delay: number; color: string }) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(delay, withRepeat(withSequence(
      withTiming(1, { duration: 280, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 280, easing: Easing.in(Easing.quad) }),
      withTiming(0, { duration: 260 }),
    ), -1));
  }, [delay, v]);
  const style = useAnimatedStyle(() => ({ opacity: 0.4 + v.value * 0.6, transform: [{ translateY: -3 * v.value }] }));
  return <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />;
}

export function TypingBubble({ avatarUrl, name }: { avatarUrl?: string; name?: string }) {
  const T = useTheme();
  const isDark = useThemeStore(s => s.isDark);
  return (
    <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)} style={styles.row} accessibilityLabel={`${name || 'They'} is typing`}>
      <UserAvatar avatarUrl={avatarUrl} size={26} name={name} />
      <View style={[styles.bubble, { borderColor: isDark ? '#2C2C2E' : '#DEDEE3' }]}>
        <Dot delay={0} color={T.textMuted} />
        <Dot delay={140} color={T.textMuted} />
        <Dot delay={280} color={T.textMuted} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, marginTop: 6, marginBottom: 4 },
  bubble: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    height: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1,
  },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
});
