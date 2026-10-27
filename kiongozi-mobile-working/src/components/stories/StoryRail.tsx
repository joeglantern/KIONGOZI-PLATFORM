// The stories rail at the top of the feed: "Your story" first, then people with stories.
import React, { useEffect, useMemo } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../stores/authStore';
import { useProfileStore } from '../../stores/profileStore';
import { useStoryStore, StoryGroup } from '../../stores/storyStore';
import { UserAvatar } from '../social/UserAvatar';
import { StoryRing } from './StoryParts';

const SIZE = 70;

export function StoryRail() {
  const T = useTheme();
  const styles = useMemo(() => makeStyles(T), [T]);
  const { user } = useAuthStore();
  const me = useProfileStore(s => s.currentUserProfile);
  const fetchMe = useProfileStore(s => s.fetchCurrentUserProfile);
  const { groups, loaded, posting, fetchFeed, openViewer, setComposerOpen, setMeId } = useStoryStore();

  useEffect(() => { setMeId(user?.id ?? null); fetchFeed(); if (!me) fetchMe(); }, [user?.id]);

  const mine = groups.find(g => g.user.id === user?.id);
  const others = groups.filter(g => g.user.id !== user?.id);

  const openGroup = (g: StoryGroup) => {
    Haptics.selectionAsync();
    // Page through everyone in rail order, starting at the tapped person
    const list = mine ? [mine, ...others] : others;
    openViewer(list, list.indexOf(g));
  };
  const openComposer = () => { Haptics.selectionAsync(); setComposerOpen(true); };

  const renderOther = ({ item }: { item: StoryGroup }) => (
    <Pressable
      onPress={() => openGroup(item)}
      style={({ pressed }) => [styles.item, pressed && { opacity: 0.7 }]}
      accessibilityRole="button"
      accessibilityLabel={`${item.user.full_name || item.user.username}'s story${item.has_unseen ? ', new' : ''}`}
    >
      <StoryRing size={SIZE} state={item.has_unseen ? 'unseen' : 'seen'} bg={T.bg}>
        <UserAvatar avatarUrl={item.user.avatar_url ?? undefined} size={SIZE - 12} />
      </StoryRing>
      <Text style={[styles.name, !item.has_unseen && styles.nameSeen]} numberOfLines={1}>
        {item.user.username}
      </Text>
    </Pressable>
  );

  return (
    <View style={styles.wrap}>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={loaded ? others : []}
        keyExtractor={g => g.user.id}
        renderItem={renderOther}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.headerRow}>
            <Pressable
              onPress={mine ? () => openGroup(mine) : openComposer}
              onLongPress={openComposer}
              style={({ pressed }) => [styles.item, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel={mine ? 'Your story' : 'Add to your story'}
            >
              <View>
                <StoryRing size={SIZE} state={mine ? 'seen' : 'none'} bg={T.bg}>
                  <UserAvatar avatarUrl={me?.avatar_url} size={mine ? SIZE - 12 : SIZE - 6} />
                </StoryRing>
                {posting ? (
                  <View style={[styles.badge, { backgroundColor: T.surface2 }]}>
                    <ActivityIndicator size="small" color={T.accent} />
                  </View>
                ) : (
                  <Pressable onPress={openComposer} hitSlop={10} style={[styles.badge, { backgroundColor: T.accent }]} accessibilityLabel="Add to your story">
                    <Ionicons name="add" size={16} color="#000" />
                  </Pressable>
                )}
              </View>
              <Text style={[styles.name, styles.nameSeen]} numberOfLines={1}>{mine ? 'Story yako' : 'Ongeza story'}</Text>
            </Pressable>
            {!loaded && [0, 1, 2, 3].map(i => (
              <View key={i} style={styles.item}>
                <View style={[styles.skeleton, { backgroundColor: T.surface2 }]} />
                <View style={[styles.skeletonText, { backgroundColor: T.surface2 }]} />
              </View>
            ))}
          </View>
        }
      />
    </View>
  );
}

const makeStyles = (T: any) => StyleSheet.create({
  wrap: { paddingTop: 6, paddingBottom: 10 },
  list: { paddingHorizontal: 12, gap: 10 },
  headerRow: { flexDirection: 'row', gap: 10 },
  item: { width: SIZE + 4, alignItems: 'center', gap: 5 },
  name: { fontSize: 12, color: T.text, fontWeight: '500', maxWidth: SIZE + 4 },
  nameSeen: { color: T.textSub },
  badge: {
    position: 'absolute', right: -1, bottom: -1, width: 24, height: 24, borderRadius: 12,
    borderWidth: 3, borderColor: T.bg, alignItems: 'center', justifyContent: 'center',
  },
  skeleton: { width: SIZE, height: SIZE, borderRadius: SIZE / 2 },
  skeletonText: { width: 44, height: 9, borderRadius: 5, marginTop: 3 },
});
