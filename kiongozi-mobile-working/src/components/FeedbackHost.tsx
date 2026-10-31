// Shows the in-app toast and choice sheet (see utils/alert.ts). Mounted once in App.tsx.
// On iPhone it draws in a full-window overlay so it also appears over open modals.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Modal, useWindowDimensions, Image } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS, Easing } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { FullWindowOverlay } from 'react-native-screens';
import { useFeedback, AlertButton } from '../utils/alert';
import { useTheme } from '../hooks/useTheme';
import { useThemeStore } from '../stores/themeStore';

function Overlay({ children }: { children: React.ReactNode }) {
  if (Platform.OS === 'ios') return <FullWindowOverlay>{children}</FullWindowOverlay>;
  return <>{children}</>;
}

export function FeedbackHost() {
  return (
    <>
      <Overlay>
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <ToastView />
          {Platform.OS === 'ios' ? <SheetView /> : null}
        </View>
      </Overlay>
      {Platform.OS !== 'ios' ? <SheetModalAndroid /> : null}
    </>
  );
}

// ─── Toast ───────────────────────────────────────────────────────────────────
function ToastView() {
  const toast = useFeedback(s => s.toast);
  const next = useFeedback(s => s.nextToast);
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore(s => s.isDark);
  const y = useSharedValue(120);
  const left = useSharedValue(1); // Undo window remaining (1 → 0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [shown, setShown] = useState(toast);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!toast) {
      y.value = withTiming(120, { duration: 200 });
      return;
    }
    setShown(toast);
    if (toast.kind === 'error') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    left.value = 1;
    if (toast.action) left.value = withTiming(0, { duration: toast.duration, easing: Easing.linear });
    y.value = 120;
    y.value = withSpring(0, { damping: 17, stiffness: 230 });
    timer.current = setTimeout(() => {
      y.value = withTiming(120, { duration: 200 }, done => { if (done) runOnJS(next)(); });
    }, toast.duration);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [toast?.id]);

  const anim = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }], opacity: y.value > 100 ? 0 : 1 }));
  const bar = useAnimatedStyle(() => ({ width: `${left.value * 100}%` }));
  if (!shown) return null;

  const icon = shown.icon ?? (shown.kind === 'error' ? 'alert-circle' : shown.kind === 'success' ? 'checkmark-circle' : null);
  // A custom icon (the repost loop) is the repost green; the kind icons keep their colours
  const iconColor = shown.icon ? (shown.kind === 'error' ? '#FF6B5E' : '#86BD2E') : shown.kind === 'error' ? '#FF6B5E' : '#5CB85C';
  const bg = isDark ? '#2C2C2E' : '#1C1C1E';

  const dismiss = () => {
    if (timer.current) clearTimeout(timer.current);
    y.value = withTiming(120, { duration: 180 }, done => { if (done) runOnJS(next)(); });
  };

  return (
    <Animated.View pointerEvents="box-none" style={[styles.toastWrap, { bottom: insets.bottom + 74 }, anim]}>
      <Pressable onPress={dismiss} accessibilityLiveRegion="polite" style={[styles.toast, { backgroundColor: bg }]}>
        {icon ? <Ionicons name={icon as any} size={18} color={iconColor} /> : null}
        <View style={{ flex: 1 }}>
          <Text style={styles.toastTitle} numberOfLines={2}>{shown.title}</Text>
          {shown.message ? <Text style={styles.toastMsg} numberOfLines={3}>{shown.message}</Text> : null}
        </View>
        {shown.action ? (
          <Pressable
            hitSlop={10}
            onPress={() => { Haptics.selectionAsync().catch(() => {}); shown.action!.onPress(); dismiss(); }}
            style={({ pressed }) => [styles.toastAction, pressed && { opacity: 0.6 }]}
          >
            <Text style={styles.toastActionText}>{shown.action.label}</Text>
          </Pressable>
        ) : null}
        {shown.action ? (
          // How long Undo is still possible
          <View style={styles.countdownTrack} pointerEvents="none">
            <Animated.View style={[styles.countdown, bar]} />
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

/** The button that just closes: marked cancel, or a plain "Cancel"/"Not now" with nothing to do */
const findCancel = (buttons: AlertButton[]) =>
  buttons.find(b => b.style === 'cancel') ?? buttons.find(b => !b.onPress && /^(cancel|not now|no|keep|close|dismiss)$/i.test((b.text || '').trim()));

// ─── Sheet ───────────────────────────────────────────────────────────────────
function useSheetActions() {
  const sheet = useFeedback(s => s.sheet);
  const close = useFeedback(s => s.closeSheet);
  const press = (b?: AlertButton) => {
    close();
    // Closed without choosing anything (tap outside / back): let the caller resume
    if (!b?.onPress && sheet?.onDismiss) { try { sheet.onDismiss(); } catch {} }
    // Let the sheet go away before the action opens anything else
    if (b?.onPress) setTimeout(() => { try { b.onPress!(); } catch {} }, 220);
  };
  return { sheet, press };
}

function SheetBody({ onPress }: { onPress: (b?: AlertButton) => void }) {
  const sheet = useFeedback(s => s.sheet)!;
  const T = useTheme();
  const insets = useSafeAreaInsets();
  const cancel = findCancel(sheet.buttons);
  const actions = sheet.buttons.filter(b => b !== cancel);
  return (
    <View style={[styles.sheet, { backgroundColor: T.surface, paddingBottom: insets.bottom + 12 }]}>
      <View style={[styles.grabber, { backgroundColor: T.border }]} />
      {sheet.image ? (
        <View style={styles.paintingWrap}>
          <Image source={sheet.image} style={styles.painting} />
        </View>
      ) : null}
      {sheet.title ? <Text style={[styles.sheetTitle, { color: T.text }]}>{sheet.title}</Text> : null}
      {sheet.message ? <Text style={[styles.sheetMsg, { color: T.textSub }]}>{sheet.message}</Text> : null}
      <View style={{ height: 14 }} />
      {actions.map((b, i) => {
        const destructive = b.style === 'destructive';
        const primary = !destructive && i === actions.length - 1;
        return (
          <Pressable
            key={`${b.text}-${i}`}
            onPress={() => {
              if (destructive) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
              else Haptics.selectionAsync().catch(() => {});
              onPress(b);
            }}
            style={({ pressed }) => [
              styles.btn,
              destructive ? { backgroundColor: 'rgba(255,69,58,0.12)' } : primary ? { backgroundColor: T.text } : { borderWidth: 1.5, borderColor: T.border },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={[styles.btnText, { color: destructive ? '#FF453A' : primary ? T.bg : T.text }]}>{b.text || 'OK'}</Text>
          </Pressable>
        );
      })}
      <Pressable onPress={() => onPress(cancel)} style={({ pressed }) => [styles.cancel, pressed && { opacity: 0.6 }]}>
        <Text style={[styles.cancelText, { color: T.textSub }]}>{cancel?.text || 'Cancel'}</Text>
      </Pressable>
    </View>
  );
}

/** iPhone: drawn inside the full-window overlay */
function SheetView() {
  const { sheet, press } = useSheetActions();
  const { height } = useWindowDimensions();
  const y = useSharedValue(height);
  const fade = useSharedValue(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (sheet) {
      setMounted(true);
      fade.value = withTiming(1, { duration: 180 });
      y.value = withSpring(0, { damping: 22, stiffness: 240 });
    } else if (mounted) {
      fade.value = withTiming(0, { duration: 180 });
      y.value = withTiming(height, { duration: 200 }, done => { if (done) runOnJS(setMounted)(false); });
    }
  }, [sheet?.id]);

  const sheetAnim = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const backAnim = useAnimatedStyle(() => ({ opacity: fade.value }));
  if (!mounted || !sheet) return null;
  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backAnim]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => sheet.cancelable && press(findCancel(sheet.buttons))} />
      </Animated.View>
      <Animated.View style={[styles.sheetWrap, sheetAnim]}>
        <SheetBody onPress={press} />
      </Animated.View>
    </View>
  );
}

/** Android: a transparent modal, which stacks over other modals */
function SheetModalAndroid() {
  const { sheet, press } = useSheetActions();
  return (
    <Modal
      visible={!!sheet}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={() => sheet?.cancelable && press(findCancel(sheet.buttons))}
    >
      <View style={[StyleSheet.absoluteFill, styles.backdrop]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => sheet?.cancelable && press(findCancel(sheet.buttons))} />
      </View>
      <View style={styles.sheetWrap}>{sheet ? <SheetBody onPress={press} /> : null}</View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  toastWrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 10, maxWidth: 440, width: '100%', overflow: 'hidden',
    paddingVertical: 12, paddingHorizontal: 16, borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.10)',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  toastTitle: { color: '#FFFFFF', fontSize: 14.5, fontWeight: '600' },
  toastMsg: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2, lineHeight: 18 },
  toastAction: { paddingHorizontal: 8, paddingVertical: 8, marginRight: -4 },
  countdownTrack: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 2 },
  countdown: { height: 2, backgroundColor: 'rgba(92,184,92,0.55)' },
  paintingWrap: { alignSelf: 'center', marginTop: 4, marginBottom: 14, transform: [{ rotate: '-2deg' }], shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  painting: { width: 112, height: 112, borderRadius: 18 },
  toastActionText: { color: '#5CB85C', fontSize: 15, fontWeight: '700' },

  backdrop: { backgroundColor: 'rgba(0,0,0,0.45)' },
  sheetWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 8 },
  grabber: { alignSelf: 'center', width: 38, height: 5, borderRadius: 3, marginBottom: 14 },
  sheetTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  sheetMsg: { fontSize: 14.5, lineHeight: 20, textAlign: 'center', marginTop: 6, paddingHorizontal: 8 },
  btn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  btnText: { fontSize: 16, fontWeight: '600' },
  cancel: { height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  cancelText: { fontSize: 15.5, fontWeight: '600' },
});
