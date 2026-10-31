// Profile QR card in cut paper. The card is drawn live here (paper pieces from the "Your week" kit, the code's
// modules as Views from the matrix the API sends), so changing colours and style is instant: tap the card or
// a swatch to change the paper, switch between Paper and Brush. Share and Save fetch the same card rendered by
// the server (QrCardService) for the chosen look; it starts rendering as soon as the choice settles.
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Image, Modal, Pressable, StyleSheet, ActivityIndicator, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiClient from '../../utils/apiClient';
import { useTheme } from '../../hooks/useTheme';
import { shareImageFile } from '../../utils/shareImage';
import { enterFade } from '../../theme/motion';
import { PAPER, AR, Cutout } from '../wrapped/paper';
import {
  QR_THEMES, QR_THEME_ORDER, QR_LAYOUT, QR_INK, QR_CARD, QR_PATCH_RING, BOARD_W, BOARD_H,
  QrThemeId, QrStyle, QrShape, clearRadius, inFinder, textWidth, nameSize, cardName,
} from './qrCardDesign';

const LOGO = require('../../../assets/kchat-logo.png');
const FONT = 'SpaceGrotesk_700Bold';
const LOOK_KEY = 'kchat.qrcard.look';

type CardData = { name: string; username: string; avatar_url: string | null; qr: string[]; profile_url: string };
const cards = new Map<string, CardData>();
const exportJobs = new Map<string, Promise<string>>();
let lastLook: { theme: QrThemeId; style: QrStyle } = { theme: 'coral', style: 'paper' };

/** The exported PNG for this look (one request per look; a failed one can be retried) */
function exportUrl(username: string, theme: QrThemeId, style: QrStyle): Promise<string> {
  const key = `${username}|${theme}|${style}`;
  let p = exportJobs.get(key);
  if (!p) {
    p = apiClient.getQrCard(username, { theme, style }).then(r => {
      if (r?.success && r.data?.url) return r.data.url;
      throw new Error(r?.error || 'Could not make the QR card');
    });
    p.catch(() => exportJobs.delete(key));
    exportJobs.set(key, p);
  }
  return p;
}

const SHAPES: Record<QrShape, { src: any; ar: number }> = {
  star: { src: PAPER.star, ar: AR.star },
  squiggle: { src: PAPER.squiggle, ar: AR.squiggle },
  heart: { src: PAPER.heart, ar: AR.heart },
  sun: { src: PAPER.sun, ar: AR.sun },
  dots: { src: PAPER.dots, ar: AR.dots },
};

const initials = (name: string) =>
  (name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || '?';

/** The code: styled modules, styled eyes, the photo in a cleared circle in the middle */
const QrCode = memo(function QrCode({ rows, size, ink, style, ring, avatar, name }: {
  rows: string[]; size: number; ink: string; style: QrStyle; ring: string; avatar: string | null; name: string;
}) {
  const n = rows.length, m = size / n;
  const cells = useMemo(() => {
    const out: [number, number][] = [];
    const c = n / 2, R = clearRadius(n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      if (rows[y][x] !== '1' || inFinder(x, y, n)) continue;
      if (Math.hypot(x + 0.5 - c, y + 0.5 - c) < R) continue;
      out.push([x, y]);
    }
    return out;
  }, [rows, n]);
  const dot = style === 'brush';
  const R = clearRadius(n);
  const d = Math.round((R - 0.5) * 2 * m), rg = Math.round(m * 0.45);
  const ro = dot ? 2.6 : 1.7, ri = dot ? 1.4 : 0.9;
  return (
    <View style={{ width: size, height: size }}>
      {cells.map(([x, y]) => (
        <View key={y * n + x} style={dot
          ? { position: 'absolute', left: (x + 0.02) * m, top: (y + 0.02) * m, width: m * 0.96, height: m * 0.96, borderRadius: m * 0.48, backgroundColor: ink }
          : { position: 'absolute', left: (x + 0.03) * m, top: (y + 0.03) * m, width: m * 0.94, height: m * 0.94, borderRadius: m * 0.3, backgroundColor: ink }} />
      ))}
      {[[0, 0], [n - 7, 0], [0, n - 7]].map(([fx, fy]) => (
        <React.Fragment key={`${fx}-${fy}`}>
          <View style={{ position: 'absolute', left: fx * m, top: fy * m, width: 7 * m, height: 7 * m, borderRadius: (ro + 0.5) * m, borderWidth: m, borderColor: ink }} />
          <View style={{ position: 'absolute', left: (fx + 2) * m, top: (fy + 2) * m, width: 3 * m, height: 3 * m, borderRadius: ri * m, backgroundColor: ink }} />
        </React.Fragment>
      ))}
      <View style={{
        position: 'absolute', left: size / 2 - d / 2 - rg, top: size / 2 - d / 2 - rg, width: d + rg * 2, height: d + rg * 2,
        borderRadius: d / 2 + rg, backgroundColor: ring, alignItems: 'center', justifyContent: 'center',
      }}>
        {avatar
          ? <Image source={{ uri: avatar }} style={{ width: d, height: d, borderRadius: d / 2 }} />
          : <View style={{ width: d, height: d, borderRadius: d / 2, backgroundColor: ink, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: QR_CARD, fontFamily: FONT, fontSize: d * 0.38, includeFontPadding: false }}>{initials(name)}</Text>
            </View>}
      </View>
    </View>
  );
});

/** A cut-paper shape with its edge-following shadow, placed in board px */
function Shape({ shape, x, y, w, rot, k }: { shape: QrShape; x: number; y: number; w: number; rot: number; k: number }) {
  const s = SHAPES[shape];
  const ht = Math.round(w * s.ar);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x * k, top: y * k, width: (w + 12) * k, height: (ht + 14) * k, transform: [{ rotate: `${rot}deg` }] }}>
      <Cutout source={s.src} w={w * k} h={ht * k} off={8 * k} shadow={0.22} />
    </View>
  );
}

function Mark({ k, color }: { k: number; color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ width: 58 * k, height: 58 * k, borderRadius: 15 * k, backgroundColor: '#FFFFFF', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
        <Image source={LOGO} style={{ width: 50 * k, height: 50 * k }} resizeMode="contain" />
      </View>
      <Text style={{ fontFamily: FONT, fontSize: 36 * k, color, marginLeft: 16 * k, letterSpacing: -0.5 * k }}>KChat</Text>
    </View>
  );
}

/** The whole card at `width` px wide (4:5), built from the same numbers as the exported image */
export function QrCardArt({ card, theme, style, width }: { card: CardData | null; theme: QrThemeId; style: QrStyle; width: number }) {
  const t = QR_THEMES[theme];
  const k = width / BOARD_W;
  const name = cardName(card?.name || card?.username || '');
  const handle = card ? `@${card.username}` : '';
  const abs = (x: number, y: number) => ({ position: 'absolute' as const, left: x * k, top: y * k });
  const [s1, s2] = t.shapes;
  const code = (size: number, ring: string) => card?.qr?.length
    ? <QrCode rows={card.qr} size={size * k} ink={t.qr} style={style} ring={ring} avatar={card.avatar_url} name={name} />
    : <View style={{ width: size * k, height: size * k, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={QR_INK} /></View>;

  let body: React.ReactNode;
  if (style === 'paper') {
    const L = QR_LAYOUT.paper;
    const nSize = nameSize(name, 92, 720);
    const hw = Math.min(860, textWidth(handle, 46) + 40);
    body = (
      <>
        <View style={abs(80, 76)}><Mark k={k} color={t.text} /></View>
        <Text numberOfLines={1} style={[abs(80, 168), { width: 720 * k, fontFamily: FONT, fontSize: nSize * k, lineHeight: nSize * 1.08 * k, color: t.text, letterSpacing: -3 * k }]}>{name}</Text>
        <Image source={PAPER.underline} resizeMode="stretch" fadeDuration={0}
          style={[abs(64, 316), { width: hw * k, height: 40 * k, tintColor: t.brush, transform: [{ rotate: '-2deg' }] }]} />
        <Text numberOfLines={1} style={[abs(80, 268), { fontFamily: FONT, fontSize: 46 * k, color: t.text }]}>{handle}</Text>
        <Image source={PAPER.patch} resizeMode="stretch" fadeDuration={0}
          style={[abs(L.patch.x + 14, L.patch.y + 20), { width: L.patch.w * k, height: L.patch.h * k, tintColor: QR_INK, opacity: 0.24, transform: [{ rotate: `${L.patch.rot}deg` }] }]} />
        <View style={[abs(L.patch.x, L.patch.y), { width: L.patch.w * k, height: L.patch.h * k, transform: [{ rotate: `${L.patch.rot}deg` }] }]}>
          <Image source={PAPER.patch} resizeMode="stretch" fadeDuration={0} style={StyleSheet.absoluteFill} />
          <View style={abs(L.qr.x, L.qr.y)}>{code(L.qr.size, QR_PATCH_RING)}</View>
          <Text style={[abs(0, L.caption), { width: L.patch.w * k, textAlign: 'center', fontFamily: FONT, fontSize: 34 * k, color: QR_INK }]}>Scan to follow me on KChat</Text>
        </View>
        <Shape shape={s1} {...L.shapes[0]} k={k} />
        <Shape shape={s2} {...L.shapes[1]} k={k} />
      </>
    );
  } else {
    const L = QR_LAYOUT.brush;
    const c = L.card, inset = (c.size - L.qr) / 2;
    const nSize = nameSize(name, 96, 1000);
    const sw = Math.min(900, textWidth(name, nSize) + 40);
    body = (
      <>
        <View style={[abs(c.x + 14, c.y + 20), { width: c.size * k, height: c.size * k, borderRadius: c.radius * k, backgroundColor: QR_INK, opacity: 0.24 }]} />
        <View style={[abs(c.x, c.y), { width: c.size * k, height: c.size * k, borderRadius: c.radius * k, backgroundColor: QR_CARD }]}>
          <View style={abs(inset, inset)}>{code(L.qr, QR_CARD)}</View>
        </View>
        <Image source={PAPER.scribble} resizeMode="stretch" fadeDuration={0}
          style={[abs((BOARD_W - sw) / 2, L.name + Math.round(nSize * 1.04)), { width: sw * k, height: 30 * k, tintColor: t.brush }]} />
        <Text numberOfLines={1} style={[abs(40, L.name), { width: (BOARD_W - 80) * k, textAlign: 'center', fontFamily: FONT, fontSize: nSize * k, lineHeight: nSize * 1.08 * k, color: t.text, letterSpacing: -3 * k }]}>{name}</Text>
        <Text numberOfLines={1} style={[abs(40, L.handle), { width: (BOARD_W - 80) * k, textAlign: 'center', fontFamily: FONT, fontSize: 44 * k, color: t.text, opacity: 0.86 }]}>{handle}</Text>
        <View style={[abs(0, L.foot), { width: width, alignItems: 'center' }]}><Mark k={k} color={t.text} /></View>
        <Shape shape={s1} {...L.shapes[0]} k={k} />
        <Shape shape={s2} {...L.shapes[1]} k={k} />
      </>
    );
  }

  return (
    <View style={{ width, height: width * BOARD_H / BOARD_W, backgroundColor: t.bg, overflow: 'hidden' }}>
      <Image source={PAPER.grain} resizeMode="cover" fadeDuration={0}
        style={[StyleSheet.absoluteFill, { width, height: width * BOARD_H / BOARD_W, opacity: t.text === QR_INK ? 0.7 : 0.9 }]} />
      {body}
    </View>
  );
}

export function QRCardSheet({ visible, username, onClose }: { visible: boolean; username?: string | null; onClose: () => void }) {
  const T = useTheme();
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const [card, setCard] = useState<CardData | null>(username ? cards.get(username) ?? null : null);
  const [err, setErr] = useState<string | null>(null);
  const [theme, setThemeId] = useState<QrThemeId>(lastLook.theme);
  const [style, setStyle] = useState<QrStyle>(lastLook.style);
  const [busy, setBusy] = useState<null | 'share' | 'save'>(null);
  const loadedLook = useRef(false);

  // The last look you picked comes back next time
  useEffect(() => {
    if (loadedLook.current) return;
    loadedLook.current = true;
    AsyncStorage.getItem(LOOK_KEY).then(v => {
      if (!v) return;
      const l = JSON.parse(v);
      if (l?.theme in QR_THEMES) { setThemeId(l.theme); lastLook.theme = l.theme; }
      if (l?.style === 'paper' || l?.style === 'brush') { setStyle(l.style); lastLook.style = l.style; }
    }).catch(() => {});
  }, []);
  useEffect(() => {
    lastLook = { theme, style };
    AsyncStorage.setItem(LOOK_KEY, JSON.stringify(lastLook)).catch(() => {});
  }, [theme, style]);

  // The matrix, name and photo (no image yet, so the card shows at once)
  useEffect(() => {
    if (!visible || !username) return;
    let alive = true;
    const hit = cards.get(username);
    setErr(null);
    setCard(hit ?? null);
    apiClient.getQrCard(username, { render: false }).then(r => {
      if (!alive) return;
      if (r?.success && r.data?.qr?.length) {
        const c: CardData = { name: r.data.name, username: r.data.username, avatar_url: r.data.avatar_url, qr: r.data.qr, profile_url: r.data.profile_url };
        cards.set(username, c);
        setCard(c);
      } else if (!hit) setErr(r?.error || 'Could not make the QR card');
    }).catch(() => { if (alive && !hit) setErr('Could not make the QR card'); });
    return () => { alive = false; };
  }, [visible, username]);

  // Start rendering the export once the choice settles, so Share is quick
  useEffect(() => {
    if (!visible || !username || !card) return;
    const id = setTimeout(() => { exportUrl(username, theme, style).catch(() => {}); }, 700);
    return () => clearTimeout(id);
  }, [visible, username, card, theme, style]);

  const pickTheme = useCallback((id: QrThemeId) => {
    Haptics.selectionAsync().catch(() => {});
    setThemeId(id);
  }, []);
  const nextTheme = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    setThemeId(cur => QR_THEME_ORDER[(QR_THEME_ORDER.indexOf(cur) + 1) % QR_THEME_ORDER.length]);
  }, []);

  const share = async (kind: 'share' | 'save') => {
    if (!card || !username || busy) return;
    Haptics.selectionAsync().catch(() => {});
    setBusy(kind);
    try {
      const url = await exportUrl(username, theme, style);
      await shareImageFile(url, `Follow @${card.username} on KChat\n${card.profile_url}`);
    } catch (e: any) {
      setErr(e?.message || 'Could not make the QR card');
      setTimeout(() => setErr(null), 3000);
    } finally {
      setBusy(null);
    }
  };

  const ratio = BOARD_W / BOARD_H;
  const maxH = Math.max(260, H - insets.top - insets.bottom - 300);
  const pw = Math.floor(Math.min(W - 48, maxH * ratio));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: T.bg, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.head}>
          <Text style={[styles.title, { color: T.text }]}>QR code</Text>
          <Pressable onPress={onClose} hitSlop={10} style={[styles.close, { backgroundColor: T.surface2 }]} accessibilityLabel="Close">
            <Ionicons name="close" size={18} color={T.text} />
          </Pressable>
        </View>

        <View style={styles.previewWrap}>
          <Pressable onPress={nextTheme} accessibilityRole="button" accessibilityLabel={`QR code for @${username}`}
            accessibilityHint="Changes the colours">
            <Animated.View entering={enterFade(240)} style={[styles.preview, { width: pw, height: pw / ratio }]}>
              <QrCardArt card={card} theme={theme} style={style} width={pw} />
            </Animated.View>
          </Pressable>
          <Text style={[styles.hint, { color: err ? '#E5484D' : T.textSub }]}>
            {err || 'Tap the card to change the colours'}
          </Text>
        </View>

        <View style={styles.swatches}>
          {QR_THEME_ORDER.map(id => {
            const on = id === theme;
            return (
              <Pressable key={id} onPress={() => pickTheme(id)} hitSlop={4} accessibilityRole="button"
                accessibilityLabel={`${id} paper`} accessibilityState={{ selected: on }}
                style={[styles.swatchRing, { borderColor: on ? T.text : 'transparent' }]}>
                <View style={[styles.swatch, { backgroundColor: QR_THEMES[id].bg }]}>
                  <View style={[styles.swatchInk, { backgroundColor: QR_THEMES[id].qr === QR_THEMES[id].bg ? QR_CARD : QR_THEMES[id].qr }]} />
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.segment, { backgroundColor: T.surface2 }]}>
          {(['paper', 'brush'] as QrStyle[]).map(s => {
            const on = s === style;
            return (
              <Pressable key={s} onPress={() => { Haptics.selectionAsync().catch(() => {}); setStyle(s); }} accessibilityRole="button"
                accessibilityState={{ selected: on }} style={[styles.segBtn, on && { backgroundColor: T.bg }]}>
                <Text style={[styles.segText, { color: on ? T.text : T.textSub }]}>{s === 'paper' ? 'Paper' : 'Brush'}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.actions}>
          <Pressable onPress={() => share('share')} disabled={!card || !!busy} accessibilityRole="button"
            style={({ pressed }) => [styles.primary, { backgroundColor: T.text }, (pressed || !card) && { opacity: 0.75 }]}>
            {busy === 'share' ? <ActivityIndicator color={T.bg} /> : <Ionicons name="share-outline" size={20} color={T.bg} />}
            <Text style={[styles.primaryText, { color: T.bg }]}>Share</Text>
          </Pressable>
          <Pressable onPress={() => share('save')} disabled={!card || !!busy} accessibilityRole="button" accessibilityLabel="Save image"
            style={({ pressed }) => [styles.secondary, { backgroundColor: T.surface2 }, (pressed || !card) && { opacity: 0.75 }]}>
            {busy === 'save' ? <ActivityIndicator color={T.text} /> : <Ionicons name="download-outline" size={20} color={T.text} />}
            <Text style={[styles.secondaryText, { color: T.text }]}>Save</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

/** A round QR button that opens the sheet itself (the Settings account card uses it). */
export function QRCardButton({ username, style }: { username?: string | null; style?: any }) {
  const T = useTheme();
  const [open, setOpen] = useState(false);
  if (!username) return null;
  return (
    <>
      <Pressable
        onPress={() => { Haptics.selectionAsync().catch(() => {}); setOpen(true); }}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel="Your QR card"
        style={({ pressed }) => [qrBtn.btn, { borderColor: T.border }, pressed && { opacity: 0.6 }, style]}
      >
        <Ionicons name="qr-code-outline" size={17} color={T.text} />
      </Pressable>
      <QRCardSheet visible={open} username={username} onClose={() => setOpen(false)} />
    </>
  );
}

const qrBtn = StyleSheet.create({
  btn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 16 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 18, paddingBottom: 8 },
  title: { fontSize: 17, fontWeight: '700' },
  close: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  previewWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  preview: { borderRadius: 22, overflow: 'hidden' },
  hint: { fontSize: 13, textAlign: 'center', marginTop: 12, paddingHorizontal: 24 },
  swatches: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 6 },
  swatchRing: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  swatchInk: { width: 10, height: 10, borderRadius: 5 },
  segment: { flexDirection: 'row', alignSelf: 'center', borderRadius: 20, padding: 3, marginTop: 14 },
  segBtn: { height: 34, paddingHorizontal: 26, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  segText: { fontSize: 14, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  primary: { flex: 1, height: 52, borderRadius: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryText: { fontSize: 16, fontWeight: '700' },
  secondary: { flex: 1, height: 52, borderRadius: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secondaryText: { fontSize: 16, fontWeight: '700' },
});
