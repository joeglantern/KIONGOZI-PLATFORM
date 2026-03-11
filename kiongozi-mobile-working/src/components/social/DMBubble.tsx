import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { DMMessage } from '../../stores/dmStore';
import { UserAvatar } from './UserAvatar';

interface DMBubbleProps {
  message: DMMessage;
  isOwn: boolean;
  // grouping
  isFirst: boolean; // top of a same-sender run
  isLast: boolean;  // bottom of a same-sender run (where the tail lives)
  // avatar shown only on isLast for incoming messages
  avatarUrl?: string;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function DMBubble({ message, isOwn, isFirst, isLast, avatarUrl }: DMBubbleProps) {
  const bubbleStyle = [
    styles.bubble,
    isOwn ? styles.ownBubble : styles.otherBubble,
    // Tail corner only on isLast; flatten the tail side on non-last messages
    isOwn
      ? isLast ? styles.ownTail : styles.ownGrouped
      : isLast ? styles.otherTail : styles.otherGrouped,
    !isFirst && styles.grouped, // tighter top margin within a run
    message._pending && styles.pending,
  ];

  return (
    <View style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}>
      {/* Avatar spacer/avatar for incoming messages */}
      {!isOwn && (
        <View style={styles.avatarSlot}>
          {isLast ? (
            <UserAvatar avatarUrl={avatarUrl} size={28} />
          ) : null}
        </View>
      )}

      <View style={bubbleStyle}>
        {message.media_url && message.media_type === 'image' && (
          <Image source={{ uri: message.media_url }} style={styles.image} resizeMode="cover" />
        )}
        {message.content ? (
          <Text style={[styles.text, isOwn ? styles.ownText : styles.otherText]}>
            {message.content}
          </Text>
        ) : null}
        <Text style={[styles.time, isOwn ? styles.ownTime : styles.otherTime]}>
          {formatTime(message.created_at)}
          {isOwn && (
            <Text style={styles.readStatus}>
              {message._pending ? '  …' : message.is_read ? '  ✓✓' : '  ✓'}
            </Text>
          )}
        </Text>
      </View>
    </View>
  );
}

const RADIUS = 18;
const TAIL = 4;
const GROUPED_CORNER = 6;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 2,
    paddingHorizontal: 12,
  },
  rowOwn: { justifyContent: 'flex-end' },
  rowOther: { justifyContent: 'flex-start' },

  avatarSlot: {
    width: 32,
    marginRight: 6,
    alignItems: 'flex-end',
  },

  bubble: {
    maxWidth: '72%',
    padding: 10,
    borderRadius: RADIUS,
  },
  ownBubble: {
    backgroundColor: '#1a365d',
  },
  otherBubble: {
    backgroundColor: '#edf2f7',
  },

  // Tail variants — only on isLast
  ownTail: {
    borderBottomRightRadius: TAIL,
  },
  otherTail: {
    borderBottomLeftRadius: TAIL,
  },

  // Non-last in a group — flatten the tail side slightly
  ownGrouped: {
    borderBottomRightRadius: GROUPED_CORNER,
  },
  otherGrouped: {
    borderBottomLeftRadius: GROUPED_CORNER,
  },

  // Tighter top margin for consecutive messages in a run
  grouped: {
    marginTop: 0,
  },

  text: {
    fontSize: 15,
    lineHeight: 21,
  },
  ownText: { color: '#fff' },
  otherText: { color: '#2d3748' },

  image: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginBottom: 4,
  },

  time: {
    fontSize: 11,
    marginTop: 4,
  },
  ownTime: {
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'right',
  },
  otherTime: { color: '#a0aec0' },
  readStatus: { color: 'rgba(255,255,255,0.65)' },

  pending: { opacity: 0.55 },
});
