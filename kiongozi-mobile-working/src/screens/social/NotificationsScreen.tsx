// Activity: notifications grouped like modern apps ("mercy and 12 others liked your post"),
// split into New / Today / This week / Earlier, with filter chips, post previews and Follow back.
import React, { useEffect, useMemo, useState } from 'react';
import { TAB_LIST_INSET } from '../../navigation/tabInset';
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator, Image, ScrollView, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useNotificationStore, SocialNotification } from '../../stores/notificationStore';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../utils/supabaseClient';
import { UserAvatar } from '../../components/social/UserAvatar';
import apiClient from '../../utils/apiClient';
import { useStoryStore } from '../../stores/storyStore';
import { useTheme } from '../../hooks/useTheme';
import { RowsSkeleton } from '../../components/social/Skeleton';
import { useBubbleRefresh } from '../../components/social/RefreshBubble';

type Theme = ReturnType<typeof useTheme>;

function timeAgo(dateStr: string): string {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const BADGE: Record<string, { icon: keyof typeof Ionicons.glyphMap; bg: string; fg: string }> = {
  like: { icon: 'heart', bg: '#FF3040', fg: '#fff' },
  comment: { icon: 'chatbubble', bg: '#5CB85C', fg: '#000' },
  repost: { icon: 'repeat', bg: '#5CB85C', fg: '#000' },
  mention: { icon: 'at', bg: '#F5B83D', fg: '#000' },
  follow: { icon: 'add', bg: '#7C5CFF', fg: '#fff' },
  follow_request: { icon: 'add', bg: '#7C5CFF', fg: '#fff' },
  dm: { icon: 'paper-plane', bg: '#3B82F6', fg: '#fff' },
};

// What each type says after the person's name (single / grouped)
const ACTION: Record<string, [string, string]> = {
  like: ['alipenda post yako', 'walipenda post yako'],
  repost: ['alishiriki post yako', 'walishiriki post yako'],
  comment: ['alijibu', 'walijibu'],
  mention: ['alikutaja kwenye post', 'walikutaja kwenye post'],
  follow: ['alianza kukufuata', 'walianza kukufuata'],
  follow_request: ['anataka kukufuata', 'wanataka kukufuata'],
  dm: ['amekutumia ujumbe', 'wamekutumia ujumbe'],
};

const FILTERS: { id: string; label: string; types: string[] | null }[] = [
  { id: 'all', label: 'All', types: null },
  { id: 'mentions', label: 'Mentions', types: ['mention'] },
  { id: 'replies', label: 'Replies', types: ['comment'] },
  { id: 'likes', label: 'Likes', types: ['like'] },
  { id: 'follows', label: 'Follows', types: ['follow', 'follow_request'] },
];

/** A row: one notification, or several of the same kind on the same post. */
interface Row { key: string; type: string; items: SocialNotification[]; unread: boolean; latest: string }

const GROUPABLE = new Set(['like', 'repost', 'follow']);

function buildSections(list: SocialNotification[]) {
  const now = Date.now();
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const bucket = (n: SocialNotification) => {
    if (!n.read) return 'New';
    const t = new Date(n.created_at).getTime();
    if (t >= startOfToday.getTime()) return 'Today';
    if (now - t < 7 * 86400000) return 'This week';
    return 'Earlier';
  };
  const order = ['New', 'Today', 'This week', 'Earlier'];
  const sections: Record<string, Row[]> = {};
  const index: Record<string, Row> = {};
  for (const n of list) {
    const b = bucket(n);
    const groupKey = GROUPABLE.has(n.type) ? `${b}|${n.type}|${n.type === 'follow' ? '' : n.postId || n.id}` : `${b}|${n.id}`;
    const existing = index[groupKey];
    if (existing && !existing.items.some(x => x.fromUserId && x.fromUserId === n.fromUserId)) {
      existing.items.push(n);
      existing.unread = existing.unread || !n.read;
      continue;
    }
    if (existing) continue; // same person twice on the same post: show once
    const row: Row = { key: n.id, type: n.type, items: [n], unread: !n.read, latest: n.created_at };
    index[groupKey] = row;
    (sections[b] ||= []).push(row);
  }
  return order.filter(t => sections[t]?.length).map(title => ({ title, data: sections[title] }));
}

// ── Post previews (text or first image) for likes / replies / reposts ──
const previewCache = new Map<string, { text?: string; image?: string } | null>();
const inflight = new Map<string, Promise<void>>();
function usePostPreview(postId?: string) {
  const [, force] = useState(0);
  useEffect(() => {
    if (!postId || previewCache.has(postId)) return;
    let live = true;
    if (!inflight.has(postId)) {
      inflight.set(postId, apiClient.getPost(postId).then((r: any) => {
        const p = r?.success ? r.data : null;
        const m = p?.post_media?.[0];
        previewCache.set(postId, p ? { text: p.content, image: m ? (m.media_type === 'video' ? m.thumbnail_url : m.url) : undefined } : null);
      }).catch(() => { previewCache.set(postId, null); }).finally(() => inflight.delete(postId)));
    }
    inflight.get(postId)?.then(() => { if (live) force(x => x + 1); });
    return () => { live = false; };
  }, [postId]);
  return postId ? previewCache.get(postId) : undefined;
}

function PostThumb({ postId, T }: { postId?: string; T: Theme }) {
  const p = usePostPreview(postId);
  if (!postId) return null;
  if (p?.image) return <Image source={{ uri: p.image }} style={thumbStyles.img} accessibilityLabel="Your post" />;
  return (
    <View style={[thumbStyles.text, { backgroundColor: T.surface2 }]}>
      <Text style={[thumbStyles.textInner, { color: T.textSub }]} numberOfLines={4}>{p?.text || ' '}</Text>
    </View>
  );
}
const thumbStyles = StyleSheet.create({
  img: { width: 44, height: 44, borderRadius: 10 },
  text: { width: 44, height: 44, borderRadius: 10, padding: 5, overflow: 'hidden' },
  textInner: { fontSize: 8, lineHeight: 10 },
});

function FollowBack({ userId, T }: { userId?: string; T: Theme }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  if (!userId) return null;
  const done = state === 'done';
  return (
    <Pressable
      onPress={async () => {
        if (state !== 'idle') return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setState('busy');
        try { await apiClient.followUser(userId); } catch {}
        setState('done');
      }}
      style={({ pressed }) => [rowStyles.pill, done ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: T.border, paddingHorizontal: 15 } : { backgroundColor: T.text }, pressed && { opacity: 0.8 }]}
      accessibilityRole="button"
      accessibilityLabel={done ? 'Following' : 'Follow back'}
    >
      {state === 'busy'
        ? <ActivityIndicator size="small" color={T.bg} />
        : <Text style={[rowStyles.pillText, { color: done ? T.text : T.bg }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>{done ? 'Following' : 'Follow back'}</Text>}
    </Pressable>
  );
}

function FollowRequestButtons({ item, onRemove, T }: { item: SocialNotification; onRemove: (id: string) => void; T: Theme }) {
  const [loading, setLoading] = useState<'accept' | 'decline' | null>(null);
  const requestId = item.data?.request_id as string | undefined;
  const fromUserId = item.data?.from_user_id as string | undefined;
  const act = async (kind: 'accept' | 'decline') => {
    if (!requestId && !fromUserId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(kind);
    try {
      if (kind === 'accept') await apiClient.acceptFollowRequest(requestId, fromUserId);
      else await apiClient.declineFollowRequest(requestId, fromUserId);
      onRemove(item.id);
    } catch {}
    setLoading(null);
  };
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
      <Pressable onPress={() => act('accept')} disabled={!!loading} style={[rowStyles.pill, { backgroundColor: T.accent, minWidth: 92 }]}>
        {loading === 'accept' ? <ActivityIndicator size="small" color="#000" /> : <Text style={[rowStyles.pillText, { color: '#000' }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>Kubali</Text>}
      </Pressable>
      <Pressable onPress={() => act('decline')} disabled={!!loading} style={[rowStyles.pill, { borderWidth: 1, borderColor: T.border, paddingHorizontal: 15, minWidth: 92 }]}>
        {loading === 'decline' ? <ActivityIndicator size="small" color={T.text} /> : <Text style={[rowStyles.pillText, { color: T.text }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>Decline</Text>}
      </Pressable>
    </View>
  );
}

function ActorAvatars({ row, T }: { row: Row; T: Theme }) {
  const a = row.items[0], b = row.items[1];
  const badge = BADGE[row.type];
  return (
    <View style={rowStyles.avatarBox}>
      {b ? (
        <>
          <View style={[rowStyles.stackTop, { borderColor: T.bg }]}><UserAvatar avatarUrl={a.fromAvatar} size={34} name={a.fromUsername} /></View>
          <View style={[rowStyles.stackBottom, { borderColor: T.bg }]}><UserAvatar avatarUrl={b.fromAvatar} size={34} name={b.fromUsername} /></View>
        </>
      ) : a.fromUsername ? (
        <UserAvatar avatarUrl={a.fromAvatar} size={48} isBot={a.fromUsername === 'kiongozi'} name={a.fromUsername} />
      ) : (
        <View style={[rowStyles.system, { backgroundColor: T.surface2 }]}>
          <Ionicons name="notifications" size={22} color={T.textSub} />
        </View>
      )}
      {badge && (
        <View style={[rowStyles.badge, { backgroundColor: badge.bg, borderColor: T.bg }]}>
          <Ionicons name={badge.icon} size={10} color={badge.fg} />
        </View>
      )}
    </View>
  );
}

/** A single reply notification shows what they said, with quick Like / Reply (like Threads). */
function ReplyActions({ item, T }: { item: SocialNotification; T: Theme }) {
  const navigation = useNavigation<any>();
  const replyId = item.data?.reply_id as string | undefined;
  const [liked, setLiked] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!replyId) return null;
  const like = async () => {
    if (busy) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const want = !liked;
    setLiked(want); setBusy(true);
    try {
      const r: any = await apiClient.likePost(replyId); // server toggles
      if (r?.success) setLiked(!!r.liked); else setLiked(!want);
    } catch { setLiked(!want); } finally { setBusy(false); }
  };
  return (
    <View style={rowStyles.replyActions}>
      <Pressable onPress={like} hitSlop={10} style={rowStyles.replyBtn} accessibilityRole="button" accessibilityLabel={liked ? 'Unlike reply' : 'Like reply'}>
        <Ionicons name={liked ? 'heart' : 'heart-outline'} size={19} color={liked ? '#FF3040' : T.textSub} />
      </Pressable>
      <Pressable
        onPress={() => navigation.navigate('PostDetail', { postId: replyId, focusReply: true })}
        hitSlop={10} style={rowStyles.replyBtn} accessibilityRole="button" accessibilityLabel="Reply"
      >
        <Ionicons name="chatbubble-outline" size={18} color={T.textSub} />
      </Pressable>
    </View>
  );
}

function NotificationRow({ row, onPress, onRemove, T }: { row: Row; onPress: () => void; onRemove: (id: string) => void; T: Theme }) {
  const first = row.items[0];
  const others = row.items.length - 1;
  const action: [string, string] | undefined = row.type === 'mention' && first.data?.story_id
    ? ['alikutaja kwenye story', 'walikutaja kwenye story'] : ACTION[row.type];
  const name = first.fromUsername || '';
  const hasPost = ['like', 'repost', 'comment', 'mention'].includes(row.type) && !!first.postId;
  const isRequest = row.type === 'follow_request' && !first.read;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [rowStyles.row, pressed && { backgroundColor: T.surface }]}>
      {row.unread && <View style={[rowStyles.unread, { backgroundColor: T.accent }]} accessibilityLabel="Unread" />}
      <ActorAvatars row={row} T={T} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[rowStyles.text, { color: T.text }]} numberOfLines={3}>
          {name && action ? (
            <>
              <Text style={rowStyles.name}>{name}</Text>
              {others > 0 && <Text>{` na wengine ${others}`}</Text>}
              <Text style={{ color: T.textSub }}>{` ${action[others > 0 ? 1 : 0]}`}</Text>
            </>
          ) : (
            <Text style={{ color: T.textSub }}>{first.message}</Text>
          )}
          <Text style={{ color: T.textMuted }}>{` · ${timeAgo(row.latest)}`}</Text>
        </Text>
        {row.type === 'comment' && others === 0 && !!first.data?.reply_text && (
          <>
            <Text style={[rowStyles.replyText, { color: T.text }]} numberOfLines={2}>{String(first.data.reply_text)}</Text>
            <ReplyActions item={first} T={T} />
          </>
        )}
        {isRequest && <FollowRequestButtons item={first} onRemove={onRemove} T={T} />}
      </View>
      {row.type === 'follow' && others === 0 && <FollowBack userId={first.fromUserId} T={T} />}
      {hasPost && <PostThumb postId={first.postId} T={T} />}
    </Pressable>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 16, minHeight: 68 },
  unread: { position: 'absolute', left: 5, top: '50%', width: 6, height: 6, borderRadius: 3, marginTop: -3 },
  avatarBox: { width: 48, height: 48 },
  stackTop: { position: 'absolute', left: 0, top: 0, borderWidth: 2, borderRadius: 19 },
  stackBottom: { position: 'absolute', right: -2, bottom: -2, borderWidth: 2, borderRadius: 19 },
  system: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', right: -4, bottom: -4, width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 15, lineHeight: 20 },
  replyText: { fontSize: 15, lineHeight: 20, marginTop: 2 },
  replyActions: { flexDirection: 'row', gap: 18, marginTop: 6 },
  replyBtn: { height: 28, minWidth: 28, justifyContent: 'center' },
  name: { fontWeight: '600' },
  // flexShrink 0: the text column (numberOfLines 3) gives way on narrow screens, not the button
  pill: { height: 34, paddingHorizontal: 16, borderRadius: 17, borderWidth: 0, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  pillText: { fontSize: 14, fontWeight: '700' },
});

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const T = useTheme();
  const styles = useMemo(() => makeStyles(T), [T]);
  const {
    notifications, unreadCount, isLoading, hasMore,
    fetchNotifications, markAllRead, markRead, addNotification, removeNotification,
  } = useNotificationStore();
  const [filter, setFilter] = useState('all');

  useEffect(() => { fetchNotifications(true); }, []);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'social_notifications', filter: `user_id=eq.${user.id}` },
        (payload) => { if (payload.new) addNotification(payload.new); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const unreadByFilter = useMemo(() => {
    const out: Record<string, number> = {};
    for (const f of FILTERS) out[f.id] = notifications.filter(n => !n.read && (!f.types || f.types.includes(n.type))).length;
    return out;
  }, [notifications]);

  const { onScroll, refreshControl, bubble, refreshing, onHeaderLayout } = useBubbleRefresh(
    () => fetchNotifications(true), T.accent, T.surface,
  );

  const sections = useMemo(() => {
    const types = FILTERS.find(f => f.id === filter)?.types;
    return buildSections(types ? notifications.filter(n => types.includes(n.type)) : notifications);
  }, [notifications, filter]);

  const open = (row: Row) => {
    row.items.forEach(n => { if (!n.read) markRead(n.id); });
    const item = row.items[0];
    if (item.type === 'dm' && item.conversationId) {
      navigation.navigate('DMConversation', { conversationId: item.conversationId, participantName: item.fromUsername || 'Message', participantUsername: item.fromUsername, participantAvatar: item.fromAvatar });
    } else if (item.data?.story_id && item.fromUserId) {
      // Mentioned in a story: watch it (falls back to their profile once it has expired)
      useStoryStore.getState().openUser(item.fromUserId).then(ok => {
        if (!ok && item.fromUsername) navigation.navigate('PublicProfile', { username: item.fromUsername });
      }).catch(() => {});
    } else if (item.postId) {
      navigation.navigate('PostDetail', { postId: item.postId });
    } else if (item.fromUsername) {
      navigation.navigate('PublicProfile', { username: item.fromUsername });
    }
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle} numberOfLines={1} maxFontSizeMultiplier={1.3}>Activity</Text>
        {unreadCount > 0 && (
          <Pressable
            onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); markAllRead(); }}
            style={({ pressed }) => [styles.markAll, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel="Mark all as read"
          >
            <Ionicons name="checkmark-done" size={20} color={T.text} />
          </Pressable>
        )}
      </View>

      <View onLayout={onHeaderLayout}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {FILTERS.map(f => {
            const on = filter === f.id;
            const count = f.id === 'all' ? 0 : unreadByFilter[f.id];
            return (
              <Pressable
                key={f.id}
                onPress={() => { Haptics.selectionAsync(); setFilter(f.id); }}
                style={[styles.chip, on ? { backgroundColor: T.text, borderColor: T.text } : { borderColor: T.border }]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Text style={[styles.chipText, { color: on ? T.bg : T.text }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>{f.label}</Text>
                {count > 0 && <View style={styles.chipCount}><Text style={styles.chipCountText} maxFontSizeMultiplier={1.15}>{count > 9 ? '9+' : count}</Text></View>}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {isLoading && notifications.length === 0 ? (
        <RowsSkeleton count={7} avatar={44} label="Loading activity" />
      ) : (
        <Animated.SectionList
          {...TAB_LIST_INSET}
          sections={sections}
          keyExtractor={r => r.key}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => <Text style={[styles.section, section === sections[0] && { paddingTop: 8 }]}>{section.title}</Text>}
          renderItem={({ item }) => (
            <NotificationRow row={item} T={T} onPress={() => open(item)} onRemove={(id) => { markRead(id); removeNotification?.(id); }} />
          )}
          onScroll={onScroll}
          scrollEventThrottle={16}
          refreshControl={refreshControl}
          onEndReached={() => { if (hasMore && !refreshing) fetchNotifications(false); }}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: T.surface }]}>
                <Ionicons name={filter === 'all' ? 'notifications-outline' : 'filter-outline'} size={32} color={T.textSub} />
              </View>
              <Text style={styles.emptyTitle}>{filter === 'all' ? "You're all caught up" : 'Nothing here yet'}</Text>
              <Text style={styles.emptySubtext}>
                {filter === 'all' ? 'Likes, replies, follows and mentions will show up here.' : 'Try another filter, or check back later.'}
              </Text>
            </View>
          }
          ListFooterComponent={isLoading && notifications.length > 0 && !refreshing ? <ActivityIndicator style={{ marginVertical: 24 }} color={T.accent} /> : <View style={{ height: 32 }} />}
        />
      )}
      {bubble}
    </View>
  );
}

function makeStyles(T: Theme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: T.bg },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 6 },
    headerTitle: { fontSize: 30, color: T.text, letterSpacing: -0.8, fontFamily: 'SpaceGrotesk_700Bold' },
    markAll: { width: 44, height: 44, borderRadius: 22, backgroundColor: T.surface2, alignItems: 'center', justifyContent: 'center' },
    chips: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10, gap: 8 },
    chip: { height: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
    chipText: { fontSize: 14, fontWeight: '600' },
    chipCount: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#FF3040', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
    chipCountText: { color: '#fff', fontSize: 11, fontWeight: '800' },
    section: { color: T.text, fontSize: 15, fontWeight: '700', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 2 },
    skelRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
    skelAvatar: { width: 48, height: 48, borderRadius: 24 },
    skelLine: { height: 12, borderRadius: 6 },
    empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40, gap: 12 },
    emptyIcon: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center' },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: T.text },
    emptySubtext: { fontSize: 14, color: T.textMuted, textAlign: 'center', lineHeight: 21 },
  });
}
