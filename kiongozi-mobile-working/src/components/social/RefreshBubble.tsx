// Pull-to-refresh, KChat style: a little green chat bubble instead of a spinner.
// Pull → it swings in and grows with your thumb, its dots filling in one by one (iOS follows the
// finger; Android shows it the moment the refresh starts). Let go → it settles in, then the
// dots hop like someone typing while the feed loads. Done → it fades away.
import { RN_EASE_OUT } from '../../theme/motion';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View, Platform, RefreshControl, LayoutChangeEvent } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTabRetap } from '../../hooks/useTabRetap';

export function RefreshBubble({ pull, refreshing, color, top }: {
  /** 0..1 pull progress (iOS overscroll); null when the platform can't report it */
  pull: Animated.AnimatedInterpolation<number> | null;
  refreshing: boolean;
  color: string;
  top: number;
}) {
  const appear = useRef(new Animated.Value(0)).current;      // 0 hidden → 1 shown (refresh state)
  const pullOn = useRef(new Animated.Value(1)).current;      // 1 = follow the pull, 0 = ignore it
  const squash = useRef(new Animated.Value(1)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const dots = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  const loops = useRef<Animated.CompositeAnimation[]>([]);
  const wasRefreshing = useRef(false);

  useEffect(() => {
    if (refreshing && !wasRefreshing.current) {
      wasRefreshing.current = true;
      pullOn.setValue(0);
      // Glide in and settle
      squash.setValue(1);
      Animated.timing(appear, { toValue: 1, duration: 260, easing: RN_EASE_OUT, useNativeDriver: true }).start();
      // Typing dots + a slow breath
      loops.current = [
        Animated.loop(Animated.sequence([
          Animated.timing(breathe, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(breathe, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])),
        ...dots.map((d, i) => Animated.loop(Animated.sequence([
          Animated.delay(i * 140),
          Animated.timing(d, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(d, { toValue: 0, duration: 260, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.delay((2 - i) * 140 + 220),
        ]))),
      ];
      loops.current.forEach(l => l.start());
    } else if (!refreshing && wasRefreshing.current) {
      wasRefreshing.current = false;
      loops.current.forEach(l => l.stop());
      dots.forEach(d => d.setValue(0));
      // Done: fade away
      Animated.timing(appear, { toValue: 0, duration: 200, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => pullOn.setValue(1));
    }
  }, [refreshing, appear, pullOn, squash, breathe, dots]);

  useEffect(() => () => loops.current.forEach(l => l.stop()), []);

  const p = pull || new Animated.Value(0);
  // Visible amount: the pull (while not refreshing) or the refresh state
  const shown = Animated.add(Animated.multiply(p, pullOn), appear);
  const scale = Animated.multiply(
    shown.interpolate({ inputRange: [0, 1, 2], outputRange: [0.2, 1, 1], extrapolate: 'clamp' }),
    Animated.multiply(squash, breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] })),
  );
  const opacity = shown.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' });
  const rotate = Animated.multiply(p, pullOn).interpolate({ inputRange: [0, 1], outputRange: ['-24deg', '0deg'], extrapolate: 'clamp' });
  const lift = Animated.multiply(p, pullOn).interpolate({ inputRange: [0, 1], outputRange: [-14, 0], extrapolate: 'clamp' });

  return (
    <View pointerEvents="none" style={[styles.wrap, { top }]}>
      <Animated.View style={{ opacity, transform: [{ translateY: lift }, { scale }, { rotate }] }}>
        <View style={[styles.bubble, { backgroundColor: color }]}>
          {dots.map((d, i) => {
            // While pulling, each dot fades in at its own third of the pull
            const fill = Animated.add(
              Animated.multiply(p, pullOn).interpolate({ inputRange: [i / 3, (i + 1) / 3], outputRange: [0.25, 1], extrapolate: 'clamp' }),
              appear,
            ).interpolate({ inputRange: [0, 1, 2], outputRange: [0.25, 1, 1], extrapolate: 'clamp' });
            return (
              <Animated.View
                key={i}
                style={[styles.dot, { opacity: fill, transform: [{ translateY: d.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }] }]}
              />
            );
          })}
        </View>
        <View style={[styles.tail, { backgroundColor: color }]} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 30, elevation: 30 },
  bubble: {
    width: 52, height: 36, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  // Little speech-bubble tail, bottom-left
  tail: { position: 'absolute', left: 9, bottom: -3, width: 12, height: 12, borderRadius: 2, transform: [{ rotate: '45deg' }], zIndex: -1 },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#000000' },
});

/**
 * The feed's pull-to-refresh for any list. Use an Animated.FlatList / Animated.SectionList and pass
 * `onScroll` + `refreshControl`, render `bubble` after the list, and put `onHeaderLayout` on the
 * view above the list so the bubble appears just under it.
 */
export function useBubbleRefresh(run: () => Promise<unknown> | unknown, color: string, surface: string) {
  const scrollY = useRef(new Animated.Value(0)).current;
  const [refreshing, setRefreshing] = useState(false);
  const [hold, setHold] = useState(false);
  const [top, setTop] = useState(0);
  const busy = useRef(false);
  const latest = useRef(run);
  latest.current = run;

  const onRefresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    // The system spinner only catches the gesture; the bubble shows the loading
    setHold(true);
    requestAnimationFrame(() => setHold(false));
    setRefreshing(true);
    const started = Date.now();
    try { await latest.current(); } catch {}
    const left = 700 - (Date.now() - started); // let the dots hop at least once
    if (left > 0) await new Promise(r => setTimeout(r, left));
    setRefreshing(false);
    busy.current = false;
  }, []);

  const onScroll = useMemo(
    () => Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true }),
    [scrollY],
  );
  const pull = useMemo(
    () => (Platform.OS === 'ios'
      ? scrollY.interpolate({ inputRange: [-110, -14], outputRange: [1, 0], extrapolate: 'clamp' })
      : null),
    [scrollY],
  );
  const onHeaderLayout = useCallback((e: LayoutChangeEvent) => {
    const { y, height } = e.nativeEvent.layout;
    setTop(y + height);
  }, []);

  // Tapping this screen's tab again: to the top, then refresh (give listRef to the list)
  const listRef = useTabRetap(scrollY, onRefresh);

  const refreshControl = (
    <RefreshControl refreshing={hold} onRefresh={onRefresh} tintColor="transparent" colors={[color]} progressBackgroundColor={surface} />
  );
  const bubble = <RefreshBubble pull={pull} refreshing={refreshing} color={color} top={top + 10} />;
  return { onScroll, refreshControl, bubble, refreshing, onHeaderLayout, scrollY, listRef };
}
