// Launch splash, played over the loading app:
//  1. Nganya scene (first launch only, with music)  2. comic "freeze" panel + burst
//  3. spray-paint mist forms the logo               4. logo eases forward and the app is revealed
// Later launches play only the (silent) logo beat. Tap anywhere to skip. A watchdog guarantees it ends.
import React, { useEffect, useRef, useState } from 'react';
import { View, Image, StyleSheet, Dimensions, Pressable } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Reanimated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring, withSequence, withDelay, Easing, runOnJS,
} from 'react-native-reanimated';

const { width: W, height: H } = Dimensions.get('window');
const SCENE = require('../../assets/splash/scene.mp4');
const LOGO_CLIP = require('../../assets/splash/logo.mp4');
const COMIC = require('../../assets/splash/comic.jpg');
const BURST = require('../../assets/splash/burst.png');
const LOGO = require('../../assets/splash/logo_crop.png'); // tightly cropped to match the clip's final frame
const SEEN_KEY = 'splash_full_seen_v1';

// The logo clip is 2:3 and its final frame has the logo at 620/1024 of the width, centred.
const CLIP_SCALE = Math.max(W / 2, H / 3);
const LOGO_W = 2 * CLIP_SCALE * (620 / 1024);
const LOGO_H = LOGO_W * (413 / 620);

type Phase = 'boot' | 'scene' | 'comic' | 'logo' | 'hold' | 'reveal';

export function AnimatedSplashScreen({ ready, onFinish }: { ready: boolean; onFinish: () => void }) {
  const [phase, setPhase] = useState<Phase>('boot');
  const finished = useRef(false);

  const scene = useVideoPlayer(SCENE, p => { p.loop = false; p.volume = 0.7; });
  const logo = useVideoPlayer(LOGO_CLIP, p => { p.loop = false; p.muted = true; });

  const rootO = useSharedValue(1);
  const flash = useSharedValue(0);
  const comicS = useSharedValue(1.14);
  const comicO = useSharedValue(0);
  const burstS = useSharedValue(0);
  const logoO = useSharedValue(0);
  const logoS = useSharedValue(1);

  // First launch → full sequence; afterwards → logo only
  useEffect(() => {
    AsyncStorage.getItem(SEEN_KEY)
      .then(v => setPhase(v ? 'logo' : 'scene'))
      .catch(() => setPhase('logo'));
  }, []);

  // Watchdog: never hang on the splash
  useEffect(() => {
    const t = setTimeout(() => setPhase(p => (p === 'reveal' ? p : 'hold')), phase === 'scene' ? 14000 : 7000);
    return () => clearTimeout(t);
  }, [phase === 'scene']);

  useEffect(() => {
    if (phase === 'scene') {
      try { scene.play(); } catch { setPhase('logo'); }
      const sub = scene.addListener('playToEnd', () => setPhase('comic'));
      const err = scene.addListener('statusChange', ({ status }) => { if (status === 'error') setPhase('logo'); });
      return () => { sub.remove(); err.remove(); };
    }
    if (phase === 'comic') {
      // white flash → comic panel snaps in, burst pops behind the dancer
      flash.value = withSequence(withTiming(1, { duration: 70 }), withTiming(0, { duration: 220 }));
      comicO.value = withTiming(1, { duration: 90 });
      comicS.value = withSpring(1, { damping: 12, stiffness: 180 });
      burstS.value = withDelay(80, withSpring(1, { damping: 9, stiffness: 160 }));
      const t = setTimeout(() => setPhase('logo'), 1100);
      return () => clearTimeout(t);
    }
    if (phase === 'logo') {
      try { scene.pause(); } catch {}
      AsyncStorage.setItem(SEEN_KEY, '1').catch(() => {});
      try { logo.currentTime = 0; logo.play(); } catch { setPhase('hold'); }
      const sub = logo.addListener('playToEnd', () => setPhase('hold'));
      const err = logo.addListener('statusChange', ({ status }) => { if (status === 'error') setPhase('hold'); });
      return () => { sub.remove(); err.remove(); };
    }
    if (phase === 'hold') {
      // crisp logo settles over the clip's last frame
      logoO.value = withTiming(1, { duration: 180 });
    }
  }, [phase]);

  // Reveal as soon as the logo is up and the app is ready
  useEffect(() => {
    if (phase !== 'hold' || !ready || finished.current) return;
    finished.current = true;
    const done = () => { try { scene.pause(); logo.pause(); } catch {} onFinish(); };
    const t = setTimeout(() => {
      setPhase('reveal');
      logoS.value = withTiming(1.25, { duration: 520, easing: Easing.in(Easing.cubic) });
      rootO.value = withTiming(0, { duration: 520, easing: Easing.in(Easing.quad) }, f => { if (f) runOnJS(done)(); });
    }, 250);
    return () => clearTimeout(t);
  }, [phase, ready]);

  const skip = () => {
    if (phase === 'scene' || phase === 'comic') setPhase('logo');
    else if (phase === 'logo') setPhase('hold');
  };

  const rootStyle = useAnimatedStyle(() => ({ opacity: rootO.value }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));
  const comicStyle = useAnimatedStyle(() => ({ opacity: comicO.value, transform: [{ scale: comicS.value }, { rotate: '-2deg' }] }));
  const burstStyle = useAnimatedStyle(() => ({ transform: [{ scale: burstS.value }, { rotate: '-8deg' }] }));
  const logoStyle = useAnimatedStyle(() => ({ opacity: logoO.value, transform: [{ scale: logoS.value }] }));

  const showScene = phase === 'scene' || phase === 'comic';
  const showLogoClip = phase === 'logo' || phase === 'hold' || phase === 'reveal';

  return (
    <Reanimated.View style={[StyleSheet.absoluteFill, styles.root, rootStyle]} pointerEvents={phase === 'reveal' ? 'none' : 'auto'}>
      <Pressable style={StyleSheet.absoluteFill} onPress={skip} accessibilityLabel="Skip intro">
        {showScene && (
          <VideoView player={scene} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} allowsFullscreen={false} />
        )}
        {phase === 'comic' && (
          <Reanimated.View style={[StyleSheet.absoluteFill, comicStyle]}>
            <Image source={COMIC} style={StyleSheet.absoluteFill} resizeMode="cover" />
            <Reanimated.Image source={BURST} style={[styles.burst, burstStyle]} resizeMode="contain" />
          </Reanimated.View>
        )}
        {showLogoClip && (
          <VideoView player={logo} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} allowsFullscreen={false} />
        )}
        {(phase === 'hold' || phase === 'reveal') && (
          <View style={styles.center} pointerEvents="none">
            <Reanimated.Image source={LOGO} style={[{ width: LOGO_W, height: LOGO_H }, logoStyle]} resizeMode="contain" />
          </View>
        )}
        <Reanimated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#fff' }, flashStyle]} pointerEvents="none" />
      </Pressable>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: '#000', zIndex: 1000 },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  burst: { position: 'absolute', width: W * 0.62, height: W * 0.42, right: -W * 0.06, top: H * 0.07 },
});
