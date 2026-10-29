// Post a clip to Mzinga: record or pick a video, choose the cover frame (shown live inside a
// hive cell, exactly how people will find it), write a caption, put it in the hive.
import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, View, Text, StyleSheet, Pressable, TextInput, Image, ScrollView, ActivityIndicator,
  KeyboardAvoidingView, Platform, useWindowDimensions, Keyboard,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useClipStore } from '../../stores/clipStore';
import { useSocialStore } from '../../stores/socialStore';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../utils/supabaseClient';
import apiClient from '../../utils/apiClient';
import { appAlert } from '../../utils/alert';
import { NoiseOverlay } from '../social/NoiseOverlay';

const HONEY = '#F2B544';
const MAX_SEC = 90;
const MAX_BYTES = 50 * 1024 * 1024;
const FRAMES = 8;

type Picked = { uri: string; durationMs: number; width: number; height: number; size?: number };

export function ClipComposer() {
  const insets = useSafeAreaInsets();
  const { width: W } = useWindowDimensions();
  const close = useClipStore(s => s.closeComposer);
  const [clip, setClip] = useState<Picked | null>(null);
  const [frames, setFrames] = useState<{ t: number; uri: string }[]>([]);
  const [cover, setCover] = useState(0);
  const [caption, setCaption] = useState('');
  const [audience, setAudience] = useState<'public' | 'followers'>('public');
  const [posting, setPosting] = useState(false);

  const pick = async (from: 'camera' | 'library') => {
    const perm = from === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      appAlert('Permission needed', from === 'camera' ? 'Allow camera access in Settings to record a clip.' : 'Allow photo access in Settings to choose a clip.');
      return;
    }
    const opts: ImagePicker.ImagePickerOptions = {
      mediaTypes: 'videos',
      videoMaxDuration: MAX_SEC,
      quality: 1,
      ...(Platform.OS === 'ios' ? { videoExportPreset: ImagePicker.VideoExportPreset.H264_1920x1080, videoQuality: ImagePicker.UIImagePickerControllerQualityType.High } : {}),
    };
    const r = from === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (r.canceled || !r.assets?.[0]) return;
    const a = r.assets[0];
    const ms = a.duration || 0;
    if (ms > (MAX_SEC + 1) * 1000) { appAlert('Too long', `Clips can be up to ${MAX_SEC} seconds. Trim it in your gallery and try again.`); return; }
    if (a.fileSize && a.fileSize > MAX_BYTES) { appAlert('File too large', 'Clips can be up to 50 MB. Try a shorter one.'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setClip({ uri: a.uri, durationMs: ms, width: a.width, height: a.height, size: a.fileSize });
  };

  // Cover candidates spread across the clip (also gives us the real, rotated shape)
  useEffect(() => {
    if (!clip) { setFrames([]); return; }
    let live = true;
    const dur = Math.max(1000, clip.durationMs || 3000);
    const times = Array.from({ length: FRAMES }, (_, i) => Math.round((dur - 200) * (i / (FRAMES - 1))));
    (async () => {
      const out: { t: number; uri: string }[] = [];
      for (const t of times) {
        try {
          const f = await VideoThumbnails.getThumbnailAsync(clip.uri, { time: t, quality: 0.5 });
          if (!live) return;
          if (out.length === 0 && f.width && f.height) setClip(c => (c ? { ...c, width: f.width, height: f.height } : c));
          out.push({ t, uri: f.uri });
          setFrames([...out]);
        } catch {}
      }
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clip?.uri]);

  const upload = async (uri: string, path: string, type: string) => {
    const buf = await new Promise<ArrayBuffer>((resolve, reject) => {
      const x = new XMLHttpRequest();
      x.open('GET', uri);
      x.responseType = 'arraybuffer';
      x.onload = () => resolve(x.response);
      x.onerror = () => reject(new Error('Could not read the file'));
      x.send();
    });
    const { error } = await supabase.storage.from('social-media').upload(path, buf, { contentType: type, upsert: false });
    if (error) throw new Error(error.message);
    return supabase.storage.from('social-media').getPublicUrl(path).data.publicUrl;
  };

  const post = async () => {
    const user = useAuthStore.getState().user;
    if (!clip || !user || posting) return;
    Keyboard.dismiss();
    setPosting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const stem = `posts/${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const ext = (clip.uri.split('.').pop() || 'mp4').toLowerCase();
    try {
      const t = frames[cover]?.t ?? 0;
      const coverFile = await VideoThumbnails.getThumbnailAsync(clip.uri, { time: t, quality: 0.85 });
      const [videoUrl, coverUrl] = await Promise.all([
        upload(clip.uri, `${stem}.${ext}`, ext === 'mov' ? 'video/quicktime' : 'video/mp4'),
        upload(coverFile.uri, `${stem}_cover.jpg`, 'image/jpeg'),
      ]);
      const res: any = await apiClient.createPost(caption.trim(), [{
        url: videoUrl,
        storage_path: `${stem}.${ext}`,
        media_type: 'video',
        width: clip.width,
        height: clip.height,
        duration_seconds: Math.round((clip.durationMs || 0) / 1000) || undefined,
        thumbnail_url: coverUrl,
      }], undefined, audience);
      if (!res.success || !res.data) throw new Error(res.error || 'Could not post');
      const p = res.data;
      if (!p.post_media?.length) p.post_media = [{ id: 'local', media_type: 'video', url: videoUrl, thumbnail_url: coverUrl, width: clip.width, height: clip.height, order_index: 0 }];
      useClipStore.getState().added(p);
      useSocialStore.getState().prependPost(p);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      appAlert('Posted to Mzinga', 'Your clip is in the hive.');
      close();
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      appAlert('Could not post', e?.message || 'Check your connection and try again.');
      supabase.storage.from('social-media').remove([`${stem}.${ext}`, `${stem}_cover.jpg`]).catch(() => {});
    } finally {
      setPosting(false);
    }
  };

  const exit = () => {
    if (clip && !posting) {
      appAlert('Discard this clip?', undefined, [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: close },
      ]);
    } else if (!posting) close();
  };

  const previewW = Math.min(W * 0.46, 210);

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" statusBarTranslucent onRequestClose={exit}>
      <View style={styles.root}>
        <LinearGradient colors={['#0A0907', '#15110A']} style={StyleSheet.absoluteFill} />
        <NoiseOverlay opacity={0.06} />

        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={exit} style={styles.round} hitSlop={8} accessibilityLabel="Close">
            <Ionicons name="close" size={22} color="#fff" />
          </Pressable>
          <Text style={styles.title}>New clip</Text>
          <View style={{ width: 40 }} />
        </View>

        {!clip ? (
          <Animated.View entering={FadeIn.duration(220)} style={styles.pickWrap}>
            <HiveMark />
            <Text style={styles.pickTitle}>Add to the hive</Text>
            <Text style={styles.pickSub}>Up to {MAX_SEC} seconds. Hold your phone upright, it looks best.</Text>
            <View style={styles.pickRow}>
              <PickCard icon="videocam" label="Record" onPress={() => pick('camera')} primary />
              <PickCard icon="images" label="Choose" onPress={() => pick('library')} />
            </View>
          </Animated.View>
        ) : (
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 110 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={styles.previewRow}>
                <Preview uri={clip.uri} width={previewW} ratio={(clip.width || 9) / (clip.height || 16)} />
                <View style={styles.cellCol}>
                  <Text style={styles.cellLabel}>In the hive</Text>
                  <CoverCell uri={frames[cover]?.uri} />
                  <Text style={styles.cellHint}>Pick the frame{'\n'}people tap</Text>
                </View>
              </View>

              <Text style={styles.section}>Cover</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.frames}>
                {Array.from({ length: FRAMES }).map((_, i) => {
                  const f = frames[i];
                  const on = i === cover;
                  return (
                    <Pressable
                      key={i}
                      onPress={() => { if (f) { setCover(i); Haptics.selectionAsync().catch(() => {}); } }}
                      style={[styles.frame, on && styles.frameOn]}
                      accessibilityLabel={`Cover frame ${i + 1}`}
                    >
                      {f ? <Animated.Image entering={FadeIn.duration(160)} source={{ uri: f.uri }} style={StyleSheet.absoluteFill} /> : null}
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Text style={styles.section}>Caption</Text>
              <TextInput
                value={caption}
                onChangeText={setCaption}
                placeholder="Say something, add #tags"
                placeholderTextColor="rgba(255,255,255,0.35)"
                style={styles.input}
                multiline
                maxLength={300}
              />

              <Pressable onPress={() => { setAudience(a => (a === 'public' ? 'followers' : 'public')); Haptics.selectionAsync().catch(() => {}); }} style={styles.audience} accessibilityRole="button" accessibilityLabel="Who can see this">
                <Ionicons name={audience === 'public' ? 'earth' : 'people'} size={17} color="#fff" />
                <Text style={styles.audienceText}>{audience === 'public' ? 'Everyone' : 'Followers only'}</Text>
                <Ionicons name="chevron-expand" size={15} color="rgba(255,255,255,0.5)" />
              </Pressable>
              {audience === 'followers' && <Text style={styles.note}>Followers-only clips don't appear in the public hive.</Text>}

              <Pressable onPress={() => setClip(null)} style={styles.swap} accessibilityRole="button">
                <Ionicons name="swap-horizontal" size={16} color="rgba(255,255,255,0.7)" />
                <Text style={styles.swapText}>Use a different video</Text>
              </Pressable>
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
              <Pressable onPress={post} disabled={posting} style={({ pressed }) => [styles.postBtn, pressed && { transform: [{ scale: 0.98 }] }, posting && { opacity: 0.8 }]} accessibilityRole="button" accessibilityLabel="Post clip">
                {posting ? <ActivityIndicator color="#1A1206" /> : <Ionicons name="arrow-up" size={18} color="#1A1206" />}
                <Text style={styles.postText}>{posting ? 'Putting it in the hive…' : 'Put in the hive'}</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        )}
      </View>
    </Modal>
  );
}

function Preview({ uri, width, ratio }: { uri: string; width: number; ratio: number }) {
  const [muted, setMuted] = useState(true);
  const player = useVideoPlayer(uri, p => { p.loop = true; p.muted = true; p.play(); });
  useEffect(() => { player.muted = muted; }, [muted, player]);
  const h = width / Math.max(0.5, Math.min(ratio, 1.2));
  return (
    <Animated.View entering={FadeInDown.springify().damping(18)} style={[styles.preview, { width, height: Math.min(h, width * 1.9) }]}>
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} allowsFullscreen={false} />
      <Pressable onPress={() => setMuted(m => !m)} style={styles.mute} hitSlop={8} accessibilityLabel={muted ? 'Sound on' : 'Sound off'}>
        <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={15} color="#fff" />
      </Pressable>
    </Animated.View>
  );
}

/** The chosen cover inside a hive cell, popping a little each time it changes. */
function CoverCell({ uri }: { uri?: string }) {
  const s = useSharedValue(1);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    s.value = 0.88;
    s.value = withSpring(1, { damping: 9, stiffness: 260 });
  }, [uri, s]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Animated.View style={[styles.cell, st]}>
      <View style={styles.cellInner}>{uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} /> : null}</View>
    </Animated.View>
  );
}

function PickCard({ icon, label, onPress, primary }: { icon: any; label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.pickCard, primary && { backgroundColor: HONEY, borderColor: HONEY }, pressed && { transform: [{ scale: 0.97 }] }]} accessibilityRole="button" accessibilityLabel={label}>
      <Ionicons name={icon} size={26} color={primary ? '#1A1206' : '#fff'} />
      <Text style={[styles.pickLabel, primary && { color: '#1A1206' }]}>{label}</Text>
    </Pressable>
  );
}

/** Seven small cells breathing in a hex, the Mzinga mark. */
function HiveMark() {
  const spots = [[0, 0], [1, 0], [-1, 0], [0.5, -0.866], [-0.5, -0.866], [0.5, 0.866], [-0.5, 0.866]];
  const k = useSharedValue(0);
  useEffect(() => { k.value = withTiming(1, { duration: 700 }); }, [k]);
  return (
    <View style={{ width: 120, height: 110, marginBottom: 18 }}>
      {spots.map(([x, y], i) => <MarkDot key={i} x={x} y={y} i={i} k={k} />)}
    </View>
  );
}
function MarkDot({ x, y, i, k }: { x: number; y: number; i: number; k: any }) {
  const st = useAnimatedStyle(() => {
    const t = Math.min(1, Math.max(0, k.value * 7 - i * 0.6));
    return { opacity: t, transform: [{ scale: 0.4 + 0.6 * t }] };
  });
  return <Animated.View style={[styles.markDot, { left: 60 - 18 + x * 40, top: 55 - 18 + y * 40, backgroundColor: i === 0 ? HONEY : 'rgba(242,181,68,0.28)' }, st]} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0907' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 },
  round: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontSize: 17, fontFamily: 'SpaceGrotesk_700Bold' },

  pickWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingBottom: 60 },
  pickTitle: { color: '#fff', fontSize: 26, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: -0.6 },
  pickSub: { color: 'rgba(255,255,255,0.55)', fontSize: 14.5, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  pickRow: { flexDirection: 'row', gap: 12, marginTop: 28 },
  pickCard: { width: 132, height: 112, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', gap: 8 },
  pickLabel: { color: '#fff', fontSize: 15.5, fontWeight: '700' },
  markDot: { position: 'absolute', width: 36, height: 36, borderRadius: 18 },

  previewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 22, paddingTop: 8 },
  preview: { borderRadius: 20, overflow: 'hidden', backgroundColor: '#1F1A12' },
  mute: { position: 'absolute', right: 8, bottom: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  cellCol: { alignItems: 'center' },
  cellLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600', marginBottom: 10, letterSpacing: 0.3, textTransform: 'uppercase' },
  cell: { width: 96, height: 96, borderRadius: 48, borderWidth: 2.5, borderColor: HONEY, padding: 3 },
  cellInner: { flex: 1, borderRadius: 48, overflow: 'hidden', backgroundColor: '#1F1A12' },
  cellHint: { color: 'rgba(255,255,255,0.45)', fontSize: 12, textAlign: 'center', marginTop: 10, lineHeight: 16 },

  section: { color: 'rgba(255,255,255,0.55)', fontSize: 12.5, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase', marginTop: 24, marginBottom: 10, paddingHorizontal: 20 },
  frames: { paddingHorizontal: 20, gap: 6 },
  frame: { width: 46, height: 72, borderRadius: 10, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 2, borderColor: 'transparent' },
  frameOn: { borderColor: HONEY, transform: [{ scale: 1.06 }] },
  input: { marginHorizontal: 20, minHeight: 70, maxHeight: 140, color: '#fff', fontSize: 16, lineHeight: 22, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12, textAlignVertical: 'top' },
  audience: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', marginHorizontal: 20, marginTop: 14, paddingHorizontal: 14, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.08)' },
  audienceText: { color: '#fff', fontSize: 14.5, fontWeight: '600' },
  note: { color: 'rgba(255,255,255,0.45)', fontSize: 12.5, marginHorizontal: 22, marginTop: 8 },
  swap: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', marginTop: 26, padding: 8 },
  swapText: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },

  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, backgroundColor: 'rgba(10,9,7,0.94)' },
  postBtn: { height: 52, borderRadius: 26, backgroundColor: HONEY, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  postText: { color: '#1A1206', fontSize: 16.5, fontWeight: '800' },
});
