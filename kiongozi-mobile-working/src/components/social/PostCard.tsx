import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Share, Modal, SafeAreaView, Alert, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Post } from '../../stores/socialStore';
import { UserAvatar } from './UserAvatar';
import { HashtagHighlight } from './HashtagHighlight';
import apiClient from '../../utils/apiClient';
import { useSocialStore } from '../../stores/socialStore';

interface PostCardProps {
  post: Post;
  onPress?: () => void;
  onProfilePress?: (username: string) => void;
  onReplyPress?: () => void;
  onMentionPress?: (username: string) => void;
  onHashtagPress?: (tag: string) => void;
  currentUserId?: string;
  onDeletePress?: () => void;
  onEditPress?: (postId: string, content: string, visibility: 'public' | 'followers') => void;
}

function PostVideo({ url, width, height }: { url: string; width?: number; height?: number }) {
  const [open, setOpen] = useState(false);
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const isPortrait = height && width && height > width;
  const displayHeight = isPortrait ? 360 : 220;

  const player = useVideoPlayer(url, p => { p.pause(); });

  useEffect(() => {
    VideoThumbnails.getThumbnailAsync(url, { time: 0 })
      .then(t => setThumbnailUri(t.uri))
      .catch(() => {});
  }, [url]);

  const handleOpen = useCallback(() => {
    player.currentTime = 0;
    player.play();
    setOpen(true);
  }, [player]);

  const handleClose = useCallback(() => {
    player.pause();
    setOpen(false);
  }, [player]);

  return (
    <>
      <TouchableOpacity
        onPress={handleOpen}
        activeOpacity={0.85}
        style={[styles.videoThumb, { height: displayHeight }]}
      >
        {thumbnailUri && (
          <Image source={{ uri: thumbnailUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        )}
        <View style={styles.videoPlayOverlay}>
          <Ionicons name="play-circle" size={56} color="rgba(255,255,255,0.92)" />
          <Text style={styles.videoLabel}>Tap to play</Text>
        </View>
      </TouchableOpacity>

      <Modal visible={open} animationType="fade" onRequestClose={handleClose} statusBarTranslucent>
        <SafeAreaView style={styles.fullscreen}>
          <VideoView
            player={player}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
            nativeControls
            allowsFullscreen
          />
          <TouchableOpacity style={styles.closeVideo} onPress={handleClose}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </>
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
  onPress,
  onProfilePress,
  onReplyPress,
  onMentionPress,
  onHashtagPress,
  currentUserId,
  onDeletePress,
  onEditPress,
}: PostCardProps) {
  const { toggleLike, toggleBookmark, toggleRepostCount, seedInteraction, postInteractions } = useSocialStore();
  const repostScale = useRef(new Animated.Value(1)).current;

  // When this is a repost, all interactions target the ORIGINAL post
  const isRepost = !!(post.repost_of_id && post.repost_of);
  const activePost = isRepost ? post.repost_of! : post;

  // Register the active (possibly original) post in the global interaction map
  useEffect(() => {
    seedInteraction(activePost.id, activePost.isLiked ?? false, activePost.like_count);
  }, [activePost.id]);

  // Always read from global map — reflects toggles from any screen
  const interaction = postInteractions[activePost.id];
  const isLiked = interaction?.isLiked ?? activePost.isLiked ?? false;
  const likeCount = interaction?.like_count ?? activePost.like_count;

  const handleLike = useCallback(async () => {
    toggleLike(activePost.id);
    try {
      await apiClient.likePost(activePost.id);
    } catch {
      toggleLike(activePost.id); // revert
    }
  }, [activePost.id, toggleLike]);

  const handleRepost = useCallback(async () => {
    // Spring pop: scale up then settle
    Animated.sequence([
      Animated.spring(repostScale, { toValue: 1.5, useNativeDriver: true, damping: 6, stiffness: 300 }),
      Animated.spring(repostScale, { toValue: 1,   useNativeDriver: true, damping: 10, stiffness: 200 }),
    ]).start();

    toggleRepostCount(activePost.id, 1); // optimistic
    try {
      const res = await apiClient.repostPost(activePost.id);
      if (!res.success) {
        toggleRepostCount(activePost.id, -1); // revert
        if (res.error === 'Already reposted') {
          Alert.alert('Already reposted', 'You have already reposted this post.');
        }
      }
    } catch {
      toggleRepostCount(activePost.id, -1);
    }
  }, [activePost.id, toggleRepostCount, repostScale]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `${activePost.profiles?.full_name ?? ''}: ${activePost.content}`,
        url: `https://kiongozi.app/posts/${activePost.id}`,
      });
    } catch {}
  }, [activePost.id, activePost.content, activePost.profiles?.full_name]);

  const handleBookmark = useCallback(async () => {
    await toggleBookmark(activePost.id);
  }, [activePost.id, toggleBookmark]);

  const handleOptions = useCallback(() => {
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
  }, [activePost.id, activePost.content, activePost.visibility, onEditPress, onDeletePress]);

  const isOwnPost = currentUserId && currentUserId === activePost.user_id;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.95} style={styles.container}>
      {/* Avatar */}
      <TouchableOpacity onPress={() => activePost.profiles?.username && onProfilePress?.(activePost.profiles.username)}>
        <UserAvatar
          avatarUrl={activePost.profiles?.avatar_url}
          size={44}
          isBot={activePost.profiles?.is_bot}
          isVerified={activePost.profiles?.is_verified}
        />
      </TouchableOpacity>

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

        {/* Content */}
        <HashtagHighlight
          content={activePost.content}
          style={styles.content}
          onMentionPress={onMentionPress}
          onHashtagPress={onHashtagPress}
        />

        {/* Media */}
        {activePost.post_media && activePost.post_media.length > 0 && (
          <View style={styles.mediaContainer}>
            {activePost.post_media.slice(0, 4).map((media) => {
              const mediaStyle = [
                styles.mediaImage,
                activePost.post_media!.length === 1 ? styles.singleImage : styles.gridImage
              ];
              return media.media_type === 'video' ? (
                <PostVideo key={media.id} url={media.url} width={media.width} height={media.height} />
              ) : (
                <Image key={media.id} source={{ uri: media.url }} style={mediaStyle} resizeMode="cover" />
              );
            })}
          </View>
        )}

        {/* Actions: Reply | Repost | Like | Bookmark | Share | [Options if own] */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.action} onPress={onReplyPress}>
            <Ionicons name="chatbubble-outline" size={18} color="#718096" />
            {activePost.comment_count > 0 && <Text style={styles.actionCount}>{activePost.comment_count}</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.action} onPress={handleRepost}>
            <Animated.View style={{ transform: [{ scale: repostScale }] }}>
              <Ionicons name="repeat-outline" size={18} color="#718096" />
            </Animated.View>
            {activePost.repost_count > 0 && <Text style={styles.actionCount}>{activePost.repost_count}</Text>}
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

          {isOwnPost && (onDeletePress || onEditPress) && (
            <TouchableOpacity style={styles.action} onPress={handleOptions}>
              <Ionicons name="ellipsis-horizontal" size={18} color="#718096" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#fff',
    gap: 10,
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
    marginBottom: 10,
  },
  mediaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mediaImage: {
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
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
    width: '100%',
    backgroundColor: '#0d1117',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
  },
  videoPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  videoLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '500',
  },
  fullscreen: {
    flex: 1,
    backgroundColor: '#000',
  },
  closeVideo: {
    position: 'absolute',
    top: 52,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 6,
  },
});
