// Share an AI answer as a branded card. The server draws the card (see My Stack/satori-server-images.md);
// here you pick a skin and a shape, see the real image, then add it to your story, post it, or send it out.
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Image, Modal, Pressable, StyleSheet, ActivityIndicator, Share, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiClient from '../../utils/apiClient';
import { useTheme } from '../../hooks/useTheme';
import { useStoryStore } from '../../stores/storyStore';
import { useSocialStore } from '../../stores/socialStore';

const SKINS = [
  { id: 'mchanga', label: 'Mchanga', thumb: require('../../../assets/ai/skin_mchanga.jpg') },
  { id: 'usiku', label: 'Usiku', thumb: require('../../../assets/ai/skin_usiku.jpg') },
  { id: 'jua', label: 'Jua', thumb: require('../../../assets/ai/skin_jua.jpg') },
  { id: 'msitu', label: 'Msitu', thumb: require('../../../assets/ai/skin_msitu.jpg') },
] as const;
type Format = 'story' | 'post';

const previewCache = new Map<string, string>(); // `${skin}|${format}|${answer hash}` → data URI

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return String(h);
}

export function ShareCardSheet({ visible, question, answer, onClose }: {
  visible: boolean; question: string; answer: string; onClose: () => void;
}) {
  const T = useTheme();
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const [skin, setSkin] = useState<string>('mchanga');
  const [format, setFormat] = useState<Format>('story');
  const [uri, setUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<null | 'story' | 'post' | 'more'>(null);
  const [done, setDone] = useState<string | null>(null);
  const reqId = useRef(0);

  // Preview: the real card, drawn by the server at half size
  useEffect(() => {
    if (!visible) return;
    const key = `${skin}|${format}|${hash(question + answer)}`;
    const cached = previewCache.get(key);
    if (cached) { setUri(cached); return; }
    const id = ++reqId.current;
    setLoading(true);
    apiClient.getShareCard({ question, answer, skin, format, preview: true }).then((r: any) => {
      if (id !== reqId.current) return;
      if (r?.success && r.data?.uri) { previewCache.set(key, r.data.uri); setUri(r.data.uri); }
    }).catch(() => {}).finally(() => { if (id === reqId.current) setLoading(false); });
  }, [visible, skin, format, question, answer]);

  useEffect(() => { if (!visible) { setDone(null); setBusy(null); } }, [visible]);

  const finish = (msg: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setDone(msg);
    setTimeout(onClose, 900);
  };

  // Full-size card, uploaded by the server, ready to use as story/post media
  const makeFull = async (fmt: Format) => {
    const r: any = await apiClient.getShareCard({ question, answer, skin, format: fmt });
    if (!r?.success || !r.data?.url) throw new Error(r?.error || 'Could not make the card');
    return r.data as { url: string; storage_path: string; width: number; height: number };
  };

  const toStory = async () => {
    setBusy('story');
    try {
      const c = await makeFull('story');
      const res: any = await apiClient.createStory({
        media_type: 'image', media_url: c.url, storage_path: c.storage_path, width: c.width, height: c.height,
        overlays: [], audience: 'everyone',
      });
      if (!res?.success) throw new Error(res?.error || 'Could not post');
      useStoryStore.getState().fetchFeed().catch(() => {});
      finish('Added to your story');
    } catch (e: any) { setDone(e?.message || 'Something went wrong'); setBusy(null); }
  };

  const toPost = async () => {
    setBusy('post');
    try {
      const c = await makeFull('post');
      const q = question.trim().replace(/\s+/g, ' ');
      const content = `Nilimuuliza Kiongozi AI: "${q.length > 220 ? q.slice(0, 219) + '…' : q}"`;
      const res: any = await apiClient.createPost(content, [{ media_type: 'image', url: c.url, storage_path: c.storage_path, width: c.width, height: c.height }]);
      if (!res?.success) throw new Error(res?.error || 'Could not post');
      if (res.data) useSocialStore.getState().prependPost(res.data);
      finish('Posted to your feed');
    } catch (e: any) { setDone(e?.message || 'Something went wrong'); setBusy(null); }
  };

  const toMore = async () => {
    setBusy('more');
    try {
      const c = await makeFull(format);
      setBusy(null);
      await Share.share({ url: c.url, message: `${question}\n\nAsked on KChat · Kiongozi AI\n${c.url}` });
    } catch { setBusy(null); }
  };

  // Preview size: as big as fits between the header and the controls
  const ratio = format === 'story' ? 9 / 16 : 4 / 5;
  const maxH = Math.max(220, H - insets.top - insets.bottom - 330);
  const pw = Math.min(W - 96, maxH * ratio);
  const ph = pw / ratio;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: T.bg, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.head}>
          <Text style={[styles.title, { color: T.text }]}>Share this answer</Text>
          <Pressable onPress={onClose} hitSlop={10} style={[styles.close, { backgroundColor: T.surface2 }]} accessibilityLabel="Close">
            <Ionicons name="close" size={18} color={T.text} />
          </Pressable>
        </View>

        <View style={styles.previewWrap}>
          <View style={[styles.preview, { width: pw, height: ph, backgroundColor: T.surface }]}>
            {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel="Card preview" /> : null}
            {loading && <View style={styles.loading}><ActivityIndicator color={T.text} /></View>}
          </View>
        </View>

        {/* Shape */}
        <View style={[styles.segment, { backgroundColor: T.surface2 }]}>
          {(['story', 'post'] as Format[]).map(f => (
            <Pressable key={f} onPress={() => { Haptics.selectionAsync().catch(() => {}); setFormat(f); }}
              style={[styles.segBtn, format === f && { backgroundColor: T.bg }]} accessibilityRole="button" accessibilityState={{ selected: format === f }}>
              <Ionicons name={f === 'story' ? 'phone-portrait-outline' : 'square-outline'} size={15} color={T.text} />
              <Text style={[styles.segText, { color: T.text }]}>{f === 'story' ? 'Story' : 'Post'}</Text>
            </Pressable>
          ))}
        </View>

        {/* Skins */}
        <View style={styles.skins}>
          {SKINS.map(s => (
            <Pressable key={s.id} onPress={() => { Haptics.selectionAsync().catch(() => {}); setSkin(s.id); }}
              style={styles.skin} accessibilityRole="button" accessibilityLabel={`${s.label} card`} accessibilityState={{ selected: skin === s.id }}>
              <View style={[styles.skinRing, { borderColor: skin === s.id ? T.text : 'transparent' }]}>
                <Image source={s.thumb} style={styles.skinImg} />
              </View>
              <Text style={[styles.skinLabel, { color: skin === s.id ? T.text : T.textSub }]}>{s.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Actions */}
        {done ? (
          <View style={styles.doneRow}>
            <Ionicons name="checkmark-circle" size={20} color={T.accent} />
            <Text style={[styles.doneText, { color: T.text }]}>{done}</Text>
          </View>
        ) : (
          <View style={styles.actions}>
            <Pressable onPress={toStory} disabled={!!busy} style={({ pressed }) => [styles.primary, { backgroundColor: T.text }, (pressed || !!busy) && { opacity: 0.8 }]}>
              {busy === 'story' ? <ActivityIndicator color={T.bg} /> : <Ionicons name="add-circle" size={20} color={T.bg} />}
              <Text style={[styles.primaryText, { color: T.bg }]}>Add to story</Text>
            </Pressable>
            <Pressable onPress={toPost} disabled={!!busy} style={({ pressed }) => [styles.secondary, { backgroundColor: T.surface2 }, (pressed || !!busy) && { opacity: 0.8 }]} accessibilityLabel="Post to feed">
              {busy === 'post' ? <ActivityIndicator color={T.text} /> : <Ionicons name="create-outline" size={20} color={T.text} />}
            </Pressable>
            <Pressable onPress={toMore} disabled={!!busy} style={({ pressed }) => [styles.secondary, { backgroundColor: T.surface2 }, (pressed || !!busy) && { opacity: 0.8 }]} accessibilityLabel="Share to other apps">
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
  close: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  previewWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  preview: { borderRadius: 20, overflow: 'hidden' },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.18)' },
  segment: { flexDirection: 'row', alignSelf: 'center', borderRadius: 18, padding: 3, marginTop: 6 },
  segBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 16, borderRadius: 15 },
  segText: { fontSize: 14, fontWeight: '600' },
  skins: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: 14 },
  skin: { alignItems: 'center', gap: 4, minWidth: 56 },
  skinRing: { borderWidth: 2, borderRadius: 14, padding: 2 },
  skinImg: { width: 40, height: 56, borderRadius: 10 },
  skinLabel: { fontSize: 12, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  primary: { flex: 1, height: 52, borderRadius: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryText: { fontSize: 16, fontWeight: '700' },
  secondary: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  doneRow: { height: 52, marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  doneText: { fontSize: 16, fontWeight: '600' },
});
