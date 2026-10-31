// Profile QR card: the server draws a white card (photo, name, @handle, QR, "Scan to follow on KChat");
// here it is shown big with Share and Save. Saving goes through the system sheet ("Save Image").
import React, { useEffect, useState } from 'react';
import { View, Text, Image, Modal, Pressable, StyleSheet, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiClient from '../../utils/apiClient';
import { useTheme } from '../../hooks/useTheme';
import { shareImageFile } from '../../utils/shareImage';

const cards = new Map<string, { url: string; profile_url: string }>();

export function QRCardSheet({ visible, username, onClose }: { visible: boolean; username?: string | null; onClose: () => void }) {
  const T = useTheme();
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const [card, setCard] = useState<{ url: string; profile_url: string } | null>(username ? cards.get(username) ?? null : null);
  const [err, setErr] = useState<string | null>(null);
  const [imgReady, setImgReady] = useState(false);

  useEffect(() => {
    if (!visible || !username) return;
    let alive = true;
    const hit = cards.get(username);
    setErr(null);
    if (hit) setCard(hit);
    else { setCard(null); setImgReady(false); }
    apiClient.getQrCard(username).then(r => {
      if (!alive) return;
      if (r?.success && r.data?.url) {
        const c = { url: r.data.url, profile_url: r.data.profile_url };
        if (c.url !== hit?.url) setImgReady(false);
        cards.set(username, c);
        setCard(c);
      } else if (!hit) setErr(r?.error || 'Could not make the QR card');
    }).catch(() => { if (alive && !hit) setErr('Could not make the QR card'); });
    return () => { alive = false; };
  }, [visible, username]);

  const share = async () => {
    if (!card) return;
    Haptics.selectionAsync().catch(() => {});
    await shareImageFile(card.url, `Follow @${username} on KChat\n${card.profile_url}`);
  };

  const ratio = 1080 / 1350;
  const maxH = Math.max(260, H - insets.top - insets.bottom - 220);
  const pw = Math.min(W - 48, maxH * ratio);
  const ph = pw / ratio;
  const ready = !!card && imgReady;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: T.bg, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.head}>
          <Text style={[styles.title, { color: T.text }]}>QR card</Text>
          <Pressable onPress={onClose} hitSlop={10} style={[styles.close, { backgroundColor: T.surface2 }]} accessibilityLabel="Close">
            <Ionicons name="close" size={18} color={T.text} />
          </Pressable>
        </View>

        <View style={styles.previewWrap}>
          <View style={[styles.preview, { width: pw, height: ph, backgroundColor: T.surface }]}>
            {card ? (
              <Image source={{ uri: card.url }} style={StyleSheet.absoluteFill} resizeMode="cover"
                onLoad={() => setImgReady(true)} accessibilityLabel={`QR code for @${username}`} />
            ) : null}
            {!ready && !err ? <View style={styles.center}><ActivityIndicator color={T.text} /></View> : null}
            {err ? <View style={styles.center}><Text style={[styles.err, { color: T.textSub }]}>{err}</Text></View> : null}
          </View>
          <Text style={[styles.hint, { color: T.textSub }]}>Anyone can scan it with their phone camera to open your profile.</Text>
        </View>

        <View style={styles.actions}>
          <Pressable onPress={share} disabled={!card} accessibilityRole="button"
            style={({ pressed }) => [styles.primary, { backgroundColor: T.text }, (pressed || !card) && { opacity: 0.75 }]}>
            <Ionicons name="share-outline" size={20} color={T.bg} />
            <Text style={[styles.primaryText, { color: T.bg }]}>Share</Text>
          </Pressable>
          <Pressable onPress={share} disabled={!card} accessibilityRole="button" accessibilityLabel="Save image"
            style={({ pressed }) => [styles.secondary, { backgroundColor: T.surface2 }, (pressed || !card) && { opacity: 0.75 }]}>
            <Ionicons name="download-outline" size={20} color={T.text} />
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
  preview: { borderRadius: 24, overflow: 'hidden' },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 24 },
  err: { fontSize: 14, textAlign: 'center' },
  hint: { fontSize: 13, textAlign: 'center', marginTop: 14, paddingHorizontal: 24 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  primary: { flex: 1, height: 52, borderRadius: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryText: { fontSize: 16, fontWeight: '700' },
  secondary: { flex: 1, height: 52, borderRadius: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secondaryText: { fontSize: 16, fontWeight: '700' },
});
