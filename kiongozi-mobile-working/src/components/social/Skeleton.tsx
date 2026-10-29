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
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
});

// ── Shapes for the other screens, so every first load looks like the feed's ──

/** Rows of people / chats / notifications: round avatar + two lines */
export function RowsSkeleton({ count = 6, avatar = 48, label = 'Loading' }: { count?: number; avatar?: number; label?: string }) {
  const sweep = useSweep();
  const widths = [[62, 84], [48, 70], [70, 56], [55, 88], [66, 62], [44, 76], [58, 68], [72, 50]];
  return (
    <View accessibilityLabel={label} accessibilityRole="progressbar" style={{ paddingTop: 6 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.listRow}>
          <Block sweep={sweep} style={{ width: avatar, height: avatar, borderRadius: avatar / 2 }} />
          <View style={{ flex: 1, gap: 8 }}>
            <Block sweep={sweep} style={{ width: `${widths[i % 8][0]}%`, height: 13, borderRadius: 7 }} />
            <Block sweep={sweep} style={{ width: `${widths[i % 8][1]}%`, height: 11, borderRadius: 6 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Explore's first load: trending rows, the photo mosaic, then posts */
export function ExploreSkeleton() {
  const sweep = useSweep();
  const gap = 3;
  const col = Math.floor((W - 32 - gap * 2) / 3);
  return (
    <View accessibilityLabel="Loading Explore" accessibilityRole="progressbar">
      <View style={{ paddingHorizontal: 16, paddingTop: 6, gap: 16 }}>
        <Block sweep={sweep} style={{ width: 150, height: 16, borderRadius: 8 }} />
        {[64, 48, 56].map((w, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Block sweep={sweep} style={{ width: 14, height: 18, borderRadius: 5 }} />
            <View style={{ flex: 1, gap: 7 }}>
              <Block sweep={sweep} style={{ width: `${w}%`, height: 14, borderRadius: 7 }} />
              <Block sweep={sweep} style={{ width: 70, height: 10, borderRadius: 5 }} />
            </View>
          </View>
        ))}
        <Block sweep={sweep} style={{ width: 110, height: 16, borderRadius: 8, marginTop: 10 }} />
      </View>
      <View style={{ flexDirection: 'row', gap, height: 112 * 2 + gap, marginHorizontal: 16, marginTop: 10, borderRadius: 16, overflow: 'hidden' }}>
        <Block sweep={sweep} style={{ width: col, height: 112 * 2 + gap }} />
        <View style={{ flex: 1, gap }}>
          {[0, 1].map(r => (
            <View key={r} style={{ flexDirection: 'row', gap, height: 112 }}>
              <Block sweep={sweep} style={{ flex: 1, height: 112 }} />
              <Block sweep={sweep} style={{ flex: 1, height: 112 }} />
            </View>
          ))}
        </View>
      </View>
      <View style={{ height: 14 }} />
      {[0, 1].map(i => <PostSkeleton key={i} sweep={sweep} media={i === 1} />)}
    </View>
  );
}

/** A profile while it loads: avatar, name, bio, counts, buttons, then posts */
export function ProfileSkeleton({ posts = 2 }: { posts?: number }) {
  const sweep = useSweep();
  return (
    <View accessibilityLabel="Loading profile" accessibilityRole="progressbar">
      <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Block sweep={sweep} style={{ width: 84, height: 84, borderRadius: 42 }} />
          <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-around' }}>
            {[0, 1, 2].map(i => (
              <View key={i} style={{ alignItems: 'center', gap: 6 }}>
                <Block sweep={sweep} style={{ width: 34, height: 16, borderRadius: 8 }} />
                <Block sweep={sweep} style={{ width: 54, height: 10, borderRadius: 5 }} />
              </View>
            ))}
          </View>
        </View>
        <Block sweep={sweep} style={{ width: '46%', height: 16, borderRadius: 8 }} />
        <Block sweep={sweep} style={{ width: '30%', height: 12, borderRadius: 6 }} />
        <Block sweep={sweep} style={{ width: '88%', height: 12, borderRadius: 6 }} />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
          <Block sweep={sweep} style={{ flex: 1, height: 36, borderRadius: 12 }} />
          <Block sweep={sweep} style={{ flex: 1, height: 36, borderRadius: 12 }} />
        </View>
      </View>
      <View style={{ height: 16 }} />
      {Array.from({ length: posts }).map((_, i) => <PostSkeleton key={i} sweep={sweep} media={i % 2 === 1} />)}
    </View>
  );
}

/** A chat while its messages load: bubbles on both sides, newest at the bottom */
export function ChatSkeleton() {
  const sweep = useSweep();
  const rows: [boolean, number, number][] = [
    [false, 52, 36], [false, 38, 36], [true, 46, 36], [false, 64, 56], [true, 34, 36], [true, 58, 36], [false, 44, 36],
  ];
  return (
    <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: 12 }} accessibilityLabel="Loading messages" accessibilityRole="progressbar">
      {rows.map(([own, w, h], i) => (
        <View key={i} style={{ flexDirection: 'row', justifyContent: own ? 'flex-end' : 'flex-start', paddingHorizontal: 10, marginTop: rows[i - 1]?.[0] === own ? 3 : 12 }}>
          {!own && <View style={{ width: 36 }} />}
          <Block sweep={sweep} style={{ width: `${w}%`, height: h, borderRadius: 18 }} />
        </View>
      ))}
    </View>
  );
}
