// "Select text" (Telegram style): the message opens in a sheet where you can drag the handles to
// copy just part of it. iOS: a read-only text field (real selection handles). Android: selectable
// text, which supports partial selection natively.
import React from 'react';
import { Modal, View, Text, TextInput, Pressable, StyleSheet, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';

export function SelectTextSheet({ text, onClose }: { text: string | null; onClose: () => void }) {
  const T = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={!!text} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={[styles.sheet, { backgroundColor: T.surface, paddingBottom: insets.bottom + 16 }]}>
        <View style={[styles.grabber, { backgroundColor: T.border }]} />
        <View style={styles.head}>
          <Text style={[styles.title, { color: T.text }]}>Select text</Text>
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button">
            <Text style={[styles.done, { color: T.accent }]}>Done</Text>
          </Pressable>
        </View>
        <Text style={[styles.hint, { color: T.textMuted }]}>Press and drag to choose the words you want to copy.</Text>
        <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}>
          {Platform.OS === 'ios' ? (
            <TextInput
              value={text || ''}
              editable={false}
              multiline
              scrollEnabled={false}
              style={[styles.body, { color: T.text }]}
            />
          ) : (
            <Text selectable style={[styles.body, { color: T.text }]}>{text}</Text>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 8 },
  grabber: { width: 38, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 10 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  title: { fontSize: 17, fontWeight: '700' },
  done: { fontSize: 16, fontWeight: '600' },
  hint: { fontSize: 13, paddingHorizontal: 20, marginTop: 4, marginBottom: 12 },
  body: { fontSize: 18, lineHeight: 26, padding: 0 },
});
