// Profile avatar with a story ring; tapping it opens that person's stories.
import React, { useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { useStoryStore, StoryGroup } from '../../stores/storyStore';
import apiClient from '../../utils/apiClient';
import { UserAvatar } from '../social/UserAvatar';
import { StoryRing } from './StoryParts';

export function ProfileStoryAvatar({ userId, avatarUrl, size, isBot, isVerified }: {
  userId?: string; avatarUrl?: string; size: number; isBot?: boolean; isVerified?: boolean;
}) {
  const T = useTheme();
  const inRail = useStoryStore(s => s.groups.find(g => g.user.id === userId));
  const openViewer = useStoryStore(s => s.openViewer);
  const [fetched, setFetched] = useState<StoryGroup | null>(null);

  // Not in the rail (e.g. someone you don't follow): ask once
  useEffect(() => {
    if (!userId || inRail) return;
    let live = true;
    apiClient.getUserStories(userId).then((r: any) => { if (live && r.success) setFetched(r.data || null); }).catch(() => {});
    return () => { live = false; };
  }, [userId, !!inRail]);

  const group = inRail || fetched;
  const state = !group?.stories.length ? 'none' : group.has_unseen ? 'unseen' : 'seen';
  const avatar = <UserAvatar avatarUrl={avatarUrl} size={state === 'none' ? size : size - 12} isBot={isBot} isVerified={isVerified} />;

  if (state === 'none') return avatar;
  return (
    <Pressable
      onPress={() => { Haptics.selectionAsync(); openViewer([group!], 0); }}
      accessibilityRole="button"
      accessibilityLabel="View story"
    >
      <StoryRing size={size} state={state} bg={T.bg}>{avatar}</StoryRing>
    </Pressable>
  );
}
