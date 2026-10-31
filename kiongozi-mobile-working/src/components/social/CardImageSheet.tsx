// A server-drawn card (baraza minutes, a post) shown as the real image, then added to your story
// or sent to other apps as a picture. Same pattern as the AI ShareCardSheet, without skins.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, Modal, Pressable, StyleSheet, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiClient from '../../utils/apiClient';
import { useTheme } from '../../hooks/useTheme';
import { useStoryStore } from '../../stores/storyStore';
import { shareImageFile } from '../../utils/shareImage';
import { toast } from '../../utils/alert';

type Full = { url: string; storage_path: string; width: number; height: number; share_url?: string };
type Res = { success: boolean; data?: any; error?: string };

export function CardImageSheet({ visible, title, ratio, cacheKey, load, shareText, onClose }: {
  visible: boolean;
  title: string;
  /** width / height of the card */
  ratio: number;
  /** previews are kept per key while the app runs */
  cacheKey: string;
  load: (preview: boolean) => Promise<Res>;
  shareText?: string;
  onClose: () => void;
}) {
  const T = useTheme();
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const [uri, setUri] = useState<string | null>(previews.get(cacheKey) ?? null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | 'story' | 'share'>(null);
  const [done, setDone] = useState<string | null>(null);
  const full = useRef<Full | null>(null);
  const req = useRef(0);

  useEffect(() => {
    if (!visible) { setDone(null); setBusy(null); return; }
    full.current = null;
    const hit = previews.get(cacheKey);
    if (hit) { setUri(hit); return; }
    const id = ++req.current;
    setUri(null); setErr(null); setLoading(true);
    load(true).then(r => {
      if (id !== req.current) return;
      if (r?.success && r.data?.uri) { previews.set(cacheKey, r.data.uri); setUri(r.data.uri); }
      else setErr(r?.error || 'Could not make the card');
    }).catch(() => { if (id === req.current) setErr('Could not make the card'); })
      .finally(() => { if (id === req.current) setLoading(false); });
  }, [visible, cacheKey]);

  const makeFull = async () => {
    if (full.current) return full.current;
    const r = await load(false);
    if (!r?.success || !r.data?.url) throw new Error(r?.error || 'Could not make the card');
    full.current = r.data as Full;
    return full.current;
  };

  const toStory = async () => {
    setBusy('story');
    try {
      const c = await makeFull();
      const res: any = await apiClient.createStory({
        media_type: 'image', media_url: c.url, storage_path: c.storage_path, width: c.width, height: c.height,
        overlays: [], audience: 'everyone',
      });
      if (!res?.success) throw new Error(res?.error || 'Could not post');
      useStoryStore.getState().fetchFeed().catch(() => {});
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setDone('Added to your story');
      setTimeout(onClose, 900);
    } catch (e: any) { setBusy(null); toast(e?.message || 'Something went wrong', { kind: 'error' }); }
  };

  const toApps = async () => {
    setBusy('share');
    try {
      const c = await makeFull();
      setBusy(null);
      await shareImageFile(c.url, [shareText, c.share_url].filter(Boolean).join('\n'));
    } catch (e: any) { setBusy(null); toast(e?.message || 'Something went wrong', { kind: 'error' }); }
  };

  const maxH = Math.max(240, H - insets.top - insets.bottom - 230);
  const pw = Math.min(W - 64, maxH * ratio);
  const ph = pw / ratio;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: T.bg, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.head}>
          <Text style={[styles.title, { color: T.text }]}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={10} style={[styles.close, { backgroundColor: T.surface2 }]} accessibilityLabel="Close">
            <Ionicons name="close" size={18} color={T.text} />
          </Pressable>
        </View>

        <View style={styles.previewWrap}>
          <View style={[styles.preview, { width: pw, height: ph, backgroundColor: T.surface }]}>
            {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel="Card preview" /> : null}
            {loading ? <View style={styles.center}><ActivityIndicator color={T.text} /></View> : null}
            {err && !uri ? <View style={styles.center}><Text style={[styles.err, { color: T.textSub }]}>{err}</Text></View> : null}
          </View>
        </View>

        {done ? (
          <View style={styles.doneRow}>
            <Ionicons name="checkmark-circle" size={20} color={T.accent} />
            <Text style={[styles.doneText, { color: T.text }]}>{done}</Text>
          </View>
        ) : (
          <View style={styles.actions}>
            <Pressable onPress={toStory} disabled={!!busy || !!err} accessibilityRole="button"
              style={({ pressed }) => [styles.primary, { backgroundColor: T.text }, (pressed || !!busy || !!err) && { opacity: 0.75 }]}>
              {busy === 'story' ? <ActivityIndicator color={T.bg} /> : <Ionicons name="add-circle" size={20} color={T.bg} />}
              <Text style={[styles.primaryText, { color: T.bg }]}>Add to story</Text>
            </Pressable>
            <Pressable onPress={toApps} disabled={!!busy || !!err} accessibilityRole="button" accessibilityLabel="Share to other apps"
              style={({ pressed }) => [styles.secondary, { backgroundColor: T.surface2 }, (pressed || !!busy || !!err) && { opacity: 0.75 }]}>
              {busy === 'share' ? <ActivityIndicator color={T.text} /> : <Ionicons name="share-outline" size={20} color={T.text} />}
              <Text style={[styles.secondaryText, { color: T.text }]}>Share</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}

const previews = new Map<string, string>();

/** "Share as image" from a post's share sheet: the server draws the 9:16 card, then the system share sheet opens. */
export async function sharePostAsImage(postId: string) {
  Haptics.selectionAsync().catch(() => {});
  toast('Making the image…', { duration: 2000 });
  try {
    const r: any = await apiClient.getPostShareCard(postId);
    if (!r?.success || !r.data?.url) throw new Error(r?.error || 'Could not make the image');
    await shareImageFile(r.data.url, r.data.share_url);
  } catch (e: any) {
    toast(e?.message || 'Could not make the image', { kind: 'error' });
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 16 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 18, paddingBottom: 8 },
  title: { fontSize: 17, fontWeight: '700' },
  close: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  previewWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  preview: { borderRadius: 20, overflow: 'hidden' },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 24 },
  err: { fontSize: 14, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  primary: { flex: 1, height: 52, borderRadius: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryText: { fontSize: 16, fontWeight: '700' },
  secondary: { height: 52, borderRadius: 26, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secondaryText: { fontSize: 16, fontWeight: '700' },
  doneRow: { height: 52, marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  doneText: { fontSize: 16, fontWeight: '600' },
});
