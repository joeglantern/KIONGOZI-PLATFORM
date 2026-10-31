import React from 'react';
import { Text, StyleSheet, Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useBarazaStore } from '../../stores/barazaStore';

interface HashtagHighlightProps {
  content: string;
  style?: any;
  onMentionPress?: (username: string) => void;
  onHashtagPress?: (tag: string) => void;
  numberOfLines?: number;
  onTextLayout?: (event: any) => void;
}

// Links, @mentions and #hashtags, in that order of priority
const TOKEN = /(https?:\/\/[^\s]+|www\.[^\s]+|[@#]\w+)/g;
const BARAZA_LINK = /\/baraza\/([0-9a-f-]{36})\/share/i;

/** Our own Baraza links open the minutes in the app; anything else opens in the in-app browser. */
function openLink(raw: string) {
  const url = raw.replace(/[.,;:!?)\]]+$/, '');
  const baraza = url.match(BARAZA_LINK);
  if (baraza) { useBarazaStore.getState().openMinutes(baraza[1]); return; }
  const full = url.startsWith('http') ? url : `https://${url}`;
  WebBrowser.openBrowserAsync(full).catch(() => Linking.openURL(full).catch(() => {}));
}

/** Show a link the way people read it: no https://, and long paths shortened. */
function prettyLink(raw: string) {
  const s = raw.replace(/^https?:\/\//, '').replace(/^www\./, '');
  return s.length > 38 ? `${s.slice(0, 36)}…` : s;
}

export function HashtagHighlight({ content, style, onMentionPress, onHashtagPress, numberOfLines, onTextLayout }: HashtagHighlightProps) {
  const parts = content.split(TOKEN);

  return (
    <Text style={style} numberOfLines={numberOfLines} onTextLayout={onTextLayout}>
      {parts.map((part, i) => {
        if (!part) return null;
        if (/^(https?:\/\/|www\.)/.test(part)) {
          const isBaraza = BARAZA_LINK.test(part);
          return (
            <Text key={i} style={styles.link} onPress={() => openLink(part)} accessibilityRole="link">
              {isBaraza ? 'Open the minutes' : prettyLink(part)}
            </Text>
          );
        }
        if (part.startsWith('@') && part.length > 1) {
          const username = part.slice(1);
          return (
            <Text key={i} style={styles.mention} onPress={() => onMentionPress?.(username)}>
              {part}
            </Text>
          );
        }
        if (part.startsWith('#') && part.length > 1) {
          const tag = part.slice(1);
          return (
            <Text key={i} style={styles.hashtag} onPress={() => onHashtagPress?.(tag)}>
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
  },
  link: {
    color: '#1D9BF0',
    fontWeight: '600',
  },
});
