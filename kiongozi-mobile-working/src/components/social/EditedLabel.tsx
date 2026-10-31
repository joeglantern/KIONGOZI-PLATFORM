// "Edited" beside a post's time (X / Threads). Tapping it opens the edit history: the current text first,
// then each earlier version with when it was written. Edits made on this phone show at once (markEdited),
// the rest come from posts.edited_at.
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, StyleProp, TextStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { create } from 'zustand';
import { useTheme } from '../../hooks/useTheme';
import apiClient from '../../utils/apiClient';
import { haptic } from '../../utils/haptics';
import { enterFade } from '../../theme/motion';
import { BottomSheet } from './BottomSheet';

/** Edits must happen within this long of posting (the API enforces the same) */
export const EDIT_WINDOW_MS = 60 * 60 * 1000;

const useEdited = create<{ at: Record<string, string> }>(() => ({ at: {} }));
/** Call after a text edit is saved so every card of that post shows "Edited" straight away */
export function markEdited(postId: string, at: string | null) {
  useEdited.setState(s => {
    const next = { ...s.at };
    if (at) next[postId] = at; else delete next[postId];
    return { at: next };
  });
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function when(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const h = d.getHours();
  const time = `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return time;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}${d.getFullYear() !== now.getFullYear() ? `, ${d.getFullYear()}` : ''}, ${time}`;
}

type Version = { content: string; written_at: string; original: boolean };

export function EditedLabel({ post, style, separator = ' · ' }: {
  post: { id: string; edited_at?: string | null } | any;
  style?: StyleProp<TextStyle>;
  separator?: string;
}) {
  const local = useEdited(s => (post?.id ? s.at[post.id] : undefined));
  const editedAt: string | null = local || post?.edited_at || null;
  const [open, setOpen] = useState(false);
  if (!editedAt) return null;
  return (
    <>
      <Text
        style={style}
        numberOfLines={1}
        maxFontSizeMultiplier={1.4}
        onPress={() => { haptic.tap(); setOpen(true); }}
        suppressHighlighting
        accessibilityRole="button"
        accessibilityLabel="Edited. Show edit history"
      >
        {separator}Edited
      </Text>
      {open && <EditHistorySheet postId={post.id} onClose={() => setOpen(false)} />}
    </>
  );
}

function EditHistorySheet({ postId, onClose }: { postId: string; onClose: () => void }) {
  const T = useTheme();
  const styles = useMemo(() => makeStyles(T), [T]);
  const [versions, setVersions] = useState<Version[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    apiClient.getPostEdits(postId)
      .then((r: any) => {
        if (!live) return;
        if (r?.success && Array.isArray(r.data?.versions)) setVersions(r.data.versions);
        else setFailed(true);
      })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [postId]);

  const label = (v: Version, i: number) =>
    i === 0 ? 'Current version' : v.original ? 'Original' : 'Earlier version';

  return (
    <BottomSheet visible onClose={onClose} title="Edit history" subtitle="Posts can be edited for 1 hour after posting." actions={[]}>
      <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ paddingBottom: 6 }}>
        {versions ? (
          versions.length > 1 ? versions.map((v, i) => (
            <Animated.View key={`${v.written_at}_${i}`} entering={enterFade(220)} style={styles.row}>
              <Text style={styles.label}>{label(v, i)}{when(v.written_at) ? ` · ${when(v.written_at)}` : ''}</Text>
              <Text style={[styles.text, i > 0 && styles.textOld]} selectable>{v.content}</Text>
            </Animated.View>
          )) : (
            <Text style={styles.note}>The earlier version of this post wasn't kept.</Text>
          )
        ) : failed ? (
          <Text style={styles.note}>Couldn't load the edit history. Check your connection and try again.</Text>
        ) : (
          <ActivityIndicator style={{ marginVertical: 24 }} color={T.textMuted} />
        )}
      </ScrollView>
    </BottomSheet>
  );
}

function makeStyles(T: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    row: { paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.border },
    label: { fontSize: 12.5, fontWeight: '600', color: T.textMuted, textTransform: 'uppercase', letterSpacing: 0.2 },
    text: { fontSize: 16, lineHeight: 22, color: T.text, marginTop: 6 },
    textOld: { color: T.textSub },
    note: { fontSize: 14, color: T.textMuted, paddingHorizontal: 20, paddingVertical: 18 },
  });
}
