// Full-screen media viewer. All gestures run on the native UI thread (Gesture Handler + Reanimated),
// so swiping to close follows the finger at full frame rate, with no JS-thread stutter.
//  • Swipe up/down to close (follows the finger, shrinks + fades, flings away or springs back)
//  • Swipe left/right between items
//  • Photos: pinch to zoom, double-tap to zoom in/out, drag while zoomed, single tap hides the chrome
//  • Videos: play with sound, tap to pause, seekable progress, mute
import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  Modal, View, Text, TouchableOpacity, Pressable, StyleSheet, Dimensions, ActivityIndicator, Image, ScrollView, useWindowDimensions,
} from 'react-native';
import Reanimated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring, interpolate, Extrapolation, runOnJS, Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView, ScrollView as GHScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Post } from '../../stores/socialStore';
import { UserAvatar } from './UserAvatar';
import { VerifiedBadge } from './VerifiedBadge';
import { getPosition, setPosition, setFeedPaused } from './videoPlayback';
import apiClient from '../../utils/apiClient';
import { shareImageFile } from '../../utils/shareImage';
import { usePrefs } from '../../stores/prefsStore';

// Initial guess only: the real page size is measured from the modal's root (on Android edge-to-edge
// the translucent modal is taller than Dimensions 'window', which would leave photos off-centre).
const WIN = Dimensions.get('window');

export interface MediaItem {
  /** post_media id — enables "share photo" (with the KChat tag) for post photos */
  id?: string;
  url: string;
  media_type: 'image' | 'video';
}

export interface PostContext {
  post: Post;
  isLiked: boolean;
  likeCount: number;
  isBookmarked: boolean;
  repostCount: number;
  commentCount: number;
  onLike: () => void;
  onRepost: () => void;
  onBookmark: () => void;
  onReply: () => void;
  onShare: () => void;
}

export interface MediaViewerModalProps {
  visible: boolean;
  onClose: () => void;
  media: MediaItem[];
  initialIndex?: number;
  caption?: string;
  postContext?: PostContext;
}

const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : String(n));
const SPRING = { damping: 32, stiffness: 240, mass: 0.9, overshootClamping: true };
const MAX_ZOOM = 5;

// ---- Zoomable photo ------------------------------------------------------------
function ZoomableImage({ uri, active, onZoomChange, onTap, pageW: SCREEN_W, pageH: SCREEN_H }: {
  uri: string; active: boolean; onZoomChange: (zoomed: boolean) => void; onTap: () => void; pageW: number; pageH: number;
}) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);
  const shown = useSharedValue(0);
  const [zoomed, setZoomed] = useState(false);
  const [loading, setLoading] = useState(true);

  const reportZoom = useCallback((z: boolean) => { setZoomed(z); onZoomChange(z); }, [onZoomChange]);

  // Leaving this page resets the zoom
  useEffect(() => {
    if (!active && zoomed) {
      scale.value = 1; tx.value = 0; ty.value = 0; savedScale.value = 1;
      reportZoom(false);
    }
  }, [active]);

  const clampXY = (s: number) => {
    'worklet';
    const maxX = Math.max(0, (SCREEN_W * s - SCREEN_W) / 2);
    const maxY = Math.max(0, (SCREEN_H * s - SCREEN_H) / 2);
    tx.value = Math.min(maxX, Math.max(-maxX, tx.value));
    ty.value = Math.min(maxY, Math.max(-maxY, ty.value));
  };

  const pinch = Gesture.Pinch()
    .onStart(() => { savedScale.value = scale.value; })
    .onUpdate(e => { scale.value = Math.min(MAX_ZOOM, Math.max(0.85, savedScale.value * e.scale)); })
    .onEnd(() => {
      if (scale.value <= 1.02) {
        scale.value = withSpring(1, SPRING);
        tx.value = withSpring(0, SPRING);
        ty.value = withSpring(0, SPRING);
        runOnJS(reportZoom)(false);
      } else {
        clampXY(scale.value);
        runOnJS(reportZoom)(true);
      }
    });

  const panZoomed = Gesture.Pan()
    .enabled(zoomed)
    .maxPointers(1)
    .onStart(() => { savedTx.value = tx.value; savedTy.value = ty.value; })
    .onUpdate(e => {
      tx.value = savedTx.value + e.translationX;
      ty.value = savedTy.value + e.translationY;
    })
    .onEnd(e => {
      const maxX = Math.max(0, (SCREEN_W * scale.value - SCREEN_W) / 2);
      const maxY = Math.max(0, (SCREEN_H * scale.value - SCREEN_H) / 2);
      tx.value = withSpring(Math.min(maxX, Math.max(-maxX, tx.value + e.velocityX * 0.08)), SPRING);
      ty.value = withSpring(Math.min(maxY, Math.max(-maxY, ty.value + e.velocityY * 0.08)), SPRING);
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(250)
    .onEnd(e => {
      if (scale.value > 1.02) {
        scale.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
        tx.value = withTiming(0, { duration: 220 });
        ty.value = withTiming(0, { duration: 220 });
        runOnJS(reportZoom)(false);
      } else {
        const s = 2.5;
        // Zoom towards where you tapped
        const maxX = (SCREEN_W * s - SCREEN_W) / 2;
        const maxY = (SCREEN_H * s - SCREEN_H) / 2;
        const toX = Math.min(maxX, Math.max(-maxX, (SCREEN_W / 2 - e.x) * (s - 1)));
        const toY = Math.min(maxY, Math.max(-maxY, (SCREEN_H / 2 - e.y) * (s - 1)));
        scale.value = withTiming(s, { duration: 240, easing: Easing.out(Easing.cubic) });
        tx.value = withTiming(toX, { duration: 240 });
        ty.value = withTiming(toY, { duration: 240 });
        runOnJS(reportZoom)(true);
      }
    });

  const singleTap = Gesture.Tap().onEnd(() => { runOnJS(onTap)(); });

  const gesture = Gesture.Simultaneous(pinch, panZoomed, Gesture.Exclusive(doubleTap, singleTap));

  const imgStyle = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View style={[styles.page, { width: SCREEN_W, height: SCREEN_H }]} collapsable={false}>
        <Reanimated.Image
          source={{ uri }}
          style={[StyleSheet.absoluteFill, imgStyle]}
          resizeMode="contain"
          onLoad={() => { setLoading(false); shown.value = withTiming(1, { duration: 180 }); }}
          onError={() => setLoading(false)}
        />
        {loading && <ActivityIndicator style={StyleSheet.absoluteFill} color="#fff" />}
      </View>
    </GestureDetector>
  );
}

// ---- Video page ----------------------------------------------------------------
// Plays with sound when it is the current page, continues from where the feed was,
// tap to pause/play, thin seekable progress bar. No native controls so swipes reach the viewer.
function VideoPage({ url, active, bottomInset, pageW, pageH }: { url: string; active: boolean; bottomInset: number; pageW: number; pageH: number }) {
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [muted, setMutedState] = useState(false);
  const barWidth = useRef(pageW - 32);

  const player = useVideoPlayer(url, p => {
    p.loop = true;
    p.muted = false;
    p.timeUpdateEventInterval = 0.25;
    const start = getPosition(url);
    if (start > 0) p.currentTime = start;
  });

  useEffect(() => {
    const subs = [
      player.addListener('statusChange', ({ status }) => setLoading(status === 'loading')),
      player.addListener('timeUpdate', ({ currentTime }) => {
        setPosition(url, currentTime);
        if (player.duration > 0) setProgress(currentTime / player.duration);
      }),
    ];
    return () => subs.forEach(s => s.remove());
  }, [player]);

  useEffect(() => {
    if (active && !paused) player.play(); else player.pause();
  }, [active, paused, player]);

  useEffect(() => () => { try { setPosition(url, player.currentTime); } catch {} }, [player]);

  const seek = (x: number) => {
    if (player.duration > 0) {
      const t = Math.min(Math.max(x / barWidth.current, 0), 1) * player.duration;
      player.currentTime = t;
      setProgress(t / player.duration);
    }
  };

  return (
    <View style={[styles.page, { width: pageW, height: pageH }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => setPaused(p => !p)}>
        <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} allowsFullscreen={false} />
        {(paused || loading) && (
          <View style={styles.centerOverlay} pointerEvents="none">
            {loading && !paused ? (
              <ActivityIndicator size="large" color="#fff" />
            ) : (
              <View style={styles.bigPlay}>
                <Ionicons name="play" size={34} color="#fff" style={{ marginLeft: 4 }} />
              </View>
            )}
          </View>
        )}
      </Pressable>

      <TouchableOpacity
        style={[styles.roundBtn, styles.muteBtn]}
        onPress={() => { const m = !muted; setMutedState(m); player.muted = m; }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityLabel={muted ? 'Unmute' : 'Mute'}
      >
        <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={20} color="#fff" />
      </TouchableOpacity>

      <Pressable
        style={[styles.progressHit, { bottom: bottomInset + 2 }]}
        onLayout={e => { barWidth.current = e.nativeEvent.layout.width; }}
        onPress={e => seek(e.nativeEvent.locationX)}
      >
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      </Pressable>
    </View>
  );
}

// ---- Viewer --------------------------------------------------------------------
export function MediaViewerModal({ visible, onClose, media, initialIndex = 0, caption, postContext }: MediaViewerModalProps) {
  const insets = useSafeAreaInsets();
  const win = useWindowDimensions();
  const [box, setBox] = useState({ w: WIN.width, h: WIN.height });
  const SCREEN_W = box.w || win.width;
  const SCREEN_H = box.h || win.height;
  const bottomInset = Math.max(insets.bottom, 8); // Android can report 0 with 3-button nav
  const narrow = SCREEN_W < 360;
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  // Share the photo itself, tagged "KChat · @author" (TikTok-style watermark: every reshare points back here)
  const watermark = usePrefs(s => s.features.watermark_shares);
  const [sharingPhoto, setSharingPhoto] = useState(false);
  const current = media[currentIndex];
  const canSharePhoto = watermark && !!current?.id && current.media_type === 'image';
  const sharePhoto = async () => {
    if (!current?.id || sharingPhoto) return;
    setSharingPhoto(true);
    try {
      const r: any = await apiClient.getShareImage(current.id);
      await shareImageFile(r?.success && r.data?.url ? r.data.url : current.url);
    } finally { setSharingPhoto(false); }
  };
  const [captionOpen, setCaptionOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [chromeOn, setChromeOn] = useState(true);
  const scrollRef = useRef<any>(null);

  const dragY = useSharedValue(0);   // finger drag (swipe to close)
  const open = useSharedValue(0);    // 0 → 1 open animation
  const chrome = useSharedValue(1);  // caption/buttons visibility

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const finishClose = useCallback(() => { onCloseRef.current(); }, []);

  const close = useCallback((dir: 1 | -1 = 1) => {
    dragY.value = withTiming(dir * SCREEN_H * 0.6, { duration: 200, easing: Easing.in(Easing.quad) });
    open.value = withTiming(0, { duration: 200 }, finished => { if (finished) runOnJS(finishClose)(); });
  }, []);

  useEffect(() => {
    if (visible) {
      dragY.value = 0;
      chrome.value = 1;
      open.value = 0;
      open.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) });
      setCurrentIndex(initialIndex);
      setCaptionOpen(false);
      setZoomed(false);
      setChromeOn(true);
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ x: initialIndex * SCREEN_W, animated: false }));
    }
    setFeedPaused('viewer', visible);
    return () => setFeedPaused('viewer', false);
  }, [visible, initialIndex]);

  const toggleChrome = useCallback(() => {
    setChromeOn(c => {
      chrome.value = withTiming(c ? 0 : 1, { duration: 160 });
      return !c;
    });
  }, []);

  // Swipe up/down to close — one finger, clearly vertical, not while zoomed
  const dismissPan = Gesture.Pan()
    .enabled(!zoomed)
    .maxPointers(1)
    .activeOffsetY([-12, 12])
    .failOffsetX([-18, 18])
    .onUpdate(e => { dragY.value = e.translationY; })
    .onEnd(e => {
      const far = Math.abs(e.translationY) > 120;
      const fast = Math.abs(e.velocityY) > 900;
      if (far || fast) {
        const dir = (fast ? e.velocityY : e.translationY) > 0 ? 1 : -1;
        dragY.value = withTiming(dir * SCREEN_H, { duration: 220, easing: Easing.out(Easing.quad) });
        open.value = withTiming(0, { duration: 220 }, finished => { if (finished) runOnJS(finishClose)(); });
      } else {
        dragY.value = withSpring(0, { ...SPRING, velocity: e.velocityY });
      }
    });

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: open.value * interpolate(Math.abs(dragY.value), [0, SCREEN_H * 0.5], [1, 0.15], Extrapolation.CLAMP),
  }));
  const contentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(open.value, [0, 1], [0, 1]),
    transform: [
      { translateY: dragY.value },
      { scale: interpolate(Math.abs(dragY.value), [0, SCREEN_H], [1, 0.82], Extrapolation.CLAMP) * interpolate(open.value, [0, 1], [0.96, 1]) },
    ],
  }));
  const chromeStyle = useAnimatedStyle(() => ({
    opacity: open.value * chrome.value * interpolate(Math.abs(dragY.value), [0, 140], [1, 0], Extrapolation.CLAMP),
  }));

  if (!media.length) return null;

  const author = postContext?.post.profiles;
  const showBottom = !!(caption || postContext);
  const progressSpace = media.some(m => m.media_type === 'video') ? 14 : 0;

  return (
    <Modal visible={visible} animationType="none" onRequestClose={() => close(1)} statusBarTranslucent transparent>
      <GestureHandlerRootView
        style={{ flex: 1 }}
        onLayout={e => {
          const { width, height } = e.nativeEvent.layout;
          if (width > 0 && height > 0 && (Math.abs(width - box.w) > 1 || Math.abs(height - box.h) > 1)) setBox({ w: width, h: height });
        }}
      >
        <Reanimated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]} />

        <GestureDetector gesture={dismissPan}>
          <Reanimated.View style={[styles.container, contentStyle]}>
            <GHScrollView
              ref={scrollRef}
              horizontal
              pagingEnabled
              scrollEnabled={!zoomed}
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e: any) => setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))}
              style={StyleSheet.absoluteFill}
            >
              {media.map((item, index) =>
                item.media_type === 'video' ? (
                  visible && Math.abs(index - currentIndex) <= 1 ? (
                    <VideoPage key={`${item.url}_${index}`} url={item.url} active={index === currentIndex} bottomInset={bottomInset} pageW={SCREEN_W} pageH={SCREEN_H} />
                  ) : (
                    <View key={`${item.url}_${index}`} style={[styles.page, { width: SCREEN_W, height: SCREEN_H }]} />
                  )
                ) : (
                  <ZoomableImage
                    key={`${item.url}_${index}`}
                    uri={item.url}
                    active={index === currentIndex}
                    onZoomChange={setZoomed}
                    onTap={toggleChrome}
                    pageW={SCREEN_W}
                    pageH={SCREEN_H}
                  />
                ),
              )}
            </GHScrollView>
          </Reanimated.View>
        </GestureDetector>

        {/* Bottom overlay: soft gradient so the media stays visible */}
        {showBottom && (
          <Reanimated.View style={[styles.bottom, chromeStyle]} pointerEvents={chromeOn ? 'box-none' : 'none'}>
            <LinearGradient
              colors={['rgba(0,0,0,0)', captionOpen ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.7)']}
              locations={[0, 0.45, 1]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <View style={[styles.bottomInner, { paddingBottom: bottomInset + progressSpace + 10 }]} pointerEvents="box-none">
              {author && (
                <View style={styles.authorRow}>
                  <UserAvatar avatarUrl={author.avatar_url} size={30} isVerified={author.is_verified} />
                  <Text style={styles.authorName} numberOfLines={1} maxFontSizeMultiplier={1.3}>{author.full_name || author.username}</Text>
                  {author.is_verified && <VerifiedBadge size={14} />}
                </View>
              )}
              {caption ? (
                captionOpen ? (
                  // Expanded caption is capped (568pt screen: 0.38*568 = 216pt) and scrolls, so it never
                  // grows up under the close button.
                  <ScrollView style={{ maxHeight: Math.round(SCREEN_H * 0.38) }} showsVerticalScrollIndicator={false}>
                    <Pressable onPress={() => setCaptionOpen(false)} hitSlop={6}>
                      <Text style={styles.caption}>{caption}</Text>
                    </Pressable>
                  </ScrollView>
                ) : (
                  <Pressable onPress={() => setCaptionOpen(true)} hitSlop={6}>
                    <Text style={styles.caption} numberOfLines={2}>{caption}</Text>
                    {caption.length > 90 && <Text style={styles.more}>more</Text>}
                  </Pressable>
                )
              ) : null}
              {postContext && (
                <View style={[styles.actions, narrow && { gap: 16 }]}>
                  <TouchableOpacity style={styles.action} onPress={() => { close(1); setTimeout(postContext.onReply, 220); }} accessibilityLabel="Reply">
                    <Ionicons name="chatbubble-outline" size={22} color="#fff" />
                    {postContext.commentCount > 0 && <Text style={styles.actionCount} maxFontSizeMultiplier={1.2}>{compact(postContext.commentCount)}</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.action} onPress={postContext.onRepost} accessibilityLabel="Repost">
                    <Ionicons name="repeat" size={23} color="#fff" />
                    {postContext.repostCount > 0 && <Text style={styles.actionCount} maxFontSizeMultiplier={1.2}>{compact(postContext.repostCount)}</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.action} onPress={postContext.onLike} accessibilityLabel={postContext.isLiked ? 'Unlike' : 'Like'}>
                    <Ionicons name={postContext.isLiked ? 'heart' : 'heart-outline'} size={23} color={postContext.isLiked ? '#FF3040' : '#fff'} />
                    {postContext.likeCount > 0 && (
                      <Text style={[styles.actionCount, postContext.isLiked && styles.likedCount]} maxFontSizeMultiplier={1.2}>{compact(postContext.likeCount)}</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.action} onPress={postContext.onBookmark} accessibilityLabel="Bookmark">
                    <Ionicons name={postContext.isBookmarked ? 'bookmark' : 'bookmark-outline'} size={21} color={postContext.isBookmarked ? '#5CB85C' : '#fff'} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.action, { marginLeft: 'auto' }]} onPress={postContext.onShare} accessibilityLabel="Share">
                    <Ionicons name="paper-plane-outline" size={21} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </Reanimated.View>
        )}

        {/* Top bar */}
        <Reanimated.View style={[styles.topBar, { paddingTop: insets.top + 8 }, chromeStyle]} pointerEvents={chromeOn ? 'box-none' : 'none'}>
          <TouchableOpacity style={styles.roundBtn} onPress={() => close(1)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityLabel="Close">
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          {media.length > 1 && <Text style={styles.counter} maxFontSizeMultiplier={1.2}>{currentIndex + 1} / {media.length}</Text>}
          {canSharePhoto ? (
            <TouchableOpacity style={styles.roundBtn} onPress={sharePhoto} disabled={sharingPhoto} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityLabel="Share photo">
              {sharingPhoto ? <ActivityIndicator color="#fff" /> : <Ionicons name="share-outline" size={22} color="#fff" />}
            </TouchableOpacity>
          ) : media.length > 1 ? <View style={{ width: 44 }} /> : null}
        </Reanimated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const textShadow = { textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 };

const styles = StyleSheet.create({
  backdrop: { backgroundColor: '#000' },
  container: { flex: 1 },
  page: { overflow: 'hidden' },
  centerOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  bigPlay: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  roundBtn: { backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 22, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  muteBtn: { position: 'absolute', right: 16, top: '50%', marginTop: -22 },
  progressHit: { position: 'absolute', left: 16, right: 16, height: 18, justifyContent: 'center', zIndex: 5 },
  progressTrack: { height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' },
  progressFill: { height: 3, backgroundColor: '#fff' },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16 },
  counter: { color: '#fff', fontSize: 15, fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, overflow: 'hidden' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  bottomInner: { paddingHorizontal: 16, paddingTop: 48 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  authorName: { color: '#fff', fontSize: 15, fontWeight: '700', flexShrink: 1, ...textShadow },
  caption: { color: '#fff', fontSize: 15, lineHeight: 21, ...textShadow },
  more: { color: 'rgba(255,255,255,0.75)', fontSize: 13.5, fontWeight: '600', marginTop: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 22, marginTop: 14 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 40 },
  actionCount: { color: '#fff', fontSize: 14, fontWeight: '600', ...textShadow },
  likedCount: { color: '#FF3040' },
});
