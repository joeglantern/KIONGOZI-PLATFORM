import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Modal, ActivityIndicator, SafeAreaView,
} from 'react-native';
import { UserAvatar } from './UserAvatar';
import { PostInput } from './PostInput';
import { useAuthStore } from '../../stores/authStore';
import { useSocialStore, Post } from '../../stores/socialStore';
import apiClient from '../../utils/apiClient';

interface QuotePostModalProps {
  visible: boolean;
  post: Post;
  onClose: () => void;
  onPosted: () => void;
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

export default function QuotePostModal({ visible, post, onClose, onPosted }: QuotePostModalProps) {
  const { user } = useAuthStore();
  const { prependPost } = useSocialStore();
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);

  const charCount = content.length;
  const canPost = content.trim().length > 0 && charCount <= 280 && !posting;

  const handlePost = async () => {
    if (!canPost) return;
    setPosting(true);
    try {
      const res = await apiClient.repostPost(post.id, content.trim());
      if (res.success && res.data) {
        prependPost(res.data);
        setContent('');
        onPosted();
      }
    } catch {
      // silent
    } finally {
      setPosting(false);
    }
  };

  const handleClose = () => {
    setContent('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Quote Post</Text>
          <TouchableOpacity
            onPress={handlePost}
            disabled={!canPost}
            style={[styles.postBtn, !canPost && styles.postBtnDisabled]}
          >
            {posting
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.postBtnText}>Post</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Composer */}
        <View style={styles.composerRow}>
          <UserAvatar size={40} />
          <View style={styles.inputWrap}>
            <PostInput
              value={content}
              onChangeText={setContent}
              placeholder="Add a comment..."
              autoFocus
            />
          </View>
        </View>

        {/* Char counter */}
        <View style={styles.counterRow}>
          <Text style={[styles.counter, charCount > 260 && styles.counterWarn]}>
            {280 - charCount}
          </Text>
        </View>

        {/* Quoted post preview */}
        <View style={styles.quoteSection}>
          <View style={styles.quoteDivider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>Quoting</Text>
            <View style={styles.dividerLine} />
          </View>
          <View style={styles.quoteCard}>
            <View style={styles.quoteHeader}>
              <Text style={styles.quoteName}>{post.profiles?.full_name}</Text>
              {post.profiles?.username && (
                <Text style={styles.quoteUsername}>@{post.profiles.username}</Text>
              )}
              <Text style={styles.quoteDot}>·</Text>
              <Text style={styles.quoteTime}>{timeAgo(post.created_at)}</Text>
            </View>
            <Text style={styles.quoteContent} numberOfLines={4}>{post.content}</Text>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  cancelBtn: {
    minWidth: 60,
  },
  cancelText: {
    fontSize: 16,
    color: '#3182ce',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a202c',
  },
  postBtn: {
    backgroundColor: '#1a365d',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 7,
    minWidth: 60,
    alignItems: 'center',
  },
  postBtnDisabled: {
    opacity: 0.4,
  },
  postBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  composerRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    alignItems: 'flex-start',
  },
  inputWrap: {
    flex: 1,
  },
  counterRow: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    marginTop: -8,
    marginBottom: 4,
  },
  counter: {
    fontSize: 13,
    color: '#718096',
  },
  counterWarn: {
    color: '#e53e3e',
    fontWeight: '600',
  },
  quoteSection: {
    paddingHorizontal: 16,
  },
  quoteDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e2e8f0',
  },
  dividerLabel: {
    fontSize: 12,
    color: '#a0aec0',
    fontWeight: '500',
  },
  quoteCard: {
    backgroundColor: '#f7fafc',
    borderLeftWidth: 3,
    borderLeftColor: '#1a365d',
    borderRadius: 12,
    padding: 12,
  },
  quoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  quoteName: {
    fontWeight: '700',
    fontSize: 14,
    color: '#1a202c',
  },
  quoteUsername: {
    fontSize: 13,
    color: '#718096',
  },
  quoteDot: {
    color: '#718096',
    fontSize: 13,
  },
  quoteTime: {
    fontSize: 13,
    color: '#718096',
  },
  quoteContent: {
    fontSize: 14,
    color: '#4a5568',
    lineHeight: 20,
  },
});
