// Story composer: text stories on Kenyan-pattern backgrounds, or a photo/video from gallery or camera,
// with draggable / pinchable stickers and text labels. Posting uploads in the background.
// Photos/videos can be framed IG-style (pinch = zoom, drag = move, twist = rotate, double-tap = fit);
// the framing is saved as a '__media' overlay entry (see StoryParts MEDIA_KEY).
import { appAlert } from '../../utils/alert';
import React, { useMemo, useRef, useState } from 'react';
import {
  View, Text, Image, Modal, Pressable, StyleSheet, TextInput, Dimensions, PanResponder,
  KeyboardAvoidingView, Platform, ScrollView, Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Reanimated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS, SharedValue } from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useStoryStore, StoryOverlay, Story } from '../../stores/storyStore';
import { useAuthStore } from '../../stores/authStore';
import { useProfileStore } from '../../stores/profileStore';
import { supabase } from '../../utils/supabaseClient';
import apiClient from '../../utils/apiClient';
import { StoryBackground, OverlayItem, STICKER_BASE, POLL_H, MEDIA_KEY, coverBox, MediaBackdrop, TEXT_STYLES, textStyleFx } from './StoryParts';
import { POLL_W } from './PollCard';
import { celebrate } from '../Confetti';
import { BACKGROUNDS, FONTS, TEXT_COLORS, STICKERS, fontById, fitFontSize, fitLineHeight, textAnchoredTop, TEXT_TOP, bgById } from './storyAssets';

const { width: W, height: H } = Dimensions.get('window');
const MAX_BYTES = 50 * 1024 * 1024;
const TOOL = W < 380 ? 40 : 44; // top tool size; a touch smaller on narrow phones
const GAP = 6;                    // gap between top tools
const NARROW = W < 360;           // 320-wide phones: tighter bottom row
const SHORT = H < 700;            // 568/667-tall phones: tighter vertical spacing
const FONT_PILL_W = TOOL + 14;    // "Aa" pill width (approx.)
// Media framing limits + snapping
const ZOOM_MIN = 0.5, ZOOM_MAX = 4;
const SNAP_PX = 10, SNAP_ZOOM = 0.07, SNAP_DEG = 7;
const SPRING = { damping: 20, stiffness: 220 };

type Draft = StoryOverlay & { _id: number };
let nextId = 1;

type Picked = { uri: string; type: 'image' | 'video'; width?: number; height?: number; durationMs?: number; thumb?: string };
type Frame = { tx: SharedValue<number>; ty: SharedValue<number>; zoom: SharedValue<number>; rot: SharedValue<number> };

const round4 = (n: number) => Math.round(n * 10000) / 10000;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
/** -180..180 */
const normDeg = (d: number) => { const r = ((d % 360) + 360) % 360; return r > 180 ? r - 360 : r; };

export function StoryComposer() {
  const open = useStoryStore(s => s.composerOpen);
  const setOpen = useStoryStore(s => s.setComposerOpen);
  return (
    <Modal visible={open} animationType="slide" statusBarTranslucent onRequestClose={() => setOpen(false)}>
      {/* RNGH needs its own root inside a Modal */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        {open && <ComposerBody onClose={() => setOpen(false)} />}
      </GestureHandlerRootView>
    </Modal>
  );
}

function ComposerBody({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const me = useProfileStore(s => s.currentUserProfile);
  const { addMine, setPosting } = useStoryStore();

  const [media, setMedia] = useState<Picked | null>(null);
  const [text, setText] = useState('');
  const [bg, setBg] = useState(BACKGROUNDS[0].id);
  const [font, setFont] = useState(FONTS[0].id);
  const [textStyle, setTextStyle] = useState<(typeof TEXT_STYLES)[number]>('plain');
  const [color, setColor] = useState<string | null>(null);
  const [overlays, setOverlays] = useState<Draft[]>([]);
  const [audience, setAudience] = useState<'everyone' | 'followers'>('everyone');
  const [trayOpen, setTrayOpen] = useState(false);
  const [labelDraft, setLabelDraft] = useState<string | null>(null);
  const [linkDraft, setLinkDraft] = useState<string | null>(null);
  const [pollDraft, setPollDraft] = useState<{ q: string; a: string; b: string } | null>(null);
  const hasPoll = overlays.some(o => o.type === 'poll');
  const [dragging, setDragging] = useState(false);
  const [overTrash, setOverTrash] = useState(false);
  const inputRef = useRef<TextInput>(null);
  // Top of the bottom bar (dots + audience + Shiriki), measured; it moves up with the keyboard
  const [bottomTop, setBottomTop] = useState(H);

  // Media framing, in px offset from centre / zoom relative to cover-fill / degrees (UI thread)
  const tx = useSharedValue(0), ty = useSharedValue(0), zoom = useSharedValue(1), rot = useSharedValue(0);
  const frame: Frame = { tx, ty, zoom, rot };
  const resetFrame = () => { tx.value = 0; ty.value = 0; zoom.value = 1; rot.value = 0; };
  /** The framing as an overlay entry, or null when it is the default cover-fill. */
  const frameOverlay = (): StoryOverlay | null => {
    const x = 0.5 + tx.value / W, y = 0.5 + ty.value / H, s = zoom.value, r = normDeg(rot.value);
    if (Math.abs(s - 1) < 0.005 && Math.abs(r) < 0.5 && Math.abs(x - 0.5) < 0.002 && Math.abs(y - 0.5) < 0.002) return null;
    return { type: 'sticker', key: MEDIA_KEY, x: round4(clamp(x, 0, 1)), y: round4(clamp(y, 0, 1)), scale: round4(clamp(s, 0.2, 5)), rotation: Math.round(r * 10) / 10 };
  };

  const isText = !media;
  const textColor = color || (bgById(bg).dark ? '#000000' : '#FFFFFF');
  const styleFx = textStyleFx(textStyle, textColor);
  const shownText = text || 'Andika kitu…';
  const textSize = fitFontSize(shownText);
  const anchored = textAnchoredTop(shownText);
  const canPost = isText ? text.trim().length > 0 : true;

  const pick = async (from: 'library' | 'camera') => {
    Keyboard.dismiss();
    const opts: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images', 'videos'], quality: 0.8, videoMaxDuration: 60, allowsEditing: false,
    };
    let res: ImagePicker.ImagePickerResult;
    if (from === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { appAlert('Camera', 'Allow camera access in Settings to take a story photo.'); return; }
      res = await ImagePicker.launchCameraAsync(opts);
    } else {
      res = await ImagePicker.launchImageLibraryAsync(opts);
    }
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    if (a.fileSize && a.fileSize > MAX_BYTES) { appAlert('Too big', 'Pick a photo or video under 50 MB.'); return; }
    const type = a.type === 'video' ? 'video' : 'image';
    if (type === 'video' && a.duration && a.duration > 61000) {
      appAlert('Video too long', 'Stories can be up to 60 seconds. Trim it and try again.');
      return;
    }
    let width = a.width, height = a.height, thumb: string | undefined;
    if (type === 'video') {
      // The thumbnail is upright (rotation applied), so its size is the true display aspect;
      // it is also the blurred backdrop while framing and is uploaded as the story thumbnail.
      try {
        const t = await VideoThumbnails.getThumbnailAsync(a.uri, { time: 0, quality: 0.6 });
        thumb = t.uri;
        if (t.width && t.height) { width = t.width; height = t.height; }
      } catch {}
    }
    resetFrame();
    setMedia({ uri: a.uri, type, width, height, durationMs: a.duration ?? undefined, thumb });
    if (type === 'image' && (!width || !height)) {
      Image.getSize(a.uri, (w, h) => setMedia(m => (m && m.uri === a.uri ? { ...m, width: w, height: h } : m)), () => {});
    }
  };

  const addSticker = (key: string) => {
    Haptics.selectionAsync();
    setOverlays(o => [...o, { _id: nextId++, type: 'sticker', key, x: 0.5, y: 0.42 + (o.length % 3) * 0.06, scale: 1, rotation: -4 }]);
    setTrayOpen(false);
  };

  const addLabel = () => {
    const t = (labelDraft || '').trim();
    if (t) setOverlays(o => [...o, { _id: nextId++, type: 'text', text: t, color: '#000000', bg: '#FFFFFF', x: 0.5, y: 0.3, scale: 1, rotation: -3 }]);
    setLabelDraft(null);
  };

  const addLink = () => {
    let u = (linkDraft || '').trim();
    if (u && !/^https?:\/\//i.test(u)) u = `https://${u}`;
    const ok = /^https?:\/\/[^\s/]+\.[^\s]+$/i.test(u) && u.length <= 300;
    if (ok) setOverlays(o => [...o.filter(x => x.type !== 'link'), { _id: nextId++, type: 'link', url: u, x: 0.5, y: 0.72, scale: 1, rotation: 0 }]);
    setLinkDraft(null);
  };

  const addPoll = () => {
    if (!pollDraft) return;
    const q = pollDraft.q.trim();
    if (!q) { setPollDraft(null); return; }
    setOverlays(o => [...o.filter(x => x.type !== 'poll'), {
      _id: nextId++, type: 'poll', text: q,
      options: [pollDraft.a.trim() || 'Ndiyo', pollDraft.b.trim() || 'Hapana'],
      x: 0.5, y: 0.62, scale: 1, rotation: 0,
    }]);
    setPollDraft(null);
  };

  const post = async () => {
    if (!user || !canPost) return;
    Keyboard.dismiss();
    const framed = media ? frameOverlay() : null;
    // Framing goes first so the server's 20-overlay cap can never drop it
    const draft = { media, text: text.trim(), bg, font, textStyle, color: textColor, overlays: [...(framed ? [framed] : []), ...overlays.map(({ _id, ...rest }) => rest)], audience };
    onClose();
    setPosting(true);
    try {
      const body: Record<string, any> = {
        media_type: draft.media ? draft.media.type : 'text',
        overlays: draft.overlays,
        audience: draft.audience,
      };
      if (draft.media) {
        const up = await upload(draft.media.uri, draft.media.type, user.id);
        Object.assign(body, { media_url: up.url, storage_path: up.path, width: draft.media.width, height: draft.media.height });
        if (draft.media.type === 'video') {
          body.duration_ms = draft.media.durationMs;
          try {
            const thumbUri = draft.media.thumb || (await VideoThumbnails.getThumbnailAsync(draft.media.uri, { time: 0, quality: 0.6 })).uri;
            const t = await upload(thumbUri, 'image', user.id);
            body.thumbnail_url = t.url;
          } catch {}
        }
      } else {
        Object.assign(body, { text_content: draft.text, bg: draft.bg, font: draft.font, text_color: draft.color, ...(draft.textStyle !== 'plain' ? { text_style: draft.textStyle } : {}) });
      }
      const res: any = await apiClient.createStory(body);
      if (!res.success) throw new Error(res.error || 'Could not post');
      addMine(res.data as Story, {
        id: user.id, username: me?.username || 'you', full_name: me?.full_name, avatar_url: me?.avatar_url, is_verified: me?.is_verified,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      celebrate();
    } catch (e: any) {
      appAlert("Story didn't post", e?.message || 'Check your connection and try again.');
    } finally {
      setPosting(false);
    }
  };

  const updateOverlay = (id: number, patch: Partial<StoryOverlay>) =>
    setOverlays(o => o.map(x => (x._id === id ? { ...x, ...patch } : x)));
  const removeOverlay = (id: number) => setOverlays(o => o.filter(x => x._id !== id));

  // Secondary tools (everything but close). Text stories have up to 6, which does not fit beside
  // close on 320-360 wide phones, so there they stack in a right-hand column instead.
  const tools: React.ReactNode[] = [];
  if (isText) {
    tools.push(
      <Pressable key="font" style={styles.fontPill} onPress={() => setFont(f => FONTS[(FONTS.findIndex(x => x.id === f) + 1) % FONTS.length].id)} accessibilityLabel="Change font">
        <Text style={styles.fontPillText}>Aa</Text>
      </Pressable>,
      <Pressable key="bg" style={styles.tool} onPress={() => setBg(b => BACKGROUNDS[(BACKGROUNDS.findIndex(x => x.id === b) + 1) % BACKGROUNDS.length].id)} accessibilityLabel="Change background">
        <Ionicons name="contrast-outline" size={20} color="#fff" />
      </Pressable>,
    );
  } else {
    tools.push(
      <Pressable key="text" style={styles.tool} onPress={() => setLabelDraft('')} accessibilityLabel="Add text">
        <Ionicons name="text" size={20} color="#fff" />
      </Pressable>,
    );
  }
  tools.push(
    <Pressable key="sticker" style={styles.tool} onPress={() => { Keyboard.dismiss(); setTrayOpen(true); }} accessibilityLabel="Add sticker">
      <Ionicons name="pricetag-outline" size={20} color="#fff" />
    </Pressable>,
  );
  tools.push(
    <Pressable key="link" style={styles.tool} onPress={() => { Keyboard.dismiss(); setLinkDraft(overlays.find(x => x.type === 'link')?.url || ''); }} accessibilityLabel="Add a link">
      <Ionicons name="link" size={20} color="#fff" />
    </Pressable>,
  );
  if (!hasPoll) {
    tools.push(
      <Pressable key="poll" style={styles.tool} onPress={() => { Keyboard.dismiss(); setPollDraft({ q: '', a: 'Ndiyo', b: 'Hapana' }); }} accessibilityLabel="Add a poll">
        <Ionicons name="stats-chart" size={18} color="#fff" />
      </Pressable>,
    );
  }
  if (isText) {
    tools.push(
      <Pressable key="gallery" style={styles.tool} onPress={() => pick('library')} accessibilityLabel="Pick from gallery">
        <Ionicons name="images-outline" size={20} color="#fff" />
      </Pressable>,
      <Pressable key="camera" style={styles.tool} onPress={() => pick('camera')} accessibilityLabel="Take a photo">
        <Ionicons name="camera-outline" size={21} color="#fff" />
      </Pressable>,
    );
  }
  // close + tools + gaps + side padding (the Aa pill is wider than a circle), with 24px breathing room
  const rowNeeded = 16 + TOOL * (tools.length + 1) + GAP * tools.length + (isText ? FONT_PILL_W - TOOL : 0);
  const toolColumn = rowNeeded + 24 > W;

  return (
    <View style={styles.root}>
      {/* Canvas */}
      {isText ? (
        <Pressable style={StyleSheet.absoluteFill} onPress={() => inputRef.current?.focus()}>
          <StoryBackground bg={bg} />
        </Pressable>
      ) : (
        // Sits under the overlays: touches on a sticker/text/poll hit that overlay, never this
        <MediaCanvas media={media!} frame={frame} />
      )}

      {isText && (
        <View style={[styles.textArea, anchored && { justifyContent: 'flex-start', paddingTop: Math.round(H * TEXT_TOP) }]} pointerEvents="box-none">
          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={setText}
            placeholder="Andika kitu…"
            placeholderTextColor={bgById(bg).dark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.6)'}
            multiline
            maxLength={700}
            autoFocus
            style={[fontById(font), styles.textInput, { color: textColor, fontSize: textSize, lineHeight: fitLineHeight(textSize) }, styleFx.box && { ...styleFx.box, minWidth: 80 }, styleFx.text]}
          />
        </View>
      )}

      {/* Overlays (draggable) */}
      {overlays.map(o => (
        <DraggableOverlay
          key={o._id}
          o={o}
          onChange={p => updateOverlay(o._id, p)}
          onDragState={(d, trash) => { setDragging(d); setOverTrash(trash); }}
          onDrop={trash => { if (trash) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); removeOverlay(o._id); } }}
        />
      ))}

      {dragging && (
        <View style={[styles.trash, { bottom: insets.bottom + 40 }, overTrash && styles.trashOn]} pointerEvents="none">
          <Ionicons name="trash-outline" size={overTrash ? 30 : 24} color="#fff" />
        </View>
      )}

      {/* Top tools: one row when it fits, otherwise close on the left + an IG-style tool column on the right */}
      {!dragging && (
        <>
          <View style={[styles.top, { top: insets.top + 8 }]} pointerEvents="box-none">
            <Pressable style={styles.tool} onPress={() => (media ? setMedia(null) : onClose())} accessibilityLabel={media ? 'Remove photo' : 'Close'}>
              <Ionicons name={media ? 'arrow-back' : 'close'} size={20} color="#fff" />
            </Pressable>
            <View style={{ flex: 1 }} />
            {!toolColumn && tools}
          </View>
          {toolColumn && (
            <View style={[styles.column, { top: insets.top + 8 }]} pointerEvents="box-none">
              <ScrollView
                style={{ maxHeight: Math.max(TOOL, bottomTop - (insets.top + 8) - 12) }}
                contentContainerStyle={styles.columnContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="always"
              >
                {tools}
              </ScrollView>
            </View>
          )}
        </>
      )}

      {/* Bottom: colours (text), audience, share */}
      {!dragging && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.bottom, { paddingBottom: Math.max(insets.bottom + 8, 16) }]}
          onLayout={e => setBottomTop(e.nativeEvent.layout.y)}
          pointerEvents="box-none"
        >
          {isText && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dots} keyboardShouldPersistTaps="always">
              <Pressable
                onPress={() => { Haptics.selectionAsync().catch(() => {}); setTextStyle(s => TEXT_STYLES[(TEXT_STYLES.indexOf(s) + 1) % TEXT_STYLES.length]); }}
                accessibilityLabel={`Text style: ${textStyle}`}
                style={[styles.dot, styles.styleBtn, textStyle === 'pill' && { backgroundColor: '#fff' }]}
              >
                <Text style={[styles.styleBtnText, textStyle === 'pill' && { color: '#000' }, textStyle === 'outline' && { textShadowColor: '#000', textShadowRadius: 4, textShadowOffset: { width: 0, height: 0 } }]}>A</Text>
              </Pressable>
              {TEXT_COLORS.map(c => (
                <Pressable key={c} onPress={() => setColor(c)} accessibilityLabel={`Text colour ${c}`}
                  style={[styles.dot, { backgroundColor: c, borderWidth: textColor === c ? 3 : 2, borderColor: textColor === c ? '#fff' : 'rgba(255,255,255,0.5)' }]} />
              ))}
            </ScrollView>
          )}
          <View style={styles.bottomRow}>
            <Pressable style={styles.audience} onPress={() => setAudience(a => (a === 'everyone' ? 'followers' : 'everyone'))} accessibilityLabel="Who can see this story">
              <Ionicons name={audience === 'everyone' ? 'globe-outline' : 'people-outline'} size={18} color="#fff" />
              <Text style={styles.audienceText} numberOfLines={1}>{audience === 'everyone' ? 'Kila mtu' : 'Wafuasi'}{NARROW ? '' : ' · 24h'}</Text>
            </Pressable>
            <View style={{ flex: 1, minWidth: 0 }} />
            <Pressable style={[styles.share, styles.shareMain, !canPost && { opacity: 0.4 }]} onPress={post} disabled={!canPost} accessibilityLabel="Share story">
              <Text style={styles.shareText}>Shiriki</Text>
              <Ionicons name="arrow-forward" size={18} color="#000" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* Sticker tray */}
      {trayOpen && (
        <View style={StyleSheet.absoluteFill}>
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} onPress={() => setTrayOpen(false)} />
          <View style={[styles.tray, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.grabber} />
            <Text style={styles.trayTitle}>Stickers</Text>
            <View style={styles.trayGrid}>
              {Object.entries(STICKERS).map(([key, s]) => (
                <Pressable key={key} onPress={() => addSticker(key)} style={({ pressed }) => [styles.trayItem, pressed && { transform: [{ scale: 0.94 }] }]} accessibilityLabel={`Add ${s.label} sticker`}>
                  <Image source={s.src} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Poll entry */}
      {pollDraft && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[StyleSheet.absoluteFill, styles.labelEntry]}>
          <View style={styles.pollEntry}>
            <TextInput
              autoFocus
              value={pollDraft.q}
              onChangeText={q => setPollDraft(d => d && { ...d, q })}
              placeholder="Uliza swali… (Ask a question)"
              placeholderTextColor="#8E8E93"
              style={styles.pollQ}
              maxLength={90}
              multiline
            />
            {(['a', 'b'] as const).map(key => (
              <TextInput
                key={key}
                value={pollDraft[key]}
                onChangeText={v => setPollDraft(d => d && { ...d, [key]: v })}
                style={styles.pollOpt}
                maxLength={40}
                placeholderTextColor="#8E8E93"
              />
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
            <Pressable style={[styles.share, { backgroundColor: 'rgba(255,255,255,0.15)' }]} onPress={() => setPollDraft(null)}>
              <Text style={[styles.shareText, { color: '#fff' }]}>Ghairi</Text>
            </Pressable>
            <Pressable style={[styles.share, !pollDraft.q.trim() && { opacity: 0.4 }]} onPress={addPoll} disabled={!pollDraft.q.trim()}>
              <Text style={styles.shareText}>Weka poll</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* Link entry */}
      {linkDraft !== null && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[StyleSheet.absoluteFill, styles.labelEntry]}>
          <TextInput
            autoFocus
            value={linkDraft}
            onChangeText={setLinkDraft}
            placeholder="https://"
            placeholderTextColor="#666"
            style={styles.labelInput}
            maxLength={300}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            onSubmitEditing={addLink}
            returnKeyType="done"
          />
          <Pressable style={[styles.share, { marginTop: 18 }]} onPress={addLink}>
            <Text style={styles.shareText}>Weka link</Text>
          </Pressable>
        </KeyboardAvoidingView>
      )}

      {/* Text label entry */}
      {labelDraft !== null && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[StyleSheet.absoluteFill, styles.labelEntry]}>
          <TextInput
            autoFocus
            value={labelDraft}
            onChangeText={setLabelDraft}
            placeholder="Andika…"
            placeholderTextColor="#666"
            style={styles.labelInput}
            maxLength={120}
            onSubmitEditing={addLabel}
            returnKeyType="done"
          />
          <Pressable style={[styles.share, { marginTop: 18 }]} onPress={addLabel}>
            <Text style={styles.shareText}>Weka</Text>
          </Pressable>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

/**
 * The photo/video, framed with pinch (zoom about the fingers), pan (1-2 fingers), rotate and
 * double-tap (back to fit). All on the UI thread. Snaps to centre lines / fit / right angles
 * with a light haptic. When the media no longer covers the canvas, a blurred copy fills behind.
 */
function MediaCanvas({ media, frame }: { media: Picked; frame: Frame }) {
  const { tx, ty, zoom, rot } = frame;
  const box = coverBox(W, H, media.width, media.height);
  const sTx = useSharedValue(0), sTy = useSharedValue(0), sZoom = useSharedValue(1), sRot = useSharedValue(0);
  const guideX = useSharedValue(0), guideY = useSharedValue(0); // 1 while magnetised to a centre line

  const gesture = useMemo(() => {
    const tick = () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); };
    const pan = Gesture.Pan()
      .minPointers(1).maxPointers(2).averageTouches(true)
      .onStart(() => { sTx.value = tx.value; sTy.value = ty.value; })
      .onUpdate(e => {
        const nx = Math.min(W / 2, Math.max(-W / 2, sTx.value + e.translationX));
        const ny = Math.min(H / 2, Math.max(-H / 2, sTy.value + e.translationY));
        const gx = Math.abs(nx) < SNAP_PX ? 1 : 0, gy = Math.abs(ny) < SNAP_PX ? 1 : 0;
        if ((gx && !guideX.value) || (gy && !guideY.value)) runOnJS(tick)();
        guideX.value = gx; guideY.value = gy;
        tx.value = gx ? 0 : nx;
        ty.value = gy ? 0 : ny;
      })
      .onFinalize(() => { guideX.value = 0; guideY.value = 0; });
    const pinch = Gesture.Pinch()
      .onStart(() => { sZoom.value = zoom.value; })
      .onUpdate(e => {
        const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, sZoom.value * e.scale));
        const ratio = next / zoom.value;
        // Zoom about the point between the fingers (focal is relative to the full canvas)
        const fx = e.focalX - W / 2, fy = e.focalY - H / 2;
        const dx = (tx.value - fx) * (ratio - 1), dy = (ty.value - fy) * (ratio - 1);
        tx.value = Math.min(W / 2, Math.max(-W / 2, tx.value + dx));
        ty.value = Math.min(H / 2, Math.max(-H / 2, ty.value + dy));
        sTx.value += dx; sTy.value += dy; // keep a simultaneous pan in step
        zoom.value = next;
      })
      .onEnd(() => {
        if (zoom.value !== 1 && Math.abs(zoom.value - 1) < SNAP_ZOOM) { zoom.value = withSpring(1, SPRING); runOnJS(tick)(); }
      });
    const rotate = Gesture.Rotation()
      .onStart(() => { sRot.value = rot.value; })
      .onUpdate(e => { rot.value = sRot.value + (e.rotation * 180) / Math.PI; })
      .onEnd(() => {
        const nearest = Math.round(rot.value / 90) * 90;
        if (rot.value !== nearest && Math.abs(rot.value - nearest) < SNAP_DEG) { rot.value = withSpring(nearest, SPRING); runOnJS(tick)(); }
      });
    const fit = Gesture.Tap().numberOfTaps(2).onEnd(() => {
      tx.value = withSpring(0, SPRING); ty.value = withSpring(0, SPRING);
      zoom.value = withSpring(1, SPRING); rot.value = withSpring(Math.round(rot.value / 360) * 360, SPRING);
      runOnJS(tick)();
    });
    return Gesture.Simultaneous(pan, pinch, rotate, fit);
  }, []);

  const boxStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { rotate: `${rot.value}deg` }, { scale: zoom.value }],
  }));
  const vGuide = useAnimatedStyle(() => ({ opacity: withTiming(guideX.value, { duration: 120 }) }));
  const hGuide = useAnimatedStyle(() => ({ opacity: withTiming(guideY.value, { duration: 120 }) }));

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.canvas} collapsable={false} accessibilityLabel="Photo. Pinch to zoom, drag to move, double-tap to fit.">
        <MediaBackdrop uri={media.type === 'image' ? media.uri : media.thumb} />
        <Reanimated.View style={[{ position: 'absolute', left: (W - box.w) / 2, top: (H - box.h) / 2, width: box.w, height: box.h }, boxStyle]}>
          {media.type === 'image'
            ? <Image source={{ uri: media.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            : <ComposerVideo uri={media.uri} />}
        </Reanimated.View>
        <Reanimated.View pointerEvents="none" style={[styles.guideV, vGuide]} />
        <Reanimated.View pointerEvents="none" style={[styles.guideH, hGuide]} />
      </View>
    </GestureDetector>
  );
}

function ComposerVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, p => { p.loop = true; p.muted = false; p.play(); });
  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />;
}

/** One overlay you can drag (1 finger) and pinch / rotate (2 fingers). Drop on the bin to delete. */
function DraggableOverlay({ o, onChange, onDragState, onDrop }: {
  o: StoryOverlay; onChange: (p: Partial<StoryOverlay>) => void;
  onDragState: (dragging: boolean, overTrash: boolean) => void; onDrop: (trash: boolean) => void;
}) {
  const start = useRef({ x: 0, y: 0, scale: 1, rotation: 0, dist: 0, angle: 0, pinching: false });
  const latest = useRef(o);
  latest.current = o;
  // Callbacks change every render; the responder below is created once, so read them from a ref
  const cb = useRef({ onChange, onDragState, onDrop });
  cb.current = { onChange, onDragState, onDrop };
  const overTrash = (pageY: number) => pageY > H - 150;

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      const c = latest.current;
      start.current = { ...start.current, x: c.x, y: c.y, scale: c.scale, rotation: c.rotation, pinching: false };
      cb.current.onDragState(true, false);
    },
    onPanResponderMove: (e, g) => {
      const t = e.nativeEvent.touches;
      if (t.length >= 2) {
        const dx = t[1].pageX - t[0].pageX, dy = t[1].pageY - t[0].pageY;
        const dist = Math.hypot(dx, dy), angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        if (!start.current.pinching) {
          const c = latest.current;
          start.current = { ...start.current, dist, angle, scale: c.scale, rotation: c.rotation, pinching: true };
          return;
        }
        cb.current.onChange({
          scale: Math.max(0.3, Math.min(4, start.current.scale * (dist / start.current.dist))),
          rotation: start.current.rotation + (angle - start.current.angle),
        });
        return;
      }
      const x = Math.max(0.02, Math.min(0.98, start.current.x + g.dx / W));
      const y = Math.max(0.02, Math.min(0.98, start.current.y + g.dy / H));
      cb.current.onChange({ x, y });
      cb.current.onDragState(true, overTrash(g.moveY));
    },
    onPanResponderRelease: (_, g) => { cb.current.onDragState(false, false); cb.current.onDrop(overTrash(g.moveY) && !start.current.pinching); },
    onPanResponderTerminate: () => cb.current.onDragState(false, false),
  })).current;

  // Hit box sized to the overlay
  const k = W / 390;
  const w = (o.type === 'sticker' ? STICKER_BASE : o.type === 'poll' ? POLL_W : 220) * k * o.scale;
  const h = (o.type === 'sticker' && o.key ? STICKER_BASE / STICKERS[o.key].ratio : o.type === 'poll' ? POLL_H : 50) * k * o.scale;
  return (
    <>
      <OverlayItem o={o} width={W} height={H} />
      <View
        {...pan.panHandlers}
        style={{ position: 'absolute', left: o.x * W - w / 2, top: o.y * H - h / 2, width: w, height: h }}
        accessibilityLabel="Sticker. Drag to move, pinch to resize, drop on the bin to remove."
      />
    </>
  );
}

async function upload(uri: string, type: 'image' | 'video', userId: string): Promise<{ url: string; path: string }> {
  const ext = (uri.split('.').pop() || (type === 'image' ? 'jpg' : 'mp4')).toLowerCase().split('?')[0];
  const mime = type === 'image'
    ? (ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg')
    : (ext === 'mov' ? 'video/quicktime' : 'video/mp4');
  const path = `stories/${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const buf = await new Promise<ArrayBuffer>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', uri);
    xhr.responseType = 'arraybuffer';
    xhr.onload = () => resolve(xhr.response);
    xhr.onerror = () => reject(new Error('Could not read the file'));
    xhr.send();
  });
  const { error } = await supabase.storage.from('social-media').upload(path, buf, { contentType: mime, upsert: false });
  if (error) throw new Error(error.message);
  return { url: supabase.storage.from('social-media').getPublicUrl(path).data.publicUrl, path };
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  canvas: { position: 'absolute', left: 0, top: 0, width: W, height: H, overflow: 'hidden', backgroundColor: '#000' },
  guideV: { position: 'absolute', left: W / 2 - 0.5, top: 0, width: 1, height: H, backgroundColor: 'rgba(255,255,255,0.7)' },
  guideH: { position: 'absolute', top: H / 2 - 0.5, left: 0, height: 1, width: W, backgroundColor: 'rgba(255,255,255,0.7)' },
  textArea: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', paddingHorizontal: 28 },
  textInput: { textAlign: 'center', padding: 0 },
  top: { position: 'absolute', left: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: GAP },
  column: { position: 'absolute', right: 8 },
  columnContent: { gap: SHORT ? 8 : 10, alignItems: 'flex-end' },
  tool: { width: TOOL, height: TOOL, borderRadius: TOOL / 2, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center' },
  fontPill: { height: TOOL, minWidth: TOOL, paddingHorizontal: 12, borderRadius: TOOL / 2, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center' },
  fontPillText: { color: '#fff', fontSize: 17, fontFamily: 'SpaceGrotesk_700Bold' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  dots: { paddingHorizontal: 16, gap: NARROW ? 8 : 10, paddingBottom: SHORT ? 12 : 22, justifyContent: 'center', flexGrow: 1 },
  dot: { width: 30, height: 30, borderRadius: 15 },
  styleBtn: { borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.25)' },
  styleBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: NARROW ? 8 : 10, paddingHorizontal: NARROW ? 12 : 16 },
  audience: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, paddingHorizontal: NARROW ? 12 : 16, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.3)', flexShrink: 1, minWidth: 0 },
  audienceText: { color: '#fff', fontWeight: '600', fontSize: 14, flexShrink: 1 },
  share: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, paddingHorizontal: 22, borderRadius: 24, backgroundColor: '#fff' },
  shareMain: { flexShrink: 0, paddingHorizontal: NARROW ? 16 : 22 },
  shareText: { color: '#000', fontWeight: '600', fontSize: 15 },
  trash: { position: 'absolute', alignSelf: 'center', width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
  trashOn: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#E53E3E', borderColor: '#E53E3E' },
  tray: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#111', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 16 },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: '#3A3A3C', marginTop: 10 },
  trayTitle: { color: '#fff', fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold', marginTop: 14, marginBottom: 10 },
  trayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  trayItem: { width: (W - 32 - 24) / 3, height: (W - 32 - 24) / 3, borderRadius: 16, backgroundColor: '#1C1C1E', padding: 10 },
  labelEntry: { backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  pollEntry: { width: '100%', backgroundColor: '#fff', borderRadius: 20, padding: 16, gap: 10 },
  pollQ: { color: '#111', fontSize: 20, fontWeight: '800', textAlign: 'center', minHeight: 30 },
  pollOpt: { backgroundColor: '#F1F1F3', borderRadius: 22, height: 44, paddingHorizontal: 16, color: '#111', fontSize: 15, fontWeight: '700' },
  labelInput: { backgroundColor: '#fff', color: '#000', fontSize: 22, fontWeight: '800', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, minWidth: 200, textAlign: 'center' },
});
