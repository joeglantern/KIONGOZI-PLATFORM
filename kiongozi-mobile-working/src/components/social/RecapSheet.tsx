// "Your week" recap (Spotify Wrapped idea): the server draws a card from the last 7 days
// (likes, followers, streak, top post). Add it to your story, post it, or send it out.
import React, { useEffect, useState } from 'react';
import { View, Text, Image, Modal, Pressable, StyleSheet, ActivityIndicator, Share, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiClient from '../../utils/apiClient';
import { useTheme } from '../../hooks/useTheme';
import { useStoryStore } from '../../stores/storyStore';
import { useSocialStore } from '../../stores/socialStore';

let cachedPreview: { at: number; uri: string } | null = null; // the week changes slowly; reuse for 10 min

function rangeLabel() {
  const end = new Date();
  const start = new Date(end.getTime() - 6 * 24 * 3600 * 1000);
  const m = (d: Date) => d.toLocaleString('en-GB', { month: 'short' });
  return m(start) === m(end) ? `${start.getDate()}–${end.getDate()} ${m(end)}` : `${start.getDate()} ${m(start)} – ${end.getDate()} ${m(end)}`;
}

export function RecapSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const T = useTheme();
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const [uri, setUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<null | 'story' | 'post' | 'more'>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) { setDone(null); setBusy(null); return; }
    if (cachedPreview && Date.now() - cachedPreview.at < 10 * 60 * 1000) { setUri(cachedPreview.uri); return; }
    setLoading(true);
    apiClient.getRecapCard(true).then((r: any) => {
      if (r?.success && r.data?.uri) { cachedPreview = { at: Date.now(), uri: r.data.uri }; setUri(r.data.uri); }
      else setDone(r?.error || 'Could not load your week');
    }).catch(() => setDone('Could not load your week')).finally(() => setLoading(false));
  }, [visible]);

  const finish = (msg: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setDone(msg);
    setTimeout(onClose, 900);
  };

  const makeFull = async () => {
    const r: any = await apiClient.getRecapCard(false);
    if (!r?.success || !r.data?.url) throw new Error(r?.error || 'Could not make your recap');
    return r.data as { url: string; storage_path: string; width: number; height: number };
  };

  const toStory = async () => {
    setBusy('story');
    try {
      const c = await makeFull();
      const res: any = await apiClient.createStory({
        media_type: 'image', media_url: c.url, storage_path: c.storage_path, width: c.width, height: c.height, overlays: [], audience: 'everyone',
      });
      if (!res?.success) throw new Error(res?.error || 'Could not post');
      useStoryStore.getState().fetchFeed().catch(() => {});
      finish('Added to your story');
    } catch (e: any) { setDone(e?.message || 'Something went wrong'); setBusy(null); }
  };

  const toPost = async () => {
    setBusy('post');
    try {
      const c = await makeFull();
      const res: any = await apiClient.createPost('Wiki yangu kwenye KChat 📊 #WikiYangu', [{ media_type: 'image', url: c.url, storage_path: c.storage_path, width: c.width, height: c.height }]);
      if (!res?.success) throw new Error(res?.error || 'Could not post');
      if (res.data) useSocialStore.getState().prependPost(res.data);
      finish('Posted to your feed');
    } catch (e: any) { setDone(e?.message || 'Something went wrong'); setBusy(null); }
  };

  const toMore = async () => {
    setBusy('more');
    try {
      const c = await makeFull();
      setBusy(null);
      await Share.share({ url: c.url, message: `My week on KChat 📊\n${c.url}` });
    } catch { setBusy(null); }
  };

  const maxH = Math.max(240, H - insets.top - insets.bottom - 230);
  const pw = Math.min(W - 96, maxH * (9 / 16));
  const ph = pw * (16 / 9);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: T.bg, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.head}>
          <View>
            <Text style={[styles.title, { color: T.text }]}>Your week</Text>
            <Text style={[styles.sub, { color: T.textSub }]}>{rangeLabel()} · new every Monday</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10} style={[styles.close, { backgroundColor: T.surface2 }]} accessibilityLabel="Close">
            <Ionicons name="close" size={18} color={T.text} />
          </Pressable>
        </View>

        <View style={styles.previewWrap}>
          <View style={[styles.preview, { width: pw, height: ph, backgroundColor: T.surface }]}>
            {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel="Your week recap card" /> : null}
            {loading && <View style={styles.loading}><ActivityIndicator color={T.text} /></View>}
          </View>
        </View>

        {done ? (
          <View style={styles.doneRow}>
            <Ionicons name="checkmark-circle" size={20} color={T.accent} />
            <Text style={[styles.doneText, { color: T.text }]}>{done}</Text>
          </View>
        ) : (
          <View style={styles.actions}>
            <Pressable onPress={toStory} disabled={!!busy || !uri} style={({ pressed }) => [styles.primary, { backgroundColor: T.text }, (pressed || !!busy || !uri) && { opacity: 0.8 }]}>
              {busy === 'story' ? <ActivityIndicator color={T.bg} /> : <Ionicons name="add-circle" size={20} color={T.bg} />}
              <Text style={[styles.primaryText, { color: T.bg }]}>Add to story</Text>
            </Pressable>
            <Pressable onPress={toPost} disabled={!!busy || !uri} style={({ pressed }) => [styles.secondary, { backgroundColor: T.surface2 }, (pressed || !!busy) && { opacity: 0.8 }]} accessibilityLabel="Post to feed">
              {busy === 'post' ? <ActivityIndicator color={T.text} /> : <Ionicons name="create-outline" size={20} color={T.text} />}
            </Pressable>
            <Pressable onPress={toMore} disabled={!!busy || !uri} style={({ pressed }) => [styles.secondary, { backgroundColor: T.surface2 }, (pressed || !!busy) && { opacity: 0.8 }]} accessibilityLabel="Share to other apps">
              {busy === 'more' ? <ActivityIndicator color={T.text} /> : <Ionicons name="paper-plane-outline" size={20} color={T.text} />}
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 16 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 18, paddingBottom: 8 },
  title: { fontSize: 17, fontWeight: '700' },
  sub: { fontSize: 13, marginTop: 2 },
  close: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  previewWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  preview: { borderRadius: 20, overflow: 'hidden' },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.18)' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  primary: { flex: 1, height: 52, borderRadius: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryText: { fontSize: 16, fontWeight: '700' },
  secondary: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  doneRow: { height: 52, marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  doneText: { fontSize: 16, fontWeight: '600' },
});
