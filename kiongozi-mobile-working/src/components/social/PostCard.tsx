import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Pressable, StyleSheet, Image, Share, Animated, ActivityIndicator, Modal, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import * as Haptics from 'expo-haptics';
import { Post } from '../../stores/socialStore';
import { UserAvatar } from './UserAvatar';
import { HashtagHighlight } from './HashtagHighlight';
import { MediaViewerModal, MediaItem, PostContext } from './MediaViewerModal';
import QuotePostModal from './QuotePostModal';
import apiClient from '../../utils/apiClient';
import { useSocialStore } from '../../stores/socialStore';
import { VerifiedBadge } from './VerifiedBadge';
import { FeedVideo } from './FeedVideo';
import { toggleInteraction, markInteraction } from '../../stores/interactionSync';

const fmtCount = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M`
  : n >= 1e4 ? `${Math.round(n / 1e3)}K`
  : n >= 1e3 ? `${(n / 1e3).toFixed(1).replace(/\.0$/, '')}K`
  : String(n);

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
  const { seedInteraction, postInteractions, deletePost } = useSocialStore();
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

  // When this is a repost, all interactions target the ORIGINAL post.
  // (The "render nothing" checks live just above the JSX so hooks always run in the same order.)
  const isRepost = !!(post.repost_of_id && post.repost_of);
  const activePost = isRepost ? post.repost_of! : post;

  // Keep the shared interaction map in step with the newest server data for this post
  useEffect(() => {
    seedInteraction(activePost);
  }, [activePost.id, activePost.isLiked, activePost.like_count, activePost.isBookmarked, activePost.isReposted, activePost.repost_count]);

  // Always read from the shared map — reflects taps from any screen
  const interaction = postInteractions[activePost.id];
  const isLiked = interaction?.isLiked ?? activePost.isLiked ?? false;
  const likeCount = interaction?.like_count ?? activePost.like_count ?? 0;
  const isBookmarked = interaction?.isBookmarked ?? activePost.isBookmarked ?? false;
  const isReposted = interaction?.isReposted ?? activePost.isReposted ?? false;
  const repostCount = interaction?.repost_count ?? activePost.repost_count ?? 0;

  const likeScale = useRef(new Animated.Value(1)).current;
  const bookmarkScale = useRef(new Animated.Value(1)).current;
  const pop = useCallback((v: Animated.Value) => {
    Animated.sequence([
      Animated.spring(v, { toValue: 1.3, useNativeDriver: true, damping: 6, stiffness: 400 }),
      Animated.spring(v, { toValue: 1, useNativeDriver: true, damping: 10, stiffness: 250 }),
    ]).start();
  }, []);

  const handleLike = useCallback((forceOn?: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    pop(likeScale);
    toggleInteraction(activePost.id, 'like', forceOn);
  }, [activePost.id, pop, likeScale]);

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
    toggleInteraction(activePost.id, 'repost', true);
  }, [activePost.id, repostScale]);

  const doUnrepost = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleInteraction(activePost.id, 'repost', false);
    // Drop my own repost card from the feed (never someone else's)
    if (isRepost && currentUserId && post.user_id === currentUserId) deletePost(post.id);
  }, [activePost.id, isRepost, post.id, post.user_id, currentUserId, deletePost]);

  const handleRepost = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRepostSheetOpen(true);
  }, []);

  // Views: shown for posts that have them; a video counts a view after 2s of playback.
  const [views, setViews] = useState(activePost.view_count ?? 0);
  useEffect(() => { setViews(activePost.view_count ?? 0); }, [activePost.id]);
  const recordView = useCallback(() => {
    setViews(v => v + 1);
    apiClient.recordPostView(activePost.id).catch(() => {});
  }, [activePost.id]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `${activePost.profiles?.full_name ?? ''}: ${activePost.content}`,
        url: `https://api.kiongozi.org/posts/${activePost.id}`,
      });
    } catch {}
  }, [activePost.id, activePost.content, activePost.profiles?.full_name]);

  const handleBookmark = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    pop(bookmarkScale);
    toggleInteraction(activePost.id, 'bookmark');
  }, [activePost.id, pop, bookmarkScale]);

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
    isBookmarked,
    repostCount,
    commentCount: activePost.comment_count,
    onLike: () => handleLike(),
    onRepost: handleRepost,
    onBookmark: handleBookmark,
    onReply: onReplyPress ?? (() => {}),
    onShare: handleShare,
  };

  // Orphaned repost (original deleted) or an empty post: render nothing
  if (post.repost_of_id && !post.repost_of) return null;
  if (!activePost.content?.trim() && (!activePost.post_media || activePost.post_media.length === 0)) return null;

  const hit = { top: 8, bottom: 8, left: 4, right: 4 };

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
                if (!isLiked) handleLike(true);
                lastTapRef.current = 0;
              } else {
                lastTapRef.current = now;
                onPress?.();
              }
            }}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                {/* Row 1: name + badge + time + options */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <TouchableOpacity onPress={() => activePost.profiles?.username && onProfilePress?.(activePost.profiles.username)}>
                    <Text style={styles.name} numberOfLines={1}>{activePost.profiles?.full_name}</Text>
                  </TouchableOpacity>
                  {activePost.profiles?.is_verified && <VerifiedBadge size={15} />}
                  <Text style={styles.dot}>·</Text>
                  <Text style={styles.time}>{timeAgo(activePost.created_at)}</Text>
                  {(isOwnPost ? (onDeletePress || onEditPress) : onReportPress) && (
                    <TouchableOpacity style={styles.optionsBtn} onPress={handleOptions} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="Post options">
                      <Ionicons name="ellipsis-horizontal" size={18} color={T.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
                {/* Row 2: @username below the name */}
                {activePost.profiles?.username && (
                  <Text style={styles.username}>@{activePost.profiles.username}</Text>
                )}
              </View>
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
            {(activePost.content?.length ?? 0) > 40 && (translating
              ? <ActivityIndicator size="small" color={T.textMuted} style={styles.translateSpinner} />
              : <TouchableOpacity onPress={handleTranslate} hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}>
                  <Text style={[styles.translateLink, { color: T.textMuted, fontSize: 13 }]}>
                    {showTranslation ? 'Show original' : 'Translate'}
                  </Text>
                </TouchableOpacity>
            )}

            {/* Media */}
            {activePost.post_media && activePost.post_media.length > 0 && (
              activePost.post_media.length === 1 ? (
                <View style={{ marginTop: 6, marginBottom: 10 }}>
                  {activePost.post_media[0].media_type === 'video' ? (
                    <FeedVideo
                      url={activePost.post_media[0].url}
                      thumbnailUrl={activePost.post_media[0].thumbnail_url}
                      width={activePost.post_media[0].width}
                      height={activePost.post_media[0].height}
                      durationSeconds={activePost.post_media[0].duration_seconds}
                      onPress={() => openViewer(0)}
                      onWatched={recordView}
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

          {/* Actions — Threads-style: like · comment · repost · share, then views and bookmark on the right */}
          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.action, styles.slot, pressed && styles.actionPressed]}
              onPress={() => handleLike()}
              hitSlop={hit}
              accessibilityRole="button"
              accessibilityLabel={isLiked ? 'Unlike' : 'Like'}
            >
              <Animated.View style={{ transform: [{ scale: likeScale }] }}>
                <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={23} color={isLiked ? '#ff3040' : T.text} />
              </Animated.View>
              {likeCount > 0 && <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[styles.actionCount, isLiked && styles.likedCount]}>{fmtCount(likeCount)}</Text>}
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.action, styles.slot, pressed && styles.actionPressed]}
              onPress={onReplyPress ?? onPress}
              hitSlop={hit}
              accessibilityRole="button"
              accessibilityLabel="Reply"
            >
              <Ionicons name="chatbubble-outline" size={21} color={T.text} />
              {activePost.comment_count > 0 && <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={styles.actionCount}>{fmtCount(activePost.comment_count)}</Text>}
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.action, styles.slot, pressed && styles.actionPressed]}
              onPress={handleRepost}
              hitSlop={hit}
              accessibilityRole="button"
              accessibilityLabel={isReposted ? 'Undo repost' : 'Repost'}
            >
              <Animated.View style={{ transform: [{ scale: repostScale }] }}>
                <Ionicons name="repeat" size={24} color={isReposted ? T.accent : T.text} />
              </Animated.View>
              {repostCount > 0 && <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[styles.actionCount, isReposted && { color: T.accent }]}>{fmtCount(repostCount)}</Text>}
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.action, styles.iconOnly, pressed && styles.actionPressed]}
              onPress={handleShare}
              hitSlop={hit}
              accessibilityRole="button"
              accessibilityLabel="Share"
            >
              <Ionicons name="paper-plane-outline" size={21} color={T.text} />
            </Pressable>

            {/* Always the same width, so buttons line up on every post */}
            <View style={[styles.action, styles.viewsAction]} accessibilityLabel={views > 0 ? `${views} views` : undefined}>
              {views > 0 && (
                <>
                  <Ionicons name="stats-chart-outline" size={15} color={T.textMuted} />
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[styles.actionCount, styles.viewsCount]}>{fmtCount(views)}</Text>
                </>
              )}
            </View>

            <Pressable
              style={({ pressed }) => [styles.action, styles.iconOnly, pressed && styles.actionPressed]}
              onPress={handleBookmark}
              hitSlop={hit}
              accessibilityRole="button"
              accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
            >
              <Animated.View style={{ transform: [{ scale: bookmarkScale }] }}>
                <Ionicons name={isBookmarked ? 'bookmark' : 'bookmark-outline'} size={21} color={isBookmarked ? T.accent : T.text} />
              </Animated.View>
            </Pressable>
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
        onPosted={() => { setQuoteVisible(false); markInteraction(activePost.id, 'repost', true); }}
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
      marginBottom: 4,
    },
    optionsBtn: {
      marginLeft: 'auto' as any,
      padding: 8,
      margin: -8,
    },
    name: {
      fontWeight: '700',
      fontSize: 15,
      color: T.text,
      flexShrink: 1,
    },
    username: {
      fontSize: 13,
      color: T.textSub,
      marginTop: 1,
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
    // Fixed slots: like/comment/repost split the width equally, so big counts never push
    // the other buttons around or off the edge; share, views and bookmark have fixed sizes.
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 6,
      marginLeft: -8, // icons line up with the text above; the padding is tap area
      marginRight: -4,
      paddingBottom: 6,
    },
    action: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      minHeight: 40,
      paddingHorizontal: 6,
      borderRadius: 20,
    },
    slot: {
      flex: 1,
      minWidth: 0,
    },
    iconOnly: {
      width: 40,
      paddingHorizontal: 0,
      justifyContent: 'center',
    },
    actionPressed: {
      backgroundColor: T.border,
    },
    viewsAction: {
      width: 52,
      paddingHorizontal: 2,
      gap: 3,
      justifyContent: 'flex-end',
    },
    viewsCount: {
      fontSize: 13,
      color: T.textMuted,
    },
    actionCount: {
      flexShrink: 1,
      fontSize: 14,
      fontWeight: '500',
      color: T.text,
      fontVariant: ['tabular-nums'],
    },
    likedCount: {
      color: '#ff3040',
    },
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

