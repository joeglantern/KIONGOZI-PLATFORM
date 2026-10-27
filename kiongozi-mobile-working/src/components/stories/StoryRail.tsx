// The stories rail at the top of the feed ("Your story" first, then people with stories),
// and StoryStack: the mini avatar stack the rail folds into when you scroll down.
import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../stores/authStore';
import { useProfileStore } from '../../stores/profileStore';
import { useStoryStore, StoryGroup } from '../../stores/storyStore';
import { UserAvatar } from '../social/UserAvatar';
import { StoryRing } from './StoryParts';

const SIZE = 78;

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
  const { loaded, posting, fetchFeed, openViewer, setComposerOpen, setMeId } = useStoryStore();
  const { mine, others, all } = useRailGroups();

  useEffect(() => { setMeId(user?.id ?? null); fetchFeed(); if (!me) fetchMe(); }, [user?.id]);

  const openGroup = (g: StoryGroup) => {
    Haptics.selectionAsync();
    openViewer(all, all.indexOf(g));
  };
  const openComposer = () => { Haptics.selectionAsync(); setComposerOpen(true); };

  const renderOther = ({ item }: { item: StoryGroup }) => (
    <Squish onPress={() => openGroup(item)} label={`${item.user.full_name || item.user.username}'s story${item.has_unseen ? ', new' : ''}`}>
      <View style={styles.item}>
        <StoryRing size={SIZE} state={item.has_unseen ? 'unseen' : 'seen'} bg={T.bg}>
          <UserAvatar avatarUrl={item.user.avatar_url ?? undefined} size={SIZE - 13} />
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
          <Squish onPress={mine ? () => openGroup(mine) : openComposer} onLongPress={openComposer} label={mine ? 'Your story' : 'Add to your story'}>
            <View style={styles.item}>
              <View>
                <StoryRing size={SIZE} state={mine ? 'seen' : 'none'} bg={T.bg}>
                  <UserAvatar avatarUrl={me?.avatar_url} size={mine ? SIZE - 13 : SIZE - 6} />
                </StoryRing>
                {posting ? (
                  <View style={[styles.badge, { backgroundColor: T.surface2 }]}>
                    <ActivityIndicator size="small" color={T.accent} />
                  </View>
                ) : (
                  <Pressable onPress={openComposer} hitSlop={10} style={[styles.badge, { backgroundColor: T.accent }]} accessibilityLabel="Add to your story">
                    <Ionicons name="add" size={18} color="#000" />
                  </Pressable>
                )}
              </View>
              <Text style={[styles.name, styles.nameSeen]} numberOfLines={1}>{mine ? 'Story yako' : 'Ongeza story'}</Text>
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
            <StoryRing size={30} state={g.has_unseen ? 'unseen' : 'seen'} bg={T.surface2}>
              <UserAvatar avatarUrl={g.user.avatar_url ?? undefined} size={23} />
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
  list: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 10, gap: 12 },
  headerRow: { flexDirection: 'row', gap: 12 },
  item: { width: SIZE + 4, alignItems: 'center', gap: 6 },
  name: { fontSize: 12.5, color: T.text, fontWeight: '600', maxWidth: SIZE + 6 },
  nameSeen: { color: T.textSub, fontWeight: '500' },
  badge: {
    position: 'absolute', right: -2, bottom: -2, width: 27, height: 27, borderRadius: 14,
    borderWidth: 3, borderColor: T.bg, alignItems: 'center', justifyContent: 'center',
  },
  skeleton: { width: SIZE, height: SIZE, borderRadius: SIZE / 2 },
  skeletonText: { width: 48, height: 10, borderRadius: 5, marginTop: 2 },
});
