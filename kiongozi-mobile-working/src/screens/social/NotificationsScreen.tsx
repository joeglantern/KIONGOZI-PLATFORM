// Activity: notifications grouped like modern apps ("mercy and 12 others liked your post"),
// split into New / Today / This week / Earlier, with filter chips, post previews and Follow back.
// Follow requests live in a pinned card at the top (and their own screen), not in the feed.
import React, { useEffect, useMemo, useState } from 'react';
import { TAB_LIST_INSET } from '../../navigation/tabInset';
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator, Image, ScrollView, Animated, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useNotificationStore, SocialNotification } from '../../stores/notificationStore';
import { useAuthStore } from '../../stores/authStore';
import { useSocialStore } from '../../stores/socialStore';
import { toggleInteraction } from '../../stores/interactionSync';
import { useFollowState, toggleFollow } from '../../stores/followSync';
import { supabase } from '../../utils/supabaseClient';
import { UserAvatar } from '../../components/social/UserAvatar';
import { BottomSheet } from '../../components/social/BottomSheet';
import apiClient from '../../utils/apiClient';
import { useBarazaStore } from '../../stores/barazaStore';
import { useStoryStore } from '../../stores/storyStore';
import { useTheme } from '../../hooks/useTheme';
import { useThemeStore } from '../../stores/themeStore';
import { RowsSkeleton } from '../../components/social/Skeleton';
import { useBubbleRefresh } from '../../components/social/RefreshBubble';
import { selectFollowRequests } from './FollowRequestsScreen';

type Theme = ReturnType<typeof useTheme>;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "now", "2m", "1h" inside the last day; a weekday ("Tue") this week; "Oct 3" before that */
function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  if (hrs < 24 * 7) return WEEKDAYS[d.getDay()];
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** Unread rows get a soft green wash instead of a dot */
const UNREAD_LIGHT = '#F7FBF7';
const UNREAD_DARK = 'rgba(92,184,92,0.08)';

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
  like: ['liked your post', 'liked your post'],
  repost: ['reposted your post', 'reposted your post'],
  comment: ['replied', 'replied'],
  mention: ['mentioned you in a post', 'mentioned you in a post'],
  follow: ['started following you', 'started following you'],
  follow_request: ['wants to follow you', 'want to follow you'],
  dm: ['sent you a message', 'sent you messages'],
  baraza_live: ['is live in a baraza', 'are live in barazas'],
};

// Title of the "who did this" sheet per kind
const SHEET_TITLE: Record<string, string> = {
  like: 'Liked by', repost: 'Reposted by', follow: 'New followers', comment: 'Replies from', mention: 'Mentioned by',
};

const FILTERS: { id: string; label: string; types: string[] | null }[] = [
  { id: 'all', label: 'All', types: null },
  { id: 'mentions', label: 'Mentions', types: ['mention'] },
  { id: 'replies', label: 'Replies', types: ['comment'] },
  { id: 'likes', label: 'Likes', types: ['like'] },
  { id: 'follows', label: 'Follows', types: ['follow'] },
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
  img: { width: 44, height: 44, borderRadius: 8 },
  text: { width: 44, height: 44, borderRadius: 8, padding: 5, overflow: 'hidden' },
  textInner: { fontSize: 8, lineHeight: 10 },
});

/** Follow pill: flips to Following (Requested for a private account) at once; followSync settles it */
function FollowPill({ userId, username, seedFollowing, backLabel, T }: { userId?: string; username?: string; seedFollowing?: boolean; backLabel?: string; T: Theme }) {
  const seed = { isFollowing: !!seedFollowing, username };
  const status = useFollowState(userId, seed).status;
  if (!userId) return null;
  const done = status !== 'none';
  const label = status === 'following' ? 'Following' : status === 'requested' ? 'Requested' : (backLabel || 'Follow');
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        toggleFollow(userId, seed);
      }}
      style={({ pressed }) => [rowStyles.pill, done ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: T.border, paddingHorizontal: 15 } : { backgroundColor: T.text }, pressed && { opacity: 0.8 }]}
      accessibilityRole="button"
      accessibilityLabel={status === 'requested' ? 'Cancel follow request' : done ? 'Unfollow' : (backLabel || 'Follow')}
    >
      <Text style={[rowStyles.pillText, { color: done ? T.text : T.bg }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>{label}</Text>
    </Pressable>
  );
}

function ActorAvatars({ row, T, ringColor }: { row: Row; T: Theme; ringColor?: string }) {
  const ring = ringColor || T.bg;
  const a = row.items[0], b = row.items[1];
  const badge = BADGE[row.type];
  return (
    <View style={rowStyles.avatarBox}>
      {b ? (
        // Two people: a 34px overlap stack instead of one avatar
        <>
          <View style={[rowStyles.stackTop, { borderColor: ring }]}><UserAvatar avatarUrl={a.fromAvatar} size={34} name={a.fromUsername} /></View>
          <View style={[rowStyles.stackBottom, { borderColor: ring }]}><UserAvatar avatarUrl={b.fromAvatar} size={34} name={b.fromUsername} /></View>
        </>
      ) : a.fromUsername ? (
        <UserAvatar avatarUrl={a.fromAvatar} size={48} isBot={a.fromUsername === 'kiongozi'} name={a.fromUsername} />
      ) : (
        <View style={[rowStyles.system, { backgroundColor: T.surface2 }]}>
          <Ionicons name="notifications" size={22} color={T.textSub} />
        </View>
      )}
      {badge && (
        <View style={[rowStyles.badge, { backgroundColor: badge.bg, borderColor: ring }]}>
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
  // The reply's like lives in the shared interaction store, like every other post
  const liked = useSocialStore(s => (replyId ? s.postInteractions[replyId]?.isLiked : false)) ?? false;
  useEffect(() => {
    if (replyId && !useSocialStore.getState().postInteractions[replyId]) {
      useSocialStore.getState().seedInteraction({ id: replyId, isLiked: false, like_count: 0, isBookmarked: false, isReposted: false, repost_count: 0 } as any);
    }
  }, [replyId]);
  if (!replyId) return null;
  const like = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (!useSocialStore.getState().postInteractions[replyId]) {
      useSocialStore.getState().seedInteraction({ id: replyId, isLiked: false, like_count: 0, isBookmarked: false, isReposted: false, repost_count: 0 } as any);
    }
    toggleInteraction(replyId, 'like');
  };
  return (
    <View style={rowStyles.replyActions}>
      <Pressable onPress={like} hitSlop={10} style={rowStyles.replyBtn} accessibilityRole="button" accessibilityLabel={liked ? 'Unlike reply' : 'Like reply'}>
        <Text style={[rowStyles.replyBtnText, { color: liked ? '#FF3040' : T.textMuted }]} maxFontSizeMultiplier={1.2}>{liked ? 'Liked' : 'Like'}</Text>
      </Pressable>
      <Text style={[rowStyles.replyBtnText, { color: T.textMuted }]} importantForAccessibility="no">·</Text>
      <Pressable
        onPress={() => navigation.navigate('PostDetail', { postId: replyId, focusReply: true })}
        hitSlop={10} style={rowStyles.replyBtn} accessibilityRole="button" accessibilityLabel="Reply"
      >
        <Text style={[rowStyles.replyBtnText, { color: T.textMuted }]} maxFontSizeMultiplier={1.2}>Reply</Text>
      </Pressable>
    </View>
  );
}

function NotificationRow({ row, onPress, onOthers, onRemove, T }: {
  row: Row; onPress: () => void; onOthers: () => void; onRemove: () => void; T: Theme;
}) {
  const first = row.items[0];
  const others = row.items.length - 1;
  const action: [string, string] | undefined = row.type === 'mention' && first.data?.story_id
    ? ['mentioned you in a story', 'mentioned you in a story']
    : row.type === 'mention' && first.data?.baraza_id ? ['mentioned you in a baraza', 'mentioned you in a baraza'] : ACTION[row.type];
  const name = first.fromUsername || '';
  const hasPost = ['like', 'repost', 'comment', 'mention'].includes(row.type) && !!first.postId;
  const isDark = useThemeStore(s => s.isDark);
  const rest = row.unread ? (isDark ? UNREAD_DARK : UNREAD_LIGHT) : T.bg;

  // Swipe left: Remove (local; the API has no delete for notifications yet)
  const remove = () => (
    <Pressable onPress={() => { Haptics.selectionAsync().catch(() => {}); onRemove(); }}
      style={rowStyles.swipeBtn} accessibilityRole="button" accessibilityLabel="Remove notification">
      <Ionicons name="close" size={22} color="#fff" />
      <Text style={rowStyles.swipeText}>Remove</Text>
    </Pressable>
  );

  return (
    <ReanimatedSwipeable renderRightActions={remove} friction={1.6} rightThreshold={40} overshootRight={false}>
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [rowStyles.row, { backgroundColor: pressed ? T.surface : rest }]}
      accessibilityHint={row.unread ? 'Unread' : undefined}
    >
      <ActorAvatars row={row} T={T} ringColor={row.unread ? rest : T.bg} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[rowStyles.text, { color: T.text }]} numberOfLines={3}>
          {name && action ? (
            <>
              <Text style={rowStyles.name}>@{name}</Text>
              {others > 0 && (
                <>
                  <Text>{' and '}</Text>
                  <Text onPress={onOthers} style={[rowStyles.others, { color: T.text }]} accessibilityRole="button" accessibilityLabel={`See all ${others + 1} people`}>
                    {`${others} ${others === 1 ? 'other' : 'others'}`}
                  </Text>
                </>
              )}
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
      </View>
      {row.type === 'follow' && others === 0 && <FollowPill userId={first.fromUserId} username={first.fromUsername} backLabel="Follow back" T={T} />}
      {hasPost && <PostThumb postId={first.postId} T={T} />}
    </Pressable>
    </ReanimatedSwipeable>
  );
}

/** Pinned card at the top: who is waiting to follow you */
function FollowRequestsCard({ requests, onPress, T }: { requests: SocialNotification[]; onPress: () => void; T: Theme }) {
  const first = requests[0];
  const unseen = requests.some(r => !r.read);
  const others = requests.length - 1;
  const who = first.fromUsername ? `@${first.fromUsername}` : 'Someone';
  const sub = others > 0 ? `${who} and ${others} ${others === 1 ? 'other' : 'others'}` : who;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [cardStyles.card, { backgroundColor: T.surface2 }, pressed && { opacity: 0.85 }]}
      accessibilityRole="button"
      accessibilityLabel={`Follow requests, ${sub}${unseen ? ', new' : ''}`}
    >
      <View style={[cardStyles.stack, { width: 40 + Math.min(requests.length - 1, 2) * 22 }]}>
        {requests.slice(0, 3).map((r, i) => (
          <View key={r.id} style={[cardStyles.stackItem, { left: i * 22, zIndex: 3 - i, borderColor: T.surface2 }]}>
            <UserAvatar avatarUrl={r.fromAvatar} size={40} name={r.fromUsername} />
          </View>
        ))}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[cardStyles.title, { color: T.text }]} maxFontSizeMultiplier={1.2}>Follow requests</Text>
          {unseen && <View style={[cardStyles.dot, { backgroundColor: T.accent }]} />}
        </View>
        <Text style={[cardStyles.sub, { color: T.textSub }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={T.textMuted} />
    </Pressable>
  );
}
const cardStyles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginTop: 4, marginBottom: 6, padding: 12, borderRadius: 18 },
  stack: { height: 44, justifyContent: 'center' },
  stackItem: { position: 'absolute', top: 0, borderWidth: 2, borderRadius: 22 },
  title: { fontSize: 15.5, fontWeight: '700' },
  sub: { fontSize: 13.5, marginTop: 2 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
});

/** Everyone in a grouped row, with a Follow pill each */
function ActorsSheet({ row, onClose, T }: { row: Row | null; onClose: () => void; T: Theme }) {
  const navigation = useNavigation<any>();
  const { height } = useWindowDimensions();
  return (
    <BottomSheet visible={!!row} onClose={onClose} title={row ? (SHEET_TITLE[row.type] || 'People') : undefined} actions={[]}>
      {row && (
        <ScrollView style={{ maxHeight: height * 0.55 }} showsVerticalScrollIndicator={false}>
          {row.items.map(n => {
            const name = (n.data?.from_full_name as string) || n.fromUsername || 'Someone';
            return (
              <View key={n.id} style={sheetStyles.row}>
                <Pressable
                  style={sheetStyles.person}
                  onPress={() => { onClose(); if (n.fromUsername) navigation.navigate('PublicProfile', { username: n.fromUsername }); }}
                  accessibilityRole="button" accessibilityLabel={`${name}'s profile`}
                >
                  <UserAvatar avatarUrl={n.fromAvatar} size={44} name={name} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[sheetStyles.name, { color: T.text }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>{name}</Text>
                    {n.fromUsername ? <Text style={[sheetStyles.handle, { color: T.textSub }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>@{n.fromUsername}</Text> : null}
                  </View>
                </Pressable>
                <FollowPill userId={n.fromUserId} username={n.fromUsername} seedFollowing={!!n.data?.is_following} T={T} />
              </View>
            );
          })}
        </ScrollView>
      )}
    </BottomSheet>
  );
}
const sheetStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 8 },
  person: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontSize: 15.5, fontWeight: '600' },
  handle: { fontSize: 13, marginTop: 1 },
});

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 16, minHeight: 68 },
  avatarBox: { width: 48, height: 48 },
  stackTop: { position: 'absolute', left: 0, top: 0, borderWidth: 2, borderRadius: 19 },
  stackBottom: { position: 'absolute', right: -2, bottom: -2, borderWidth: 2, borderRadius: 19 },
  system: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', right: -4, bottom: -4, width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 15, lineHeight: 20 },
  replyText: { fontSize: 15, lineHeight: 20, marginTop: 2 },
  replyActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  replyBtn: { height: 28, minWidth: 28, justifyContent: 'center' },
  replyBtnText: { fontSize: 13, fontWeight: '500' },
  name: { fontWeight: '600' },
  others: { fontWeight: '700' },
  swipeBtn: { width: 84, backgroundColor: '#FF3B30', alignItems: 'center', justifyContent: 'center', gap: 4 },
  swipeText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
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
    fetchNotifications, markAllRead, markRead, addNotification, dismiss,
  } = useNotificationStore();
  const [filter, setFilter] = useState('all');
  const [actorsRow, setActorsRow] = useState<Row | null>(null);

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

  // Follow requests sit in the pinned card, not in the feed
  const requests = useMemo(() => selectFollowRequests(notifications), [notifications]);
  const feed = useMemo(() => notifications.filter(n => n.type !== 'follow_request'), [notifications]);

  const unreadByFilter = useMemo(() => {
    const out: Record<string, number> = {};
    for (const f of FILTERS) out[f.id] = feed.filter(n => !n.read && (!f.types || f.types.includes(n.type))).length;
    return out;
  }, [feed]);

  const { onScroll, refreshControl, bubble, refreshing, onHeaderLayout } = useBubbleRefresh(
    () => fetchNotifications(true), T.accent, T.surface,
  );

  const sections = useMemo(() => {
    const types = FILTERS.find(f => f.id === filter)?.types;
    return buildSections(types ? feed.filter(n => types.includes(n.type)) : feed);
  }, [feed, filter]);

  const open = (row: Row) => {
    row.items.forEach(n => { if (!n.read) markRead(n.id); });
    const item = row.items[0];
    if (item.data?.kind === 'new_login') {
      // New sign-in alert: see the devices and log the stranger out
      navigation.navigate('Profile', { screen: 'Devices', initial: false });
    } else if (item.type === 'dm' && item.conversationId) {
      navigation.navigate('DMConversation', { conversationId: item.conversationId, participantName: item.fromUsername || 'Message', participantUsername: item.fromUsername, participantAvatar: item.fromAvatar });
    } else if (item.data?.baraza_id) {
      // Live: open the room. Over: the store shows the minutes instead.
      useBarazaStore.getState().open(item.data.baraza_id);
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

  const openRequests = () => {
    Haptics.selectionAsync().catch(() => {});
    navigation.navigate('FollowRequests');
  };

  const showRequestsCard = requests.length > 0 && (filter === 'all' || filter === 'follows');

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle} numberOfLines={1} maxFontSizeMultiplier={1.3} accessibilityRole="header">Activity</Text>
        {unreadCount > 0 && (
          <Pressable
            onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); markAllRead(); }}
            hitSlop={10}
            style={({ pressed }) => [styles.markAll, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityLabel="Mark all as read"
          >
            <Text style={styles.markAllText} maxFontSizeMultiplier={1.2}>Mark all read</Text>
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
          ListHeaderComponent={showRequestsCard ? <FollowRequestsCard requests={requests} onPress={openRequests} T={T} /> : null}
          renderSectionHeader={({ section }) => <Text style={[styles.section, section === sections[0] && { paddingTop: 8 }]} accessibilityRole="header">{section.title.toUpperCase()}</Text>}
          renderItem={({ item }) => (
            <NotificationRow
              row={item}
              T={T}
              onPress={() => open(item)}
              onOthers={() => { Haptics.selectionAsync().catch(() => {}); setActorsRow(item); }}
              onRemove={() => item.items.forEach(n => dismiss(n.id))}
            />
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

      <ActorsSheet row={actorsRow} onClose={() => setActorsRow(null)} T={T} />
    </View>
  );
}

function makeStyles(T: Theme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: T.bg },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 20, paddingBottom: 6 },
    headerTitle: { flex: 1, fontSize: 34, lineHeight: 41, color: T.text, letterSpacing: 0.37, fontWeight: '800' },
    markAll: { paddingBottom: 8, paddingLeft: 12 },
    markAllText: { fontSize: 15, fontWeight: '600', color: T.accentDeep },
    chips: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10, gap: 8 },
    chip: { height: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
    chipText: { fontSize: 14, fontWeight: '600' },
    chipCount: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#FF3040', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
    chipCountText: { color: '#fff', fontSize: 11, fontWeight: '800' },
    section: { color: T.textMuted, fontSize: 13, fontWeight: '600', letterSpacing: -0.08, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
    empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40, gap: 12 },
    emptyIcon: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center' },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: T.text },
    emptySubtext: { fontSize: 14, color: T.textMuted, textAlign: 'center', lineHeight: 21 },
  });
}
