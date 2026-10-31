import { RN_EASE_OUT } from '../../theme/motion';
import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Pressable, StyleSheet, Image, Share, Animated, ActivityIndicator, Modal, Platform, ScrollView, useWindowDimensions, InteractionManager } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useThemeStore } from '../../stores/themeStore';
import * as Haptics from 'expo-haptics';
import { Post } from '../../stores/socialStore';
import { FeedStoryAvatar } from '../stories/FeedStoryAvatar';
import { UserAvatar } from './UserAvatar';
import { HashtagHighlight, LinkPills } from './HashtagHighlight';
import { MediaViewerModal, MediaItem, PostContext } from './MediaViewerModal';
import QuotePostModal from './QuotePostModal';
import apiClient from '../../utils/apiClient';
import { useSocialStore } from '../../stores/socialStore';
import { VerifiedBadge } from './VerifiedBadge';
import { FeedVideo } from './FeedVideo';
import { FitImage, VideoTile, useImageRatio } from './media';
import { toggleInteraction, markInteraction } from '../../stores/interactionSync';
import { toast } from '../../utils/alert';
import { RepostLoop, RollingCount } from './RepostLoop';
import { useStoryStore } from '../../stores/storyStore';
import { sharePostAsImage } from './CardImageSheet';
import { shareLink, kchatLink } from '../../utils/links';
import { canPin, usePinnedId, togglePin } from '../../stores/pinSync';
import { PollBlock } from './PollBlock';

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
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const sheetY = useRef(new Animated.Value(300)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      sheetY.setValue(300);
      backdropOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(sheetY, { toValue: 0, duration: 320, easing: RN_EASE_OUT, useNativeDriver: true }),
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
  /** Shown first on a profile: a small grey "Pinned" row above it */
  pinned?: boolean;
}

function SmartImage({ url, onPress, w, h, placeholder, alt }: { url: string; onPress: () => void; w?: number; h?: number; placeholder?: string | null; alt?: string | null }) {
  const T = useTheme();
  // Real shape from the stored size (no layout jump) or measured; tall/wide photos are shown
  // whole over a blurred copy instead of being cropped.
  const ratio = useImageRatio(url, w && h ? w / h : null);
  return <FitImage uri={url} ratio={ratio} placeholder={placeholder} alt={alt} onPress={onPress} bg={T.surface2} radius={16} minRatio={0.75} maxRatio={1.91} />;
}

/** A hairline inner edge over media, so a white photo still reads as a tile on a white card. */
function MediaEdge({ isDark }: { isDark: boolean }) {
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { borderRadius: 16, borderWidth: 0.5, borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)' }]}
    />
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
  const d = new Date(dateStr);
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
  return d.getFullYear() === new Date().getFullYear() ? `${d.getDate()} ${mon}` : `${d.getDate()} ${mon} ${d.getFullYear()}`;
}

/** A quote is a repost that carries its own text; a plain repost has none. */
const isQuotePost = (post: Post) => !!(post.repost_of_id && post.repost_of && post.content?.trim());

/** False for posts the card would draw as nothing (a repost whose original was deleted, an empty post),
 * so lists can drop them and show their empty state instead of a blank gap. */
export function isShowable(post: any): boolean {
  if (!post) return false;
  if (post.repost_of_id && !post.repost_of) return false;
  const p = post.repost_of_id && !post.content?.trim() ? post.repost_of : post;
  return !!(p?.content?.trim() || p?.post_media?.length);
}

/**
 * The quoted post inside a quote, the way X does it: the whole box opens the quoted post, and its
 * picture or video runs edge to edge along the bottom of the box at its own shape (portrait clips
 * crop to 4:5). Tapping the media opens it full screen with the quoted post's own actions.
 */
function QuoteBox({ post, styles, onProfilePress, onOpen, onOpenMedia }: {
  post: Post; styles: ReturnType<typeof makeStyles>; onProfilePress?: (username: string) => void;
  onOpen: () => void; onOpenMedia: () => void;
}) {
  const p = post.profiles;
  const first: any = [...(post.post_media ?? [])].sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0))[0];
  const isVideo = first?.media_type === 'video';
  const thumb = first ? ((isVideo ? first.thumbnail_url : first.url) || null) : null;
  const raw = first?.width && first?.height ? first.width / first.height : isVideo ? 9 / 16 : 1.5;
  const ratio = Math.max(0.8, Math.min(isVideo ? 1.78 : 1.91, raw));
  const dur = isVideo && first?.duration_seconds ? `${Math.floor(first.duration_seconds / 60)}:${String(Math.round(first.duration_seconds % 60)).padStart(2, '0')}` : null;
  const more = (post.post_media?.length ?? 0) - 1;
  return (
    <Pressable onPress={onOpen} style={({ pressed }) => [styles.quoteBox, thumb ? styles.quoteBoxMedia : null, pressed && { opacity: 0.85 }]} accessibilityRole="button" accessibilityLabel="Open the quoted post">
      <View style={thumb ? styles.quoteInner : null}>
        <TouchableOpacity
          style={styles.quoteHead}
          onPress={p?.username ? () => onProfilePress?.(p.username) : undefined}
          activeOpacity={0.7}
          disabled={!p?.username}
        >
          <UserAvatar avatarUrl={p?.avatar_url} size={20} isBot={!!p?.is_bot} name={p?.full_name || p?.username} />
          <Text style={styles.quoteName} numberOfLines={1} maxFontSizeMultiplier={1.3}>{p?.full_name || p?.username}</Text>
          {!!p?.is_verified && <VerifiedBadge size={13} />}
          {!!p?.username && <Text style={styles.quoteHandle} numberOfLines={1} maxFontSizeMultiplier={1.3}>@{p.username} · {timeAgo(post.created_at)}</Text>}
        </TouchableOpacity>
        {!!post.content?.trim() && (
          <Text style={styles.quoteText} numberOfLines={thumb ? 3 : 5} maxFontSizeMultiplier={1.4}>{post.content}</Text>
        )}
      </View>
      {thumb && (
        <Pressable onPress={onOpenMedia} style={[styles.quoteMedia, { aspectRatio: ratio }]} accessibilityRole="button" accessibilityLabel={isVideo ? 'Play the video' : 'Open the photo'}>
          <Image source={{ uri: thumb }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          {isVideo && (
            <View style={styles.quotePlayWrap} pointerEvents="none">
              <View style={styles.quotePlay}><Ionicons name="play" size={22} color="#fff" style={{ marginLeft: 3 }} /></View>
            </View>
          )}
          {(isVideo || more > 0) && (
            <View style={styles.quoteChip} pointerEvents="none">
              <Text style={styles.quoteChipText}>{isVideo ? (dur || 'Video') : `+${more}`}</Text>
            </View>
          )}
        </Pressable>
      )}
    </Pressable>
  );
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
  pinned = false,
}: PostCardProps) {
  const { seedInteraction, postInteractions, deletePost } = useSocialStore();
  const T = useTheme();
  const isDark = useThemeStore(s => s.isDark);
  const styles = useMemo(() => makeStyles(T, isDark), [T, isDark]);
  const repostSpin = useRef(new Animated.Value(0)).current;
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

  // A plain repost shows the ORIGINAL post and every interaction targets it. A quote (a repost
  // with its own text) is its own post: the quoter is the author and the original sits in a box.
  // (The "render nothing" checks live just above the JSX so hooks always run in the same order.)
  const isQuote = isQuotePost(post);
  const isRepost = !isQuote && !!(post.repost_of_id && post.repost_of);
  const activePost = isRepost ? post.repost_of! : post;
  const quoted = isQuote ? post.repost_of! : null;

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
      Animated.timing(v, { toValue: 1.18, duration: 110, easing: RN_EASE_OUT, useNativeDriver: true }),
      Animated.timing(v, { toValue: 1, duration: 180, easing: RN_EASE_OUT, useNativeDriver: true }),
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
    heartScale.setValue(0.4);
    heartOpacity.setValue(1);
    Animated.parallel([
      Animated.timing(heartScale, { toValue: 1.25, duration: 260, easing: RN_EASE_OUT, useNativeDriver: true }),
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

  // The loop spins half a turn and fills green; the count rolls up; a toast offers Undo (like X)
  const doRepost = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(repostSpin, { toValue: 1, duration: 0, useNativeDriver: true }),
      Animated.timing(repostSpin, { toValue: 2, duration: 460, easing: RN_EASE_OUT, useNativeDriver: true }),
    ]).start(() => repostSpin.setValue(0));
    toggleInteraction(activePost.id, 'repost', true);
    toast('Reposted to your profile', { kind: 'success', icon: 'repeat', action: { label: 'Undo', onPress: () => toggleInteraction(activePost.id, 'repost', false) } });
  }, [activePost.id, repostSpin]);

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

  // Views: shown on the video tile for posts that have them; a video counts a view after 2s of playback.
  const [views, setViews] = useState(activePost.view_count ?? 0);
  useEffect(() => { setViews(activePost.view_count ?? 0); }, [activePost.id]);
  const recordView = useCallback(() => {
    setViews(v => v + 1);
    apiClient.recordPostView(activePost.id).catch(() => {});
  }, [activePost.id]);

  const handleShare = useCallback(async () => {
    try {
      // shareLink: Android ignores `url`, so the link used to be missing from every Android share
      const who = activePost.profiles?.full_name || activePost.profiles?.username;
      const text = Array.from(String(activePost.content || '').replace(/\s+/g, ' ').trim()).slice(0, 140).join('');
      await shareLink(kchatLink.post(activePost.id), [who, text].filter(Boolean).join(': ') || 'On KChat');
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
  const pinnable = isOwnPost && canPin(activePost, currentUserId);
  const isPinnedNow = usePinnedId(currentUserId) === activePost.id;

  const handleOptions = useCallback(() => {
    setOptionsSheetOpen(true);
  }, []);

  // Build media items array for the viewer
  const mediaItems: MediaItem[] = (activePost.post_media ?? []).slice(0, 4).map(m => ({
    id: m.id,
    url: m.url,
    media_type: m.media_type,
  }));

  // The quoted post's own media viewer, and where tapping the quote goes
  const navigation = useNavigation<any>();
  const [quoteViewer, setQuoteViewer] = useState(false);
  const openQuoted = useCallback(() => {
    if (!quoted) return;
    Haptics.selectionAsync().catch(() => {});
    try { navigation.navigate('PostDetail', { postId: quoted.id }); } catch { onPress?.(); }
  }, [quoted?.id, navigation, onPress]);
  const qi = quoted ? postInteractions[quoted.id] : undefined;
  const quotedMedia: MediaItem[] = (quoted?.post_media ?? []).slice(0, 4).map(m => ({ id: m.id, url: m.url, media_type: m.media_type }));
  const quotedContext: PostContext | undefined = quoted ? {
    post: quoted,
    isLiked: qi?.isLiked ?? quoted.isLiked ?? false,
    likeCount: qi?.like_count ?? quoted.like_count ?? 0,
    isBookmarked: qi?.isBookmarked ?? quoted.isBookmarked ?? false,
    repostCount: qi?.repost_count ?? quoted.repost_count ?? 0,
    commentCount: quoted.comment_count,
    onLike: () => toggleInteraction(quoted.id, 'like'),
    onRepost: () => toggleInteraction(quoted.id, 'repost'),
    onBookmark: () => toggleInteraction(quoted.id, 'bookmark' as any),
    onReply: () => { setQuoteViewer(false); setTimeout(() => { try { navigation.navigate('PostDetail', { postId: quoted.id, focusReply: true }); } catch {} }, 250); },
    onShare: () => {},
  } : undefined;

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

  const hit = { top: 8, bottom: 8, left: 6, right: 6 };
  const showViews = views > 0 && variant !== 'detail';
  // Quiet outline icons; press feedback is a small shrink and fade, no box behind
  const actionStyle = ({ pressed }: { pressed: boolean }) => [styles.action, pressed && styles.actionPressed];

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
          {pinned && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }} accessibilityLabel="Pinned post">
              <Ionicons name="pin" size={13} color={T.textMuted} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: T.textMuted }} maxFontSizeMultiplier={1.3}>Pinned</Text>
            </View>
          )}

          {/* "X reposted" banner */}
          {isRepost && (
            <TouchableOpacity
              style={styles.repostBanner}
              onPress={() => post.profiles?.username && onProfilePress?.(post.profiles.username)}
            >
              <RepostLoop size={14} on={false} color={T.textMuted} onColor={T.textMuted} />
              <Text style={styles.repostBannerText} numberOfLines={1} maxFontSizeMultiplier={1.3}>{(() => {
                // "Amina and 2 others reposted" (one card, all the reposters), the name in bold
                const others = (activePost.recentReposters || []).filter(u => u?.id && u.id !== post.user_id).length;
                const extra = Math.max(others, (activePost.repost_count || 1) - 1);
                const who = post.profiles?.full_name || post.profiles?.username;
                return <><Text style={styles.repostBannerName}>{who}</Text>{extra > 0 ? ` and ${extra} other${extra === 1 ? '' : 's'} reposted` : ' reposted'}</>;
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
              {(isOwnPost ? (onDeletePress || onEditPress || pinnable) : onReportPress) && (
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
              pillLinks
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

            {/* Baraza links as "Open the minutes" pills */}
            <LinkPills content={activePost.content} />

            {(activePost as any).poll && <PollBlock key={activePost.id} post={activePost as any} />}

            {/* Media */}
            {activePost.post_media && activePost.post_media.length > 0 && (
              activePost.post_media.length === 1 ? (
                <View style={styles.mediaWrap}>
                  {activePost.post_media[0].media_type === 'video' ? (
                    <FeedVideo
                      url={activePost.post_media[0].url}
                      thumbnailUrl={activePost.post_media[0].thumbnail_url}
                      width={activePost.post_media[0].width}
                      height={activePost.post_media[0].height}
                      durationSeconds={activePost.post_media[0].duration_seconds}
                      views={showViews ? views : 0}
                      onPress={() => openViewer(0)}
                      onWatched={recordView}
                    />
                  ) : (
                    <SmartImage url={activePost.post_media[0].url} w={activePost.post_media[0].width} h={activePost.post_media[0].height} placeholder={activePost.post_media[0].placeholder} alt={(activePost.post_media[0] as any).alt_text} onPress={() => openViewer(0)} />
                  )}
                  <MediaEdge isDark={isDark} />
                </View>
              ) : (
                <PostMediaCarousel media={activePost.post_media} onOpenViewer={openViewer} />
              )
            )}

            {/* Quote: the original post in a hairline box */}
            {quoted && <QuoteBox post={quoted} styles={styles} onProfilePress={onProfilePress} onOpen={openQuoted} onOpenMedia={() => setQuoteViewer(true)} />}
          </Pressable>

          {/* Actions: reply · repost · like spread across, share + bookmark grouped at the right */}
          <View style={styles.actions}>
            <Pressable
              style={actionStyle}
              onPress={onReplyPress ?? onPress}
              hitSlop={hit}
              accessibilityRole="button"
              accessibilityLabel="Reply"
            >
              <Ionicons name="chatbubble-outline" size={21} color={T.textSub} />
              {activePost.comment_count > 0 && (
                <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={styles.actionCount}>{fmtCount(activePost.comment_count)}</Text>
              )}
            </Pressable>

            <Pressable
              style={actionStyle}
              onPress={handleRepost}
              hitSlop={hit}
              accessibilityRole="button"
              accessibilityLabel={isReposted ? 'Undo repost' : 'Repost'}
            >
              <RepostLoop size={21} on={isReposted} spin={repostSpin} color={T.textSub} onColor={T.accent} />
              <RollingCount value={repostCount} text={repostCount > 0 ? fmtCount(repostCount) : ''} style={[styles.actionCount, repostCount === 0 && styles.actionCountEmpty, isReposted && { color: T.accent }]} />
            </Pressable>

            <Pressable
              style={actionStyle}
              onPress={() => handleLike()}
              hitSlop={hit}
              accessibilityRole="button"
              accessibilityLabel={isLiked ? 'Unlike' : 'Like'}
            >
              <Animated.View style={{ transform: [{ scale: likeScale }] }}>
                <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={21} color={isLiked ? T.like : T.textSub} />
              </Animated.View>
              {likeCount > 0 && (
                <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={[styles.actionCount, isLiked && styles.likedCount]}>{fmtCount(likeCount)}</Text>
              )}
            </Pressable>

            <View style={styles.actionGroup}>
              <Pressable
                style={actionStyle}
                onPress={canStory ? openShareSheet : handleShare}
                hitSlop={hit}
                accessibilityRole="button"
                accessibilityLabel="Share"
              >
                <Ionicons name="share-outline" size={21} color={T.textSub} />
              </Pressable>

              <Pressable
                style={actionStyle}
                onPress={handleBookmark}
                hitSlop={hit}
                accessibilityRole="button"
                accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
              >
                <Animated.View style={{ transform: [{ scale: bookmarkScale }] }}>
                  <Ionicons name={isBookmarked ? 'bookmark' : 'bookmark-outline'} size={20} color={isBookmarked ? T.accent : T.textSub} />
                </Animated.View>
              </Pressable>
            </View>
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

      {quoted && quotedMedia.length > 0 && (
        <MediaViewerModal
          visible={quoteViewer}
          onClose={() => setQuoteViewer(false)}
          media={quotedMedia}
          initialIndex={0}
          caption={quoted.content}
          postContext={quotedContext}
        />
      )}

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
          { label: 'Share as image', icon: 'image-outline', onPress: () => { sharePostAsImage(activePost.id); } },
          { label: 'Share via…', icon: 'share-outline', onPress: handleShare },
        ]}
      />

      {/* Post options sheet */}
      <ActionSheet
        visible={optionsSheetOpen}
        onClose={() => setOptionsSheetOpen(false)}
        items={isOwnPost ? [
          ...(pinnable && currentUserId ? [{ label: isPinnedNow ? 'Unpin from profile' : 'Pin to your profile', icon: 'pin-outline', onPress: () => { Haptics.selectionAsync().catch(() => {}); togglePin(activePost, currentUserId); } }] : []),
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
          <Ionicons name="heart" size={80} color={T.like} />
        </Animated.View>
      )}
    </View>
  );
}

function makeStyles(T: ReturnType<typeof import('../../hooks/useTheme').useTheme>, isDark: boolean) {
  return StyleSheet.create({
    // Flat card: a hairline between cards, no shadow
    container: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: T.border,
      backgroundColor: T.bg,
    },
    inner: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 12,
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
      minWidth: 0,
    },
    repostBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 4,
    },
    repostBannerText: {
      fontSize: 13,
      color: T.textMuted,
      fontWeight: '400',
      flexShrink: 1,
    },
    repostBannerName: {
      color: T.text,
      fontWeight: '700',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginBottom: 4,
      minHeight: 22,
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
      fontWeight: '700',
      fontSize: 15.5,
      color: T.text,
    },
    meta: {
      flexShrink: 2,
      fontSize: 15.5,
      color: T.textSub,
    },
    content: {
      fontSize: 16,
      color: T.text,
      lineHeight: 22,
    },
    readMore: {
      fontSize: 14,
      color: T.accent,
      fontWeight: '500',
      marginBottom: 8,
    },
    mediaWrap: {
      marginTop: 10,
      marginBottom: 2,
      borderRadius: 16,
    },
    // Quoted post: hairline box, small author row, the text in the secondary colour
    quoteBox: {
      marginTop: 10,
      borderWidth: 0.5,
      borderColor: T.border,
      borderRadius: 14,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    quoteHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    quoteName: { fontSize: 14, fontWeight: '700', color: T.text, flexShrink: 1 },
    quoteHandle: { fontSize: 14, color: T.textSub, flexShrink: 2 },
    quoteText: { fontSize: 14.5, lineHeight: 20, color: T.textSub },
    // with media: no padding on the box, the text gets its own and the media runs to the edges
    quoteBoxMedia: { paddingVertical: 0, paddingHorizontal: 0, overflow: 'hidden' },
    quoteInner: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10 },
    quoteMedia: { width: '100%', backgroundColor: T.surface2, borderTopWidth: 0.5, borderTopColor: T.border },
    quotePlayWrap: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
    quotePlay: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(0,0,0,0.55)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
    quoteChip: { position: 'absolute', left: 8, bottom: 8, paddingHorizontal: 7, height: 22, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center' },
    quoteChipText: { color: '#fff', fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
    // Action row: reply, repost, like spread with space-between; share + bookmark grouped at the right
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 8,
      marginLeft: -4,
      paddingRight: 8,
    },
    actionGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    action: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 32,
      paddingHorizontal: 4,
    },
    actionPressed: {
      transform: [{ scale: 0.96 }],
      opacity: 0.6,
    },
    actionCount: {
      marginLeft: 5,
      fontSize: 13.5,
      fontWeight: '600',
      color: T.textSub,
      fontVariant: ['tabular-nums'],
    },
    // RollingCount always renders a Text; with no count it must take no room
    actionCountEmpty: { marginLeft: 0 },
    likedCount: {
      color: T.like,
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
  const isDark = useThemeStore(s => s.isDark);
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
      style={{ marginTop: 10, marginBottom: 2 }}
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
            <View key={m.id} style={{ width: itemWidth, borderRadius: 16 }}>
              {m.media_type === 'video' ? (
                <VideoTile
                  url={m.url}
                  thumbnail={m.thumbnail_url}
                  onPress={() => onOpenViewer(index)}
                  bg={T.surface2}
                  style={{ width: itemWidth, aspectRatio: frameRatio, borderRadius: 16 }}
                />
              ) : (
                <FitImage
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
              )}
              <MediaEdge isDark={isDark} />
            </View>
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
