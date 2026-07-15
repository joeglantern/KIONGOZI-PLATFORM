import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Pressable, StyleSheet, Image, Share, Animated, ActivityIndicator, Modal, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as Haptics from 'expo-haptics';
import { Post } from '../../stores/socialStore';
import { UserAvatar } from './UserAvatar';
import { HashtagHighlight } from './HashtagHighlight';
import { MediaViewerModal, MediaItem, PostContext } from './MediaViewerModal';
import QuotePostModal from './QuotePostModal';
import apiClient from '../../utils/apiClient';
import { useSocialStore } from '../../stores/socialStore';

// ─── Reusable action sheet — replaces all native Alert dialogs ───────────────

interface SheetItem {
  label: string;
  icon: string;
  color?: string;
  onPress: () => void;
}

function ActionSheet({
  visible,
  title,
  description,
  items,
  onClose,
}: {
  visible: boolean;
  title?: string;
  description?: string;
  items: SheetItem[];
  onClose: () => void;
}) {
  const T = useTheme();
  const sheetY = useRef(new Animated.Value(300)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      sheetY.setValue(300);
      backdropOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(sheetY, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 220 }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const close = useCallback(() => {
    Animated.parallel([
      Animated.timing(sheetY, { toValue: 300, duration: 180, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 160, useNativeDriver: true }),
    ]).start(() => onClose());
  }, [onClose]);

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" onRequestClose={close}>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <Animated.View style={[asSheet.backdrop, { opacity: backdropOpacity }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={close} activeOpacity={1} />
        </Animated.View>
        <Animated.View style={[asSheet.sheet, { backgroundColor: T.surface, transform: [{ translateY: sheetY }] }]}>
          <View style={[asSheet.handle, { backgroundColor: T.border }]} />
          {(title || description) && (
            <View style={asSheet.titleBlock}>
              {title && <Text style={[asSheet.title, { color: T.text }]}>{title}</Text>}
              {description && <Text style={[asSheet.desc, { color: T.textSub }]}>{description}</Text>}
            </View>
          )}
          {items.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={asSheet.item}
              onPress={() => { close(); setTimeout(() => item.onPress(), 220); }}
              activeOpacity={0.7}
            >
              <Ionicons name={item.icon as any} size={22} color={item.color ?? T.text} />
              <Text style={[asSheet.itemText, { color: item.color ?? T.text }]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
          <View style={[asSheet.divider, { backgroundColor: T.border }]} />
          <TouchableOpacity style={asSheet.item} onPress={close} activeOpacity={0.7}>
            <Ionicons name="close-outline" size={22} color={T.textSub} />
            <Text style={[asSheet.itemText, { color: T.textSub }]}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const asSheet = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.52)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingBottom: Platform.OS === 'ios' ? 36 : 18, paddingTop: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18, shadowRadius: 14, elevation: 24,
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  titleBlock: { paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(128,128,128,0.2)', marginBottom: 4 },
  title: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  desc: { fontSize: 13, lineHeight: 18 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 16 },
  itemText: { fontSize: 16, fontWeight: '500' },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16, marginVertical: 4 },
});

// ─── PostCard ─────────────────────────────────────────────────────────────────

interface PostCardProps {
  post: Post;
  hasConnectorBelow?: boolean;
  style?: any;
  onPress?: () => void;
  onProfilePress?: (username: string) => void;
  onReplyPress?: () => void;
  onMentionPress?: (username: string) => void;
  onHashtagPress?: (tag: string) => void;
  currentUserId?: string;
  onDeletePress?: () => void;
  onEditPress?: (postId: string, content: string, visibility: 'public' | 'followers') => void;
  onReportPress?: (postId: string) => void;
}

function SmartImage({ url, onPress }: { url: string; onPress: () => void }) {
  const T = useTheme();
  // Default 4:3 landscape while dimensions load — prevents zero-height container
  const [ratio, setRatio] = useState(1.33);

  useEffect(() => {
    Image.getSize(
      url,
      (w, h) => {
        if (w > 0 && h > 0) {
          // Clamp between 9:16 portrait (0.56) and 16:9 landscape (1.78)
          setRatio(Math.min(Math.max(w / h, 0.56), 1.78));
        }
      },
      () => {}
    );
  }, [url]);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={{
        width: '100%',
        aspectRatio: ratio,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: T.surface2,
        marginTop: 4,
      }}
    >
      <Image
        source={{ uri: url }}
        style={{ width: '100%', height: '100%' }}
        resizeMode="cover"
      />
    </TouchableOpacity>
  );
}

function VideoThumbnail({ url, style, isSingle, onPress }: { url: string; style?: any; isSingle?: boolean; onPress: () => void }) {
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [ratio, setRatio] = useState(1.33);
  const T = useTheme();

  useEffect(() => {
    VideoThumbnails.getThumbnailAsync(url, { time: 0 })
      .then(t => {
        setThumbnailUri(t.uri);
        if (isSingle && t.width && t.height) {
          setRatio(Math.min(Math.max(t.width / t.height, 0.56), 1.78));
        }
      })
      .catch(() => {});
  }, [url]);

  const containerStyle = isSingle
    ? { width: '100%' as const, aspectRatio: ratio, borderRadius: 12, overflow: 'hidden' as const, backgroundColor: T.surface, marginTop: 4 }
    : [{ overflow: 'hidden', backgroundColor: T.surface, borderRadius: 8 }, style];

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={containerStyle}>
      {thumbnailUri ? (
        <Image source={{ uri: thumbnailUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      ) : (
        <View style={{ flex: 1, backgroundColor: T.surface }} />
      )}
      <View style={StyleSheet.absoluteFillObject as any}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="play-circle" size={36} color="rgba(255,255,255,0.92)" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString();
}

export function PostCard({
  post,
  hasConnectorBelow = false,
  style,
  onPress,
  onProfilePress,
  onReplyPress,
  onMentionPress,
  onHashtagPress,
  currentUserId,
  onDeletePress,
  onEditPress,
  onReportPress,
}: PostCardProps) {
  const { toggleLike, toggleBookmark, toggleRepost, seedInteraction, postInteractions } = useSocialStore();
  const T = useTheme();
  const styles = useMemo(() => makeStyles(T), [T]);
  const repostScale = useRef(new Animated.Value(1)).current;
  const [repostSheetOpen, setRepostSheetOpen] = useState(false);
  const [optionsSheetOpen, setOptionsSheetOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Double-tap to like
  const lastTapRef = useRef(0);
  const tapPosRef = useRef({ x: 0, y: 0 });
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;
  const [heartVisible, setHeartVisible] = useState(false);

  // Quote post modal
  const [quoteVisible, setQuoteVisible] = useState(false);

  // Translation
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [translating, setTranslating] = useState(false);

  // Media viewer state
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  // Read more state
  const [isTruncated, setIsTruncated] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [measured, setMeasured] = useState(false);

  // Fall back to onProfilePress for @mention taps when no explicit handler is provided
  const handleMentionPress = useCallback((username: string) => {
    if (onMentionPress) {
      onMentionPress(username);
    } else if (onProfilePress) {
      onProfilePress(username);
    }
  }, [onMentionPress, onProfilePress]);

  // When this is a repost, all interactions target the ORIGINAL post
  const isRepost = !!(post.repost_of_id && post.repost_of);
  const activePost = isRepost ? post.repost_of! : post;
  const isReposted = activePost.isReposted ?? false;

  // Register the active (possibly original) post in the global interaction map
  useEffect(() => {
    seedInteraction(activePost.id, activePost.isLiked ?? false, activePost.like_count);
  }, [activePost.id]);

  // Always read from global map — reflects toggles from any screen
  const interaction = postInteractions[activePost.id];
  const isLiked = interaction?.isLiked ?? activePost.isLiked ?? false;
  const likeCount = interaction?.like_count ?? activePost.like_count;

  const handleLike = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleLike(activePost.id);
    try {
      await apiClient.likePost(activePost.id);
    } catch {
      toggleLike(activePost.id); // revert
    }
  }, [activePost.id, toggleLike]);

  const showHeartBurst = useCallback((x: number, y: number) => {
    tapPosRef.current = { x, y };
    setHeartVisible(true);
    heartScale.setValue(0);
    heartOpacity.setValue(1);
    Animated.parallel([
      Animated.spring(heartScale, { toValue: 1.4, useNativeDriver: true, damping: 6, stiffness: 200 }),
      Animated.sequence([
        Animated.delay(350),
        Animated.timing(heartOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
    ]).start(() => setHeartVisible(false));
  }, [heartScale, heartOpacity]);

  const handleTranslate = useCallback(async () => {
    if (showTranslation) { setShowTranslation(false); return; }
    if (translatedText) { setShowTranslation(true); return; }
    setTranslating(true);
    try {
      const res = await apiClient.translateText(activePost.content);
      if (res.success && res.data?.translated) {
        setTranslatedText(res.data.translated);
        setShowTranslation(true);
      }
    } finally { setTranslating(false); }
  }, [activePost.content, showTranslation, translatedText]);

  const doRepost = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.spring(repostScale, { toValue: 1.5, useNativeDriver: true, damping: 6, stiffness: 300 }),
      Animated.spring(repostScale, { toValue: 1, useNativeDriver: true, damping: 10, stiffness: 200 }),
    ]).start();
    toggleRepost(activePost.id, 1);
    try {
      const res = await apiClient.repostPost(activePost.id);
      if (!res.success) toggleRepost(activePost.id, -1);
    } catch { toggleRepost(activePost.id, -1); }
  }, [activePost.id, toggleRepost, repostScale]);

  const doUnrepost = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleRepost(activePost.id, -1);
    try {
      await apiClient.unrepostPost(activePost.id);
    } catch { toggleRepost(activePost.id, 1); }
  }, [activePost.id, toggleRepost]);

  const handleRepost = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRepostSheetOpen(true);
  }, []);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `${activePost.profiles?.full_name ?? ''}: ${activePost.content}`,
        url: `https://kiongozi.app/posts/${activePost.id}`,
      });
    } catch {}
  }, [activePost.id, activePost.content, activePost.profiles?.full_name]);

  const handleBookmark = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await toggleBookmark(activePost.id);
  }, [activePost.id, toggleBookmark]);

  const isOwnPost = !!(currentUserId && currentUserId === activePost.user_id);

  const handleOptions = useCallback(() => {
    setOptionsSheetOpen(true);
  }, []);

  // Build media items array for the viewer
  const mediaItems: MediaItem[] = (activePost.post_media ?? []).slice(0, 4).map(m => ({
    url: m.url,
    media_type: m.media_type,
  }));

  const openViewer = useCallback((index: number) => {
    setViewerIndex(index);
    setViewerVisible(true);
  }, []);

  const handleTextLayout = useCallback((e: any) => {
    if (!measured) {
      setMeasured(true);
      setIsTruncated(e.nativeEvent.lines.length > 4);
    }
  }, [measured]);

  const viewerPostContext: PostContext = {
    post: activePost,
    isLiked,
    likeCount,
    isBookmarked: activePost.isBookmarked ?? false,
    repostCount: activePost.repost_count,
    commentCount: activePost.comment_count,
    onLike: handleLike,
    onRepost: handleRepost,
    onBookmark: handleBookmark,
    onReply: onReplyPress ?? (() => {}),
    onShare: handleShare,
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.inner}>
        {/* Left column: avatar + optional connector line */}
        <View style={styles.leftCol}>
          <TouchableOpacity onPress={() => activePost.profiles?.username && onProfilePress?.(activePost.profiles.username)}>
            <UserAvatar
              avatarUrl={activePost.profiles?.avatar_url}
              size={44}
              isBot={activePost.profiles?.is_bot}
              isVerified={activePost.profiles?.is_verified}
            />
          </TouchableOpacity>
          {hasConnectorBelow && (
            <View style={styles.connectorLine} />
          )}
        </View>

        {/* Right column */}
        <View style={styles.right}>
          {/* "X reposted" banner */}
          {isRepost && (
            <TouchableOpacity
              style={styles.repostBanner}
              onPress={() => post.profiles?.username && onProfilePress?.(post.profiles.username)}
            >
              <Ionicons name="repeat-outline" size={13} color={T.textMuted} />
              <Text style={styles.repostBannerText}>{post.profiles?.full_name} reposted</Text>
            </TouchableOpacity>
          )}

          {/* Tappable content area */}
          <Pressable
            onPress={(e) => {
              const now = Date.now();
              if (now - lastTapRef.current < 280) {
                showHeartBurst(e.nativeEvent.locationX, e.nativeEvent.locationY);
                if (!isLiked) handleLike();
                lastTapRef.current = 0;
              } else {
                lastTapRef.current = now;
                onPress?.();
              }
            }}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => activePost.profiles?.username && onProfilePress?.(activePost.profiles.username)}>
                <Text style={styles.name}>{activePost.profiles?.full_name}</Text>
              </TouchableOpacity>
              {activePost.profiles?.username && (
                <Text style={styles.username}>@{activePost.profiles.username}</Text>
              )}
              <Text style={styles.dot}>·</Text>
              <Text style={styles.time}>{timeAgo(activePost.created_at)}</Text>
              {/* Options ⋯ lives in the header row, right-aligned */}
              {(isOwnPost ? (onDeletePress || onEditPress) : onReportPress) && (
                <TouchableOpacity style={styles.optionsBtn} onPress={handleOptions} hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}>
                  <Ionicons name="ellipsis-horizontal" size={16} color={T.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Content with Read more */}
            <HashtagHighlight
              content={activePost.content}
              style={styles.content}
              numberOfLines={measured && isTruncated && !expanded ? 4 : undefined}
              onTextLayout={!measured ? handleTextLayout : undefined}
              onMentionPress={handleMentionPress}
              onHashtagPress={onHashtagPress}
            />
            {isTruncated && !expanded && (
              <TouchableOpacity onPress={() => setExpanded(true)}>
                <Text style={styles.readMore}>Read more</Text>
              </TouchableOpacity>
            )}
            {isTruncated && expanded && (
              <TouchableOpacity onPress={() => setExpanded(false)}>
                <Text style={styles.readMore}>Show less</Text>
              </TouchableOpacity>
            )}

            {/* Translation */}
            {showTranslation && translatedText && (
              <Text style={styles.translatedText}>{translatedText}</Text>
            )}
            {translating
              ? <ActivityIndicator size="small" color="#3182ce" style={styles.translateSpinner} />
              : <TouchableOpacity onPress={handleTranslate} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <Text style={styles.translateLink}>
                    {showTranslation ? '· Show original' : '· Translate'}
                  </Text>
                </TouchableOpacity>
            }

            {/* Media */}
            {activePost.post_media && activePost.post_media.length > 0 && (
              activePost.post_media.length === 1 ? (
                <View style={{ marginTop: 6, marginBottom: 10 }}>
                  {activePost.post_media[0].media_type === 'video' ? (
                    <VideoThumbnail
                      url={activePost.post_media[0].url}
                      isSingle
                      style={styles.mediaImage}
                      onPress={() => openViewer(0)}
                    />
                  ) : (
                    <SmartImage url={activePost.post_media[0].url} onPress={() => openViewer(0)} />
                  )}
                </View>
              ) : (
                <PostMediaCarousel media={activePost.post_media} onOpenViewer={openViewer} />
              )
            )}
          </Pressable>

          {/* Actions — order and sizes match the design: comment · repost · like · bookmark · share (no ⋯ here — moved to header) */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.action} onPress={onReplyPress}>
              <Ionicons name="chatbubble-outline" size={19} color={T.textMuted} />
              {activePost.comment_count > 0 && <Text style={styles.actionCount}>{activePost.comment_count}</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.action} onPress={handleRepost}>
              <Animated.View style={{ transform: [{ scale: repostScale }] }}>
                <Ionicons
                  name={isReposted ? 'repeat' : 'repeat-outline'}
                  size={19}
                  color={isReposted ? T.accent : T.textMuted}
                />
              </Animated.View>
              <RepostStack reposters={activePost.recentReposters ?? []} count={activePost.repost_count} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.action} onPress={handleLike}>
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={19}
                color={isLiked ? '#e53e3e' : T.textMuted}
              />
              {likeCount > 0 && (
                <Text style={[styles.actionCount, isLiked && styles.likedCount]}>
                  {likeCount}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.action} onPress={handleBookmark}>
              <Ionicons
                name={activePost.isBookmarked ? 'bookmark' : 'bookmark-outline'}
                size={19}
                color={activePost.isBookmarked ? T.accent : T.textMuted}
              />
            </TouchableOpacity>

            {/* Share is pushed to the far right — matches the design's margin-left:auto */}
            <TouchableOpacity style={[styles.action, { marginLeft: 'auto' }]} onPress={handleShare}>
              <Ionicons name="share-outline" size={19} color={T.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Full-screen media viewer */}
      <MediaViewerModal
        visible={viewerVisible}
        onClose={() => setViewerVisible(false)}
        media={mediaItems}
        initialIndex={viewerIndex}
        caption={activePost.content}
        postContext={viewerPostContext}
      />

      {/* Quote post modal */}
      <QuotePostModal
        visible={quoteVisible}
        post={activePost}
        onClose={() => setQuoteVisible(false)}
        onPosted={() => { setQuoteVisible(false); toggleRepost(activePost.id, 1); }}
      />

      {/* Repost / Undo-repost sheet */}
      <ActionSheet
        visible={repostSheetOpen}
        onClose={() => setRepostSheetOpen(false)}
        items={isReposted ? [
          { label: 'Undo Repost', icon: 'repeat-outline', color: T.error, onPress: doUnrepost },
          { label: 'Quote Post',  icon: 'create-outline',  onPress: () => setQuoteVisible(true) },
        ] : [
          { label: 'Repost',     icon: 'repeat-outline',  onPress: doRepost },
          { label: 'Quote Post', icon: 'create-outline',  onPress: () => setQuoteVisible(true) },
        ]}
      />

      {/* Post options sheet */}
      <ActionSheet
        visible={optionsSheetOpen}
        onClose={() => setOptionsSheetOpen(false)}
        items={isOwnPost ? [
          ...(onEditPress ? [{ label: 'Edit Post',   icon: 'pencil-outline', onPress: () => onEditPress(activePost.id, activePost.content, activePost.visibility ?? 'public') }] : []),
          ...(onDeletePress ? [{ label: 'Delete Post', icon: 'trash-outline',  color: T.error, onPress: () => setDeleteConfirmOpen(true) }] : []),
        ] : [
          ...(onReportPress ? [{ label: 'Report Post', icon: 'flag-outline', color: T.error, onPress: () => onReportPress!(activePost.id) }] : []),
        ]}
      />

      {/* Delete confirmation sheet */}
      <ActionSheet
        visible={deleteConfirmOpen}
        title="Delete this post?"
        description="This can't be undone. The post will be removed for everyone."
        onClose={() => setDeleteConfirmOpen(false)}
        items={onDeletePress ? [
          { label: 'Delete', icon: 'trash-outline', color: T.error, onPress: onDeletePress },
        ] : []}
      />

      {/* Double-tap heart burst */}
      {heartVisible && (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            {
              left: tapPosRef.current.x - 40,
              top: tapPosRef.current.y - 40,
              width: 80,
              height: 80,
              transform: [{ scale: heartScale }],
              opacity: heartOpacity,
              alignItems: 'center',
              justifyContent: 'center',
            },
          ]}
        >
          <Ionicons name="heart" size={80} color="#e53e3e" />
        </Animated.View>
      )}
    </View>
  );
}

function makeStyles(T: ReturnType<typeof import('../../hooks/useTheme').useTheme>) {
  return StyleSheet.create({
    container: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: T.borderLight,
      backgroundColor: T.bg,
    },
    inner: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingTop: 12,
    },
    leftCol: {
      alignItems: 'center',
      width: 44,
      marginRight: 10,
    },
    connectorLine: {
      flex: 1,
      width: 2,
      backgroundColor: T.border,
      marginTop: 6,
      minHeight: 20,
    },
    right: {
      flex: 1,
    },
    repostBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 4,
    },
    repostBannerText: {
      fontSize: 12,
      color: T.textMuted,
      fontWeight: '500',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 4,
    },
    optionsBtn: {
      marginLeft: 'auto' as any,
      padding: 2,
    },
    name: {
      fontWeight: '700',
      fontSize: 15,
      color: T.text,
      flexShrink: 1,
    },
    username: {
      fontSize: 14,
      color: T.textSub,
    },
    dot: {
      color: T.textMuted,
      fontSize: 14,
    },
    time: {
      fontSize: 14,
      color: T.textMuted,
    },
    content: {
      fontSize: 15,
      color: T.text,
      lineHeight: 22,
      marginBottom: 4,
    },
    readMore: {
      fontSize: 14,
      color: T.accent,
      fontWeight: '500',
      marginBottom: 8,
    },
    mediaContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 4,
      marginTop: 6,
      marginBottom: 10,
      borderRadius: 12,
      overflow: 'hidden',
    },
    mediaImage: {
      borderRadius: 10,
      backgroundColor: T.surface2,
      overflow: 'hidden',
    },
    gridImage: {
      width: '48%',
      height: 140,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 26,
      marginTop: 8,
      paddingBottom: 12,
    },
    action: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    actionCount: {
      fontSize: 13,
      color: T.textMuted,
    },
    likedCount: {
      color: '#e53e3e',
    },
    repostStack: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    repostAvatarWrap: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: T.bg, overflow: 'hidden' },
    repostAvatarImg: { width: 16, height: 16 },
    translateLink: { fontSize: 12, color: T.accent, marginTop: 2, marginBottom: 4 },
    translatedText: { fontSize: 15, color: T.textSub, lineHeight: 22, marginTop: 4, marginBottom: 2, fontStyle: 'italic' },
    translateSpinner: { alignSelf: 'flex-start', marginTop: 4, marginBottom: 4 },
  });
}

function PostMediaCarousel({
  media,
  onOpenViewer,
}: {
  media: NonNullable<Post['post_media']>;
  onOpenViewer: (index: number) => void;
}) {
  const T = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const ITEM_RATIO = 0.88;
  const ITEM_GAP = 8;
  const itemWidth = containerWidth > 0 ? containerWidth * ITEM_RATIO : 0;

  return (
    <View
      style={{ marginTop: 6, marginBottom: 10 }}
      onLayout={e => setContainerWidth(e.nativeEvent.layout.width)}
    >
      {containerWidth > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={itemWidth + ITEM_GAP}
          snapToAlignment="start"
          contentContainerStyle={{ gap: ITEM_GAP, paddingRight: containerWidth - itemWidth }}
          onScroll={e => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / (itemWidth + ITEM_GAP));
            setCurrentIndex(Math.max(0, Math.min(idx, media.length - 1)));
          }}
          scrollEventThrottle={16}
        >
          {media.slice(0, 4).map((m, index) => (
            <TouchableOpacity
              key={m.id}
              activeOpacity={0.92}
              onPress={() => onOpenViewer(index)}
              style={{ width: itemWidth, height: 220, borderRadius: 14, overflow: 'hidden', backgroundColor: T.surface2 }}
            >
              {m.media_type === 'video' ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: T.surface2 }}>
                  <Ionicons name="play-circle" size={44} color="rgba(255,255,255,0.85)" />
                </View>
              ) : (
                <Image source={{ uri: m.url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      {media.length > 1 && containerWidth > 0 && (
        <View style={{ position: 'absolute', bottom: 10, right: 10, flexDirection: 'row', gap: 4, alignItems: 'center' }}>
          {media.slice(0, 4).map((_, i) => (
            <View
              key={i}
              style={{
                width: i === currentIndex ? 16 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: i === currentIndex ? '#fff' : 'rgba(255,255,255,0.5)',
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function RepostStack({ reposters, count }: { reposters: any[]; count: number }) {
  const T = useTheme();
  const styles = useMemo(() => makeStyles(T), [T]);
  if (count === 0) return null;
  if (reposters.length === 0) return <Text style={styles.actionCount}>{count}</Text>;
  return (
    <View style={styles.repostStack}>
      {reposters.slice(0, 3).map((r, i) => (
        <View key={i} style={[styles.repostAvatarWrap, { marginLeft: i === 0 ? 0 : -6, zIndex: 3 - i }]}>
          {r?.avatar_url
            ? <Image source={{ uri: r.avatar_url }} style={styles.repostAvatarImg} />
            : <View style={[styles.repostAvatarImg, { backgroundColor: T.border }]} />}
        </View>
      ))}
      <Text style={styles.actionCount}>{count}</Text>
    </View>
  );
}
