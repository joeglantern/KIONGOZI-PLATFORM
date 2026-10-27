import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, Pressable, Modal, TextInput,
  StyleSheet, Alert, ActivityIndicator, ScrollView,
  KeyboardAvoidingView, Platform, Animated, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import apiClient from '../../utils/apiClient';
import { useTheme, AppTheme } from '../../hooks/useTheme';

const REASONS: { value: string; label: string }[] = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'hate_speech', label: 'Hate speech' },
  { value: 'misinformation', label: 'Misinformation' },
  { value: 'explicit_content', label: 'Explicit or adult content' },
  { value: 'other', label: 'Something else' },
];

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface ReportTarget {
  type: 'post' | 'user';
  id: string;
  displayName: string;
}

interface ReportModalProps {
  target: ReportTarget | null;
  onClose: () => void;
}

type DoneState = null | 'submitted' | 'duplicate';

export default function ReportModal({ target, onClose }: ReportModalProps) {
  const T = useTheme();
  const styles = useMemo(() => makeStyles(T), [T]);
  const insets = useSafeAreaInsets();
  const [selectedReason, setSelectedReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<DoneState>(null);
  const [detailsFocused, setDetailsFocused] = useState(false);
  const sheetY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const visible = !!target;

  useEffect(() => {
    if (visible) {
      sheetY.setValue(SCREEN_HEIGHT);
      Animated.spring(sheetY, { toValue: 0, useNativeDriver: true, damping: 24, stiffness: 240 }).start();
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert('Select a reason', 'Please choose a reason for your report.');
      return;
    }
    if (!target) return;

    setLoading(true);
    try {
      const res = await apiClient.reportContent(
        target.type,
        target.id,
        selectedReason,
        description.trim() || undefined
      );
      if (res.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setDone('submitted');
      } else if (res.error?.includes('already reported')) {
        setDone('duplicate');
      } else {
        Alert.alert('Error', res.error || 'Failed to submit report. Please try again.');
      }
    } catch {
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedReason('');
    setDescription('');
    setDone(null);
    onClose();
  };

  const selectReason = (value: string) => {
    if (value !== selectedReason) Haptics.selectionAsync().catch(() => {});
    setSelectedReason(value);
  };

  const noun = target?.type === 'user' ? 'account' : 'post';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.root}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} accessibilityLabel="Close" />

        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 16), maxHeight: SCREEN_HEIGHT - insets.top - 24 },
            { transform: [{ translateY: sheetY }] },
          ]}
        >
          <View style={styles.grabber} />

          {done ? (
            <View style={styles.doneWrap}>
              <View style={styles.doneIcon}>
                <Ionicons name="checkmark" size={30} color="#000" />
              </View>
              <Text style={[styles.title, { textAlign: 'center' }]}>
                {done === 'submitted' ? 'Thanks for letting us know' : 'Already reported'}
              </Text>
              <Text style={styles.doneSub}>
                {done === 'submitted'
                  ? `Your report helps keep KChat safe. We’ll review this ${noun} against our community guidelines.`
                  : `You already reported this ${noun} recently. We’re reviewing it.`}
              </Text>
              <Pressable
                onPress={handleClose}
                style={({ pressed }) => [styles.primaryBtn, { alignSelf: 'stretch', marginTop: 24 }, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.primaryBtnText}>Done</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20 }}
                bounces={false}
              >
                <Text style={styles.title}>Report {noun}</Text>
                <Text style={styles.subtitle} numberOfLines={2}>
                  Why are you reporting {target?.displayName || `this ${noun}`}?
                </Text>

                <View style={styles.reasons}>
                  {REASONS.map((r, i) => {
                    const selected = selectedReason === r.value;
                    return (
                      <Pressable
                        key={r.value}
                        onPress={() => selectReason(r.value)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        style={({ pressed }) => [
                          styles.reasonRow,
                          i < REASONS.length - 1 && styles.reasonDivider,
                          pressed && { backgroundColor: T.surface2 },
                        ]}
                      >
                        <Text style={styles.reasonLabel}>{r.label}</Text>
                        <View style={[styles.radio, selected && styles.radioSelected]}>
                          {selected && <View style={styles.radioDot} />}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.detailsLabel}>Add details (optional)</Text>
                <TextInput
                  style={[styles.textarea, detailsFocused && { borderColor: T.text }]}
                  value={description}
                  onChangeText={t => setDescription(t.slice(0, 500))}
                  onFocus={() => setDetailsFocused(true)}
                  onBlur={() => setDetailsFocused(false)}
                  placeholder="Anything that helps us understand what’s wrong"
                  placeholderTextColor={T.placeholder}
                  multiline
                  textAlignVertical="top"
                />
                <Text style={styles.charCount}>{description.length}/500</Text>
              </ScrollView>

              <View style={styles.footer}>
                <Pressable
                  onPress={handleSubmit}
                  disabled={loading || !selectedReason}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    !selectedReason && styles.primaryBtnDisabled,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Text style={[styles.primaryBtnText, !selectedReason && { color: T.textMuted }]}>Submit report</Text>
                  )}
                </Pressable>
                <Pressable
                  onPress={handleClose}
                  style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.5 }]}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
              </View>
            </>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function makeStyles(T: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: {
      backgroundColor: T.bg,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingTop: 10,
    },
    grabber: {
      alignSelf: 'center', width: 36, height: 5, borderRadius: 3,
      backgroundColor: T.border, marginBottom: 16,
    },
    title: { fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold', color: T.text },
    subtitle: { fontSize: 14, color: T.textMuted, marginTop: 4, lineHeight: 20 },
    reasons: {
      marginTop: 16, backgroundColor: T.surface, borderRadius: 16, overflow: 'hidden',
    },
    reasonRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      minHeight: 52, paddingHorizontal: 16, gap: 12,
    },
    reasonDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.border },
    reasonLabel: { flex: 1, fontSize: 16, color: T.text },
    radio: {
      width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: T.textMuted,
      alignItems: 'center', justifyContent: 'center',
    },
    radioSelected: { borderColor: T.accent },
    radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: T.accent },
    detailsLabel: { fontSize: 13, color: T.textMuted, marginTop: 20, marginBottom: 8 },
    textarea: {
      borderRadius: 14, borderWidth: 1, borderColor: T.border, backgroundColor: T.bg,
      paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12,
      fontSize: 15, color: T.text, minHeight: 96,
    },
    charCount: { fontSize: 12, color: T.textMuted, textAlign: 'right', marginTop: 6 },
    footer: { paddingHorizontal: 20, paddingTop: 12 },
    primaryBtn: {
      height: 48, borderRadius: 24, backgroundColor: T.accent,
      alignItems: 'center', justifyContent: 'center',
    },
    primaryBtnDisabled: { backgroundColor: T.surface2 },
    primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#000' },
    cancelBtn: { height: 44, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
    cancelText: { fontSize: 16, fontWeight: '600', color: T.text },
    doneWrap: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 8, paddingBottom: 8 },
    doneIcon: {
      width: 64, height: 64, borderRadius: 32, backgroundColor: T.accent,
      alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    },
    doneSub: { fontSize: 14, color: T.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  });
}
