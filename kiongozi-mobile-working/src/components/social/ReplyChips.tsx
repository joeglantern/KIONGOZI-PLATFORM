// Quick reply ideas above the chat box (Gmail / LinkedIn style). Only when their message is the
// last one and you haven't started typing. Tapping one puts it in the box so you can edit it.
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, Pressable, Text, StyleSheet, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import apiClient from '../../utils/apiClient';
import { useTheme } from '../../hooks/useTheme';
import { usePrefs } from '../../stores/prefsStore';

type Last = { id: string; sender_id: string; content?: string | null; _pending?: boolean } | undefined;

export function ReplyChips({ conversationId, last, myId, hidden, onPick }: {
  conversationId: string; last: Last; myId?: string; hidden: boolean; onPick: (text: string) => void;
}) {
  const T = useTheme();
  const enabled = usePrefs(s => (s.features as any).smart_replies !== false);
  const [replies, setReplies] = useState<string[]>([]);
  const [forId, setForId] = useState<string | null>(null);
  const fade = useRef(new Animated.Value(0)).current;

  const theirs = !!last && !!myId && last.sender_id !== myId && !!last.content?.trim() && !String(last.id).startsWith('temp_');

  useEffect(() => {
    if (!enabled || !theirs || !last) { setReplies([]); return; }
    if (forId === last.id) return;
    let alive = true;
    const t = setTimeout(async () => {
      try {
        const r: any = await apiClient.getReplySuggestions(conversationId);
        if (!alive) return;
        setForId(last.id);
        setReplies(r?.success && Array.isArray(r.data?.replies) ? r.data.replies.slice(0, 3) : []);
      } catch {}
    }, 700);
    return () => { alive = false; clearTimeout(t); };
  }, [enabled, theirs, last?.id, conversationId]);

  const show = enabled && theirs && !hidden && replies.length > 0 && forId === last?.id;
  useEffect(() => {
    Animated.timing(fade, { toValue: show ? 1 : 0, duration: show ? 220 : 120, useNativeDriver: true }).start();
  }, [show]);

  if (!show) return null;
  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }] }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always" contentContainerStyle={styles.row}>
        {replies.map((r, i) => (
          <Pressable
            key={`${r}-${i}`}
            onPress={() => { Haptics.selectionAsync().catch(() => {}); onPick(r); }}
            accessibilityRole="button"
            accessibilityLabel={`Reply: ${r}`}
            style={({ pressed }) => [styles.chip, { borderColor: T.border, backgroundColor: pressed ? T.surface2 : 'transparent' }]}
          >
            <Text style={[styles.text, { color: T.text }]} numberOfLines={1}>{r}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingHorizontal: 12, paddingBottom: 8, paddingTop: 2 },
  chip: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, height: 36, justifyContent: 'center', maxWidth: 240 },
  text: { fontSize: 14.5, fontWeight: '500' },
});
