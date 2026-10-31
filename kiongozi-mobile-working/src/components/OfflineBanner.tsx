// Soft offline notice (WhatsApp / Instagram style): a small pill under the status bar, never a
// blocking screen. It says what's happening, shrinks to a quiet "Offline" chip after a few
// seconds, can be tapped to retry, and flashes "Back online" when the connection returns.
import { SETTLE } from '../theme/motion';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNet } from '../stores/netStore';

type Mode = 'hidden' | 'offline' | 'compact' | 'back';

export function OfflineBanner() {
  const online = useNet(s => s.online);
  const status = useNet(s => s.status);
  // Their internet works but we can't reach KChat: never blame their connection
  const serverSide = status === 'server';
  const backAt = useNet(s => s.backAt);
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('hidden');
  const [checking, setChecking] = useState(false);
  const shrinkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Hidden = fully above the screen, even under a Dynamic Island (insets.top ~59)
  const offY = -(insets.top + 140);
  const y = useSharedValue(offY);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (shrinkTimer.current) clearTimeout(shrinkTimer.current);
    if (!online) {
      setMode('offline');
      shrinkTimer.current = setTimeout(() => setMode('compact'), 6000);
    } else if (backAt && Date.now() - backAt < 3000) {
      setMode('back');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      shrinkTimer.current = setTimeout(() => setMode('hidden'), 1800);
    } else {
      setMode('hidden');
    }
    return () => { if (shrinkTimer.current) clearTimeout(shrinkTimer.current); };
  }, [online, backAt]);

  useEffect(() => {
    if (mode === 'hidden') {
      y.value = withTiming(offY, { duration: 220 });
      // Unmount once it has slid away so nothing can peek out behind the status bar
      const t = setTimeout(() => setMounted(false), 260);
      return () => clearTimeout(t);
    }
    setMounted(true);
    y.value = withTiming(0, SETTLE);
  }, [mode, y, offY]);

  const anim = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  if (!mounted && mode === 'hidden') return null;

  const retry = async () => {
    if (checking || online) return;
    Haptics.selectionAsync().catch(() => {});
    setChecking(true);
    setMode('offline');
    const ok = await useNet.getState().check();
    setChecking(false);
    if (!ok) {
      if (shrinkTimer.current) clearTimeout(shrinkTimer.current);
      shrinkTimer.current = setTimeout(() => setMode('compact'), 4000);
    }
  };

  const back = mode === 'back';
  const compact = mode === 'compact';

  return (
    <Animated.View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + 6 }, anim]}>
      <Pressable
        onPress={retry}
        accessibilityRole="button"
        accessibilityLiveRegion="polite"
        accessibilityLabel={back ? 'Back online' : serverSide ? 'Can’t reach KChat right now. Tap to try again.' : 'No internet connection. Tap to try again.'}
        style={({ pressed }) => [styles.pill, compact && styles.pillCompact, back && styles.pillBack, pressed && { opacity: 0.85 }]}
      >
        {back ? (
          <View style={styles.dot} />
        ) : checking ? (
          <ActivityIndicator size="small" color="#FFFFFF" style={{ transform: [{ scale: 0.75 }] }} />
        ) : (
          <Ionicons name={serverSide ? 'sync-outline' : 'cloud-offline-outline'} size={16} color="#FFFFFF" />
        )}
        {compact ? (
          <Text style={styles.title} maxFontSizeMultiplier={1.2}>{serverSide ? 'Reconnecting' : 'Offline'}</Text>
        ) : back ? (
          <Text style={styles.title} maxFontSizeMultiplier={1.2}>Back online</Text>
        ) : (
          <View style={{ flexShrink: 1 }}>
            <Text style={styles.title} maxFontSizeMultiplier={1.2}>{checking ? 'Checking…' : serverSide ? 'KChat can’t connect right now' : 'No internet connection'}</Text>
            <Text style={styles.sub} maxFontSizeMultiplier={1.2} numberOfLines={1}>{serverSide ? 'Your internet is fine · we’ll keep trying' : 'Showing what you saw last · tap to retry'}</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center', zIndex: 999, elevation: 999 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 9, paddingLeft: 14, paddingRight: 18, borderRadius: 22,
    backgroundColor: '#1C1C1E', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.14)',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    maxWidth: 360,
  },
  pillCompact: { paddingVertical: 6, paddingLeft: 10, paddingRight: 12, gap: 6 },
  pillBack: { paddingVertical: 7, paddingLeft: 12, paddingRight: 14, gap: 8 },
  title: { color: '#FFFFFF', fontSize: 13.5, fontWeight: '600' },
  sub: { color: 'rgba(255,255,255,0.62)', fontSize: 12, marginTop: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#5CB85C' },
});
