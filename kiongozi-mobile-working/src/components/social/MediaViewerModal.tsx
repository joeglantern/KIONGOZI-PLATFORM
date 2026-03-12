import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Post } from '../../stores/socialStore';

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

function VideoPage({ url }: { url: string }) {
  const player = useVideoPlayer(url, p => { p.pause(); });
  return (
    <View style={{ width: SCREEN_W, height: SCREEN_H, backgroundColor: '#000' }}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        nativeControls
        allowsFullscreen
      />
    </View>
  );
}

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
  const scrollRef = useRef<ScrollView>(null);

  // Swipe-to-dismiss — translateY only (no Reanimated, Expo Go safe)
  const translateY = useRef(new Animated.Value(0)).current;
  const backdropOpacity = translateY.interpolate({
    inputRange: [0, SCREEN_H * 0.45],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const dismissWithAnimation = useCallback(() => {
    Animated.timing(translateY, {
      toValue: SCREEN_H,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      onClose();
      translateY.setValue(0);
    });
  }, [onClose, translateY]);

  // Separate PanResponder that lives on a thin drag-strip above the image.
  // This strip has no ScrollView competing for the gesture.
  const dragResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) translateY.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 90 || gs.vy > 1.2) {
          dismissWithAnimation();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 15,
            stiffness: 150,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      translateY.setValue(0);
      setCurrentIndex(initialIndex);
      setTimeout(() => {
        scrollRef.current?.scrollTo({ x: initialIndex * SCREEN_W, animated: false });
      }, 0);
    }
  }, [visible, initialIndex]);

  const handleScroll = useCallback((event: any) => {
    const idx = Math.round(event.nativeEvent.contentOffset.x / SCREEN_W);
    setCurrentIndex(idx);
  }, []);

  if (!media.length) return null;

  const showBottomBar = !!(caption || postContext);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={dismissWithAnimation}
      statusBarTranslucent
      transparent
    >
      {/* Backdrop dims as you pull down */}
      <Animated.View style={[StyleSheet.absoluteFillObject, styles.backdrop, { opacity: backdropOpacity }]} />

      <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
        {/* Drag handle strip — owns the vertical pan gesture exclusively */}
        <View
          style={[styles.dragStrip, { paddingTop: insets.top }]}
          {...dragResponder.panHandlers}
        >
          <View style={styles.dragPill} />
        </View>

        {/* Horizontal image pager */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          scrollEventThrottle={16}
          style={styles.scroll}
        >
          {media.map((item, index) =>
            item.media_type === 'video' ? (
              <VideoPage key={`${item.url}_${index}`} url={item.url} />
            ) : (
              <View key={`${item.url}_${index}`} style={styles.page}>
                <Image
                  source={{ uri: item.url }}
                  style={StyleSheet.absoluteFill}
                  resizeMode="contain"
                />
              </View>
            )
          )}
        </ScrollView>

        {/* Bottom bar */}
        {showBottomBar && (
          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
            {caption ? (
              <Text style={styles.caption} numberOfLines={4}>{caption}</Text>
            ) : null}
            {postContext && (
              <View style={styles.actions}>
                <TouchableOpacity style={styles.action} onPress={postContext.onReply}>
                  <Ionicons name="chatbubble-outline" size={20} color="#fff" />
                  {postContext.commentCount > 0 && (
                    <Text style={styles.actionCount}>{postContext.commentCount}</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.action} onPress={postContext.onRepost}>
                  <Ionicons name="repeat-outline" size={20} color="#fff" />
                  {postContext.repostCount > 0 && (
                    <Text style={styles.actionCount}>{postContext.repostCount}</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.action} onPress={postContext.onLike}>
                  <Ionicons
                    name={postContext.isLiked ? 'heart' : 'heart-outline'}
                    size={20}
                    color={postContext.isLiked ? '#fc8181' : '#fff'}
                  />
                  {postContext.likeCount > 0 && (
                    <Text style={[styles.actionCount, postContext.isLiked && styles.likedCount]}>
                      {postContext.likeCount}
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.action} onPress={postContext.onBookmark}>
                  <Ionicons
                    name={postContext.isBookmarked ? 'bookmark' : 'bookmark-outline'}
                    size={20}
                    color={postContext.isBookmarked ? '#90cdf4' : '#fff'}
                  />
                </TouchableOpacity>
                <TouchableOpacity style={styles.action} onPress={postContext.onShare}>
                  <Ionicons name="share-outline" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Overlay — pointerEvents="box-none" so ScrollView still scrolls */}
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {/* Close button */}
          <View
            style={[styles.topBar, { paddingTop: insets.top + 8 }]}
            pointerEvents="box-none"
          >
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={dismissWithAnimation}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            {media.length > 1 && (
              <Text style={styles.counter}>{currentIndex + 1} / {media.length}</Text>
            )}
          </View>

          {/* Dot indicators */}
          {media.length > 1 && (
            <View
              style={[styles.dots, showBottomBar ? { bottom: 120 } : { bottom: 24 }]}
              pointerEvents="none"
            >
              {media.map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i === currentIndex ? styles.dotActive : styles.dotInactive]}
                />
              ))}
            </View>
          )}
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  dragStrip: {
    width: '100%',
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  dragPill: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  scroll: {
    flex: 1,
  },
  page: {
    width: SCREEN_W,
    backgroundColor: '#000',
    // height fills remaining space after drag strip and bottom bar
    height: SCREEN_H - 36,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  closeBtn: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    padding: 8,
  },
  counter: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  dots: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotActive: { backgroundColor: '#fff' },
  dotInactive: { backgroundColor: 'rgba(255,255,255,0.4)' },
  bottomBar: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  caption: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  actions: {
    flexDirection: 'row',
    gap: 24,
    paddingBottom: 4,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionCount: { color: '#fff', fontSize: 13 },
  likedCount: { color: '#fc8181' },
});
