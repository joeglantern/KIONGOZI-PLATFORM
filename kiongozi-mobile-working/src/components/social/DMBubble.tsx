import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DMMessage } from '../../stores/dmStore';
import { UserAvatar } from './UserAvatar';

interface DMBubbleProps {
  message: DMMessage;
  isOwn: boolean;
  isFirst: boolean;
  isLast: boolean;
  avatarUrl?: string;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function ReadReceipt({ pending, read }: { pending?: boolean; read: boolean }) {
  if (pending) {
    return <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.5)" style={styles.receiptIcon} />;
  }
  if (read) {
    return <Ionicons name="checkmark-done" size={13} color="#7dd3fc" style={styles.receiptIcon} />;
  }
  return <Ionicons name="checkmark" size={13} color="rgba(255,255,255,0.55)" style={styles.receiptIcon} />;
}

export function DMBubble({ message, isOwn, isFirst, isLast, avatarUrl }: DMBubbleProps) {
  return (
    <View style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}>
      {!isOwn && (
        <View style={styles.avatarSlot}>
          {isLast ? <UserAvatar avatarUrl={avatarUrl} size={28} /> : null}
        </View>
      )}

      <View style={[
        styles.bubble,
        isOwn ? styles.ownBubble : styles.otherBubble,
        isOwn
          ? (isLast ? styles.ownTail : styles.ownGrouped)
          : (isLast ? styles.otherTail : styles.otherGrouped),
        !isFirst && styles.grouped,
        message._pending && styles.pending,
      ]}>
        {message.media_url && message.media_type === 'image' && (
          <Image source={{ uri: message.media_url }} style={styles.image} resizeMode="cover" />
        )}

        {message.content ? (
          <Text style={[styles.text, isOwn ? styles.ownText : styles.otherText]}>
            {message.content}
          </Text>
        ) : null}

        <View style={[styles.meta, isOwn ? styles.metaOwn : styles.metaOther]}>
          <Text style={[styles.time, isOwn ? styles.ownTime : styles.otherTime]}>
            {formatTime(message.created_at)}
          </Text>
          {isOwn && (
            <ReadReceipt pending={message._pending} read={message.is_read} />
          )}
        </View>
      </View>
    </View>
  );
}

const RADIUS = 20;
const TAIL   = 4;
const SOFT   = 8;

const styles = StyleSheet.create({
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
  ownBubble:   { backgroundColor: '#1a365d' },
  otherBubble: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e8edf3' },

  ownTail:    { borderBottomRightRadius: TAIL },
  otherTail:  { borderBottomLeftRadius: TAIL },
  ownGrouped: { borderBottomRightRadius: SOFT },
  otherGrouped: { borderBottomLeftRadius: SOFT },

  grouped: { marginTop: 1 },

  text: { fontSize: 15, lineHeight: 22 },
  ownText:   { color: '#fff' },
  otherText: { color: '#1a202c' },

  image: { width: 200, height: 150, borderRadius: 12, marginBottom: 4 },

  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 3,
  },
  metaOwn:   { justifyContent: 'flex-end' },
  metaOther: { justifyContent: 'flex-start' },

  time: { fontSize: 11 },
  ownTime:   { color: 'rgba(255,255,255,0.55)' },
  otherTime: { color: '#a0aec0' },

  receiptIcon: { marginLeft: 1 },

  pending: { opacity: 0.6 },
});
