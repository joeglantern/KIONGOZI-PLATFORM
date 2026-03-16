import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Pressable, StyleSheet, Image, Share, Alert, Animated, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as Haptics from 'expo-haptics';
import { Post } from '../../stores/socialStore';
import { UserAvatar } from './UserAvatar';
import { HashtagHighlight } from './HashtagHighlight';
import { MediaViewerModal, MediaItem, PostContext } from './MediaViewerModal';
import QuotePostModal from './QuotePostModal';
import apiClient from '../../utils/apiClient';
import { useSocialStore } from '../../stores/socialStore';

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

function VideoThumbnail({ url, style, onPress }: { url: string; style?: any; onPress: () => void }) {
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);

  useEffect(() => {
    VideoThumbnails.getThumbnailAsync(url, { time: 0 })
      .then(t => setThumbnailUri(t.uri))
      .catch(() => {});
  }, [url]);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[styles.videoThumb, style]}>
      {thumbnailUri ? (
        <Image source={{ uri: thumbnailUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0d1117' }]} />
      )}
      <View style={styles.videoPlayOverlay}>
        <Ionicons name="play-circle" size={36} color="rgba(255,255,255,0.92)" />
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
  const repostScale = useRef(new Animated.Value(1)).current;
  const [repostTip, setRepostTip] = useState(false);

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

  const handleRepost = useCallback(async () => {
    if (isReposted) {
      setRepostTip(true);
      setTimeout(() => setRepostTip(false), 2000);
      return;
    }
    Alert.alert('Repost', undefined, [
      {
        text: 'Repost',
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          Animated.sequence([
            Animated.spring(repostScale, { toValue: 1.5, useNativeDriver: true, damping: 6, stiffness: 300 }),
            Animated.spring(repostScale, { toValue: 1,   useNativeDriver: true, damping: 10, stiffness: 200 }),
          ]).start();
          toggleRepost(activePost.id, 1);
          try {
            const res = await apiClient.repostPost(activePost.id);
            if (!res.success) toggleRepost(activePost.id, -1);
          } catch { toggleRepost(activePost.id, -1); }
        },
      },
      { text: 'Quote Post', onPress: () => setQuoteVisible(true) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [activePost.id, isReposted, toggleRepost, repostScale]);

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
    if (isOwnPost) {
      Alert.alert(
        'Post Options',
        undefined,
        [
          {
            text: 'Edit Post',
            onPress: () => onEditPress?.(activePost.id, activePost.content, activePost.visibility ?? 'public'),
          },
          {
            text: 'Delete Post',
            style: 'destructive',
            onPress: () => Alert.alert(
              'Delete Post',
              'Are you sure you want to delete this post?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: onDeletePress },
              ]
            ),
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } else {
      Alert.alert(
        'Post Options',
        undefined,
        [
          {
            text: 'Report Post',
            onPress: () => onReportPress?.(activePost.id),
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  }, [activePost.id, activePost.content, activePost.visibility, onEditPress, onDeletePress, onReportPress, isOwnPost]);

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
      <View style={[styles.inner, { paddingBottom: hasConnectorBelow ? 0 : 12 }]}>
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
              <Ionicons name="repeat-outline" size={13} color="#718096" />
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

            {/* Media grid */}
            {activePost.post_media && activePost.post_media.length > 0 && (
              <View style={styles.mediaContainer}>
                {activePost.post_media.slice(0, 4).map((media, index) => {
                  const mediaStyle = [
                    styles.mediaImage,
                    activePost.post_media!.length === 1 ? styles.singleImage : styles.gridImage,
                  ];
                  return media.media_type === 'video' ? (
                    <VideoThumbnail
                      key={media.id}
                      url={media.url}
                      style={mediaStyle}
                      onPress={() => openViewer(index)}
                    />
                  ) : (
                    <TouchableOpacity
                      key={media.id}
                      onPress={() => openViewer(index)}
                      activeOpacity={0.9}
                      style={mediaStyle}
                    >
                      <Image source={{ uri: media.url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </Pressable>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.action} onPress={onReplyPress}>
              <Ionicons name="chatbubble-outline" size={18} color="#718096" />
              {activePost.comment_count > 0 && <Text style={styles.actionCount}>{activePost.comment_count}</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.action} onPress={handleRepost}>
              <Animated.View style={{ transform: [{ scale: repostScale }] }}>
                <Ionicons
                  name={isReposted ? 'repeat' : 'repeat-outline'}
                  size={18}
                  color={isReposted ? '#10b981' : '#718096'}
                />
              </Animated.View>
              <RepostStack reposters={activePost.recentReposters ?? []} count={activePost.repost_count} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.action} onPress={handleLike}>
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={18}
                color={isLiked ? '#e53e3e' : '#718096'}
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
                size={18}
                color={activePost.isBookmarked ? '#1a365d' : '#718096'}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.action} onPress={handleShare}>
              <Ionicons name="share-outline" size={18} color="#718096" />
            </TouchableOpacity>

            {(isOwnPost ? (onDeletePress || onEditPress) : onReportPress) && (
              <TouchableOpacity style={styles.action} onPress={handleOptions}>
                <Ionicons name="ellipsis-horizontal" size={18} color="#718096" />
              </TouchableOpacity>
            )}
          </View>
          {repostTip && <Text style={styles.repostTip}>Already reposted</Text>}
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

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#fff',
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
    backgroundColor: '#e2e8f0',
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
    color: '#718096',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  name: {
    fontWeight: '700',
    fontSize: 15,
    color: '#1a202c',
  },
  username: {
    fontSize: 14,
    color: '#718096',
  },
  dot: {
    color: '#718096',
    fontSize: 14,
  },
  time: {
    fontSize: 14,
    color: '#718096',
  },
  content: {
    fontSize: 15,
    color: '#2d3748',
    lineHeight: 22,
    marginBottom: 4,
  },
  readMore: {
    fontSize: 14,
    color: '#3182ce',
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
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
  },
  singleImage: {
    width: '100%',
    height: 200,
  },
  gridImage: {
    width: '48%',
    height: 140,
  },
  actions: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 4,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionCount: {
    fontSize: 13,
    color: '#718096',
  },
  likedCount: {
    color: '#e53e3e',
  },
  videoThumb: {
    overflow: 'hidden',
    backgroundColor: '#0d1117',
    borderRadius: 8,
  },
  videoPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repostStack: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  repostAvatarWrap: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: '#fff', overflow: 'hidden' },
  repostAvatarImg: { width: 16, height: 16 },
  repostTip: { fontSize: 11, color: '#10b981', marginLeft: 48, marginTop: -6, marginBottom: 2 },
  translateLink: { fontSize: 12, color: '#3182ce', marginTop: 2, marginBottom: 4 },
  translatedText: { fontSize: 15, color: '#4a5568', lineHeight: 22, marginTop: 4, marginBottom: 2, fontStyle: 'italic' },
  translateSpinner: { alignSelf: 'flex-start', marginTop: 4, marginBottom: 4 },
});

function RepostStack({ reposters, count }: { reposters: any[]; count: number }) {
  if (count === 0) return null;
  if (reposters.length === 0) return <Text style={styles.actionCount}>{count}</Text>;
  return (
    <View style={styles.repostStack}>
      {reposters.slice(0, 3).map((r, i) => (
        <View key={i} style={[styles.repostAvatarWrap, { marginLeft: i === 0 ? 0 : -6, zIndex: 3 - i }]}>
          {r?.avatar_url
            ? <Image source={{ uri: r.avatar_url }} style={styles.repostAvatarImg} />
            : <View style={[styles.repostAvatarImg, { backgroundColor: '#e2e8f0' }]} />}
        </View>
      ))}
      <Text style={styles.actionCount}>{count}</Text>
    </View>
  );
}
