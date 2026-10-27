// Shimmer placeholders shown while the feed loads (instead of a bare spinner).
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';

const W = Dimensions.get('window').width;

/** One shared sweep so every block shimmers in step. */
function useSweep() {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, []);
  return v.interpolate({ inputRange: [0, 1], outputRange: [-W, W] });
}

function Block({ style, sweep }: { style: any; sweep: Animated.AnimatedInterpolation<number> }) {
  const T = useTheme();
  return (
    <View style={[{ backgroundColor: T.surface2, overflow: 'hidden' }, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: sweep }] }]}>
        <LinearGradient
          colors={['transparent', T.border, 'transparent']}
          start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
          style={{ width: W * 0.6, height: '100%' }}
        />
      </Animated.View>
    </View>
  );
}

export function PostSkeleton({ media = false, sweep }: { media?: boolean; sweep: Animated.AnimatedInterpolation<number> }) {
  return (
    <View style={styles.row} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Block sweep={sweep} style={styles.avatar} />
      <View style={{ flex: 1, gap: 8 }}>
        <Block sweep={sweep} style={{ width: '45%', height: 13, borderRadius: 7 }} />
        <Block sweep={sweep} style={{ width: '95%', height: 12, borderRadius: 6 }} />
        <Block sweep={sweep} style={{ width: '70%', height: 12, borderRadius: 6 }} />
        {media && <Block sweep={sweep} style={{ width: '100%', height: 190, borderRadius: 16, marginTop: 4 }} />}
        <View style={{ flexDirection: 'row', gap: 28, marginTop: 6 }}>
          {[0, 1, 2, 3].map(i => <Block key={i} sweep={sweep} style={{ width: 22, height: 22, borderRadius: 11 }} />)}
        </View>
      </View>
    </View>
  );
}

/** A few placeholder posts, for a list's empty/loading state. */
export function FeedSkeleton({ count = 4 }: { count?: number }) {
  const sweep = useSweep();
  return (
    <View accessibilityLabel="Loading posts" accessibilityRole="progressbar">
      {Array.from({ length: count }).map((_, i) => <PostSkeleton key={i} sweep={sweep} media={i % 2 === 1} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, paddingHorizontal: 12, paddingVertical: 14 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
});
