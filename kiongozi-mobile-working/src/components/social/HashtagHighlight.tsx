import React from 'react';
import { Text, StyleSheet } from 'react-native';

interface HashtagHighlightProps {
  content: string;
  style?: any;
  onMentionPress?: (username: string) => void;
  onHashtagPress?: (tag: string) => void;
  numberOfLines?: number;
  onTextLayout?: (event: any) => void;
}

export function HashtagHighlight({ content, style, onMentionPress, onHashtagPress, numberOfLines, onTextLayout }: HashtagHighlightProps) {
  // Split content by @mentions and #hashtags
  const parts = content.split(/([@#]\w+)/g);

  return (
    <Text style={style} numberOfLines={numberOfLines} onTextLayout={onTextLayout}>
      {parts.map((part, i) => {
        if (part.startsWith('@')) {
          const username = part.slice(1);
          return (
            <Text
              key={i}
              style={styles.mention}
              onPress={() => onMentionPress?.(username)}
            >
              {part}
            </Text>
          );
        }
        if (part.startsWith('#')) {
          const tag = part.slice(1);
          return (
            <Text
              key={i}
              style={styles.hashtag}
              onPress={() => onHashtagPress?.(tag)}
            >
              {part}
            </Text>
          );
        }
        return <Text key={i}>{part}</Text>;
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  mention: {
    color: '#3182ce',
    fontWeight: '500',
  },
  hashtag: {
    color: '#3182ce',
  }
});
