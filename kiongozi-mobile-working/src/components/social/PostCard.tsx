import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Share, Modal, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
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
}

function PostVideo({ url, style }: { url: string; style: any }) {
  const [open, setOpen] = useState(false);

  const player = useVideoPlayer(url, p => {
    p.muted = false;
    p.pause();
  });

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
      {/* Dark thumbnail with play icon */}
      <TouchableOpacity onPress={handleOpen} activeOpacity={0.85}>
        <View style={[style, styles.videoThumb]}>
          <Ionicons name="play-circle" size={52} color="rgba(255,255,255,0.92)" />
          <Text style={styles.videoLabel}>Tap to play</Text>
        </View>
      </TouchableOpacity>

      {/* Fullscreen player */}
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
  onHashtagPress
}: PostCardProps) {
  const { toggleLike } = useSocialStore();

  const handleLike = useCallback(async () => {
    toggleLike(post.id); // Optimistic update
    try {
      await apiClient.likePost(post.id);
    } catch {
      toggleLike(post.id); // Revert on error
    }
  }, [post.id, toggleLike]);

  const handleRepost = useCallback(async () => {
    try {
      await apiClient.repostPost(post.id);
    } catch {}
  }, [post.id]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `${post.profiles?.full_name ?? ''}: ${post.content}`,
        url: `https://kiongozi.app/posts/${post.id}`,
      });
    } catch {}
  }, [post.id, post.content, post.profiles?.full_name]);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.95} style={styles.container}>
      {/* Avatar */}
      <TouchableOpacity onPress={() => post.profiles?.username && onProfilePress?.(post.profiles.username)}>
        <UserAvatar
          avatarUrl={post.profiles?.avatar_url}
          size={44}
          isBot={post.profiles?.is_bot}
          isVerified={post.profiles?.is_verified}
        />
      </TouchableOpacity>

      <View style={styles.right}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => post.profiles?.username && onProfilePress?.(post.profiles.username)}>
            <Text style={styles.name}>{post.profiles?.full_name}</Text>
          </TouchableOpacity>
          {post.profiles?.username && (
            <Text style={styles.username}>@{post.profiles.username}</Text>
          )}
          <Text style={styles.dot}>·</Text>
          <Text style={styles.time}>{timeAgo(post.created_at)}</Text>
        </View>

        {/* Content */}
        <HashtagHighlight
          content={post.content}
          style={styles.content}
          onMentionPress={onMentionPress}
          onHashtagPress={onHashtagPress}
        />

        {/* Media */}
        {post.post_media && post.post_media.length > 0 && (
          <View style={styles.mediaContainer}>
            {post.post_media.slice(0, 4).map((media) => {
              const mediaStyle = [
                styles.mediaImage,
                post.post_media!.length === 1 ? styles.singleImage : styles.gridImage
              ];
              return media.media_type === 'video' ? (
                <PostVideo key={media.id} url={media.url} style={mediaStyle} />
              ) : (
                <Image key={media.id} source={{ uri: media.url }} style={mediaStyle} resizeMode="cover" />
              );
            })}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.action} onPress={onReplyPress}>
            <Ionicons name="chatbubble-outline" size={18} color="#718096" />
            {post.comment_count > 0 && <Text style={styles.actionCount}>{post.comment_count}</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.action} onPress={handleRepost}>
            <Ionicons name="repeat-outline" size={18} color="#718096" />
            {post.repost_count > 0 && <Text style={styles.actionCount}>{post.repost_count}</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.action} onPress={handleLike}>
            <Ionicons
              name={post.isLiked ? 'heart' : 'heart-outline'}
              size={18}
              color={post.isLiked ? '#e53e3e' : '#718096'}
            />
            {post.like_count > 0 && (
              <Text style={[styles.actionCount, post.isLiked && styles.likedCount]}>
                {post.like_count}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.action} onPress={handleShare}>
            <Ionicons name="share-outline" size={18} color="#718096" />
          </TouchableOpacity>
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
    gap: 24,
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
    backgroundColor: '#0d1117',
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
