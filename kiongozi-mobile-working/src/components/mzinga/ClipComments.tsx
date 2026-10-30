// Comments for a clip, inside the player (TikTok/Reels style): the sheet rises, the clip shrinks
// to the top and keeps playing, and you never leave the reel. Comments are the post's replies.
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput, FlatList, ActivityIndicator, Keyboard, Platform, useWindowDimensions,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS, FadeIn } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiClient from '../../utils/apiClient';
import { appAlert } from '../../utils/alert';
import { useAuthStore } from '../../stores/authStore';
import { useProfileStore } from '../../stores/profileStore';
import type { Post } from '../../stores/socialStore';
import { UserAvatar } from '../social/UserAvatar';

const HONEY = '#F2B544';

const ago = (iso: string) => {
  const s = Math.max(1, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
};

export function ClipComments({ post, open, onClose, onCount, bottomInset = 0 }: {
  post: Post | null; open: boolean; onClose: () => void; onCount: (postId: string, n: number) => void;
  /** room under the input for a bar floating over the screen (the iPhone tab bar in Mitaa) */
  bottomInset?: number;
}) {
  const { height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const sheetH = Math.round(H * 0.64);
  // Extra room the floating bar needs beyond the home indicator space the input already leaves
  const extra = Math.max(0, bottomInset - insets.bottom);
  const y = useSharedValue(sheetH + extra + 40);
  const [rows, setRows] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [kb, setKb] = useState(0);
  const cursor = useRef<string | null>(null);
  const loadedFor = useRef<string | null>(null);
  const me = useProfileStore(s => s.currentUserProfile);
  const user = useAuthStore(s => s.user);

  useEffect(() => {
    y.value = open ? withSpring(0, { damping: 22, stiffness: 220 }) : withTiming(sheetH + extra + 40, { duration: 220 });
    if (!open) Keyboard.dismiss();
  }, [open, sheetH, extra, y]);

  // Load when opened for a new clip
  useEffect(() => {
    if (!open || !post || loadedFor.current === post.id) return;
    loadedFor.current = post.id;
    cursor.current = null;
    setRows([]);
    load(post.id, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, post?.id]);

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', e => setKb(e.endCoordinates.height));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKb(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const load = async (id: string, first = false) => {
    if (loading) return;
    setLoading(true);
    const r: any = await apiClient.getPostReplies(id, first ? undefined : cursor.current || undefined);
    if (r.success && loadedFor.current === id) {
      setRows(prev => (first ? r.data : [...prev, ...r.data]));
      cursor.current = r.nextCursor ?? null;
    }
    setLoading(false);
  };

  const send = async () => {
    const t = text.trim();
    if (!t || !post || sending) return;
    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const temp: any = {
      id: `tmp-${Date.now()}`, content: t, created_at: new Date().toISOString(), user_id: user?.id,
      profiles: { id: user?.id, username: me?.username, full_name: me?.full_name, avatar_url: me?.avatar_url },
    };
    setRows(prev => [...prev, temp]);
    setText('');
    const r: any = await apiClient.replyToPost(post.id, t);
    setSending(false);
    if (r.success && r.data) {
      setRows(prev => prev.map(x => (x.id === temp.id ? { ...temp, ...r.data, profiles: r.data.profiles || temp.profiles } : x)));
      onCount(post.id, 1);
    } else {
      setRows(prev => prev.filter(x => x.id !== temp.id));
      setText(t);
      appAlert('Could not comment', r.error || 'Try again.');
    }
  };

  const drag = Gesture.Pan()
    .onUpdate(e => { y.value = Math.max(0, e.translationY); })
    .onEnd(e => {
      if (e.translationY > 120 || e.velocityY > 900) runOnJS(onClose)();
      else y.value = withSpring(0, { damping: 22, stiffness: 220 });
    });

  const sheet = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const scrim = useAnimatedStyle(() => ({ opacity: 1 - Math.min(1, y.value / sheetH) }));
  const count = post?.comment_count ?? rows.length;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={open ? 'box-none' : 'none'}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrim]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close comments" />
      </Animated.View>
      <Animated.View style={[styles.sheet, { height: Math.min(sheetH + (kb || extra), H - insets.top - 24), paddingBottom: kb ? kb : 0 }, sheet]}>
        <GestureDetector gesture={drag}>
          <View style={styles.head}>
            <View style={styles.grabber} />
            <Text style={styles.title}>{count > 0 ? `${count} comment${count === 1 ? '' : 's'}` : 'Comments'}</Text>
          </View>
        </GestureDetector>

        <FlatList
          data={rows}
          keyExtractor={r => r.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          onEndReached={() => { if (cursor.current && post) load(post.id); }}
          ListEmptyComponent={loading ? (
            <ActivityIndicator color={HONEY} style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No comments yet</Text>
              <Text style={styles.emptySub}>Say something nice to start it off.</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <Animated.View entering={FadeIn.duration(160)} style={[styles.row, item.id.startsWith('tmp-') && { opacity: 0.6 }]}>
              <UserAvatar avatarUrl={item.profiles?.avatar_url} name={item.profiles?.full_name || item.profiles?.username} size={34} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.meta}>
                  <Text style={styles.name}>{item.profiles?.username}</Text>  {ago(item.created_at)}
                </Text>
                <Text style={styles.body}>{item.content}</Text>
              </View>
            </Animated.View>
          )}
        />

        <View style={[styles.inputBar, { paddingBottom: kb ? 8 : Math.max(insets.bottom, bottomInset, 12) }]}>
          <UserAvatar avatarUrl={me?.avatar_url} name={me?.full_name || me?.username} size={32} />
          <View style={styles.pill}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Add a comment…"
              placeholderTextColor="rgba(255,255,255,0.4)"
              style={styles.input}
              multiline
              maxLength={500}
            />
            {text.trim().length > 0 && (
              <Pressable onPress={send} disabled={sending} style={styles.send} accessibilityLabel="Post comment">
                <Ionicons name="arrow-up" size={17} color="#1A1206" />
              </Pressable>
            )}
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { backgroundColor: 'rgba(0,0,0,0.25)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#16130E', borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: 'hidden' },
  head: { alignItems: 'center', paddingTop: 8, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.08)' },
  grabber: { width: 38, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)', marginBottom: 8 },
  title: { color: '#fff', fontSize: 15, fontWeight: '700' },
  row: { flexDirection: 'row', paddingVertical: 10 },
  meta: { color: 'rgba(255,255,255,0.45)', fontSize: 12.5 },
  name: { color: 'rgba(255,255,255,0.75)', fontWeight: '700' },
  body: { color: '#fff', fontSize: 15, lineHeight: 20, marginTop: 2 },
  empty: { alignItems: 'center', marginTop: 50 },
  emptyTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  emptySub: { color: 'rgba(255,255,255,0.5)', fontSize: 13.5, marginTop: 4 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 12, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.08)' },
  pill: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', minHeight: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.08)', paddingLeft: 14, paddingRight: 4, paddingVertical: 3 },
  input: { flex: 1, color: '#fff', fontSize: 15.5, lineHeight: 20, maxHeight: 100, paddingTop: Platform.OS === 'ios' ? 7 : 4, paddingBottom: Platform.OS === 'ios' ? 7 : 4 },
  send: { width: 30, height: 30, borderRadius: 15, backgroundColor: HONEY, alignItems: 'center', justifyContent: 'center', marginLeft: 6, marginBottom: 1 },
});
