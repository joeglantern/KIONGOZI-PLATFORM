import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Pressable, StyleSheet, Image, Share, Animated, ActivityIndicator, Modal, Platform, ScrollView, useWindowDimensions, InteractionManager } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useThemeStore } from '../../stores/themeStore';
import * as Haptics from 'expo-haptics';
import { Post } from '../../stores/socialStore';
import { FeedStoryAvatar } from '../stories/FeedStoryAvatar';
import { HashtagHighlight } from './HashtagHighlight';
import { MediaViewerModal, MediaItem, PostContext } from './MediaViewerModal';
import QuotePostModal from './QuotePostModal';
import apiClient from '../../utils/apiClient';
import { useSocialStore } from '../../stores/socialStore';
import { VerifiedBadge } from './VerifiedBadge';
import { FeedVideo } from './FeedVideo';
import { FitImage, VideoTile, useImageRatio } from './media';
import { toggleInteraction, markInteraction } from '../../stores/interactionSync';
import { useStoryStore } from '../../stores/storyStore';

const LIKE_RED = '#FF3040';

const fmtCount = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M`
  : n >= 1e4 ? `${Math.round(n / 1e3)}K`
  : n >= 1e3 ? `${(n / 1e3).toFixed(1).replace(/\.0$/, '')}K`
  : String(n);

// --- Action-row fitting ------------------------------------------------------
// Row width = W - 16*2 (card pad) - 44 (avatar) - 12 (gap) + 2*pad (the row is pulled out by the
// button padding so icons align with the text) = W - 88 + 2*pad.
// Content without padding = like(23+gap+count) + reply(21+gap+count) + repost(23+gap+count)
//                         + share 21 + bookmark 21 + 3 group gaps; each of the 5 buttons adds 2*pad.
// W=320 (tier pad 5, gap 3, count min 12, icons 22/20): noPad = 37+35+37+20+20 = 149,
//   pad = min(5, (232-149)/8) = 5, share/bookmark = 33 -> used 109+30+66 = 205 of row 242 -> 37 free:
//   views hidden (< 340 wide). Big counts ("1.2K" x3, +63) shrink pad toward 2 and finally ellipsize.
// W=375 (tier pad 6): noPad 175, row 299, used 241 -> 58 free -> "eye 523" compact views.
// W=390+ (tier pad 8, the design): row 320, used 264 -> ~57 free -> "1.2K views" at >=0.8 scale (iOS).
const COUNT_CH = 14 * 0.6;   // tabular digits ~0.6em
const VIEWS_CH = 13 * 0.5;
type ActionMetrics = { pad: number; igap: number; ggap: number; countMin: number; minW: number; big: number; small: number; pull: number; views: 'full' | 'icon' | 'none' };
function actionMetrics(W: number, fontScale: number, counts: string[], viewsText: string | null): ActionMetrics {
  const fs = Math.min(fontScale || 1, 1.2); // counts/views are capped at 1.2x (maxFontSizeMultiplier)
  const tier = W >= 385 ? { pad: 8, igap: 5, ggap: 4, countMin: 16, big: 23, small: 21 }
    : W >= 340 ? { pad: 6, igap: 4, ggap: 2, countMin: 16, big: 23, small: 21 }
    : { pad: 5, igap: 3, ggap: 0, countMin: 12, big: 22, small: 20 };
  const cw = (t: string) => Math.max(tier.countMin, t.length * COUNT_CH * fs);
  const noPad = (tier.big + tier.igap + cw(counts[0])) + (tier.small + tier.igap + cw(counts[1]))
    + (tier.big + tier.igap + cw(counts[2])) + tier.small * 2 + tier.ggap * 3;
  // shrink padding (never below 2) if big counts would overflow the row
  const pad = Math.max(2, Math.min(tier.pad, Math.floor((W - 88 - noPad) / 8)));
  const minW = Math.min(40, 2 * pad + tier.small + 3);
  const rowW = W - 88 + 2 * pad;
  const btn = Math.max(minW, 2 * pad + tier.small); // share / bookmark buttons
  const used = (noPad - tier.small * 2) + 6 * pad + 2 * btn;
  const free = rowW - used;
  let views: ActionMetrics['views'] = 'none';
  if (viewsText) {
    const full = `${viewsText} views`.length * VIEWS_CH * fs * (Platform.OS === 'ios' ? 0.8 : 1) + 4;
    const icon = 14 + 3 + viewsText.length * VIEWS_CH * fs + 4;
    views = free >= full ? 'full' : (W >= 340 && free >= icon) ? 'icon' : 'none';
  }
  return { ...tier, pad, minW, pull: pad, views };
}

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
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
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
        <Animated.View style={[asSheet.sheet, { backgroundColor: T.surface, paddingBottom: Math.max(insets.bottom + (Platform.OS === 'ios' ? 2 : 6), 18), maxHeight: winH * 0.85, transform: [{ translateY: sheetY }] }]}>
          <View style={[asSheet.handle, { backgroundColor: T.border }]} />
          {(title || description) && (
            <View style={asSheet.titleBlock}>
              {title && <Text style={[asSheet.title, { color: T.text }]} numberOfLines={2}>{title}</Text>}
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
              <Text style={[asSheet.itemText, { color: item.color ?? T.text }]} numberOfLines={1}>{item.label}</Text>
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
    paddingTop: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18, shadowRadius: 14, elevation: 24,
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  titleBlock: { paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(128,128,128,0.2)', marginBottom: 4 },
  title: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  desc: { fontSize: 13, lineHeight: 18 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 16 },
  itemText: { fontSize: 16, fontWeight: '500', flexShrink: 1 },
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
  /** 'detail' = the focused post on the thread screen: the screen's own meta line shows time and views. */
  variant?: 'default' | 'detail';
}

function SmartImage({ url, onPress, w, h, placeholder, alt }: { url: string; onPress: () => void; w?: number; h?: number; placeholder?: string | null; alt?: string | null }) {
  const T = useTheme();
  // Real shape from the stored size (no layout jump) or measured; tall/wide photos are shown
  // whole over a blurred copy instead of being cropped.
  const ratio = useImageRatio(url, w && h ? w / h : null);
  return <FitImage uri={url} ratio={ratio} placeholder={placeholder} alt={alt} onPress={onPress} bg={T.surface2} radius={16} minRatio={0.75} maxRatio={1.91} style={{ marginTop: 4 }} />;
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
  const d = new Date(dateStr);
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
  return d.getFullYear() === new Date().getFullYear() ? `${d.getDate()} ${mon}` : `${d.getDate()} ${mon} ${d.getFullYear()}`;
}

/** False for posts the card would draw as nothing (a repost whose original was deleted, an empty post),
 * so lists can drop them and show their empty state instead of a blank gap. */
export function isShowable(post: any): boolean {
  if (!post) return false;
  if (post.repost_of_id && !post.repost_of) return false;
  const p = post.repost_of_id ? post.repost_of : post;
  return !!(p?.content?.trim() || p?.post_media?.length);
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
  variant = 'default',
}: PostCardProps) {
  const { seedInteraction, postInteractions, deletePost } = useSocialStore();
  const T = useTheme();
  const isDark = useThemeStore(s => s.isDark);
  const styles = useMemo(() => makeStyles(T, isDark), [T, isDark]);
  const { width: winW, fontScale } = useWindowDimensions();
  const repostScale = useRef(new Animated.Value(1)).current;
  const [repostSheetOpen, setRepostSheetOpen] = useState(false);
  const [optionsSheetOpen, setOptionsSheetOpen] = useState(false);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
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

  // Share button: add the post to your story (IG style) or share it outside the app
  const openShareSheet = useCallback(() => {
    Haptics.selectionAsync();
    setShareSheetOpen(true);
  }, []);
  const addToStory = useCallback(() => {
    const m = [...(activePost.post_media ?? [])].sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0))[0];
    const p = activePost.profiles;
    const seed = {
      post: {
        id: activePost.id,
        username: p?.username ?? '',
        full_name: p?.full_name ?? null,
        avatar_url: p?.avatar_url ?? null,
        is_verified: !!p?.is_verified,
        text: (activePost.content || '').slice(0, 280),
        image: m ? ((m.media_type === 'video' ? m.thumbnail_url : m.url) || null) : null,
      },
    };
    // The composer is a full-screen Modal; iOS won't present it while the sheet's Modal is still
    // going away, so wait a beat for that to finish
    setTimeout(() => InteractionManager.runAfterInteractions(() => useStoryStore.getState().openComposerWith(seed)), 120);
  }, [activePost]);
  // Only public posts can go on a story (the server checks too)
  const canStory = (activePost.visibility ?? 'public') === 'public';

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
    id: m.id,
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
  const showViews = views > 0 && variant !== 'detail';
  const M = actionMetrics(
    winW, fontScale,
    [likeCount > 0 ? fmtCount(likeCount) : '', activePost.comment_count > 0 ? fmtCount(activePost.comment_count) : '', repostCount > 0 ? fmtCount(repostCount) : ''],
    showViews ? fmtCount(views) : null,
  );
  const actionBox = { paddingHorizontal: M.pad, gap: M.igap, minWidth: M.minW };
  const countBox = { minWidth: M.countMin };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.inner}>
        {/* Left column: avatar + optional connector line */}
        <View style={styles.leftCol}>
          <FeedStoryAvatar
            userId={activePost.user_id}
            avatarUrl={activePost.profiles?.avatar_url}
            size={44}
            isBot={activePost.profiles?.is_bot}
            isVerified={activePost.profiles?.is_verified}
            name={activePost.profiles?.full_name || activePost.profiles?.username}
            onPress={activePost.profiles?.username ? () => onProfilePress?.(activePost.profiles!.username!) : undefined}
          />
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
              <Text style={styles.repostBannerText} numberOfLines={1}>{(() => {
                // "Amina and 2 others reposted" (one card, all the reposters)
                const others = ((activePost as any).recentReposters || []).filter((u: any) => u?.id && u.id !== post.user_id).length;
                const extra = Math.max(others, (activePost.repost_count || 1) - 1);
                return extra > 0 ? `${post.profiles?.full_name || post.profiles?.username} and ${extra} other${extra === 1 ? '' : 's'} reposted` : `${post.profiles?.full_name || post.profiles?.username} reposted`;
              })()}</Text>
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
            {/* Header: one line — Name ✓ @handle · 2h, options at the right */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.nameBtn}
                onPress={() => activePost.profiles?.username && onProfilePress?.(activePost.profiles.username)}
              >
                <Text style={styles.name} numberOfLines={1} maxFontSizeMultiplier={1.4}>{activePost.profiles?.full_name || activePost.profiles?.username}</Text>
              </TouchableOpacity>
              {activePost.profiles?.is_verified && <VerifiedBadge size={16} />}
              <Text style={styles.meta} numberOfLines={1} maxFontSizeMultiplier={1.4}>
                {variant === 'detail'
                  ? (activePost.profiles?.username ? `@${activePost.profiles.username}` : '')
                  : <>{activePost.profiles?.username ? `@${activePost.profiles.username} · ` : ''}{timeAgo(activePost.created_at)}</>}
              </Text>
              {(isOwnPost ? (onDeletePress || onEditPress) : onReportPress) && (
                <TouchableOpacity style={styles.optionsBtn} onPress={handleOptions} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="Post options">
                  <Ionicons name="ellipsis-horizontal" size={18} color={T.textMuted} />
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
                <View style={{ marginTop: 10, marginBottom: 6 }}>
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
                    <SmartImage url={activePost.post_media[0].url} w={activePost.post_media[0].width} h={activePost.post_media[0].height} placeholder={activePost.post_media[0].placeholder} alt={(activePost.post_media[0] as any).alt_text} onPress={() => openViewer(0)} />
                  )}
                </View>
              ) : (
                <PostMediaCarousel media={activePost.post_media} onOpenViewer={openViewer} />
              )
            )}
          </Pressable>

          {/* Actions: like · reply · repost · share on the left, then views + bookmark on the right.
              Counts always reserve a minimum width, so a 0→1 never nudges the buttons beside it. */}
          <View style={[styles.actions, { marginLeft: -M.pull, marginRight: -M.pull }]}>
            <View style={[styles.actionGroup, { gap: M.ggap }]}>
            <Pressable
              style={({ pressed }) => [styles.action, actionBox, pressed && styles.actionPressed]}
              onPress={() => handleLike()}
              hitSlop={hit}
              accessibilityRole="button"
              accessibilityLabel={isLiked ? 'Unlike' : 'Like'}
            >
              <Animated.View style={{ transform: [{ scale: likeScale }] }}>
                <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={M.big} color={isLiked ? LIKE_RED : T.text} />
              </Animated.View>
              <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={[styles.actionCount, countBox, isLiked && styles.likedCount]}>{likeCount > 0 ? fmtCount(likeCount) : ''}</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.action, actionBox, pressed && styles.actionPressed]}
              onPress={onReplyPress ?? onPress}
              hitSlop={hit}
              accessibilityRole="button"
              accessibilityLabel="Reply"
            >
              <Ionicons name="chatbubble-outline" size={M.small} color={T.text} />
              <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={[styles.actionCount, countBox]}>{activePost.comment_count > 0 ? fmtCount(activePost.comment_count) : ''}</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.action, actionBox, pressed && styles.actionPressed]}
              onPress={handleRepost}
              hitSlop={hit}
              accessibilityRole="button"
              accessibilityLabel={isReposted ? 'Undo repost' : 'Repost'}
            >
              <Animated.View style={{ transform: [{ scale: repostScale }] }}>
                <Ionicons name="repeat" size={M.big} color={isReposted ? T.accent : T.text} />
              </Animated.View>
              <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={[styles.actionCount, countBox, isReposted && { color: T.accent }]}>{repostCount > 0 ? fmtCount(repostCount) : ''}</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.action, actionBox, pressed && styles.actionPressed]}
              onPress={canStory ? openShareSheet : handleShare}
              hitSlop={hit}
              accessibilityRole="button"
              accessibilityLabel="Share"
            >
              <Ionicons name="paper-plane-outline" size={M.small} color={T.text} />
            </Pressable>
            </View>

            <View style={styles.spacer} />

            {showViews && M.views === 'full' && (
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                maxFontSizeMultiplier={1.2}
                style={styles.views}
                accessibilityLabel={`${views} views`}
              >
                {fmtCount(views)} views
              </Text>
            )}
            {showViews && M.views === 'icon' && (
              <View style={styles.viewsCompact} accessible accessibilityLabel={`${views} views`}>
                <Ionicons name="eye-outline" size={14} color={isDark ? '#8E8E93' : T.textSub} />
                <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={[styles.views, { paddingRight: 0 }]}>{fmtCount(views)}</Text>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [styles.action, actionBox, pressed && styles.actionPressed]}
              onPress={handleBookmark}
              hitSlop={hit}
              accessibilityRole="button"
              accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
            >
              <Animated.View style={{ transform: [{ scale: bookmarkScale }] }}>
                <Ionicons name={isBookmarked ? 'bookmark' : 'bookmark-outline'} size={M.small} color={isBookmarked ? T.accent : T.text} />
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

      {/* Share sheet */}
      <ActionSheet
        visible={shareSheetOpen}
        onClose={() => setShareSheetOpen(false)}
        items={[
          { label: 'Add to story', icon: 'add-circle-outline', onPress: addToStory },
          { label: 'Share via…', icon: 'share-outline', onPress: handleShare },
        ]}
      />

      {/* Post options sheet */}
      <ActionSheet
        visible={optionsSheetOpen}
        onClose={() => setOptionsSheetOpen(false)}
        items={isOwnPost ? [
          ...(onEditPress ? [{ label: 'Edit post',   icon: 'pencil-outline', onPress: () => onEditPress(activePost.id, activePost.content, activePost.visibility ?? 'public') }] : []),
          ...(onDeletePress ? [{ label: 'Delete post', icon: 'trash-outline',  color: T.error, onPress: onDeletePress }] : []),
        ] : [
          ...(onReportPress ? [{ label: 'Report post', icon: 'flag-outline', color: T.error, onPress: () => onReportPress!(activePost.id) }] : []),
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

function makeStyles(T: ReturnType<typeof import('../../hooks/useTheme').useTheme>, isDark: boolean) {
  return StyleSheet.create({
    container: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: T.borderLight,
      backgroundColor: T.bg,
    },
    inner: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingTop: 14,
    },
    leftCol: {
      alignItems: 'center',
      width: 44,
      marginRight: 12,
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
      gap: 6,
      marginBottom: 6,
    },
    nameBtn: {
      flexShrink: 1,
    },
    optionsBtn: {
      marginLeft: 'auto' as any,
      padding: 8,
      margin: -8,
    },
    name: {
      fontWeight: '600',
      fontSize: 15,
      color: T.text,
    },
    meta: {
      flexShrink: 2,
      fontSize: 15,
      color: isDark ? '#8E8E93' : T.textSub,
    },
    content: {
      fontSize: 15,
      color: isDark ? '#F2F2F7' : T.text,
      lineHeight: 21,
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
    // Compact left group (design: 40 tall, 5 icon→count, 4 between buttons). Button padding is 8
    // rather than the mock's 10: at the real 302px content width the mock's row doesn't fit the
    // views label. The row is pulled out by that padding so the icons line up with the text.
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: -8,
      marginRight: -8,
      paddingBottom: 10,
    },
    actionGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      flexShrink: 1, // last resort (huge counts at 320): counts ellipsize instead of pushing bookmark off
    },
    viewsCompact: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingRight: 4, flexShrink: 1 },
    action: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      height: 40,
      minWidth: 40,
      paddingHorizontal: 8,
      borderRadius: 20,
      justifyContent: 'center',
      flexShrink: 1,
    },
    actionPressed: {
      backgroundColor: T.border,
    },
    spacer: {
      flex: 1,
    },
    views: {
      flexShrink: 1,
      fontSize: 13,
      color: isDark ? '#8E8E93' : T.textSub,
      paddingRight: 4,
      fontVariant: ['tabular-nums'],
    },
    actionCount: {
      minWidth: 16,
      flexShrink: 1,
      fontSize: 14,
      fontWeight: '500',
      color: T.text,
      fontVariant: ['tabular-nums'],
    },
    likedCount: {
      color: LIKE_RED,
    },
    translateLink: { fontSize: 12, color: T.accent, marginTop: 2, marginBottom: 4 },
    translatedText: { fontSize: 15, color: T.textSub, lineHeight: 21, marginTop: 4, marginBottom: 2, fontStyle: 'italic' },
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
  // All slides share one frame shaped like the first item (clamped 4:5 … 1.91:1)
  const first = media[0];
  const firstRatio = useImageRatio(first?.media_type === 'image' ? first.url : null, first?.width && first?.height ? first.width / first.height : null);
  const frameRatio = Math.min(Math.max(firstRatio || 1, 0.8), 1.91);

  return (
    <View
      style={{ marginTop: 10, marginBottom: 6 }}
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
            m.media_type === 'video' ? (
              <VideoTile
                key={m.id}
                url={m.url}
                thumbnail={m.thumbnail_url}
                onPress={() => onOpenViewer(index)}
                bg={T.surface2}
                style={{ width: itemWidth, aspectRatio: frameRatio, borderRadius: 16 }}
              />
            ) : (
              <FitImage
                key={m.id}
                uri={m.url}
                placeholder={m.placeholder}
                alt={(m as any).alt_text}
                ratio={m.width && m.height ? m.width / m.height : null}
                minRatio={frameRatio}
                maxRatio={frameRatio}
                width={itemWidth}
                radius={16}
                bg={T.surface2}
                onPress={() => onOpenViewer(index)}
              />
            )
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

