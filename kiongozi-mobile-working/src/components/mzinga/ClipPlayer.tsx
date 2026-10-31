// Full-screen clip player. Grows out of the hive cell you tapped (a circle opening into the
// screen), swipes up/down between clips, and pinching in shrinks it back into the hive.
// Tap = pause, double-tap = like (heart where your finger is; keep tapping for more hearts),
// hold on the right edge = 2x speed, hold anywhere else = clip options (report, speed, copy link).
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, FlatList, Image, Share, useWindowDimensions, Platform, ViewToken, AppState, Animated as RNAnimated } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, withSequence, withDelay, withRepeat, cancelAnimation, interpolate, runOnJS, Extrapolation,
  FadeIn, FadeOut, Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useVideoPlayer, VideoView, VideoPlayer, VideoPlayerStatus } from 'expo-video';
import * as Clipboard from 'expo-clipboard';
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
import { setFeedPaused } from '../social/videoPlayback';
import { UserAvatar } from '../social/UserAvatar';
import { RepostLoop, RollingCount } from '../social/RepostLoop';
import { ClipComments } from './ClipComments';
import { useSafeAreaInsets as useInsets } from 'react-native-safe-area-context';
import { BottomSheet, SheetAction } from '../social/BottomSheet';
import ReportModal from '../../screens/social/ReportModal';
import { useAuthStore } from '../../stores/authStore';
import { useProfileStore } from '../../stores/profileStore';
import { useFollowState, toggleFollow } from '../../stores/followSync';
import { useMitaaStore } from '../../stores/mitaaStore';
import { toast as appToast } from '../../utils/alert';

const HONEY = '#F2B544';
const REPOST_GREEN = '#86BD2E';
const CLAMP = Extrapolation.CLAMP;
const fmt = (n: number) => { const s = (v: number, u: string) => `${v.toFixed(1).replace(/\.0$/, '')}${u}`; return n >= 1e6 ? s(n / 1e6, 'M') : n >= 1e3 ? s(n / 1e3, 'K') : String(n); };

let soundOn = true; // remembered while the app is open
let heartSeq = 0;
const SPEEDS = [0.5, 1, 1.5, 2];
export const postLink = (id: string) => `https://api.kiongozi.org/posts/${id}`;

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
  // Not interested: drop it here (the next clip slides into its place) and from Mitaa
  const notInterested = useCallback((p: Post) => {
    useClipStore.setState(st => ({ clips: st.clips.filter(x => x.id !== p.id) }));
    useMitaaStore.getState().hide(p.id);
  }, []);

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
                  onNotInterested={notInterested}
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

const clock = (sec: number) => { const t = Math.max(0, Math.floor(sec)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };

export const ClipItem = React.memo(function ClipItem({ post, W, H, state, muted, onToggleSound, onClose, onComments, chrome, bottomInset, hideTop, onProfile, onNotInterested, followed }: {
  post: Post; W: number; H: number; state: 'play' | 'warm' | 'cold'; muted: boolean;
  onToggleSound: () => void; onClose: () => void; onComments: () => void; chrome: boolean;
  /** Mitaa tab: room for the tab bar instead of the home indicator */
  bottomInset?: number;
  /** Mitaa tab draws its own header */
  hideTop?: boolean;
  /** Open a profile in place (Mitaa has its own stack). Without it the profile opens on Home. */
  onProfile?: (username: string) => void;
  /** Hide this clip and move on */
  onNotInterested?: (post: Post) => void;
  /** Already known to be followed (the Following street) */
  followed?: boolean;
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
  const [speed, setSpeed] = useState(1);
  const [more, setMore] = useState(false);
  const [long, setLong] = useState(false);
  const [player, setPlayer] = useState<VideoPlayer | null>(null);
  const [status, setStatus] = useState<VideoPlayerStatus>('idle');
  const [sheet, setSheet] = useState<null | 'options' | 'speed'>(null);
  const [report, setReport] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progress = useSharedValue(0);
  const scrub = useSharedValue(0);       // 0..1, how "grabbed" the bar is
  const scrubbing = useRef(false);
  const [scrubTime, setScrubTime] = useState<{ t: number; d: number } | null>(null);
  const lastSeek = useRef(0);
  const pauseGlyph = useSharedValue(0);
  const pauseStyle = useAnimatedStyle(() => ({ opacity: pauseGlyph.value, transform: [{ scale: interpolate(pauseGlyph.value, [0, 1], [1.4, 1]) }] }));

  // Leaving the clip clears its pause, so coming back never shows a stale glyph
  useEffect(() => {
    if (state === 'play') return;
    setPaused(false);
    cancelAnimation(pauseGlyph);
    pauseGlyph.value = 0;
  }, [state, pauseGlyph]);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const playing = state === 'play' && !paused && !report;

  // Progress line
  useEffect(() => {
    if (!player || state !== 'play') return;
    const t = setInterval(() => {
      const d = player.duration || 0;
      if (d > 0 && !scrubbing.current) progress.value = withTiming(player.currentTime / d, { duration: 240, easing: Easing.linear });
    }, 250);
    return () => clearInterval(t);
  }, [player, state, progress]);

  // Still loading while it should be playing: the track breathes
  const buffering = playing && (status === 'loading' || status === 'idle');
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (buffering) pulse.value = withRepeat(withSequence(withTiming(1, { duration: 520 }), withTiming(0, { duration: 520 })), -1);
    else { cancelAnimation(pulse); pulse.value = withTiming(0, { duration: 160 }); }
  }, [buffering, pulse]);
  // Grabbed: the track lightens to 0.3 so the honey fill and the thumb stand out
  const trackStyle = useAnimatedStyle(() => ({ backgroundColor: `rgba(255,255,255,${0.22 + scrub.value * 0.08 + pulse.value * 0.4})` }));

  const retry = () => {
    if (!player) return;
    setStatus('loading');
    try { player.replace(v.url); if (playing) player.play(); } catch {}
    Haptics.selectionAsync().catch(() => {});
  };

  // Hearts where you tap: double-tap likes, then each quick tap adds another heart
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const lastHeart = useRef(0);
  const addHeart = (x: number, y: number) => {
    const id = ++heartSeq;
    setHearts(h => [...h.slice(-6), { id, x, y }]);
  };
  const dropHeart = useCallback((id: number) => setHearts(h => h.filter(k => k.id !== id)), []);

  // Repost from the rail: flips at once (interactionSync settles it), loop spins a half turn
  const reposted = inter?.isReposted ?? !!post.isReposted;
  const reposts = inter?.repost_count ?? post.repost_count ?? 0;
  const repostSpin = useRef(new RNAnimated.Value(0)).current;
  const repost = () => {
    const next = !reposted;
    Haptics.impactAsync(next ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (next) {
      RNAnimated.sequence([
        RNAnimated.timing(repostSpin, { toValue: 1, duration: 0, useNativeDriver: true }),
        RNAnimated.spring(repostSpin, { toValue: 2, useNativeDriver: true, damping: 9, stiffness: 140 }),
      ]).start(() => repostSpin.setValue(0));
    }
    toggleInteraction(post.id, 'repost', next);
    if (next) appToast('Reposted', { icon: 'repeat', action: { label: 'Undo', onPress: () => toggleInteraction(post.id, 'repost', false) } });
  };

  const like = (force?: boolean) => {
    toggleInteraction(post.id, 'like', force ? true : undefined);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };
  const heartTap = (x: number, y: number) => {
    lastHeart.current = Date.now();
    addHeart(x, y);
    if (!liked) like(true);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };
  const onSingle = (x: number, y: number) => {
    // Right after a double-tap heart, more taps add hearts instead of pausing
    if (Date.now() - lastHeart.current < 700) { heartTap(x, y); return; }
    const next = !paused;
    setPaused(next);
    pauseGlyph.value = withSequence(withTiming(1, { duration: 120 }), withDelay(next ? 500 : 120, withTiming(next ? 0.85 : 0, { duration: 200 })));
  };
  const onLongStart = (x: number) => {
    if (x > W * 0.75) {
      setFast(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      setSheet('options');
    }
  };
  const endHold = () => setFast(false);

  const double = Gesture.Tap().numberOfTaps(2).maxDelay(240).onEnd(e => { runOnJS(heartTap)(e.x, e.y); });
  const single = Gesture.Tap().onEnd(e => { runOnJS(onSingle)(e.x, e.y); });
  const hold = Gesture.LongPress().minDuration(320)
    .onStart(e => { runOnJS(onLongStart)(e.x); })
    .onFinalize(() => { runOnJS(endHold)(); });
  // hold wins as soon as it starts; otherwise a double-tap beats a single tap
  const taps = Gesture.Race(hold, Gesture.Exclusive(double, single));

  // Scrubbing (TikTok / Reels): grab anywhere along the bottom, the bar thickens, a big time
  // bubble shows where you will land, the picture follows your finger, and it lands where you let go.
  const trackW = W - 28;
  const seekTo = (frac: number, final: boolean) => {
    if (!player) return;
    const d = player.duration || 0;
    if (!d) return;
    const t = Math.max(0, Math.min(d - 0.05, frac * d));
    setScrubTime({ t, d });
    const now = Date.now();
    if (final || now - lastSeek.current > 90) { // live preview without flooding the decoder
      lastSeek.current = now;
      try { player.currentTime = t; } catch {}
    }
  };
  const scrubStart = () => {
    scrubbing.current = true;
    Haptics.selectionAsync().catch(() => {});
  };
  const scrubEnd = (frac: number) => {
    seekTo(frac, true);
    scrubbing.current = false;
    setScrubTime(null);
    if (paused) { setPaused(false); pauseGlyph.value = withTiming(0, { duration: 120 }); }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };
  const pan = Gesture.Pan()
    .activeOffsetX([-6, 6]).failOffsetY([-14, 14])
    .onStart(e => {
      scrub.value = withSpring(1, { damping: 18, stiffness: 320 });
      progress.value = Math.max(0, Math.min(1, (e.x - 14) / trackW));
      runOnJS(scrubStart)();
    })
    .onUpdate(e => {
      const f = Math.max(0, Math.min(1, (e.x - 14) / trackW));
      progress.value = f;
      runOnJS(seekTo)(f, false);
    })
    .onEnd(e => {
      const f = Math.max(0, Math.min(1, (e.x - 14) / trackW));
      progress.value = f;
      runOnJS(scrubEnd)(f);
    })
    .onFinalize(() => { scrub.value = withTiming(0, { duration: 260 }); });
  const tapSeek = Gesture.Tap().maxDuration(250).onEnd(e => {
    const f = Math.max(0, Math.min(1, (e.x - 14) / trackW));
    progress.value = withTiming(f, { duration: 160 });
    scrub.value = withSequence(withTiming(1, { duration: 120 }), withDelay(400, withTiming(0, { duration: 240 })));
    runOnJS(scrubStart)();
    runOnJS(scrubEnd)(f);
  });
  const scrubGesture = Gesture.Exclusive(pan, tapSeek);
  const trackGrow = useAnimatedStyle(() => ({ height: 2.5 + scrub.value * 5.5, borderRadius: 2 + scrub.value * 2 }));
  const thumbStyle = useAnimatedStyle(() => ({
    opacity: scrub.value,
    transform: [{ translateX: progress.value * trackW - 8 }, { scale: 0.4 + scrub.value * 0.6 }],
  }));
  // Scrubbing dims the rail and caption to a quarter so the picture and the time read, without losing your place
  const chromeFade = useAnimatedStyle(() => ({ opacity: 1 - scrub.value * 0.75 }));

  const go = (screen: string, params: any) => {
    const nav = storyNav.current;
    if (!nav) return;
    onClose();
    useClipStore.getState().closeHive();
    setTimeout(() => nav.navigate('Feed', { screen, params }), 60);
  };
  const username = post.profiles?.username;
  const openProfile = () => {
    if (!username) return;
    if (onProfile) onProfile(username);
    else go('PublicProfile', { username });
  };
  const share = async () => {
    try {
      await Share.share({ message: `${post.profiles?.full_name || post.profiles?.username} on KChat`, url: postLink(post.id) });
    } catch {}
  };

  const showToast = (t: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(t);
    toastTimer.current = setTimeout(() => setToast(null), 1600);
  };
  const copyLink = async () => {
    try {
      await Clipboard.setStringAsync(postLink(post.id));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      showToast('Link copied');
    } catch { showToast("Couldn't copy the link"); }
  };

  // Follow from the rail: only when we know you don't follow them yet
  const myId = useAuthStore(s => s.user?.id);
  const authorId = post.user_id || post.profiles?.id;
  const own = !!myId && authorId === myId;
  const knownFollow = useProfileStore(s => {
    const p = username ? s.profiles[username] : undefined;
    if (!p) return undefined;
    if (p.isFollowing || p.followRequestStatus === 'pending') return true;
    return p.isFollowing === false ? false : undefined;
  });
  const [badge, setBadge] = useState<'idle' | 'check' | 'gone'>('idle');
  useEffect(() => {
    if (state === 'play' && myId && !own && !followed && username && knownFollow === undefined) {
      useProfileStore.getState().fetchProfile(username).catch(() => {});
    }
  }, [state, myId, own, followed, username, knownFollow]);
  const badgeScale = useSharedValue(1);
  const badgeO = useSharedValue(1);
  const badgeStyle = useAnimatedStyle(() => ({ opacity: badgeO.value, transform: [{ scale: badgeScale.value }] }));
  // Follow goes through followSync: the badge ticks and fades at once, the store settles it with the
  // server (Requested for a private account) and shows the badge again with a toast if it is refused
  const followStatus = useFollowState(authorId || undefined).status;
  const tappedFollow = useRef(false);
  useEffect(() => {
    if (tappedFollow.current && followStatus === 'none') {
      tappedFollow.current = false;
      cancelAnimation(badgeO);
      badgeO.value = 1;
      setBadge('idle');
    }
  }, [followStatus]);
  const follow = () => {
    if (badge !== 'idle' || !authorId || !username) return;
    setBadge('check');
    tappedFollow.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    badgeScale.value = withSequence(withTiming(1.3, { duration: 110 }), withSpring(1, { damping: 9, stiffness: 260 }));
    badgeO.value = withDelay(900, withTiming(0, { duration: 260 }, (f?: boolean) => { if (f) runOnJS(setBadge)('gone'); }));
    const prof = useProfileStore.getState().profiles[username];
    toggleFollow(authorId, { isFollowing: false, is_private: !!(prof?.is_private ?? (post.profiles as any)?.is_private), username });
  };
  const showBadge = !!myId && !own && !followed && ((knownFollow === false && badge === 'idle') || badge === 'check');

  const options: SheetAction[] = sheet === 'speed'
    ? SPEEDS.map(r => ({
        icon: speed === r ? 'checkmark-circle' : 'ellipse-outline',
        label: `${r}x`,
        onPress: () => { setSpeed(r); showToast(r === 1 ? 'Normal speed' : `${r}x speed`); },
      }))
    : [
        ...(onNotInterested && !own ? [{ icon: 'eye-off-outline' as const, label: 'Not interested', onPress: () => onNotInterested(post) }] : []),
        { icon: 'link-outline', label: 'Copy link', onPress: copyLink },
        { icon: 'speedometer-outline', label: speed === 1 ? 'Speed' : `Speed: ${speed}x`, onPress: () => setSheet('speed') },
        ...(!own ? [{ icon: 'flag-outline' as const, label: 'Report', destructive: true, onPress: () => setReport(true) }] : []),
      ];

  const bar = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));
  const caption = post.content?.trim();
  // Someone you follow reposted this clip (the feed sends recent reposters)
  const reposter = (post.recentReposters || []).find(u => u?.id && u.id !== post.user_id && u.id !== myId);

  return (
    <View style={{ width: W, height: H, backgroundColor: '#000' }}>
      {/* Cover first, then the video on top of it */}
      {!tall && thumb ? <Image source={{ uri: thumb }} style={[StyleSheet.absoluteFill, { opacity: 0.55 }]} blurRadius={30} /> : null}
      {thumb ? <Image source={{ uri: thumb }} style={StyleSheet.absoluteFill} resizeMode={tall ? 'cover' : 'contain'} /> : null}
      {state !== 'cold' && (
        <ClipVideo url={v.url} playing={playing} muted={muted} rate={fast ? 2 : speed} fit={tall ? 'cover' : 'contain'} onPlayer={setPlayer} onStatus={setStatus} />
      )}

      <GestureDetector gesture={taps}>
        <View style={StyleSheet.absoluteFill} />
      </GestureDetector>

      {hearts.map(h => <Heart key={h.id} id={h.id} x={h.x} y={h.y} onDone={dropHeart} />)}
      <Animated.View pointerEvents="none" style={[styles.pauseGlyph, { left: W / 2 - 36, top: H / 2 - 36 }, pauseStyle]}>
        <Ionicons name={paused ? 'play' : 'pause'} size={34} color="#fff" />
      </Animated.View>
      {state !== 'cold' && status === 'error' && (
        <Pressable onPress={retry} style={[styles.error, { top: H / 2 - 22 }]} accessibilityRole="button" accessibilityLabel="Couldn't play. Tap to retry">
          <Ionicons name="refresh" size={18} color="#fff" />
          <Text style={styles.errorText}>Couldn't play. Tap to retry</Text>
        </Pressable>
      )}
      {fast && (
        <View pointerEvents="none" style={[styles.fast, { top: insets.top + 60 }]}>
          <Ionicons name="play-forward" size={14} color="#1A1206" />
          <Text style={styles.fastText}>2×</Text>
        </View>
      )}
      {toast && (
        <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(200)} pointerEvents="none" style={[styles.toast, { top: insets.top + 60 }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </Animated.View>
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
      <Animated.View style={[styles.rail, { bottom: (bottomInset ?? insets.bottom) + 96 }, chromeFade]} pointerEvents="box-none">
        <View>
          <Pressable onPress={openProfile} accessibilityLabel={`Open ${username}'s profile`}>
            <View style={styles.railAvatar}>
              <UserAvatar avatarUrl={post.profiles?.avatar_url} name={post.profiles?.full_name || post.profiles?.username} size={44} />
            </View>
            {reposter && !showBadge ? (
              <View style={styles.repostDot} accessibilityLabel={`Reposted by ${reposter.username}`}>
                <RepostLoop size={11} on color="#fff" onColor="#fff" />
              </View>
            ) : null}
          </Pressable>
          {showBadge && (
            <Animated.View style={[styles.followBadge, badgeStyle]}>
              <Pressable onPress={follow} hitSlop={10} style={styles.followBadgeIn} accessibilityRole="button" accessibilityLabel={`Follow ${username}`}>
                <Ionicons name={badge === 'check' ? 'checkmark' : 'add'} size={15} color="#1A1206" />
              </Pressable>
            </Animated.View>
          )}
        </View>
        <RailBtn icon={liked ? 'heart' : 'heart-outline'} color={liked ? '#FF3B5C' : '#fff'} label={likes ? fmt(likes) : 'Like'} onPress={() => like()} a11y={liked ? 'Unlike' : 'Like'} />
        <RailBtn icon="chatbubble-outline" label={post.comment_count ? fmt(post.comment_count) : 'Comment'} onPress={onComments} a11y="Comments" />
        <RailBtn
          icon={<RepostLoop size={30} on={reposted} spin={repostSpin} color="#fff" onColor={REPOST_GREEN} />}
          label={<RollingCount value={reposts} text={reposts ? fmt(reposts) : 'Repost'} style={[styles.railLabel, reposted && { color: REPOST_GREEN }]} />}
          onPress={repost}
          a11y={reposted ? 'Undo repost' : 'Repost'}
        />
        <RailBtn icon="share-outline" label="Share" onPress={share} a11y="Share" />
      </Animated.View>

      {/* Who and what */}
      <Animated.View style={[styles.info, { bottom: (bottomInset ?? insets.bottom) + 30, right: 84 }, chromeFade]} pointerEvents="box-none">
        {reposter ? (
          <View style={styles.repostPill}>
            <RepostLoop size={13} on color="#86BD2E" onColor="#86BD2E" />
            <Text style={styles.repostPillText} numberOfLines={1}>Reposted by <Text style={{ fontWeight: '800' }}>@{reposter.username}</Text></Text>
          </View>
        ) : null}
        <Pressable onPress={openProfile}>
          <Text style={styles.name}>@{username}</Text>
        </Pressable>
        {caption ? (
          <Pressable onPress={() => { if (long || more) setMore(m => !m); }}>
            <Text style={styles.caption} numberOfLines={more ? 8 : 2}>{caption}</Text>
            {long && !more ? <Text style={styles.more}>more</Text> : null}
            {/* Unclamped copy, measured to know if the caption was cut */}
            <Text style={[styles.caption, styles.measure]} onTextLayout={e => setLong(e.nativeEvent.lines.length > 2)} accessible={false} importantForAccessibility="no-hide-descendants">{caption}</Text>
          </Pressable>
        ) : null}
      </Animated.View>

      {scrubTime && (
        <View pointerEvents="none" style={[styles.scrubBubble, { bottom: (bottomInset ?? insets.bottom) + 70 }]}>
          <Text style={styles.scrubNow}>{clock(scrubTime.t)}</Text>
          <Text style={styles.scrubTotal}> / {clock(scrubTime.d)}</Text>
        </View>
      )}

      {/* The seek bar: a tall invisible touch strip around a thin line */}
      <GestureDetector gesture={scrubGesture}>
        <View style={[styles.scrubZone, { bottom: (bottomInset ?? insets.bottom) - 4 }]}
          accessible accessibilityRole="adjustable" accessibilityLabel="Seek"
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={e => {
            if (!player || !player.duration) return;
            const step = e.nativeEvent.actionName === 'increment' ? 5 : -5;
            try { player.currentTime = Math.max(0, Math.min(player.duration - 0.05, player.currentTime + step)); } catch {}
          }}>
          <Animated.View style={[styles.track, { position: 'relative', left: 0, right: 0, marginHorizontal: 14 }, trackStyle, trackGrow]} pointerEvents="none">
            <Animated.View style={[styles.trackFill, bar]} />
          </Animated.View>
          <Animated.View style={[styles.thumb, thumbStyle]} pointerEvents="none" />
        </View>
      </GestureDetector>
      </>}

      <BottomSheet
        visible={!!sheet}
        onClose={() => setSheet(null)}
        title={sheet === 'speed' ? 'Playback speed' : undefined}
        actions={options}
      />
      {report && (
        <ReportModal
          target={{ type: 'post', id: post.id, displayName: username ? `@${username}` : 'this clip' }}
          onClose={() => setReport(false)}
        />
      )}
    </View>
  );
});

function Heart({ id, x, y, onDone }: { id: number; x: number; y: number; onDone: (id: number) => void }) {
  const v = useSharedValue(0);
  const tilt = useRef((Math.random() - 0.5) * 30).current;
  useEffect(() => {
    v.value = withTiming(1, { duration: 820 }, (f?: boolean) => { if (f) runOnJS(onDone)(id); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const st = useAnimatedStyle(() => ({
    opacity: interpolate(v.value, [0, 0.15, 0.75, 1], [0, 1, 1, 0]),
    transform: [
      { translateY: interpolate(v.value, [0, 1], [0, -70]) },
      { scale: interpolate(v.value, [0, 0.2, 0.32, 1], [0.3, 1.25, 1, 1.1]) },
      { rotate: `${tilt + interpolate(v.value, [0, 1], [-6, 6])}deg` },
    ],
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles.heart, { left: x - 48, top: y - 48 }, st]}>
      <Ionicons name="heart" size={96} color="#FF3B5C" />
    </Animated.View>
  );
}

/** `icon` is an Ionicons name or a ready node (the repost loop); `label` a string or a node (a rolling count) */
function RailBtn({ icon, label, onPress, color = '#fff', a11y }: { icon: any; label?: React.ReactNode; onPress: () => void; color?: string; a11y: string }) {
  const s = useSharedValue(1);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Pressable
      onPress={() => { s.value = withSequence(withTiming(0.8, { duration: 80 }), withSpring(1, { damping: 8, stiffness: 300 })); onPress(); }}
      style={styles.railBtn}
      accessibilityRole="button"
      accessibilityLabel={a11y}
    >
      <Animated.View style={st}>{typeof icon === 'string' ? <Ionicons name={icon as any} size={30} color={color} /> : icon}</Animated.View>
      {typeof label === 'string' ? <Text style={styles.railLabel}>{label}</Text> : label ? <View>{label}</View> : null}
    </Pressable>
  );
}

// Only one clip may ever make sound: starting one pauses and mutes every other clip player
// (neighbours preloaded on either side, the same clip on another street, a player left open).
const clipPlayers = new Set<VideoPlayer>();
function claimSound(p: VideoPlayer) {
  clipPlayers.forEach(o => {
    if (o === p) return;
    try { o.muted = true; o.pause(); } catch {}
  });
  setFeedPaused('clip', true);
}

function ClipVideo({ url, playing, muted, rate, fit, onPlayer, onStatus }: {
  url: string; playing: boolean; muted: boolean; rate: number; fit: 'cover' | 'contain';
  onPlayer: (p: VideoPlayer) => void; onStatus?: (s: VideoPlayerStatus) => void;
}) {
  const o = useSharedValue(0);
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const statusRef = useRef(onStatus);
  statusRef.current = onStatus;
  // Preloaded players start silent; sound is switched on only when this one plays
  const player = useVideoPlayer(url, p => { p.loop = true; p.muted = true; });
  useEffect(() => {
    clipPlayers.add(player);
    return () => {
      clipPlayers.delete(player);
      if (!clipPlayers.size) setFeedPaused('clip', false);
    };
  }, [player]);
  useEffect(() => { onPlayer(player); }, [player, onPlayer]);
  useEffect(() => {
    statusRef.current?.(player.status);
    if (player.status === 'readyToPlay') o.value = withTiming(1, { duration: 200 });
    const sub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') o.value = withTiming(1, { duration: 200 });
      statusRef.current?.(status);
    });
    return () => sub.remove();
  }, [player, o]);
  useEffect(() => {
    if (playing) { claimSound(player); player.muted = muted; player.play(); }
    else { player.pause(); player.muted = true; }
  }, [playing, muted, player]);
  // Back from the background: carry on if this clip was playing, otherwise stay paused
  useEffect(() => {
    const sub = AppState.addEventListener('change', s => {
      try {
        if (s === 'active' && playingRef.current) player.play();
        else player.pause();
      } catch {}
    });
    return () => sub.remove();
  }, [player]);
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
  toast: { position: 'absolute', alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.72)', borderRadius: 14, paddingHorizontal: 14, height: 30, justifyContent: 'center' },
  toastText: { color: '#fff', fontSize: 13.5, fontWeight: '700' },
  error: { position: 'absolute', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 18, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.6)' },
  errorText: { color: '#fff', fontSize: 14.5, fontWeight: '700' },
  shadeTop: { position: 'absolute', left: 0, right: 0, top: 0 },
  shadeBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 280 },
  top: { position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  topBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  brand: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: -0.4, textShadowColor: 'rgba(0,0,0,0.45)', textShadowRadius: 6 },
  rail: { position: 'absolute', right: 10, alignItems: 'center', gap: 18 },
  railAvatar: { borderWidth: 2, borderColor: '#fff', borderRadius: 26, padding: 2, marginBottom: 4 },
  // 20px honey circle centred on the avatar's bottom edge (avatar is 52 wide with 4 of margin under it)
  followBadge: { position: 'absolute', left: 16, bottom: -6 },
  repostDot: { position: 'absolute', left: 16, bottom: -4, width: 20, height: 20, borderRadius: 10, backgroundColor: '#3FA845', borderWidth: 2, borderColor: '#000', alignItems: 'center', justifyContent: 'center' },
  repostPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, height: 26, paddingLeft: 7, paddingRight: 10, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.16)', marginBottom: 8 },
  repostPillText: { color: '#fff', fontSize: 12.5, fontWeight: '600' },
  followBadgeIn: { width: 20, height: 20, borderRadius: 10, backgroundColor: HONEY, alignItems: 'center', justifyContent: 'center' },
  railBtn: { alignItems: 'center', minWidth: 52 },
  railLabel: { color: '#fff', fontSize: 12.5, fontWeight: '600', marginTop: 3, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },
  info: { position: 'absolute', left: 14 },
  name: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 4, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },
  caption: { color: 'rgba(255,255,255,0.92)', fontSize: 14.5, lineHeight: 20, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },
  more: { color: '#fff', fontSize: 14.5, lineHeight: 20, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },
  measure: { position: 'absolute', left: 0, right: 0, top: 0, opacity: 0 },
  track: { position: 'absolute', left: 14, right: 14, height: 2.5, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.22)', overflow: 'hidden' },
  scrubZone: { position: 'absolute', left: 0, right: 0, height: 36, justifyContent: 'center' },
  thumb: {
    position: 'absolute', left: 14, width: 16, height: 16, borderRadius: 8, backgroundColor: '#FFFFFF',
    shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 3,
  },
  scrubBubble: { position: 'absolute', alignSelf: 'center', flexDirection: 'row', alignItems: 'baseline' },
  scrubNow: { color: '#FFFFFF', fontSize: 34, fontWeight: '800', fontVariant: ['tabular-nums'], textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 8 },
  scrubTotal: { color: 'rgba(255,255,255,0.65)', fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'], textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 8 },
  trackFill: { height: '100%', backgroundColor: HONEY, borderRadius: 2 },
});
