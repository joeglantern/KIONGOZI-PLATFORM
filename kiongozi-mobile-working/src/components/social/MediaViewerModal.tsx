import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Post } from '../../stores/socialStore';
import { UserAvatar } from './UserAvatar';
import { VerifiedBadge } from './VerifiedBadge';
import { getPosition, setPosition, setFeedPaused } from './videoPlayback';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export interface MediaItem {
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

// ---- Video page --------------------------------------------------------------
// Plays with sound when it is the current page, continues from where the feed was,
// tap to pause/play, thin seekable progress bar. No native controls so swipes reach the modal.
function VideoPage({ url, active, bottomInset }: { url: string; active: boolean; bottomInset: number }) {
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [muted, setMutedState] = useState(false);
  const barWidth = useRef(SCREEN_W - 32);

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

  // Leaving the viewer: keep the feed muted again (sound is a viewer thing) and remember position.
  useEffect(() => () => { try { setPosition(url, player.currentTime); } catch {} }, [player]);

  const seek = (x: number) => {
    if (player.duration > 0) {
      const t = Math.min(Math.max(x / barWidth.current, 0), 1) * player.duration;
      player.currentTime = t;
      setProgress(t / player.duration);
    }
  };

  return (
    <View style={styles.page}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => setPaused(p => !p)}>
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          nativeControls={false}
          allowsFullscreen={false}
        />
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
      >
        <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={20} color="#fff" />
      </TouchableOpacity>

      {/* Progress bar, sits at the very bottom under the caption overlay */}
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

// ---- Viewer -------------------------------------------------------------------
export function MediaViewerModal({
  visible,
  onClose,
  media,
  initialIndex = 0,
  caption,
  postContext,
}: MediaViewerModalProps) {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [captionOpen, setCaptionOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Swipe up or down anywhere to dismiss.
  const translateY = useRef(new Animated.Value(0)).current;
  const fade = translateY.interpolate({
    inputRange: [-SCREEN_H * 0.4, 0, SCREEN_H * 0.4],
    outputRange: [0, 1, 0],
    extrapolate: 'clamp',
  });
  const scale = translateY.interpolate({
    inputRange: [-SCREEN_H, 0, SCREEN_H],
    outputRange: [0.85, 1, 0.85],
    extrapolate: 'clamp',
  });

  const dismiss = useCallback((dir: 1 | -1 = 1) => {
    Animated.timing(translateY, {
      toValue: dir * SCREEN_H,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onClose();
      translateY.setValue(0);
    });
  }, [onClose, translateY]);

  const pan = useRef(
    PanResponder.create({
      // Claim clearly vertical drags before the horizontal pager or taps get them.
      onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dy) > 12 && Math.abs(g.dy) > Math.abs(g.dx) * 1.4,
      onPanResponderMove: (_, g) => translateY.setValue(g.dy),
      onPanResponderRelease: (_, g) => {
        if (Math.abs(g.dy) > 110 || Math.abs(g.vy) > 1.1) {
          dismissRef.current(g.dy > 0 ? 1 : -1);
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 16, stiffness: 160 }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;
  const dismissRef = useRef(dismiss);
  dismissRef.current = dismiss;

  useEffect(() => {
    if (visible) {
      translateY.setValue(0);
      setCurrentIndex(initialIndex);
      setCaptionOpen(false);
      setTimeout(() => {
        scrollRef.current?.scrollTo({ x: initialIndex * SCREEN_W, animated: false });
      }, 0);
    }
    // Pause feed videos underneath while the viewer is open.
    setFeedPaused('viewer', visible);
    return () => setFeedPaused('viewer', false);
  }, [visible, initialIndex]);

  const handleScroll = useCallback((event: any) => {
    const idx = Math.round(event.nativeEvent.contentOffset.x / SCREEN_W);
    setCurrentIndex(idx);
  }, []);

  if (!media.length) return null;

  const author = postContext?.post.profiles;
  const showBottom = !!(caption || postContext);
  const progressSpace = media.some(m => m.media_type === 'video') ? 14 : 0;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={() => dismiss(1)}
      statusBarTranslucent
      transparent
    >
      <Animated.View style={[StyleSheet.absoluteFillObject, styles.backdrop, { opacity: fade }]} />

      <Animated.View
        style={[styles.container, { transform: [{ translateY }, { scale }] }]}
        {...pan.panHandlers}
      >
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          scrollEventThrottle={16}
          style={StyleSheet.absoluteFill}
        >
          {media.map((item, index) =>
            item.media_type === 'video' ? (
              visible ? (
                <VideoPage
                  key={`${item.url}_${index}`}
                  url={item.url}
                  active={index === currentIndex}
                  bottomInset={insets.bottom}
                />
              ) : (
                <View key={`${item.url}_${index}`} style={styles.page} />
              )
            ) : (
              <View key={`${item.url}_${index}`} style={styles.page}>
                <Image source={{ uri: item.url }} style={StyleSheet.absoluteFill} resizeMode="contain" />
              </View>
            )
          )}
        </ScrollView>

        {/* Bottom overlay: soft gradient instead of a solid box, so the video stays visible */}
        {showBottom && (
          <Animated.View style={[styles.bottom, { opacity: fade }]} pointerEvents="box-none">
            <LinearGradient
              colors={['rgba(0,0,0,0)', captionOpen ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.7)']}
              locations={[0, 0.45, 1]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <View style={[styles.bottomInner, { paddingBottom: insets.bottom + progressSpace + 10 }]} pointerEvents="box-none">
              {author && (
                <View style={styles.authorRow}>
                  <UserAvatar avatarUrl={author.avatar_url} size={30} isVerified={author.is_verified} />
                  <Text style={styles.authorName} numberOfLines={1}>{author.full_name || author.username}</Text>
                  {author.is_verified && <VerifiedBadge size={14} />}
                </View>
              )}
              {caption ? (
                <Pressable onPress={() => setCaptionOpen(o => !o)} hitSlop={6}>
                  <Text style={styles.caption} numberOfLines={captionOpen ? undefined : 2}>
                    {caption}
                  </Text>
                  {!captionOpen && caption.length > 90 && <Text style={styles.more}>more</Text>}
                </Pressable>
              ) : null}
              {postContext && (
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.action} onPress={() => { dismiss(1); setTimeout(postContext.onReply, 220); }}>
                    <Ionicons name="chatbubble-outline" size={22} color="#fff" />
                    {postContext.commentCount > 0 && <Text style={styles.actionCount}>{compact(postContext.commentCount)}</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.action} onPress={postContext.onRepost}>
                    <Ionicons name="repeat-outline" size={22} color="#fff" />
                    {postContext.repostCount > 0 && <Text style={styles.actionCount}>{compact(postContext.repostCount)}</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.action} onPress={postContext.onLike}>
                    <Ionicons
                      name={postContext.isLiked ? 'heart' : 'heart-outline'}
                      size={22}
                      color={postContext.isLiked ? '#fc8181' : '#fff'}
                    />
                    {postContext.likeCount > 0 && (
                      <Text style={[styles.actionCount, postContext.isLiked && styles.likedCount]}>
                        {compact(postContext.likeCount)}
                      </Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.action} onPress={postContext.onBookmark}>
                    <Ionicons
                      name={postContext.isBookmarked ? 'bookmark' : 'bookmark-outline'}
                      size={21}
                      color={postContext.isBookmarked ? '#90cdf4' : '#fff'}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.action, { marginLeft: 'auto' }]} onPress={postContext.onShare}>
                    <Ionicons name="share-outline" size={21} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </Animated.View>
        )}

        {/* Top bar */}
        <Animated.View style={[styles.topBar, { paddingTop: insets.top + 8, opacity: fade }]} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.roundBtn}
            onPress={() => dismiss(1)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          {media.length > 1 && (
            <Text style={styles.counter}>{currentIndex + 1} / {media.length}</Text>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const textShadow = { textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 };

const styles = StyleSheet.create({
  backdrop: { backgroundColor: '#000' },
  container: { flex: 1, backgroundColor: '#000' },
  page: { width: SCREEN_W, height: SCREEN_H, backgroundColor: '#000' },
  centerOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  bigPlay: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  roundBtn: { backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 20, padding: 8 },
  muteBtn: { position: 'absolute', right: 16, top: '50%', marginTop: -20 },
  progressHit: { position: 'absolute', left: 16, right: 16, height: 18, justifyContent: 'center', zIndex: 5 },
  progressTrack: { height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' },
  progressFill: { height: 3, backgroundColor: '#fff' },
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16,
  },
  counter: {
    color: '#fff', fontSize: 15, fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, overflow: 'hidden',
  },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  bottomInner: { paddingHorizontal: 16, paddingTop: 48 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  authorName: { color: '#fff', fontSize: 15, fontWeight: '700', flexShrink: 1, ...textShadow },
  caption: { color: '#fff', fontSize: 14.5, lineHeight: 20, ...textShadow },
  more: { color: 'rgba(255,255,255,0.75)', fontSize: 13.5, fontWeight: '600', marginTop: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 26, marginTop: 14 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionCount: { color: '#fff', fontSize: 13.5, fontWeight: '600', ...textShadow },
  likedCount: { color: '#fc8181' },
});
