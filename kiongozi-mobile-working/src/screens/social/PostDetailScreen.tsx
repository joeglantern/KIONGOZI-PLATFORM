import { toast } from '../../utils/alert';
import { deletePostWithUndo, hideFromList } from '../../utils/deletePost';
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable,
  TextInput, KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { PostCard } from '../../components/social/PostCard';
import { MutedGate } from '../../components/social/MutedGate';
import { EditPostModal } from '../../components/social/EditPostModal';
import { EditedLabel } from '../../components/social/EditedLabel';
import { HashtagHighlight } from '../../components/social/HashtagHighlight';
import { UserAvatar } from '../../components/social/UserAvatar';
import { VerifiedBadge } from '../../components/social/VerifiedBadge';
import { BottomSheet } from '../../components/social/BottomSheet';
import ReportModal from './ReportModal';
import { PostInsightsSheet } from '../../components/social/PostInsightsSheet';
import { useSocialStore } from '../../stores/socialStore';
import { useAuthStore } from '../../stores/authStore';
import { useProfileStore } from '../../stores/profileStore';
import { supabase } from '../../utils/supabaseClient';
import apiClient from '../../utils/apiClient';
import { useTheme } from '../../hooks/useTheme';

type Theme = ReturnType<typeof useTheme>;
type ThreadItem = any & { _role: 'ancestor' | 'main' | 'meta' | 'reply' };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const fmtCount = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  : n >= 1_000 ? `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  : String(n);

/** Compact relative time for reply rows: "now", "5m", "1h", "3d", then "Oct 27" */
function timeAgo(iso?: string) {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (isNaN(t)) return '';
  const mins = Math.floor((Date.now() - t) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  const d = new Date(t);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** "2:41 PM · Oct 27" (+ year when not the current year) */
function fmtStamp(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const h = d.getHours();
  const time = `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
  const sameYear = d.getFullYear() === new Date().getFullYear();
  const date = `${MONTHS[d.getMonth()]} ${d.getDate()}${sameYear ? '' : `, ${d.getFullYear()}`}`;
  return `${time} · ${date}`;
}

export default function PostDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { postId, focusReply } = route.params || {};
  const { user } = useAuthStore();
  const { deletePost } = useSocialStore();
  const { currentUserProfile } = useProfileStore();
  const T = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(T), [T]);

  const [post, setPost]           = useState<any>(null);
  const [replies, setReplies]     = useState<any[]>([]);
  const [ancestors, setAncestors] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [replyText, setReplyText]  = useState('');
  const [keyboardShown, setKeyboardShown] = useState(false);
  const [editTarget, setEditTarget] = useState<{ id: string; content: string; visibility: 'public' | 'followers' } | null>(null);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ type: 'post' | 'user'; id: string; displayName: string } | null>(null);
  const [replyMenu, setReplyMenu] = useState<any>(null);
  const replyInputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);

  const hasText = replyText.trim().length > 0;
  const canSend = hasText;

  useEffect(() => { loadPost(); }, [postId]);

  useEffect(() => {
    if (focusReply) setTimeout(() => replyInputRef.current?.focus(), 300);
  }, []);

  // Drop the home-indicator inset from the composer while the keyboard is up
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const s = Keyboard.addListener(showEvt, () => setKeyboardShown(true));
    const h = Keyboard.addListener(hideEvt, () => setKeyboardShown(false));
    return () => { s.remove(); h.remove(); };
  }, []);

  const loadPost = async () => {
    setLoading(true);
    setError(null);
    try {
      const [postRes, repliesRes, ancestorsRes] = await Promise.all([
        apiClient.getPost(postId),
        apiClient.getPostReplies(postId),
        apiClient.getPostAncestors(postId),
      ]);
      if (postRes.success) setPost(postRes.data);
      else setError('Post not found');
      if (repliesRes.success) setReplies((repliesRes.data as any[]) || []);
      if (ancestorsRes.success) setAncestors((ancestorsRes.data as any[]) || []);
    } catch (e: any) {
      setError(e?.message?.includes('Network') ? 'Network error — check your connection' : 'Failed to load post');
    }
    setLoading(false);
  };

  // Realtime: append new replies as they arrive
  useEffect(() => {
    if (!postId) return;
    const repliesChannel = supabase
      .channel(`replies-${postId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts', filter: `parent_post_id=eq.${postId}` },
        async (payload) => {
          if (payload.new?.user_id === user?.id) return; // own reply already added optimistically
          // Re-fetch the full replies list so bot grandchild replies also appear
          try {
            const res = await apiClient.getPostReplies(postId);
            // keep replies of mine still sending or waiting for a retry
            if (res.success) setReplies(prev => [...((res.data as any[]) || []), ...prev.filter(r => r._pending || r._failed)]);
          } catch {}
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(repliesChannel); };
  }, [postId, user?.id]);

  // Realtime: update like count when others like/unlike this post
  useEffect(() => {
    if (!postId) return;
    const likesChannel = supabase
      .channel(`likes-${postId}`)
      .on(
        'postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'post_likes', filter: `post_id=eq.${postId}` },
        () => {
          setPost((p: any) => p ? { ...p, like_count: (p.like_count ?? 0) + 1 } : p);
        }
      )
      .on(
        'postgres_changes' as any,
        { event: 'DELETE', schema: 'public', table: 'post_likes', filter: `post_id=eq.${postId}` },
        () => {
          setPost((p: any) => p ? { ...p, like_count: Math.max(0, (p.like_count ?? 0) - 1) } : p);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(likesChannel); };
  }, [postId]);

  // Flat thread: ancestors → main post → meta/“Replies” row → replies
  const threadItems: ThreadItem[] = useMemo(() => [
    ...ancestors.map(a  => ({ ...a, _role: 'ancestor' as const })),
    ...(post ? [{ ...post, _role: 'main' as const }, { id: '__meta__', _role: 'meta' as const }] : []),
    ...replies.map(r => ({ ...r, _role: 'reply'  as const })),
  ], [ancestors, post, replies]);

  // Replies that have a child reply directly beneath them get a connector line
  const repliesWithChild = useMemo(() => {
    const set = new Set<string>();
    for (let i = 0; i < replies.length - 1; i++) {
      if (replies[i + 1]?.parent_post_id === replies[i]?.id) set.add(replies[i].id);
    }
    return set;
  }, [replies]);

  // After load, scroll so the focused (main) post is at the top when ancestors exist
  useEffect(() => {
    if (!loading && ancestors.length > 0 && threadItems.length > 0) {
      const mainIndex = ancestors.length;
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: mainIndex, animated: false });
      }, 150);
    }
  }, [loading]);

  // The reply shows up (and the count moves) the moment you tap send; several can be in flight.
  // If the server refuses one it stays in place as "Not sent · Tap to retry".
  const sendReply = useCallback(async (content: string, tempId: string) => {
    setReplies(prev => prev.map(r => r.id === tempId ? { ...r, _pending: true, _failed: false } : r));
    setPost((p: any) => p ? { ...p, comment_count: (p.comment_count ?? 0) + 1 } : p);
    const res: any = await apiClient.replyToPost(postId, content).catch(() => null);
    if (res?.success && res.data) {
      setReplies(prev => prev.map(r => r.id === tempId ? res.data : r));
      return;
    }
    // Take the count back and leave the reply there to retry
    setPost((p: any) => p ? { ...p, comment_count: Math.max(0, (p.comment_count ?? 0) - 1) } : p);
    setReplies(prev => prev.map(r => r.id === tempId ? { ...r, _pending: false, _failed: true } : r));
    toast("Couldn't send", { kind: 'error' });
  }, [postId]);

  const handleSendReply = useCallback(() => {
    const content = replyText.trim();
    if (!content) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setReplyText('');
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const tempReply = {
      id: tempId,
      user_id: user?.id,
      content,
      created_at: new Date().toISOString(),
      like_count: 0, comment_count: 0, repost_count: 0, view_count: 0,
      is_bot_reply: false, visibility: 'public', parent_post_id: postId,
      profiles: currentUserProfile ?? post?.profiles,
      _pending: true,
    };
    setReplies(prev => [...prev, tempReply]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
    sendReply(content, tempId);
  }, [replyText, postId, user, post, currentUserProfile, sendReply]);

  const retryReply = useCallback((item: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    sendReply(item.content, item.id);
  }, [sendReply]);

  const handleDeletePost = useCallback((pid: string) => {
    if (pid === postId) {
      deletePostWithUndo(pid, { after: () => navigation.goBack() });
    } else {
      deletePostWithUndo(pid, { hide: () => hideFromList(setReplies as any, pid) });
    }
  }, [postId, navigation]);

  const handleEditPress = useCallback((pid: string, content: string, visibility: 'public' | 'followers') => {
    setEditTarget({ id: pid, content, visibility });
  }, []);

  // The edit lands in this thread at once (no refetch, which could race the save)
  const handleEditSaved = useCallback((pid: string, content: string, visibility: 'public' | 'followers') => {
    setPost((p: any) => (p && p.id === pid ? { ...p, content, visibility } : p));
    setReplies(prev => prev.map(r => (r.id === pid ? { ...r, content, visibility } : r)));
    setAncestors(prev => prev.map(a => (a.id === pid ? { ...a, content, visibility } : a)));
  }, []);

  const goProfile = useCallback((u: string) => navigation.navigate('PublicProfile', { username: u }), [navigation]);
  const goHashtag = useCallback((tag: string) => navigation.navigate('Explore', {
    screen: 'ExploreMain', params: { initialQuery: `#${tag}` },
  }), [navigation]);

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
      <Pressable
        onPress={() => navigation.goBack()}
        style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel="Back"
      >
        <Ionicons name="chevron-back" size={24} color={T.text} />
      </Pressable>
      <Text style={styles.headerTitle} numberOfLines={1}>Thread</Text>
      <View style={styles.headerBtn} />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.root}>
        {header}
        <ThreadSkeleton T={T} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.root}>
        {header}
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={40} color={T.textMuted} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            onPress={loadPost}
            style={({ pressed }) => [styles.retryBtn, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const parentAuthor = post?.profiles?.username;
  const views = post?.view_count ?? 0;
  const stamp = fmtStamp(post?.created_at);
  const metaLine = [stamp, views > 0 ? `${fmtCount(views)} ${views === 1 ? 'view' : 'views'}` : '']
    .filter(Boolean).join(' · ');

  const renderItem = ({ item }: { item: ThreadItem }) => {
    if (item._role === 'meta') {
      return (
        <View>
          {!!metaLine && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLineText}>{metaLine}</Text>
              {post && <EditedLabel post={post} style={styles.metaLineText} />}
            </View>
          )}
          {!!post?.id && !!user?.id && post.user_id === user.id && (
            <Text onPress={() => { Haptics.selectionAsync().catch(() => {}); setInsightsOpen(true); }} style={[styles.metaLine, { color: T.accentDeep, fontWeight: '600', paddingTop: 6 }]} accessibilityRole="button" suppressHighlighting>
              {views > 0 ? `${fmtCount(views)} ${views === 1 ? 'view' : 'views'} · insights` : 'View insights'}
            </Text>
          )}
          <View style={styles.divider} />
          <View style={styles.repliesRow}>
            <Text style={styles.repliesLabel}>Replies</Text>
            {(post?.comment_count ?? replies.length) > 0 && (
              <Text style={styles.repliesCount}>{fmtCount(post?.comment_count ?? replies.length)}</Text>
            )}
          </View>
        </View>
      );
    }

    const isAncestor = item._role === 'ancestor';
    const isMain     = item._role === 'main';
    const isReply    = item._role === 'reply';
    const hasConnectorBelow = isAncestor || (isReply && repliesWithChild.has(item.id));

    if (isReply) {
      const author = item.profiles || {};
      const failed = !!item._failed;
      const pending = !failed && (!!item._pending || String(item.id).startsWith('temp_'));
      return (
        <MutedGate post={item} me={user?.id}>
        <Pressable
          onPress={failed ? () => retryReply(item) : pending ? undefined : () => navigation.push('PostDetail', { postId: item.id })}
          onLongPress={pending || failed ? undefined : () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); setReplyMenu(item); }}
          delayLongPress={350}
          style={({ pressed }) => [styles.replyRow, pressed && { backgroundColor: T.surface }, pending && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityLabel={failed ? 'Not sent. Tap to retry' : `Reply from ${author.username || 'user'}`}
        >
          <View style={styles.replyAvatarCol}>
            <Pressable onPress={() => author.username && goProfile(author.username)} hitSlop={4}>
              <UserAvatar avatarUrl={author.avatar_url} size={36} isBot={!!item.is_bot_reply} name={author.full_name || author.username} />
            </Pressable>
            {hasConnectorBelow && <View style={styles.replyLine} />}
          </View>
          <View style={styles.replyBody}>
            <View style={styles.replyHead}>
              <Text style={styles.replyUser} numberOfLines={1} onPress={() => author.username && goProfile(author.username)}>
                {author.username || 'user'}
              </Text>
              {!!author.is_verified && <VerifiedBadge size={14} />}
              <Text style={styles.replyTime} numberOfLines={1}>{` · ${pending || failed ? 'now' : timeAgo(item.created_at)}`}</Text>
            </View>
            {!!item.content && (
              <HashtagHighlight content={item.content} style={styles.replyText} onMentionPress={goProfile} onHashtagPress={goHashtag} />
            )}
            {failed && (
              <Text style={[styles.replyTime, { color: T.error, marginTop: 4 }]} maxFontSizeMultiplier={1.2}>Not sent · Tap to retry</Text>
            )}
          </View>
        </Pressable>
        </MutedGate>
      );
    }

    return (
      <PostCard
        post={item}
        hasConnectorBelow={hasConnectorBelow}
        variant={isMain ? 'detail' : 'default'}
        style={
          isMain ? styles.mainCard
          : isAncestor ? styles.ancestorCard
          : hasConnectorBelow ? styles.noBorder
          : undefined
        }
        onPress={isMain ? undefined : () => navigation.push('PostDetail', { postId: item.id })}
        onReplyPress={isMain
          ? () => replyInputRef.current?.focus()
          : () => navigation.push('PostDetail', { postId: item.id, focusReply: true })}
        onProfilePress={goProfile}
        onMentionPress={goProfile}
        onHashtagPress={goHashtag}
        currentUserId={user?.id}
        onDeletePress={() => handleDeletePost(item.id)}
        onEditPress={handleEditPress}
        onReportPress={(id) => setReportTarget({ type: 'post', id, displayName: 'this post' })}
      />
    );
  };

  return (
    <View style={styles.root}>
      {/* 'padding' on both platforms: SDK 54 Android is edge-to-edge, so the window is
          not resized for the keyboard and the composer would sit under it. KAV pads by
          the keyboard's overlap with its own frame, so if the window DOES resize the
          overlap is 0 and nothing is double-counted. */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
      >
        {header}

        <FlatList
          ref={flatListRef}
          data={threadItems}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          ListFooterComponent={
            post && replies.length === 0 ? (
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="chatbubble-outline" size={26} color={T.textMuted} />
                </View>
                <Text style={styles.emptyTitle}>No replies yet</Text>
                <Text style={styles.emptySub}>Start the conversation.</Text>
              </View>
            ) : null
          }
          onScrollToIndexFailed={() => {}}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          contentContainerStyle={{ paddingBottom: 16 }}
        />

        {/* Reply composer */}
        <View style={[styles.composer, { paddingBottom: keyboardShown ? 8 : Math.max(insets.bottom, 12) }]}>
          <View style={styles.composerAvatar}>
            <UserAvatar avatarUrl={currentUserProfile?.avatar_url} size={32} />
          </View>
          <View style={styles.inputPill}>
            <TextInput
              ref={replyInputRef}
              style={styles.input}
              placeholder={`Reply to @${parentAuthor || 'post'}…`}
              placeholderTextColor={T.placeholder}
              value={replyText}
              onChangeText={setReplyText}
              multiline
              maxLength={280}
            />
            {replyText.length > 240 && (
              <Text style={[styles.counter, replyText.length >= 280 && { color: T.error }]} maxFontSizeMultiplier={1.2}>
                {280 - replyText.length}
              </Text>
            )}
          <Pressable
            onPress={handleSendReply}
            disabled={!canSend}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel="Send reply"
            accessibilityState={{ disabled: !canSend }}
            style={({ pressed }) => [
              styles.sendBtn,
              !canSend && styles.sendDisabled,
              pressed && { transform: [{ scale: 0.92 }] },
            ]}
          >
            <Ionicons name="arrow-up" size={20} color="#000" />
          </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      {editTarget && (
        <EditPostModal
          visible
          postId={editTarget.id}
          initialContent={editTarget.content}
          initialVisibility={editTarget.visibility}
          onSaved={(content, visibility) => handleEditSaved(editTarget.id, content, visibility)}
          onClose={() => setEditTarget(null)}
        />
      )}
      <ReportModal target={reportTarget} onClose={() => setReportTarget(null)} />
      {insightsOpen && !!post?.id && <PostInsightsSheet postId={post.id} visible onClose={() => setInsightsOpen(false)} />}
      <BottomSheet
        visible={!!replyMenu}
        onClose={() => setReplyMenu(null)}
        title={replyMenu?.profiles?.username ? `@${replyMenu.profiles.username}` : 'Reply'}
        actions={replyMenu ? (
          replyMenu.user_id && replyMenu.user_id === user?.id
            ? [
                { icon: 'create-outline', label: 'Edit', onPress: () => handleEditPress(replyMenu.id, replyMenu.content || '', replyMenu.visibility === 'followers' ? 'followers' : 'public') },
                { icon: 'trash-outline', label: 'Delete', destructive: true, onPress: () => handleDeletePost(replyMenu.id) },
              ]
            : [
                { icon: 'chatbubble-outline', label: 'Reply', onPress: () => navigation.push('PostDetail', { postId: replyMenu.id, focusReply: true }) },
                { icon: 'flag-outline', label: 'Report', onPress: () => setReportTarget({ type: 'post', id: replyMenu.id, displayName: 'this post' }) },
              ]
        ) : []}
      />
    </View>
  );
}

/** Placeholder blocks shaped like a post + a couple of replies */
function ThreadSkeleton({ T }: { T: Theme }) {
  const block = (w: number | `${number}%`, h: number, extra?: object) => (
    <View style={[{ width: w, height: h, borderRadius: 6, backgroundColor: T.surface2 }, extra]} />
  );
  const row = (key: string, lines: Array<number | `${number}%`>) => (
    <View key={key} style={{ flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 14, gap: 10 }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: T.surface2 }} />
      <View style={{ flex: 1, gap: 8, paddingTop: 4 }}>
        {block(120, 12)}
        {lines.map((w, i) => <React.Fragment key={i}>{block(w, 12)}</React.Fragment>)}
      </View>
    </View>
  );
  return (
    <View accessibilityLabel="Loading thread">
      {row('main', ['92%', '84%', '60%'])}
      <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>{block(170, 12)}</View>
      <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: T.borderLight }} />
      <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>{block(70, 14)}</View>
      {row('r1', ['80%'])}
      {row('r2', ['70%', '45%'])}
    </View>
  );
}

function makeStyles(T: Theme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: T.bg },
    pressed: { opacity: 0.6 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingHorizontal: 32 },

    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 4, paddingBottom: 4, backgroundColor: T.bg,
    },
    headerBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 17, color: T.text, fontFamily: 'SpaceGrotesk_600SemiBold' },

    errorText: { fontSize: 15, color: T.textSub, textAlign: 'center', lineHeight: 21 },
    retryBtn: {
      marginTop: 4, minHeight: 44, paddingHorizontal: 24, justifyContent: 'center',
      backgroundColor: T.accent, borderRadius: 22,
    },
    retryText: { color: '#000', fontWeight: '700', fontSize: 15 },

    mainCard: { borderBottomWidth: 0, paddingTop: 2 },
    ancestorCard: { borderBottomWidth: 0, opacity: 0.72 },
    noBorder: { borderBottomWidth: 0 },

    metaLine: { fontSize: 14, color: T.textMuted, paddingHorizontal: 16, paddingTop: 10 },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingTop: 10 },
    metaLineText: { fontSize: 14, color: T.textMuted },
    divider: { height: 1, marginTop: 12, backgroundColor: T.bg === '#000000' ? '#1C1C1E' : '#E5E5EA' },
    repliesRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4,
    },
    repliesLabel: { fontSize: 15, color: T.text, fontFamily: 'SpaceGrotesk_600SemiBold' },
    repliesCount: { fontSize: 14, color: T.textMuted },

    replyRow: { flexDirection: 'row', gap: 12, paddingVertical: 10, paddingHorizontal: 16 },
    replyAvatarCol: { width: 36, alignItems: 'center', gap: 4 },
    replyLine: { flex: 1, width: 2, borderRadius: 1, backgroundColor: '#2C2C2E', marginBottom: -10 },
    replyBody: { flex: 1, minWidth: 0, gap: 4 },
    replyHead: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    replyUser: { fontSize: 15, fontWeight: '700', color: T.text, flexShrink: 1 },
    replyTime: { fontSize: 15, color: '#7C7C80' },
    replyText: { fontSize: 15, lineHeight: 21, color: T.text },

    empty: { alignItems: 'center', paddingTop: 40, paddingBottom: 24, paddingHorizontal: 32 },
    emptyIcon: {
      width: 64, height: 64, borderRadius: 32, backgroundColor: T.surface,
      alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: T.text, marginBottom: 4 },
    emptySub: { fontSize: 14, color: T.textMuted },

    composer: {
      flexDirection: 'row', alignItems: 'flex-end', gap: 8,
      paddingHorizontal: 10, paddingTop: 8,
      backgroundColor: T.bg,
    },
    composerAvatar: { height: 44, justifyContent: 'center' },
    inputPill: {
      flex: 1, flexDirection: 'row', alignItems: 'flex-end',
      minHeight: 44, borderRadius: 22, backgroundColor: T.surface2,
      paddingLeft: 16, paddingRight: 6,
    },
    input: {
      flex: 1, fontSize: 15, color: T.text, maxHeight: 110,
      paddingTop: Platform.OS === 'ios' ? 12 : 10,
      paddingBottom: Platform.OS === 'ios' ? 12 : 10,
      paddingHorizontal: 0,
    },
    counter: { fontSize: 12, color: T.textMuted, paddingBottom: 13, paddingHorizontal: 6 },
    sendBtn: {
      width: 36, height: 36, borderRadius: 18, marginBottom: 4, marginLeft: 4,
      backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center',
    },
    sendDisabled: { opacity: 0.4 },
  });
}
