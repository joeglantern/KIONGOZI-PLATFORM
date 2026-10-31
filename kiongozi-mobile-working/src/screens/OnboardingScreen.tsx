// First run: one welcome screen under the Baraza sky. The island floats, two clouds drift,
// then "Get started" goes to sign up and "I have an account" to sign in.
// (The old three marketing slides carried no permission flow, so nothing is lost by replacing them.)
import React, { useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Image, Linking, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ISLAND = require('../../assets/baraza/island.webp');
const CLOUD = require('../../assets/baraza/cloud.png');
const LOGO = require('../../assets/kchat-logo.png');
const ISLAND_RATIO = 886 / 900; // island.webp height / width (same as barazaArt ISLAND.ratio)

// Same links Settings opens
const TERMS_URL = 'https://chat.kiongozi.org/terms';
const PRIVACY_POLICY_URL = 'https://chat.kiongozi.org/privacy-policy';

const INK = '#1E1236';
const INK_SOFT = '#4E4060';

export type OnboardingChoice = 'signup' | 'signin';

interface Props {
  onDone: (choice: OnboardingChoice) => void;
}

export default function OnboardingScreen({ onDone }: Props) {
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const compact = H < 700;

  // Island width ~300, sitting between y 110 and 400 on a regular phone
  const IW = Math.min(W * 0.8, H < 600 ? 180 : compact ? 220 : 300);
  const IH = IW * ISLAND_RATIO;
  const islandTop = compact ? Math.max(insets.top + 8, 56) : 110;

  const f = useSharedValue(0);
  const c = useSharedValue(0);
  useEffect(() => {
    f.value = withRepeat(withTiming(1, { duration: 4200, easing: Easing.inOut(Easing.sin) }), -1, true);
    c.value = withRepeat(withTiming(1, { duration: 11000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [f, c]);
  const float = useAnimatedStyle(() => ({ transform: [{ translateY: -8 + f.value * 8 }] }));
  const cloudA = useAnimatedStyle(() => ({ transform: [{ translateX: c.value * 28 }] }));
  const cloudB = useAnimatedStyle(() => ({ transform: [{ translateX: -c.value * 22 }] }));

  const finish = useCallback(async (choice: OnboardingChoice) => {
    try { await AsyncStorage.setItem('onboarding_done', 'true'); } catch {}
    onDone(choice);
  }, [onDone]);

  const open = (url: string) => Linking.openURL(url).catch(() => {});

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <LinearGradient
        colors={['#B9B4F0', '#DCC7EC', '#FBD3B0', '#FFE2BF']}
        locations={[0, 0.4, 0.78, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* sky */}
      <Animated.Image source={CLOUD} style={[styles.cloud, { left: -16, top: islandTop + IH * 0.18, width: 104, height: 60 }, cloudA]} />
      <Animated.Image source={CLOUD} style={[styles.cloud, { right: -10, top: islandTop + IH * 0.62, width: 78, height: 45, opacity: 0.8 }, cloudB]} />
      <Animated.View style={[{ marginTop: islandTop, alignSelf: 'center', width: IW, height: IH }, float]}>
        <View style={[styles.islandShadow, { left: IW * 0.18, right: IW * 0.18, height: IH * 0.16, borderRadius: IW }]} />
        <Image source={ISLAND} style={{ width: IW, height: IH }} fadeDuration={0} accessibilityIgnoresInvertColors />
      </Animated.View>

      {/* words */}
      <View style={[styles.copy, { marginTop: compact ? 8 : 18 }]}>
        <Image source={LOGO} style={styles.logo} accessibilityLabel="KChat" />
        <Text style={[styles.headline, compact && { fontSize: 30, lineHeight: 34 }]} maxFontSizeMultiplier={1.2}>
          Kenya, say your piece.
        </Text>
        <Text style={styles.sub} maxFontSizeMultiplier={1.3}>
          Posts, clips, stories and live barazas, one voice at a time. Made in Nairobi.
        </Text>
      </View>

      {/* doors */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 10 }]}>
        <Pressable
          onPress={() => finish('signup')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.btn, styles.btnDark, pressed && { transform: [{ scale: 0.985 }], opacity: 0.92 }]}
        >
          <Text style={styles.btnDarkText} maxFontSizeMultiplier={1.2}>Get started</Text>
        </Pressable>
        <Pressable
          onPress={() => finish('signin')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.btn, styles.btnLight, pressed && { transform: [{ scale: 0.985 }], opacity: 0.92 }]}
        >
          <Text style={styles.btnLightText} maxFontSizeMultiplier={1.2}>I have an account</Text>
        </Pressable>
        <Text style={styles.legal} maxFontSizeMultiplier={1.2}>
          By continuing you agree to the{' '}
          <Text style={styles.legalLink} onPress={() => open(TERMS_URL)} accessibilityRole="link">Terms</Text>
          {' '}and{' '}
          <Text style={styles.legalLink} onPress={() => open(PRIVACY_POLICY_URL)} accessibilityRole="link">Privacy Policy</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#DCC7EC' },
  cloud: { position: 'absolute', opacity: 0.92 },
  islandShadow: { position: 'absolute', bottom: 0, backgroundColor: 'rgba(60,40,110,0.16)' },
  copy: { flex: 1, paddingHorizontal: 24, alignItems: 'flex-start' },
  logo: { width: 44, height: 44, borderRadius: 11, marginBottom: 14 },
  headline: { fontSize: 34, lineHeight: 38, fontWeight: '800', color: INK, letterSpacing: -0.8 },
  sub: { fontSize: 16, lineHeight: 22, color: INK_SOFT, marginTop: 10 },
  footer: { paddingHorizontal: 24, gap: 10 },
  btn: { height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  btnDark: { backgroundColor: INK },
  btnDarkText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  btnLight: { backgroundColor: 'rgba(255,255,255,0.7)' },
  btnLightText: { color: INK, fontSize: 17, fontWeight: '700' },
  legal: { fontSize: 12, lineHeight: 16, color: INK_SOFT, textAlign: 'center', marginTop: 4 },
  legalLink: { color: INK, fontWeight: '600', textDecorationLine: 'underline' },
});
