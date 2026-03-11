import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { DMMessage } from '../../stores/dmStore';

interface DMBubbleProps {
  message: DMMessage;
  isOwn: boolean;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function DMBubble({ message, isOwn }: DMBubbleProps) {
  return (
    <View style={[styles.container, isOwn ? styles.ownContainer : styles.otherContainer, message._pending && styles.pending]}>
      {message.media_url && message.media_type === 'image' && (
        <Image source={{ uri: message.media_url }} style={styles.image} resizeMode="cover" />
      )}
      {message.content && (
        <Text style={[styles.text, isOwn ? styles.ownText : styles.otherText]}>
          {message.content}
        </Text>
      )}
      <Text style={[styles.time, isOwn ? styles.ownTime : styles.otherTime]}>
        {formatTime(message.created_at)}
        {isOwn && (
          <Text style={styles.readStatus}>
            {message.is_read ? '  ✓✓' : '  ✓'}
          </Text>
        )}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    maxWidth: '75%',
    marginVertical: 4,
    borderRadius: 18,
    padding: 10,
  },
  ownContainer: {
    alignSelf: 'flex-end',
    backgroundColor: '#1a365d',
    borderBottomRightRadius: 4,
  },
  otherContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#edf2f7',
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 15,
    lineHeight: 21,
  },
  ownText: {
    color: '#fff',
  },
  otherText: {
    color: '#2d3748',
  },
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
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right',
  },
  otherTime: {
    color: '#a0aec0',
  },
  readStatus: {
    color: 'rgba(255,255,255,0.7)',
  },
  pending: {
    opacity: 0.6,
  },
});
