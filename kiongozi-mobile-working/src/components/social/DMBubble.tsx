import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { DMMessage } from '../../stores/dmStore';
import { UserAvatar } from './UserAvatar';
import { useTheme } from '../../hooks/useTheme';

interface DMBubbleProps {
  message: DMMessage;
  isOwn: boolean;
  isFirst: boolean;
  isLast: boolean;
  avatarUrl?: string;
  onMediaPress?: () => void;
  onLongPress?: () => void;
  replyPreview?: { senderName: string; content: string };
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function ReadReceipt({ pending, read }: { pending?: boolean; read: boolean }) {
  const T = useTheme();
  if (pending) {
    return <Ionicons name="time-outline" size={12} color={T.textMuted} style={{ marginLeft: 1 }} />;
  }
  if (read) {
    return <Ionicons name="checkmark-done" size={13} color={T.accent} style={{ marginLeft: 1 }} />;
  }
  return <Ionicons name="checkmark" size={13} color={T.textSub} style={{ marginLeft: 1 }} />;
}

export function DMBubble({ message, isOwn, isFirst, isLast, avatarUrl, onMediaPress, onLongPress, replyPreview }: DMBubbleProps) {
  const T = useTheme();
  const styles = useMemo(() => makeStyles(T), [T]);

  // Media-only: no padding so image fills the bubble edge-to-edge
  const mediaOnly = !!(message.media_url) && !message.content;
  const bubblePad = mediaOnly
    ? { paddingHorizontal: 0, paddingVertical: 0, overflow: 'hidden' as const }
    : undefined;

  const ownTailRadius = isLast ? styles.ownTail : styles.ownGrouped;
  const otherTailRadius = isLast ? styles.otherTail : styles.otherGrouped;

  return (
    <View style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}>
      {!isOwn && (
        <View style={styles.avatarSlot}>
          {isLast ? <UserAvatar avatarUrl={avatarUrl} size={28} /> : null}
        </View>
      )}

      {isOwn ? (
        <LinearGradient
          colors={[T.accent, T.accentDeep]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.bubble,
            ownTailRadius,
            !isFirst && styles.grouped,
            message._pending && styles.pending,
            bubblePad,
            { shadowColor: T.acc25, shadowOffset: { width: 0, height: 4 }, shadowRadius: 14, shadowOpacity: 1, elevation: 3 },
          ]}
        >
          <TouchableOpacity activeOpacity={0.85} onLongPress={onLongPress} delayLongPress={350}>
            {replyPreview && (
              <View style={[styles.replyBar, styles.replyBarOwn, mediaOnly && { margin: 10, marginBottom: 0 }]}>
                <Text style={styles.replyName} numberOfLines={1}>{replyPreview.senderName}</Text>
                <Text style={styles.replyContent} numberOfLines={2}>{replyPreview.content}</Text>
              </View>
            )}
            {message.media_url && message.media_type === 'image' && (
              <TouchableOpacity onPress={onMediaPress} activeOpacity={0.9}>
                <Image
                  source={{ uri: message.media_url }}
                  style={[styles.image, mediaOnly && styles.imageOnly]}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            )}
            {message.media_url && message.media_type === 'video' && (
              <TouchableOpacity onPress={onMediaPress} style={[styles.videoThumb, mediaOnly && styles.videoThumbOnly]} activeOpacity={0.9}>
                <Ionicons name="play-circle" size={40} color="rgba(255,255,255,0.9)" />
                <Text style={styles.videoLabel}>Video</Text>
              </TouchableOpacity>
            )}
            {message.content ? (
              <Text style={[styles.text, styles.ownText, mediaOnly && { paddingHorizontal: 14, paddingTop: 6 }]}>
                {message.content}
              </Text>
            ) : null}
            <View style={[styles.meta, styles.metaOwn, mediaOnly && { paddingHorizontal: 10, paddingBottom: 6 }]}>
              {message._edited && <Text style={styles.editedLabel}>edited</Text>}
              <Text style={[styles.time, styles.ownTime]}>{formatTime(message.created_at)}</Text>
              <ReadReceipt pending={message._pending} read={message.is_read} />
            </View>
          </TouchableOpacity>
        </LinearGradient>
      ) : (
        <TouchableOpacity
          activeOpacity={0.85}
          onLongPress={onLongPress}
          delayLongPress={350}
          style={[
            styles.bubble,
            styles.otherBubble,
            otherTailRadius,
            !isFirst && styles.grouped,
            message._pending && styles.pending,
            bubblePad,
          ]}
        >
          {replyPreview && (
            <View style={[styles.replyBar, styles.replyBarOther, mediaOnly && { margin: 10, marginBottom: 0 }]}>
              <Text style={styles.replyName} numberOfLines={1}>{replyPreview.senderName}</Text>
              <Text style={styles.replyContent} numberOfLines={2}>{replyPreview.content}</Text>
            </View>
          )}
          {message.media_url && message.media_type === 'image' && (
            <TouchableOpacity onPress={onMediaPress} activeOpacity={0.9}>
              <Image
                source={{ uri: message.media_url }}
                style={[styles.image, mediaOnly && styles.imageOnly]}
                resizeMode="cover"
              />
            </TouchableOpacity>
          )}
          {message.media_url && message.media_type === 'video' && (
            <TouchableOpacity onPress={onMediaPress} style={[styles.videoThumb, mediaOnly && styles.videoThumbOnly]} activeOpacity={0.9}>
              <Ionicons name="play-circle" size={40} color="rgba(255,255,255,0.9)" />
              <Text style={styles.videoLabel}>Video</Text>
            </TouchableOpacity>
          )}
          {message.content ? (
            <Text style={[styles.text, styles.otherText, mediaOnly && { paddingHorizontal: 14, paddingTop: 6 }]}>
              {message.content}
            </Text>
          ) : null}
          <View style={[styles.meta, styles.metaOther, mediaOnly && { paddingHorizontal: 10, paddingBottom: 6 }]}>
            {message._edited && <Text style={styles.editedLabel}>edited</Text>}
            <Text style={[styles.time, styles.otherTime]}>{formatTime(message.created_at)}</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const RADIUS = 20;
const TAIL   = 4;
const SOFT   = 8;

function makeStyles(T: ReturnType<typeof import('../../hooks/useTheme').useTheme>) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      marginVertical: 2,
      paddingHorizontal: 12,
    },
    rowOwn:   { justifyContent: 'flex-end' },
    rowOther: { justifyContent: 'flex-start' },

    avatarSlot: { width: 34, marginRight: 6, alignItems: 'flex-end' },

    bubble: {
      maxWidth: '74%',
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: RADIUS,
    },
    ownBubble:   {},
    otherBubble: { backgroundColor: T.frost, borderWidth: 1, borderColor: T.border },

    ownTail:    { borderBottomRightRadius: TAIL },
    otherTail:  { borderBottomLeftRadius: TAIL },
    ownGrouped: { borderBottomRightRadius: SOFT },
    otherGrouped: { borderBottomLeftRadius: SOFT },

    grouped: { marginTop: 1 },

    text: { fontSize: 15, lineHeight: 22 },
    ownText:   { color: '#FFFFFF' },
    otherText: { color: T.text },

    image: { width: 200, height: 150, borderRadius: 12, marginBottom: 4 },
    // When there's no text: image fills the entire bubble (no margins/padding)
    imageOnly: { width: 220, height: 165, borderRadius: 0, marginBottom: 0 },
    videoThumb: {
      width: 200,
      height: 130,
      borderRadius: 12,
      backgroundColor: T.surface2,
      marginBottom: 4,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    videoThumbOnly: { width: 220, height: 150, borderRadius: 0, marginBottom: 0 },
    videoLabel: {
      color: T.text,
      fontSize: 13,
      fontWeight: '500',
    },

    meta: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
      gap: 3,
    },
    metaOwn:   { justifyContent: 'flex-end' },
    metaOther: { justifyContent: 'flex-start' },

    time: { fontSize: 11 },
    ownTime:   { color: 'rgba(255,255,255,0.7)' },
    otherTime: { color: T.textSub },
    editedLabel: { fontSize: 10, color: T.textMuted, fontStyle: 'italic', marginRight: 3 },

    pending: { opacity: 0.6 },

    replyBar: {
      borderLeftWidth: 3,
      borderLeftColor: T.accent,
      paddingLeft: 8,
      paddingVertical: 4,
      marginBottom: 6,
      borderRadius: 4,
    },
    replyBarOwn: { backgroundColor: 'rgba(0,0,0,0.15)' },
    replyBarOther: { backgroundColor: T.surface2 },
    replyName: { fontSize: 12, fontWeight: '700', color: T.accent, marginBottom: 2 },
    replyContent: { fontSize: 12, color: T.textSub, lineHeight: 16 },
  });
}
