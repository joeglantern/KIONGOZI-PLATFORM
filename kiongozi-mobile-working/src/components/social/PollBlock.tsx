// Poll inside a feed post (like X). Before voting: outlined choices you tap once.
// After voting (and for the author, signed-out people, or once it ends): bars fill
// on a calm ease-out with percentages, your choice ticked, the leader in bold.
// Votes are final. A vote shows instantly and rolls back if the server says no.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { create } from 'zustand';
import { RN_EASE_OUT } from '../../theme/motion';
import { useTheme } from '../../hooks/useTheme';
import { useThemeStore } from '../../stores/themeStore';
import { useAuthStore } from '../../stores/authStore';
import apiClient from '../../utils/apiClient';
import { toast } from '../../utils/alert';

export interface PostPoll {
  options: { text: string; votes: number }[];
  total: number;
  ends_at: string;
  my_vote: number | null;
}

// Votes made on this device, shared by every screen showing the same post (feed, detail, profile)
const usePollVotes = create<{ byId: Record<string, PostPoll>; put: (id: string, p: PostPoll | null) => void }>(set => ({
  byId: {},
  put: (id, p) => set(s => {
    const byId = { ...s.byId };
    if (p) byId[id] = p; else delete byId[id];
    return { byId };
  }),
}));

/** Newest of what the server sent and what we know locally */
function pick(server: PostPoll, local?: PostPoll): PostPoll {
  if (!local) return server;
  if (local.my_vote != null && server.my_vote == null) return local;
  return local.total > server.total ? local : server;
}

const fmtVotes = (n: number) => `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} ${n === 1 ? 'vote' : 'votes'}`;

function timeLeft(endsAt: number, now: number): string {
  const ms = endsAt - now;
  if (ms <= 0) return 'Final results';
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'Less than a minute left';
  if (m < 60) return `${m}m left`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h left`;
  return `${Math.floor(h / 24)}d left`;
}

const spokenLeft = (s: string) =>
  s.replace(/(\d+)m left/, (_, n) => `${n} minute${n === '1' ? '' : 's'} left`)
    .replace(/(\d+)h left/, (_, n) => `${n} hour${n === '1' ? '' : 's'} left`)
    .replace(/(\d+)d left/, (_, n) => `${n} day${n === '1' ? '' : 's'} left`);

export function PollBlock({ post }: { post: { id: string; user_id?: string; poll?: PostPoll | null } }) {
  const T = useTheme();
  const isDark = useThemeStore(s => s.isDark);
  const userId = useAuthStore(s => s.user?.id);
  const local = usePollVotes(s => s.byId[post.id]);
  const put = usePollVotes(s => s.put);
  const busy = useRef(false);
  const [now, setNow] = useState(() => Date.now());

  const server = post.poll;
  const poll = server ? pick(server, local) : null;
  const endsAt = poll ? new Date(poll.ends_at).getTime() : 0;
  const ended = !!poll && endsAt <= now;

  // Keep "5m left" honest and flip to Final results on time, only for polls close to ending
  useEffect(() => {
    if (!poll || ended) return;
    const left = endsAt - Date.now();
    if (left > 6 * 3600_000) return;
    const t = setInterval(() => setNow(Date.now()), left < 3600_000 ? 15_000 : 60_000);
    return () => clearInterval(t);
  }, [poll?.ends_at, ended]);

  // Results show from the first render (no animation) unless they appear because you just voted
  const revealedAtMount = useRef<boolean | null>(null);

  if (!poll || !poll.options?.length) return null;

  const isAuthor = !!userId && userId === post.user_id;
  const showResults = poll.my_vote != null || isAuthor || ended || !userId;
  if (revealedAtMount.current === null) revealedAtMount.current = showResults;
  const total = poll.total;
  const pcts = poll.options.map(o => (total ? Math.round((o.votes / total) * 100) : 0));
  const top = Math.max(...poll.options.map(o => o.votes));
  const meta = `${fmtVotes(total)} · ${timeLeft(endsAt, now)}`;

  const castVote = async (i: number) => {
    if (busy.current || showResults) return;
    busy.current = true;
    Haptics.selectionAsync().catch(() => {});
    const before = local ?? null;
    const optimistic: PostPoll = {
      ...poll,
      options: poll.options.map((o, k) => (k === i ? { ...o, votes: o.votes + 1 } : o)),
      total: poll.total + 1,
      my_vote: i,
    };
    put(post.id, optimistic);
    try {
      const res = await apiClient.votePoll(post.id, i);
      const fresh = res.data as PostPoll | undefined;
      if (res.success && fresh?.options) {
        put(post.id, { ...fresh, my_vote: fresh.my_vote ?? i });
      } else {
        put(post.id, before);
        toast(res.error === 'This poll has ended' ? 'This poll has ended' : 'Vote did not go through', { kind: 'error', message: res.error === 'This poll has ended' ? undefined : 'Check your connection and try again.' });
      }
    } catch {
      put(post.id, before);
      toast('Vote did not go through', { kind: 'error', message: 'Check your connection and try again.' });
    } finally {
      busy.current = false;
    }
  };

  const fillOther = isDark ? '#262628' : '#E9E9EE';

  if (!showResults) {
    return (
      <View style={s.wrap}>
        {poll.options.map((o, i) => (
          <Pressable
            key={i}
            onPress={() => castVote(i)}
            style={({ pressed }) => [s.choice, { borderColor: T.accent }, pressed && { backgroundColor: T.acc10 }]}
            accessibilityRole="button"
            accessibilityLabel={`Vote ${o.text}`}
            accessibilityHint={`Choice ${i + 1} of ${poll.options.length}. Votes are final.`}
          >
            <Text style={[s.choiceText, { color: T.accent }]} numberOfLines={1}>{o.text}</Text>
          </Pressable>
        ))}
        <Text style={[s.meta, { color: T.textMuted }]}>{meta}</Text>
      </View>
    );
  }

  const spoken = [
    ended ? 'Poll, final results.' : 'Poll results.',
    ...poll.options.map((o, i) => `${o.text}, ${pcts[i]} percent${poll.my_vote === i ? ', your vote' : ''}.`),
    `${fmtVotes(total)}.`,
    ended ? '' : `${spokenLeft(timeLeft(endsAt, now))}.`,
  ].join(' ');

  return (
    <View style={s.wrap} accessible accessibilityLabel={spoken}>
      {poll.options.map((o, i) => (
        <ResultRow
          key={i}
          text={o.text}
          pct={pcts[i]}
          mine={poll.my_vote === i}
          lead={total > 0 && o.votes === top}
          animate={!revealedAtMount.current}
          fill={poll.my_vote === i ? T.acc25 : fillOther}
          color={T.text}
          check={T.accent}
        />
      ))}
      <Text style={[s.meta, { color: T.textMuted }]}>{meta}</Text>
    </View>
  );
}

function ResultRow({ text, pct, mine, lead, animate, fill, color, check }: {
  text: string; pct: number; mine: boolean; lead: boolean; animate: boolean; fill: string; color: string; check: string;
}) {
  const w = useRef(new Animated.Value(animate ? 0 : pct / 100)).current;
  useEffect(() => {
    Animated.timing(w, { toValue: pct / 100, duration: 420, easing: RN_EASE_OUT, useNativeDriver: false }).start();
  }, [pct]);
  const weight = lead ? '800' : '500';
  return (
    <View style={s.row}>
      <Animated.View
        style={[s.fill, { backgroundColor: fill, width: w.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}
      />
      <View style={s.rowLabel}>
        <Text style={[s.rowText, { color, fontWeight: weight }]} numberOfLines={1}>{text}</Text>
        {mine && <Ionicons name="checkmark-circle" size={16} color={check} style={s.tick} />}
      </View>
      <Text style={[s.pct, { color, fontWeight: weight }]}>{pct}%</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginTop: 10, marginBottom: 2 },
  choice: {
    height: 40, borderRadius: 20, borderWidth: 1.5, marginTop: 8,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16,
  },
  choiceText: { fontSize: 15, fontWeight: '700' },
  row: {
    height: 40, borderRadius: 10, marginTop: 8, overflow: 'hidden',
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
  },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 10 },
  rowLabel: { flex: 1, flexDirection: 'row', alignItems: 'center', minWidth: 0, marginRight: 10 },
  rowText: { fontSize: 15, flexShrink: 1 },
  tick: { marginLeft: 6 },
  pct: { fontSize: 15, fontVariant: ['tabular-nums'] },
  meta: { fontSize: 13, marginTop: 10 },
});
