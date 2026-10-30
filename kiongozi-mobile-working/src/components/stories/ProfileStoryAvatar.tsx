// Profile avatar with a painted story ring. Tap: with a story you choose between the story and the
// photo; without one the photo opens full screen. On your own profile there is also "Change photo".
import React, { useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useStoryStore, StoryGroup } from '../../stores/storyStore';
import apiClient from '../../utils/apiClient';
import { UserAvatar } from '../social/UserAvatar';
import { StoryRing, ringInnerSize } from './StoryParts';
import { avatarChoice } from '../social/AvatarHost';

export function ProfileStoryAvatar({ userId, avatarUrl, size, isBot, isVerified, name, onChangePhoto }: {
  userId?: string; avatarUrl?: string; size: number; isBot?: boolean; isVerified?: boolean;
  name?: string; onChangePhoto?: () => void;
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
  const avatar = <UserAvatar avatarUrl={avatarUrl} size={state === 'none' ? size : ringInnerSize(size, state)} isBot={isBot} isVerified={isVerified} name={name} />;

  const onPress = () => avatarChoice({
    name,
    avatarUrl,
    group: state === 'none' ? null : group,
    extra: onChangePhoto ? [{ label: avatarUrl ? 'Change photo' : 'Add a photo', icon: 'camera-outline', onPress: onChangePhoto }] : undefined,
  });

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={state === 'none' ? 'Profile photo' : 'Story or profile photo'}
      style={({ pressed }) => pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }}
    >
      <StoryRing size={size} state={state} bg={T.bg} close={group?.close_friends} count={group?.stories.length}>{avatar}</StoryRing>
    </Pressable>
  );
}
