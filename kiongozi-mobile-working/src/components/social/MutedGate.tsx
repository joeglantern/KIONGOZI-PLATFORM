// Safety net for muted words: the server already drops matching posts from feeds, but a cached
// page, a reply, or a word you muted a second ago can still reach the screen. Those fold into one
// quiet line ("Post hidden because of a muted word · Show"); Show opens it in place with a fade.
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { useMutedWords, hitsMuted } from '../../stores/mutedWordsStore';
import { enterFade } from '../../theme/motion';

let loadAsked = false;

export function MutedGate({ post, me, children }: { post: any; me?: string | null; children: React.ReactNode }) {
  const T = useTheme();
  const re = useMutedWords(s => s.re);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!loadAsked) { loadAsked = true; useMutedWords.getState().load().catch(() => {}); }
  }, []);

  const mine = !!me && (post?.user_id === me || post?.profiles?.id === me);
  const muted = !mine && hitsMuted(re, post?.content, post?.repost_of?.content);

  if (!muted) return <>{children}</>;
  if (shown) return <Animated.View entering={enterFade(220)}>{children}</Animated.View>;

  return (
    <View style={[s.row, { borderBottomColor: T.border }]}>
      <Text style={[s.text, { color: T.textMuted }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
        Post hidden because of a muted word
      </Text>
      <Pressable
        onPress={() => { Haptics.selectionAsync().catch(() => {}); setShown(true); }}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Show post hidden because of a muted word"
      >
        <Text style={[s.show, { color: T.text }]} maxFontSizeMultiplier={1.3}>Show</Text>
      </Pressable>
    </View>
  );
}

/** Reset the one-time load (after sign-out the store is cleared and the next account loads its own) */
useMutedWords.subscribe(s => { if (!s.loaded && !s.words.length) loadAsked = false; });

const s = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  text: { fontSize: 14, flexShrink: 1 },
  show: { fontSize: 14, fontWeight: '600' },
});
