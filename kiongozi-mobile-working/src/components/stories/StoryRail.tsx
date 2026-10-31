// The stories rail at the top of the feed ("Your story" first, then people with stories),
// and StoryStack: the mini avatar stack the rail folds into when you scroll down.
import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Animated } from 'react-native';
import Reanimated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../stores/authStore';
import { useProfileStore } from '../../stores/profileStore';
import { useStoryStore, StoryGroup } from '../../stores/storyStore';
import { UserAvatar } from '../social/UserAvatar';
import { StoryRing, ringInnerSize } from './StoryParts';

const SIZE = 64;
const RING = 2.5; // posting ring stroke

/**
 * Thin progress ring with no SVG: a full coloured ring under two half-circle masks (track colour),
 * each clipped to its half and rotated about the centre. The right mask turns first (0..50%), then
 * the left one (50..100%), so the arc grows clockwise from 12 o'clock.
 */
function ProgressRing({ size, progress, color, track, bg, children }: {
  size: number; progress: number; color: string; track: string; bg: string; children: React.ReactNode;
}) {
  const p = useSharedValue(progress);
  useEffect(() => { p.value = withTiming(progress, { duration: 320, easing: Easing.out(Easing.quad) }); }, [progress, p]);
  const half = size / 2;
  // Each mask pivots on the circle's centre: shift the pivot to the edge, rotate, shift back
  const rightMask = useAnimatedStyle(() => ({
    transform: [{ translateX: -half / 2 }, { rotate: `${Math.min(p.value, 0.5) * 360}deg` }, { translateX: half / 2 }],
  }));
  const leftMask = useAnimatedStyle(() => ({
    transform: [{ translateX: half / 2 }, { rotate: `${Math.max(p.value - 0.5, 0) * 360}deg` }, { translateX: -half / 2 }],
  }));
  const inner = size - RING * 2;
  return (
    <View style={{ width: size, height: size }}>
      <View style={{ position: 'absolute', width: size, height: size, borderRadius: half, backgroundColor: color }} />
      <View style={{ position: 'absolute', left: half, top: 0, width: half, height: size, overflow: 'hidden' }}>
        <Reanimated.View style={[{ position: 'absolute', left: 0, top: 0, width: half, height: size, backgroundColor: track }, rightMask]} />
      </View>
      <View style={{ position: 'absolute', left: 0, top: 0, width: half, height: size, overflow: 'hidden' }}>
        <Reanimated.View style={[{ position: 'absolute', left: 0, top: 0, width: half, height: size, backgroundColor: track }, leftMask]} />
      </View>
      {/* bg gap, then the avatar */}
      <View style={{ position: 'absolute', left: RING, top: RING, width: inner, height: inner, borderRadius: inner / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </View>
    </View>
  );
}

/** Rail order: yours first, then everyone else as the server sorted them. */
function useRailGroups() {
  const { user } = useAuthStore();
  const groups = useStoryStore(s => s.groups);
  const mine = groups.find(g => g.user.id === user?.id);
  const others = groups.filter(g => g.user.id !== user?.id);
  return { mine, others, all: mine ? [mine, ...others] : others };
}

/** Springy press: shrinks a little under the finger, bounces back. */
function Squish({ children, onPress, onLongPress, label }: {
  children: React.ReactNode; onPress: () => void; onLongPress?: () => void; label: string;
}) {
  const s = useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.spring(s, { toValue: v, useNativeDriver: true, damping: 12, stiffness: 320 }).start();
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} onPressIn={() => to(0.9)} onPressOut={() => to(1)}
      accessibilityRole="button" accessibilityLabel={label}>
      <Animated.View style={{ transform: [{ scale: s }] }}>{children}</Animated.View>
    </Pressable>
  );
}

export function StoryRail() {
  const T = useTheme();
  const styles = useMemo(() => makeStyles(T), [T]);
  const { user } = useAuthStore();
  const me = useProfileStore(s => s.currentUserProfile);
  const fetchMe = useProfileStore(s => s.fetchCurrentUserProfile);
  const { loaded, posting, postProgress, postFailed, retryPost, fetchFeed, openViewer, setComposerOpen, setMeId } = useStoryStore();
  const { mine, others, all } = useRailGroups();

  useEffect(() => { setMeId(user?.id ?? null); fetchFeed(); if (!me) fetchMe(); }, [user?.id]);

  const openGroup = (g: StoryGroup) => {
    Haptics.selectionAsync();
    openViewer(all, all.indexOf(g));
  };
  const openComposer = () => { Haptics.selectionAsync(); setComposerOpen(true); };
  const retry = () => { Haptics.selectionAsync(); retryPost?.(); };
  const busy = posting || postFailed;
  const avatarSize = mine ? ringInnerSize(SIZE, 'seen') : SIZE - 8;
  const meAvatar = (size: number) => <UserAvatar avatarUrl={me?.avatar_url} size={size} name={me?.full_name || me?.username} neutral />;

  const renderOther = ({ item }: { item: StoryGroup }) => (
    <Squish onPress={() => openGroup(item)} label={`${item.user.full_name || item.user.username}'s story${item.has_unseen ? ', new' : ''}`}>
      <View style={styles.item}>
        <StoryRing size={SIZE} state={item.has_unseen ? 'unseen' : 'seen'} bg={T.bg} close={item.close_friends} count={item.stories.length}>
          <UserAvatar
            avatarUrl={item.user.avatar_url ?? undefined}
            size={ringInnerSize(SIZE, item.has_unseen ? 'unseen' : 'seen')}
            name={item.user.full_name || item.user.username}
          />
        </StoryRing>
        <Text style={[styles.name, !item.has_unseen && styles.nameSeen]} numberOfLines={1}>
          {item.user.username}
        </Text>
      </View>
    </Squish>
  );

  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={loaded ? others : []}
      keyExtractor={g => g.user.id}
      renderItem={renderOther}
      contentContainerStyle={styles.list}
      style={styles.wrap}
      ListHeaderComponent={
        <View style={styles.headerRow}>
          <Squish
            onPress={postFailed ? retry : mine ? () => openGroup(mine) : openComposer}
            onLongPress={openComposer}
            label={postFailed ? 'Story did not post. Tap to retry' : posting ? `Posting your story, ${Math.round(postProgress * 100)} percent` : mine ? 'Your story' : 'Add to your story'}
          >
            <View style={styles.item}>
              <View>
                {busy ? (
                  // Posting: the ring fills as the upload goes; failed: a red ring with a retry badge
                  <ProgressRing size={SIZE} progress={postFailed ? 1 : postProgress} color={postFailed ? T.error : T.accent} track={T.surface2} bg={T.bg}>
                    {/* Dimmed while it uploads or after it failed, so the ring and badge read first */}
                    <View style={{ opacity: 0.55 }}>{meAvatar(SIZE - RING * 2 - 6)}</View>
                  </ProgressRing>
                ) : (
                  <StoryRing size={SIZE} state={mine ? 'seen' : 'none'} bg={T.bg}>
                    {meAvatar(avatarSize)}
                  </StoryRing>
                )}
                {postFailed ? (
                  <Pressable onPress={retry} hitSlop={10} style={styles.retryBadge} accessibilityRole="button" accessibilityLabel="Retry posting your story">
                    <Ionicons name="refresh" size={14} color={T.error} />
                  </Pressable>
                ) : posting ? null : (
                  <Pressable onPress={openComposer} hitSlop={10} style={[styles.badge, { backgroundColor: T.accent }]} accessibilityLabel="Add to your story">
                    {/* 8px plus, 2.2 stroke (design) */}
                    <View style={styles.plusH} />
                    <View style={styles.plusV} />
                  </Pressable>
                )}
              </View>
              <Text style={[styles.name, styles.nameSeen, postFailed && { color: T.error, fontWeight: '600' }]} numberOfLines={1}>
                {postFailed ? 'Tap to retry' : posting ? 'Posting…' : mine ? 'Your story' : 'Add story'}
              </Text>
            </View>
          </Squish>
          {!loaded && [0, 1, 2, 3].map(i => (
            <View key={i} style={styles.item}>
              <View style={[styles.skeleton, { backgroundColor: T.surface2 }]} />
              <View style={[styles.skeletonText, { backgroundColor: T.surface2 }]} />
            </View>
          ))}
        </View>
      }
    />
  );
}

/** Mini stack shown in the header once the rail has folded away. Tap = watch. */
export function StoryStack() {
  const T = useTheme();
  const { user } = useAuthStore();
  const openViewer = useStoryStore(s => s.openViewer);
  const setComposerOpen = useStoryStore(s => s.setComposerOpen);
  const { all, others } = useRailGroups();
  const unseen = others.filter(g => g.has_unseen);
  const shown = (unseen.length ? unseen : others).slice(0, 3);

  if (!shown.length) {
    // Nobody has stories: a small "+" so you can still post from up here
    return (
      <Pressable onPress={() => setComposerOpen(true)} style={[stackStyles.pill, { backgroundColor: T.surface2 }]} accessibilityLabel="Add to your story">
        <Ionicons name="add" size={16} color={T.text} />
        <Text style={[stackStyles.label, { color: T.text }]}>Story</Text>
      </Pressable>
    );
  }
  return (
    <Pressable
      onPress={() => { Haptics.selectionAsync(); const g = shown[0]; openViewer(all, all.indexOf(g)); }}
      style={[stackStyles.pill, { backgroundColor: T.surface2 }]}
      accessibilityRole="button"
      accessibilityLabel={`${unseen.length || others.length} stories. Tap to watch.`}
    >
      <View style={{ flexDirection: 'row' }}>
        {shown.map((g, i) => (
          <View key={g.user.id} style={{ marginLeft: i ? -10 : 0, zIndex: 3 - i }}>
            <StoryRing size={30} state={g.has_unseen ? 'unseen' : 'seen'} bg={T.surface2} close={g.close_friends} count={g.stories.length}>
              <UserAvatar avatarUrl={g.user.avatar_url ?? undefined} size={ringInnerSize(30, g.has_unseen ? 'unseen' : 'seen')} name={g.user.full_name || g.user.username} />
            </StoryRing>
          </View>
        ))}
      </View>
      {unseen.length > 0 && <Text style={[stackStyles.label, { color: T.text }]}>{unseen.length > 9 ? '9+' : unseen.length}</Text>}
    </Pressable>
  );
}

const stackStyles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingLeft: 5, paddingRight: 11, borderRadius: 19 },
  label: { fontSize: 13, fontWeight: '700' },
});

const makeStyles = (T: any) => StyleSheet.create({
  wrap: { flexGrow: 0 },
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, gap: 12 },
  headerRow: { flexDirection: 'row', gap: 12 },
  item: { width: SIZE, alignItems: 'center', gap: 6 },
  // Unseen: bright + medium; seen (and your own tile): grey + regular
  name: { fontSize: 12, color: T.text, fontWeight: '500', maxWidth: SIZE },
  nameSeen: { color: T.textSub, fontWeight: '400' },
  badge: {
    position: 'absolute', right: 0, bottom: 0, width: 24, height: 24, borderRadius: 12,
    borderWidth: 3, borderColor: T.bg, alignItems: 'center', justifyContent: 'center',
  },
  // Failed post: a white retry circle sitting in the middle of the dimmed avatar
  retryBadge: {
    position: 'absolute', left: SIZE / 2 - 12, top: SIZE / 2 - 12, width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  plusH: { position: 'absolute', width: 8, height: 2.2, borderRadius: 1.1, backgroundColor: '#000' },
  plusV: { position: 'absolute', width: 2.2, height: 8, borderRadius: 1.1, backgroundColor: '#000' },
  skeleton: { width: SIZE, height: SIZE, borderRadius: SIZE / 2 },
  skeletonText: { width: 48, height: 10, borderRadius: 5, marginTop: 2 },
});
