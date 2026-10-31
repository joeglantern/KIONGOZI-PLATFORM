// Chat bubble, iMessage / Telegram feel: solid green for you, a soft filled grey for them,
// tight grouping (inner corners tuck in), and the time sits inside the last bubble of a group,
// tucked into the corner of the last line (Telegram's trick) instead of on its own row.
import React, { useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Reanimated, { FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { DMMessage } from '../../stores/dmStore';
import { UserAvatar } from './UserAvatar';
import { FitImage, VideoTile } from './media';
import { VoiceBubbleBody } from './VoiceNote';
import { useTheme } from '../../hooks/useTheme';
import { useThemeStore } from '../../stores/themeStore';

export type BubbleRect = { x: number; y: number; width: number; height: number };

interface DMBubbleProps {
  message: DMMessage;
  isOwn: boolean;
  isFirst: boolean;
  isLast: boolean;
  avatarUrl?: string;
  /** Name for the avatar's initials fallback */
  avatarName?: string;
  onMediaPress?: () => void;
  /** Long press, with where the bubble sits on screen (for the focus menu) */
  onLongPress?: (rect: BubbleRect) => void;
  replyPreview?: { senderName: string; content: string };
  /** Tap on "Not sent · Tap to retry" */
  onRetry?: () => void;
  /** Drawn inside the long-press menu: no avatar slot, no press handling */
  floating?: boolean;
  /** "Seen 9:42" under my newest message they have read (read_at ISO; '' = no time known) */
  seenAt?: string | null;
}

/** 24h "10:42" — built by hand so it's identical on every device/locale */
export function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Only-emoji messages (up to 3) render big, without a bubble. */
function bigEmoji(text?: string | null) {
  if (!text) return false;
  const t = text.trim();
  if (!t || t.length > 12) return false;
  return Array.from(t).every(ch => {
    const c = ch.codePointAt(0) || 0;
    return ch === ' ' || c === 0x200d || c === 0xfe0f || (c >= 0x2190 && !(c >= 0x2e80 && c <= 0xd7ff));
  });
}

export function bubbleColors(isDark: boolean, accent: string) {
  return {
    own: accent,
    ownText: '#000000',
    ownMeta: 'rgba(0,0,0,0.5)',
    other: isDark ? '#1C1C1E' : '#F2F2F7',
    otherText: isDark ? '#FFFFFF' : '#000000',
    otherMeta: isDark ? 'rgba(235,235,245,0.45)' : 'rgba(60,60,67,0.5)',
  };
}

/** "9:42": like formatTime, without the leading zero (reads as a word in a sentence) */
const seenTime = (iso: string) => formatTime(iso).replace(/^0/, '');

export function DMBubble({ message, isOwn, isFirst, isLast, avatarUrl, avatarName, onMediaPress, onLongPress, replyPreview, onRetry, floating, seenAt }: DMBubbleProps) {
  const T = useTheme();
  const isDark = useThemeStore(s => s.isDark);
  const C = useMemo(() => bubbleColors(isDark, T.accent), [isDark, T.accent]);
  const bubbleRef = useRef<View>(null);

  const isVoice = message.media_type === 'audio' && !!message.media_url;
  const mediaOnly = !!message.media_url && !message.content && !isVoice;
  const emojiOnly = !message.media_url && !replyPreview && bigEmoji(message.content);
  const bg = isOwn ? C.own : C.other;
  const fg = isOwn ? C.ownText : C.otherText;
  const meta = isOwn ? C.ownMeta : C.otherMeta;

  // Grouped corners: the side facing the sender tucks in inside a group
  const r = 20, s = 6;
  const corners = isOwn
    ? { borderTopRightRadius: isFirst ? r : s, borderBottomRightRadius: isLast ? r : s }
    : { borderTopLeftRadius: isFirst ? r : s, borderBottomLeftRadius: isLast ? r : s };

  const longPress = () => {
    if (!onLongPress) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    bubbleRef.current?.measureInWindow((x, y, width, height) => onLongPress({ x, y, width, height }));
  };

  const tick = isOwn ? (
    message._failed
      ? <Ionicons name="alert-circle" size={13} color={mediaOnly ? '#fff' : meta} style={styles.tick} />
      : message._pending
      ? <Ionicons name="time-outline" size={12} color={mediaOnly ? '#fff' : meta} style={styles.tick} />
      : <Ionicons name={message.is_read ? 'checkmark-done' : 'checkmark'} size={14} color={mediaOnly ? '#fff' : message.is_read ? '#000' : meta} style={styles.tick} />
  ) : null;

  const showMeta = isLast || floating;
  const metaInline = (
    <View style={[styles.metaCorner, (mediaOnly || emojiOnly) && styles.metaPill]} pointerEvents="none">
      {message._edited && <Text style={[styles.time, { color: mediaOnly || emojiOnly ? '#fff' : meta }]}>edited </Text>}
      <Text style={[styles.time, { color: mediaOnly || emojiOnly ? '#fff' : meta }]}>{formatTime(message.created_at)}</Text>
      {tick}
    </View>
  );
  // Invisible room at the end of the last line so the time never overlaps the words
  const spacer = showMeta ? (
    <Text style={styles.spacer}>{(message._edited ? '   ' : '') + (isOwn ? '     ' : '    ')}</Text>
  ) : null;

  const failed = isOwn && message._failed;
  const row = (
    <View style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther, isFirst && !floating && styles.groupStart, floating && { paddingHorizontal: 0, marginTop: 0 }]}>
      {!isOwn && !floating && (
        <View style={styles.avatarSlot}>{isLast ? <UserAvatar avatarUrl={avatarUrl} size={28} name={avatarName} /> : null}</View>
      )}

      {emojiOnly ? (
        <Pressable ref={bubbleRef} onLongPress={longPress} delayLongPress={280} disabled={floating} style={[styles.emojiWrap, isOwn && { alignItems: 'flex-end' }]}>
          <Text style={styles.emoji}>{message.content!.trim()}</Text>
          {showMeta ? (
            <View style={[styles.emojiMeta, { alignSelf: isOwn ? 'flex-end' : 'flex-start', backgroundColor: C.other }]}>
              <Text style={[styles.time, { color: C.otherMeta }]}>{formatTime(message.created_at)}</Text>
              {isOwn ? <Ionicons name={message._pending ? 'time-outline' : message.is_read ? 'checkmark-done' : 'checkmark'} size={13} color={C.otherMeta} style={styles.tick} /> : null}
            </View>
          ) : null}
        </Pressable>
      ) : (
        <Pressable
          ref={bubbleRef}
          onLongPress={longPress}
          delayLongPress={280}
          disabled={floating}
          unstable_pressDelay={60}
          style={({ pressed }) => [
            styles.bubble,
            floating && styles.bubbleFloating,
            { backgroundColor: bg },
            corners,
            mediaOnly && styles.mediaBubble,
            message._pending && { opacity: 0.75 },
            message._failed && { opacity: 0.5 },
            pressed && !floating && { transform: [{ scale: 0.97 }] },
          ]}
        >
          {replyPreview && (
            <View style={[styles.reply, { backgroundColor: isOwn ? 'rgba(0,0,0,0.12)' : isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', borderLeftColor: isOwn ? 'rgba(0,0,0,0.45)' : T.accent }, mediaOnly && { margin: 6 }]}>
              <Text style={[styles.replyName, { color: isOwn ? fg : T.accent }]} numberOfLines={1}>{replyPreview.senderName}</Text>
              <Text style={[styles.replyText, { color: isOwn ? 'rgba(0,0,0,0.65)' : T.textSub }]} numberOfLines={2}>{replyPreview.content}</Text>
            </View>
          )}

          {message.media_url && message.media_type === 'image' && (
            <FitImage
              uri={message.media_url}
              minRatio={0.75}
              maxRatio={1.78}
              width={240}
              radius={mediaOnly ? 0 : 13}
              bg={'rgba(127,127,127,0.2)'}
              onPress={floating ? undefined : onMediaPress}
              style={mediaOnly ? undefined : { marginBottom: 5, marginTop: 1 }}
            />
          )}
          {message.media_url && message.media_type === 'video' && (
            <VideoTile
              url={message.media_url}
              onPress={floating ? undefined : onMediaPress}
              bg="#111"
              style={[{ width: 240, aspectRatio: 0.8 }, mediaOnly ? null : { borderRadius: 13, marginBottom: 5, marginTop: 1 }]}
            />
          )}

          {isVoice && (
            <View style={showMeta ? { paddingBottom: 12 } : undefined}>
              <VoiceBubbleBody
                id={message.id}
                url={message.media_url!}
                durationMs={message.duration_ms}
                fg={fg}
                meta={meta}
                accent={T.accent}
                isOwn={isOwn}
                transcript={message.transcript}
                pending={message._pending}
                createdAt={message.created_at}
              />
            </View>
          )}

          {message.content ? (
            <Text style={[styles.text, { color: fg }, mediaOnly && { paddingHorizontal: 12 }]} selectable={false}>
              {message.content}
              {spacer}
            </Text>
          ) : null}
          {showMeta ? metaInline : null}
        </Pressable>
      )}
    </View>
  );
  const seen = isOwn && !floating && seenAt !== undefined && seenAt !== null;
  if (!failed && !seen) return row;
  if (floating) return row;
  return (
    <View>
      {row}
      {seen && (
        <Reanimated.Text entering={FadeIn.duration(260)} style={[styles.seen, { color: T.textMuted }]} accessibilityLabel={seenAt ? `Seen at ${seenTime(seenAt)}` : 'Seen'}>
          {seenAt ? `Seen ${seenTime(seenAt)}` : 'Seen'}
        </Reanimated.Text>
      )}
      {failed && (
      <Pressable onPress={onRetry} hitSlop={8} accessibilityRole="button" accessibilityLabel="Message not sent. Tap to retry." style={styles.failRow}>
        <Ionicons name="alert-circle" size={14} color={T.error} />
        <Text style={[styles.failText, { color: T.error }]}>Not sent · Tap to retry</Text>
      </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  failRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: 4, marginTop: 4, marginRight: 14 },
  failText: { fontSize: 12.5, fontWeight: '600' },
  seen: { fontSize: 12, alignSelf: 'flex-end', marginTop: 3, marginRight: 14 },
  row: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 2, paddingHorizontal: 10 },
  groupStart: { marginTop: 12 },
  rowOwn: { justifyContent: 'flex-end' },
  rowOther: { justifyContent: 'flex-start' },
  avatarSlot: { width: 28, marginRight: 6, alignItems: 'flex-end' },

  bubble: { maxWidth: '78%', paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, borderRadius: 20 },
  bubbleFloating: { maxWidth: '100%' },
  mediaBubble: { paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0, overflow: 'hidden' },
  text: { fontSize: 16.5, lineHeight: 21, letterSpacing: -0.2 },
  spacer: { fontSize: 11, color: 'transparent' },

  metaCorner: { position: 'absolute', right: 12, bottom: 8, flexDirection: 'row', alignItems: 'center' },
  metaPill: { backgroundColor: 'rgba(0,0,0,0.38)', borderRadius: 9, paddingHorizontal: 6, paddingVertical: 2, right: 8, bottom: 7 },
  time: { fontSize: 11, fontVariant: ['tabular-nums'] },
  tick: { marginLeft: 2 },

  reply: { borderRadius: 10, borderLeftWidth: 3, paddingHorizontal: 9, paddingVertical: 5, marginBottom: 5, marginTop: 1 },
  replyName: { fontSize: 12.5, fontWeight: '700', marginBottom: 1 },
  replyText: { fontSize: 13.5, lineHeight: 17 },

  emojiWrap: { maxWidth: '78%' },
  emojiMeta: { flexDirection: 'row', alignItems: 'center', borderRadius: 9, paddingHorizontal: 7, paddingVertical: 2, marginTop: -2 },
  emoji: { fontSize: 44, lineHeight: 54 },
});
