// Chat bubble. Flat, modern: solid green for you, soft grey for them, tight grouping,
// time + read ticks only on the last bubble of a group.
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DMMessage } from '../../stores/dmStore';
import { UserAvatar } from './UserAvatar';
import { FitImage, VideoTile } from './media';
import { useTheme } from '../../hooks/useTheme';
import { useThemeStore } from '../../stores/themeStore';

interface DMBubbleProps {
  message: DMMessage;
  isOwn: boolean;
  isFirst: boolean;
  isLast: boolean;
  avatarUrl?: string;
  /** Name for the avatar's initials fallback */
  avatarName?: string;
  onMediaPress?: () => void;
  onLongPress?: () => void;
  replyPreview?: { senderName: string; content: string };
  /** Tap on "Not sent · Tap to retry" */
  onRetry?: () => void;
}

/** 24h "10:42" — built by hand so it's identical on every device/locale */
function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Only-emoji messages (up to 3) render big, without a bubble. */
function bigEmoji(text?: string | null) {
  if (!text) return false;
  const t = text.trim();
  if (!t || t.length > 12) return false;
  // Every character is a symbol/emoji code point (no letters, digits or punctuation)
  return Array.from(t).every(ch => {
    const c = ch.codePointAt(0) || 0;
    return ch === ' ' || c === 0x200d || c === 0xfe0f || (c >= 0x2190 && !(c >= 0x2e80 && c <= 0xd7ff));
  });
}

export function DMBubble({ message, isOwn, isFirst, isLast, avatarUrl, avatarName, onMediaPress, onLongPress, replyPreview, onRetry }: DMBubbleProps) {
  const T = useTheme();
  const isDark = useThemeStore(s => s.isDark);
  const C = useMemo(() => ({
    own: T.accent,
    ownText: '#000000',
    ownMeta: 'rgba(0,0,0,0.55)',
    other: 'transparent',
    otherBorder: isDark ? '#2C2C2E' : '#DEDEE3',
    otherText: T.text,
    otherMeta: T.textMuted,
  }), [isDark, T]);

  const mediaOnly = !!message.media_url && !message.content;
  const emojiOnly = !message.media_url && !replyPreview && bigEmoji(message.content);
  const bg = isOwn ? C.own : C.other;
  const fg = isOwn ? C.ownText : C.otherText;
  const meta = isOwn ? C.ownMeta : C.otherMeta;

  // Grouped corners: the side facing the sender gets small radii inside a group
  const r = 20, s = 6;
  const corners = isOwn
    ? { borderTopRightRadius: isFirst ? r : s, borderBottomRightRadius: isLast ? r : s }
    : { borderTopLeftRadius: isFirst ? r : s, borderBottomLeftRadius: isLast ? r : s };

  const metaRow = isLast ? (
    <View style={[styles.meta, isOwn ? { justifyContent: 'flex-end' } : null, (mediaOnly || emojiOnly) && styles.metaFloating]}>
      {message._edited && <Text style={[styles.time, { color: meta }]}>edited · </Text>}
      <Text style={[styles.time, { color: (mediaOnly) ? '#fff' : meta }]}>{formatTime(message.created_at)}</Text>
      {isOwn && (
        message._failed
          ? <Ionicons name="alert-circle" size={13} color={mediaOnly ? '#fff' : meta} style={{ marginLeft: 3 }} />
          : message._pending
          ? <Ionicons name="time-outline" size={12} color={mediaOnly ? '#fff' : meta} style={{ marginLeft: 3 }} />
          : <Ionicons name={message.is_read ? 'checkmark-done' : 'checkmark'} size={14} color={mediaOnly ? '#fff' : message.is_read ? '#000' : meta} style={{ marginLeft: 3 }} />
      )}
    </View>
  ) : null;

  const failed = isOwn && message._failed;
  const row = (
    <View style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther, isFirst && styles.groupStart]}>
      {!isOwn && (
        <View style={styles.avatarSlot}>{isLast ? <UserAvatar avatarUrl={avatarUrl} size={28} name={avatarName} /> : null}</View>
      )}

      {emojiOnly ? (
        <Pressable onLongPress={onLongPress} delayLongPress={300} style={[styles.emojiWrap, isOwn && { alignItems: 'flex-end' }]}>
          <Text style={styles.emoji}>{message.content!.trim()}</Text>
        </Pressable>
      ) : (
        <Pressable
          onLongPress={onLongPress}
          delayLongPress={300}
          style={({ pressed }) => [
            styles.bubble,
            { backgroundColor: bg },
            !isOwn && !mediaOnly && { borderWidth: 1, borderColor: C.otherBorder },
            corners,
            mediaOnly && styles.mediaBubble,
            message._pending && { opacity: 0.75 },
            message._failed && { opacity: 0.5 },
            pressed && { opacity: 0.85 },
          ]}
        >
          {replyPreview && (
            <View style={[styles.reply, { backgroundColor: isOwn ? 'rgba(0,0,0,0.1)' : T.surface }, mediaOnly && { margin: 6 }]}>
              <Text style={[styles.replyName, { color: isOwn ? fg : T.text }]} numberOfLines={1}>{replyPreview.senderName}</Text>
              <Text style={[styles.replyText, { color: isOwn ? meta : T.textSub }]} numberOfLines={2}>{replyPreview.content}</Text>
            </View>
          )}

          {message.media_url && message.media_type === 'image' && (
            // Real shape (portrait 3:4 … wide 16:9); anything beyond is shown whole over a blur
            <FitImage
              uri={message.media_url}
              minRatio={0.75}
              maxRatio={1.78}
              width={240}
              radius={mediaOnly ? 0 : 14}
              bg={'rgba(127,127,127,0.2)'}
              onPress={onMediaPress}
              style={mediaOnly ? undefined : { marginBottom: 6, marginTop: 2 }}
            />
          )}
          {message.media_url && message.media_type === 'video' && (
            <VideoTile
              url={message.media_url}
              onPress={onMediaPress}
              bg="#111"
              style={[{ width: 240, aspectRatio: 0.8 }, mediaOnly ? null : { borderRadius: 14, marginBottom: 6, marginTop: 2 }]}
            />
          )}

          {message.content ? (
            <Text style={[styles.text, { color: fg }, mediaOnly && { paddingHorizontal: 12 }]}>{message.content}</Text>
          ) : null}
          {metaRow}
        </Pressable>
      )}
    </View>
  );
  if (!failed) return row;
  return (
    <View>
      {row}
      <Pressable onPress={onRetry} hitSlop={8} accessibilityRole="button" accessibilityLabel="Message not sent. Tap to retry." style={styles.failRow}>
        <Ionicons name="alert-circle" size={14} color={T.error} />
        <Text style={[styles.failText, { color: T.error }]}>Not sent · Tap to retry</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  failRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: 4, marginTop: 4, marginRight: 14 },
  failText: { fontSize: 12.5, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 2, paddingHorizontal: 10 },
  groupStart: { marginTop: 10 },
  rowOwn: { justifyContent: 'flex-end' },
  rowOther: { justifyContent: 'flex-start' },
  avatarSlot: { width: 30, marginRight: 6, alignItems: 'flex-end' },

  bubble: { maxWidth: '76%', paddingHorizontal: 13, paddingVertical: 8, borderRadius: 20 },
  mediaBubble: { paddingHorizontal: 0, paddingVertical: 0, overflow: 'hidden' },
  text: { fontSize: 16, lineHeight: 21 },

  meta: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  metaFloating: { position: 'absolute', right: 8, bottom: 6, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, marginTop: 0 },
  time: { fontSize: 11, fontVariant: ['tabular-nums'] },

  image: { backgroundColor: 'rgba(127,127,127,0.2)' },
  imageOnly: { width: 230, height: 280 },
  imageWithText: { width: 230, height: 200, borderRadius: 14, marginBottom: 6, marginTop: 2 },
  video: { backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  playCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },

  reply: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 6 },
  replyName: { fontSize: 12, fontWeight: '700', marginBottom: 1 },
  replyText: { fontSize: 13, lineHeight: 17 },

  emojiWrap: { maxWidth: '76%' },
  emoji: { fontSize: 44, lineHeight: 54 },
});
