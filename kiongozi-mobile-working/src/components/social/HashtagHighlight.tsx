import React from 'react';
import { Text, StyleSheet, Linking, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { useThemeStore } from '../../stores/themeStore';
import * as WebBrowser from 'expo-web-browser';
import { useBarazaStore } from '../../stores/barazaStore';

interface HashtagHighlightProps {
  content: string;
  style?: any;
  onMentionPress?: (username: string) => void;
  onHashtagPress?: (tag: string) => void;
  numberOfLines?: number;
  onTextLayout?: (event: any) => void;
  /** Leave Baraza links out of the text; the caller draws them as <LinkPills> under it */
  pillLinks?: boolean;
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

const LINK_BLUE = '#1D9BF0';

/** The Baraza minutes links in a post, in order, without repeats */
export function barazaLinks(content?: string | null): string[] {
  if (!content) return [];
  const out: string[] = [];
  (content.match(TOKEN) || []).forEach(t => {
    const url = t.replace(/[.,;:!?)\]]+$/, '');
    if (BARAZA_LINK.test(url) && !out.includes(url)) out.push(url);
  });
  return out;
}

/** Baraza links as quiet 28px "Open the minutes" pills under the post text */
export function LinkPills({ content }: { content?: string | null }) {
  const T = useTheme();
  const isDark = useThemeStore(s => s.isDark);
  const links = barazaLinks(content);
  if (!links.length) return null;
  return (
    <View style={styles.pills}>
      {links.map(url => (
        <Pressable
          key={url}
          onPress={() => { Haptics.selectionAsync().catch(() => {}); openLink(url); }}
          style={({ pressed }) => [styles.pill, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F2F2F7' }, pressed && { opacity: 0.6 }]}
          accessibilityRole="link"
          accessibilityLabel="Open the minutes"
          hitSlop={6}
        >
          <Ionicons name="link" size={15} color={LINK_BLUE} />
          <Text style={[styles.pillText, { color: T.text }]} maxFontSizeMultiplier={1.3}>Open the minutes</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function HashtagHighlight({ content, style, onMentionPress, onHashtagPress, numberOfLines, onTextLayout, pillLinks }: HashtagHighlightProps) {
  let parts = content.split(TOKEN);
  if (pillLinks) {
    // Drop the Baraza links (and the space they leave at the end) so only the pill shows them
    parts = parts.map(p => (/^(https?:\/\/|www\.)/.test(p) && BARAZA_LINK.test(p) ? '' : p));
    let k = parts.length - 1;
    while (k >= 0 && !parts[k].trim()) { parts[k] = ''; k--; }
    if (k >= 0) parts[k] = parts[k].replace(/\s+$/, '');
  }

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
    color: LINK_BLUE,
    fontWeight: '500',
  },
  hashtag: {
    color: LINK_BLUE,
  },
  link: {
    color: LINK_BLUE,
    fontWeight: '600',
  },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 28, paddingHorizontal: 12, borderRadius: 14 },
  pillText: { fontSize: 13.5, fontWeight: '600' },
});
