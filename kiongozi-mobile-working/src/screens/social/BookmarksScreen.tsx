import React, { useEffect, useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { PostCard } from '../../components/social/PostCard';
import { EditPostModal } from '../../components/social/EditPostModal';
import { useSocialStore, Post } from '../../stores/socialStore';
import { useAuthStore } from '../../stores/authStore';
import apiClient from '../../utils/apiClient';
import { useTheme, AppTheme } from '../../hooks/useTheme';

export default function BookmarksScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const T = useTheme();
  const styles = React.useMemo(() => makeStyles(T), [T]);
  const {
    bookmarkPosts, bookmarkCursor, bookmarkLoading,
    fetchBookmarks, deletePost,
  } = useSocialStore();
  const [editTarget, setEditTarget] = useState<{ id: string; content: string; visibility: 'public' | 'followers' } | null>(null);

  useEffect(() => {
    fetchBookmarks(true);
  }, []);

  const handlePostPress = useCallback((post: Post) => {
    navigation.navigate('PostDetail', { postId: post.id });
  }, [navigation]);

  const handleProfilePress = useCallback((username: string) => {
    navigation.navigate('PublicProfile', { username });
  }, [navigation]);

  const handleHashtagPress = useCallback((tag: string) => {
    navigation.navigate('Explore', {
      screen: 'ExploreMain',
      params: { initialQuery: `#${tag}` },
    });
  }, [navigation]);

  const handleDeletePost = useCallback((postId: string) => {
    apiClient.deletePost(postId).then(() => deletePost(postId)).catch(() => {});
  }, [deletePost]);

  const handleEditPress = useCallback((postId: string, content: string, visibility: 'public' | 'followers') => {
    setEditTarget({ id: postId, content, visibility });
  }, []);

  const renderPost = useCallback(({ item }: { item: Post }) => (
    <PostCard
      post={item}
      onPress={() => handlePostPress(item)}
      onProfilePress={handleProfilePress}
      onReplyPress={() => navigation.navigate('PostDetail', { postId: item.id, focusReply: true })}
      onMentionPress={(username) => navigation.navigate('PublicProfile', { username })}
      onHashtagPress={handleHashtagPress}
      currentUserId={user?.id}
      onDeletePress={() => handleDeletePost(item.id)}
      onEditPress={handleEditPress}
    />
  ), [handlePostPress, handleProfilePress, handleHashtagPress, user?.id, handleDeletePost, handleEditPress]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.5 }]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={26} color={T.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Bookmarks</Text>
        <View style={{ width: 44 }} />
      </View>

      <FlatList
        data={bookmarkPosts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        onEndReached={() => { if (bookmarkCursor) fetchBookmarks(false); }}
        onEndReachedThreshold={0.5}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24, flexGrow: 1 }}
        ListEmptyComponent={
          bookmarkLoading ? (
            <PostSkeleton T={T} />
          ) : (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="bookmark-outline" size={26} color={T.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>No bookmarks yet</Text>
              <Text style={styles.emptySub}>Tap the bookmark on any post to save it here. Only you can see your bookmarks.</Text>
            </View>
          )
        }
        ListFooterComponent={
          bookmarkLoading && bookmarkPosts.length > 0 ? (
            <ActivityIndicator style={{ marginVertical: 20 }} color={T.textMuted} />
          ) : null
        }
      />
      {editTarget && (
        <EditPostModal
          visible
          postId={editTarget.id}
          initialContent={editTarget.content}
          initialVisibility={editTarget.visibility}
          onClose={() => setEditTarget(null)}
        />
      )}
    </View>
  );
}

function PostSkeleton({ T }: { T: AppTheme }) {
  const bar = (w: number | `${number}%`, h = 10) => (
    <View style={{ width: w, height: h, borderRadius: h / 2, backgroundColor: T.surface2 }} />
  );
  return (
    <View>
      {Array.from({ length: 4 }).map((_, i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 16,
            borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.borderLight,
          }}
        >
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: T.surface2 }} />
          <View style={{ flex: 1, gap: 10, paddingTop: 4 }}>
            {bar('35%', 12)}
            {bar('92%')}
            {bar(i % 2 ? '60%' : '78%')}
          </View>
        </View>
      ))}
    </View>
  );
}

function makeStyles(T: AppTheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: T.bg },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 4, backgroundColor: T.bg,
    },
    backBtn: { width: 44, height: 50, alignItems: 'center', justifyContent: 'center' },
    headerTitle: {
      flex: 1, textAlign: 'center', fontSize: 17,
      fontFamily: 'SpaceGrotesk_600SemiBold', color: T.text,
    },
    empty: { alignItems: 'center', paddingTop: 96, paddingHorizontal: 40 },
    emptyIcon: {
      width: 64, height: 64, borderRadius: 32, backgroundColor: T.surface,
      alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    },
    emptyTitle: { fontSize: 17, fontWeight: '700', color: T.text, textAlign: 'center' },
    emptySub: { fontSize: 14, color: T.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  });
}
