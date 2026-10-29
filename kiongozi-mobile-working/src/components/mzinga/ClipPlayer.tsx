// Full-screen clip player. Grows out of the hive cell you tapped (a circle opening into the
// screen), swipes up/down between clips, and pinching in shrinks it back into the hive.
// Tap = pause, double-tap = like (heart where your finger is), hold = 2x speed.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, FlatList, Image, Share, useWindowDimensions, Platform, ViewToken } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, withSequence, withDelay, interpolate, runOnJS, Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useVideoPlayer, VideoView, VideoPlayer } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useClipStore, clipVideo } from '../../stores/clipStore';
import { useSocialStore, Post } from '../../stores/socialStore';
import { toggleInteraction } from '../../stores/interactionSync';
import apiClient from '../../utils/apiClient';
import { storyNav } from '../stories/storyAssets';
import { useVideoThumb } from '../social/media';
import { UserAvatar } from '../social/UserAvatar';
import { ClipComments } from './ClipComments';
import { useSafeAreaInsets as useInsets } from 'react-native-safe-area-context';

const HONEY = '#F2B544';
const CLAMP = Extrapolation.CLAMP;
const fmt = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(n || 0));

let soundOn = true; // remembered while the app is open

export function ClipPlayer({ standalone }: { standalone?: boolean }) {
  const body = <PlayerBody />;
  if (!standalone) return body;
  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={() => useClipStore.getState().closePlayer()}>
      <GestureHandlerRootView style={{ flex: 1 }}>{body}</GestureHandlerRootView>
    </Modal>
  );
}

function PlayerBody() {
  const { width: W, height: winH } = useWindowDimensions();
  const [H, setH] = useState(winH);
  const clips = useClipStore(s => s.clips);
  const start = useClipStore(s => s.player);
  const { closePlayer, markSeen, fetch } = useClipStore.getState();
  const [active, setActive] = useState(start?.index ?? 0);
  const [muted, setMuted] = useState(!soundOn);
  const [comments, setComments] = useState(false);
  const insetsTop = useInsets().top;
  const origin = useRef(start?.origin).current;
  const startIndex = useRef(start?.index ?? 0).current;

  // Open: a circle at the hive cell grows to fill the screen
  const open = useSharedValue(0);
  const pinch = useSharedValue(1);
  useEffect(() => { open.value = withSpring(1, { damping: 22, stiffness: 190, mass: 0.9 }); }, [open]);

  const close = useCallback(() => {
    const back = origin && active === startIndex;
    if (back) open.value = withTiming(0, { duration: 260 }, f => { if (f) runOnJS(closePlayer)(); });
    else { pinch.value = withTiming(0.6, { duration: 200 }); open.value = withTiming(0, { duration: 200 }, f => { if (f) runOnJS(closePlayer)(); }); }
  }, [origin, active, startIndex, open, pinch, closePlayer]);

  const frame = useAnimatedStyle(() => {
    const o = origin || { x: W / 2 - 40, y: H / 2 - 40, width: 80, height: 80 };
    const p = open.value;
    const w = interpolate(p, [0, 1], [o.width, W]);
    const h = interpolate(p, [0, 1], [o.height, H]);
    return {
      left: interpolate(p, [0, 1], [o.x, 0]),
      top: interpolate(p, [0, 1], [o.y, 0]),
      width: w, height: h,
      borderRadius: interpolate(p, [0, 0.85, 1], [o.width / 2, 40, interpolate(pinch.value, [0.6, 1], [44, 0], CLAMP)]),
      opacity: origin ? 1 : interpolate(p, [0, 0.4], [0, 1], CLAMP),
      transform: [{ scale: pinch.value }],
    };
  });
  // Keeps the content still on screen while the frame around it grows
  const inner = useAnimatedStyle(() => {
    const o = origin || { x: W / 2 - 40, y: H / 2 - 40, width: 80, height: 80 };
    return {
      left: -interpolate(open.value, [0, 1], [o.x, 0]),
      top: -interpolate(open.value, [0, 1], [o.y, 0]),
    };
  });
  // Comments open: the clip shrinks into the space above the sheet and keeps playing
  const cp = useSharedValue(0);
  useEffect(() => { cp.value = withSpring(comments ? 1 : 0, { damping: 22, stiffness: 220 }); }, [comments, cp]);
  const shrink = useAnimatedStyle(() => {
    const s = Math.max(0.2, (H * 0.36 - insetsTop - 8) / H);
    return {
      transform: [
        { translateY: interpolate(cp.value, [0, 1], [0, -H * (1 - s) / 2 + insetsTop + 4]) },
        { scale: interpolate(cp.value, [0, 1], [1, s]) },
      ],
      borderRadius: interpolate(cp.value, [0, 1], [0, 18]),
    };
  });
  const scrim = useAnimatedStyle(() => ({ opacity: interpolate(open.value, [0, 1], [0, 1]) * interpolate(pinch.value, [0.6, 1], [0.4, 1], CLAMP) }));

  const pinchG = Gesture.Pinch()
    .onUpdate(e => { pinch.value = Math.min(1, Math.max(0.55, e.scale)); })
    .onEnd(() => {
      if (pinch.value < 0.86) runOnJS(close)();
      else pinch.value = withSpring(1, { damping: 18 });
    });

  const onViewable = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const v = viewableItems.find(x => x.isViewable);
    if (v?.index != null) setActive(v.index);
  }).current;

  // One view per clip you land on (not again when the next page of clips arrives)
  const viewed = useRef<string | null>(null);
  const activeId = clips[active]?.id;
  useEffect(() => {
    if (!activeId || viewed.current === activeId) return;
    viewed.current = activeId;
    markSeen(activeId);
    apiClient.recordPostView(activeId).catch(() => {});
  }, [activeId, markSeen]);
  useEffect(() => { if (active >= clips.length - 4) fetch(); }, [active, clips.length, fetch]);

  const toggleSound = () => { soundOn = muted; setMuted(m => !m); Haptics.selectionAsync().catch(() => {}); };

  return (
    <View style={StyleSheet.absoluteFill} onLayout={e => setH(e.nativeEvent.layout.height)}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.88)' }, scrim]} />
      <GestureDetector gesture={pinchG}>
        <Animated.View style={[styles.frame, frame]}>
          <Animated.View style={[{ position: 'absolute', width: W, height: H }, inner]}>
            <Animated.View style={[{ flex: 1, overflow: 'hidden' }, shrink]}>
            <FlatList
              scrollEnabled={!comments}
              data={clips}
              keyExtractor={p => p.id}
              pagingEnabled
              showsVerticalScrollIndicator={false}
              initialScrollIndex={startIndex}
              getItemLayout={(_, i) => ({ length: H, offset: H * i, index: i })}
              windowSize={3}
              initialNumToRender={1}
              maxToRenderPerBatch={2}
              removeClippedSubviews={Platform.OS === 'android'}
              decelerationRate="fast"
              onViewableItemsChanged={onViewable}
              viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
              renderItem={({ item, index }) => (
                <ClipItem
                  post={item}
                  W={W} H={H}
                  state={index === active ? 'play' : Math.abs(index - active) === 1 ? 'warm' : 'cold'}
                  muted={muted}
                  onToggleSound={toggleSound}
                  onClose={close}
                  onComments={() => setComments(true)}
                  chrome={!comments}
                />
              )}
            />
            </Animated.View>
            <ClipComments
              post={clips[active] || null}
              open={comments}
              onClose={() => setComments(false)}
              onCount={(id, n) => useClipStore.getState().bumpComments(id, n)}
            />
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

export const ClipItem = React.memo(function ClipItem({ post, W, H, state, muted, onToggleSound, onClose, onComments, chrome, bottomInset, hideTop }: {
  post: Post; W: number; H: number; state: 'play' | 'warm' | 'cold'; muted: boolean;
  onToggleSound: () => void; onClose: () => void; onComments: () => void; chrome: boolean;
  /** Mitaa tab: room for the tab bar instead of the home indicator */
  bottomInset?: number;
  /** Mitaa tab draws its own header */
  hideTop?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const v = clipVideo(post)!;
  const thumb = useVideoThumb(v.url, v.thumbnail_url);
  const tall = (v.height || 16) >= (v.width || 9);
  const inter = useSocialStore(s => s.postInteractions[post.id]);
  const liked = inter?.isLiked ?? !!post.isLiked;
  const likes = inter?.like_count ?? post.like_count;
  const [paused, setPaused] = useState(false);
  const [fast, setFast] = useState(false);
  const [more, setMore] = useState(false);
  const [player, setPlayer] = useState<VideoPlayer | null>(null);
  const progress = useSharedValue(0);

  useEffect(() => { if (state !== 'play') setPaused(false); }, [state]);

  // Progress line
  useEffect(() => {
    if (!player || state !== 'play') return;
    const t = setInterval(() => {
      const d = player.duration || 0;
      if (d > 0) progress.value = withTiming(player.currentTime / d, { duration: 240 });
    }, 250);
    return () => clearInterval(t);
  }, [player, state, progress]);

  // Heart burst where you double-tapped
  const heart = useSharedValue(0);
  const [heartAt, setHeartAt] = useState({ x: 0, y: 0 });
  const heartStyle = useAnimatedStyle(() => ({
    opacity: interpolate(heart.value, [0, 0.15, 0.75, 1], [0, 1, 1, 0]),
    transform: [
      { translateY: interpolate(heart.value, [0, 1], [0, -70]) },
      { scale: interpolate(heart.value, [0, 0.2, 0.32, 1], [0.3, 1.25, 1, 1.1]) },
      { rotate: `${interpolate(heart.value, [0, 1], [-12, 6])}deg` },
    ],
  }));
  const pauseGlyph = useSharedValue(0);
  const pauseStyle = useAnimatedStyle(() => ({ opacity: pauseGlyph.value, transform: [{ scale: interpolate(pauseGlyph.value, [0, 1], [1.4, 1]) }] }));

  const like = (force?: boolean) => {
    toggleInteraction(post.id, 'like', force ? true : undefined);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };
  const onDouble = (x: number, y: number) => {
    setHeartAt({ x, y });
    heart.value = 0;
    heart.value = withTiming(1, { duration: 820 });
    if (!liked) like(true);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };
  const onSingle = () => {
    setPaused(p => {
      pauseGlyph.value = withSequence(withTiming(1, { duration: 120 }), withDelay(p ? 120 : 500, withTiming(p ? 0 : 0.85, { duration: 200 })));
      return !p;
    });
  };
  const onHold = (on: boolean) => {
    setFast(on);
    if (on) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
  };

  const double = Gesture.Tap().numberOfTaps(2).maxDelay(240).onEnd(e => { runOnJS(onDouble)(e.x, e.y); });
  const single = Gesture.Tap().onEnd(() => { runOnJS(onSingle)(); });
  const hold = Gesture.LongPress().minDuration(320)
    .onStart(() => { runOnJS(onHold)(true); })
    .onFinalize(() => { runOnJS(onHold)(false); });
  // hold wins as soon as it starts; otherwise a double-tap beats a single tap
  const taps = Gesture.Race(hold, Gesture.Exclusive(double, single));

  const go = (screen: string, params: any) => {
    const nav = storyNav.current;
    if (!nav) return;
    onClose();
    useClipStore.getState().closeHive();
    setTimeout(() => nav.navigate('Feed', { screen, params }), 60);
  };
  const share = async () => {
    try {
      await Share.share({ message: `${post.profiles?.full_name || post.profiles?.username} on KChat`, url: `https://api.kiongozi.org/posts/${post.id}` });
    } catch {}
  };

  const bar = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <View style={{ width: W, height: H, backgroundColor: '#000' }}>
      {/* Cover first, then the video on top of it */}
      {!tall && thumb ? <Image source={{ uri: thumb }} style={[StyleSheet.absoluteFill, { opacity: 0.55 }]} blurRadius={30} /> : null}
      {thumb ? <Image source={{ uri: thumb }} style={StyleSheet.absoluteFill} resizeMode={tall ? 'cover' : 'contain'} /> : null}
      {state !== 'cold' && (
        <ClipVideo url={v.url} playing={state === 'play' && !paused} muted={muted} rate={fast ? 2 : 1} fit={tall ? 'cover' : 'contain'} onPlayer={setPlayer} />
      )}

      <GestureDetector gesture={taps}>
        <View style={StyleSheet.absoluteFill} />
      </GestureDetector>

      <Animated.View pointerEvents="none" style={[styles.heart, { left: heartAt.x - 48, top: heartAt.y - 48 }, heartStyle]}>
        <Ionicons name="heart" size={96} color="#FF3B5C" />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.pauseGlyph, { left: W / 2 - 36, top: H / 2 - 36 }, pauseStyle]}>
        <Ionicons name={paused ? 'play' : 'pause'} size={34} color="#fff" />
      </Animated.View>
      {fast && (
        <View pointerEvents="none" style={[styles.fast, { top: insets.top + 60 }]}>
          <Ionicons name="play-forward" size={14} color="#1A1206" />
          <Text style={styles.fastText}>2×</Text>
        </View>
      )}

      {chrome && <>
      {/* Shade so the words read on any video */}
      <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0.45)', 'transparent']} style={[styles.shadeTop, { height: insets.top + 90 }]} />
      <LinearGradient pointerEvents="none" colors={['transparent', 'rgba(0,0,0,0.7)']} style={styles.shadeBottom} />

      {/* Top bar */}
      {!hideTop && <View style={[styles.top, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <Pressable onPress={onClose} style={styles.topBtn} hitSlop={8} accessibilityLabel="Close">
          <Ionicons name="chevron-down" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.brand}>Mitaa</Text>
        <Pressable onPress={onToggleSound} style={styles.topBtn} hitSlop={8} accessibilityLabel={muted ? 'Sound on' : 'Sound off'}>
          <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={20} color="#fff" />
        </Pressable>
      </View>}

      {/* Right rail */}
      <View style={[styles.rail, { bottom: (bottomInset ?? insets.bottom) + 96 }]} pointerEvents="box-none">
        <Pressable onPress={() => go('PublicProfile', { username: post.profiles?.username })} accessibilityLabel={`Open ${post.profiles?.username}'s profile`}>
          <View style={styles.railAvatar}>
            <UserAvatar avatarUrl={post.profiles?.avatar_url} name={post.profiles?.full_name || post.profiles?.username} size={44} />
          </View>
        </Pressable>
        <RailBtn icon={liked ? 'heart' : 'heart-outline'} color={liked ? '#FF3B5C' : '#fff'} label={fmt(likes)} onPress={() => like()} a11y={liked ? 'Unlike' : 'Like'} />
        <RailBtn icon="chatbubble-outline" label={fmt(post.comment_count)} onPress={onComments} a11y="Comments" />
        <RailBtn icon="paper-plane-outline" label="Share" onPress={share} a11y="Share" />
      </View>

      {/* Who and what */}
      <View style={[styles.info, { bottom: (bottomInset ?? insets.bottom) + 30, right: 84 }]} pointerEvents="box-none">
        <Pressable onPress={() => go('PublicProfile', { username: post.profiles?.username })}>
          <Text style={styles.name}>@{post.profiles?.username}</Text>
        </Pressable>
        {post.content?.trim() ? (
          <Pressable onPress={() => setMore(m => !m)}>
            <Text style={styles.caption} numberOfLines={more ? 8 : 2}>{post.content.trim()}</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.track, { bottom: (bottomInset ?? insets.bottom) + 14 }]} pointerEvents="none">
        <Animated.View style={[styles.trackFill, bar]} />
      </View>
      </>}
    </View>
  );
});

function RailBtn({ icon, label, onPress, color = '#fff', a11y }: { icon: any; label: string; onPress: () => void; color?: string; a11y: string }) {
  const s = useSharedValue(1);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Pressable
      onPress={() => { s.value = withSequence(withTiming(0.8, { duration: 80 }), withSpring(1, { damping: 8, stiffness: 300 })); onPress(); }}
      style={styles.railBtn}
      accessibilityRole="button"
      accessibilityLabel={a11y}
    >
      <Animated.View style={st}><Ionicons name={icon} size={30} color={color} /></Animated.View>
      <Text style={styles.railLabel}>{label}</Text>
    </Pressable>
  );
}

function ClipVideo({ url, playing, muted, rate, fit, onPlayer }: {
  url: string; playing: boolean; muted: boolean; rate: number; fit: 'cover' | 'contain'; onPlayer: (p: VideoPlayer) => void;
}) {
  const o = useSharedValue(0);
  const player = useVideoPlayer(url, p => { p.loop = true; p.muted = muted; });
  useEffect(() => { onPlayer(player); }, [player, onPlayer]);
  useEffect(() => {
    const sub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') o.value = withTiming(1, { duration: 200 });
    });
    return () => sub.remove();
  }, [player, o]);
  useEffect(() => { if (playing) player.play(); else player.pause(); }, [playing, player]);
  useEffect(() => { player.muted = muted; }, [muted, player]);
  useEffect(() => { player.playbackRate = rate; }, [rate, player]);
  const st = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, st]} pointerEvents="none">
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit={fit} nativeControls={false} allowsFullscreen={false} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  frame: { position: 'absolute', overflow: 'hidden', backgroundColor: '#000' },
  heart: { position: 'absolute', width: 96, height: 96 },
  pauseGlyph: { position: 'absolute', width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  fast: { position: 'absolute', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: HONEY, borderRadius: 14, paddingHorizontal: 12, height: 28 },
  fastText: { color: '#1A1206', fontSize: 13, fontWeight: '800' },
  shadeTop: { position: 'absolute', left: 0, right: 0, top: 0 },
  shadeBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 280 },
  top: { position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  topBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  brand: { color: '#fff', fontSize: 17, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: -0.3 },
  rail: { position: 'absolute', right: 10, alignItems: 'center', gap: 18 },
  railAvatar: { borderWidth: 2, borderColor: '#fff', borderRadius: 26, padding: 2, marginBottom: 4 },
  railBtn: { alignItems: 'center', minWidth: 52 },
  railLabel: { color: '#fff', fontSize: 12.5, fontWeight: '600', marginTop: 3, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },
  info: { position: 'absolute', left: 14 },
  name: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 4, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },
  caption: { color: 'rgba(255,255,255,0.92)', fontSize: 14.5, lineHeight: 20, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },
  track: { position: 'absolute', left: 14, right: 14, height: 2.5, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.22)', overflow: 'hidden' },
  trackFill: { height: '100%', backgroundColor: HONEY, borderRadius: 2 },
});
