// Avatar for lists (feed posts): a painted ring when the person has a story you can see.
// Tap: their story if they have one, otherwise onPress (usually their profile).
// Long-press: choose between story, photo and profile.
import React from 'react';
import { Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { useStoryStore } from '../../stores/storyStore';
import { UserAvatar } from '../social/UserAvatar';
import { avatarChoice } from '../social/AvatarHost';
import { StoryRing, ringInnerSize } from './StoryParts';

export function FeedStoryAvatar({ userId, avatarUrl, size, name, isBot, isVerified, onPress }: {
  userId?: string; avatarUrl?: string | null; size: number; name?: string; isBot?: boolean; isVerified?: boolean;
  onPress?: () => void;
}) {
  const T = useTheme();
  // Only people already in your story rail: no extra network calls per row
  const group = useStoryStore(s => (userId ? s.groups.find(g => g.user.id === userId && g.stories.length) : undefined));
  const state = !group ? 'none' : group.has_unseen ? 'unseen' : 'seen';

  return (
    <Pressable
      onPress={() => {
        if (group) { Haptics.selectionAsync().catch(() => {}); useStoryStore.getState().openViewer([group], 0); }
        else onPress?.();
      }}
      onLongPress={() => avatarChoice({
        name,
        avatarUrl,
        group,
        extra: onPress ? [{ label: 'View profile', icon: 'person-circle-outline', onPress }] : undefined,
      })}
      delayLongPress={320}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={group ? `${name || 'Their'} story` : `${name || 'Their'} profile`}
      accessibilityHint="Long-press for the photo and more"
    >
      <StoryRing size={size} state={state} bg={T.bg} close={group?.close_friends} count={group?.stories.length}>
        <UserAvatar avatarUrl={avatarUrl ?? undefined} size={ringInnerSize(size, state)} isBot={isBot} isVerified={isVerified} name={name} />
      </StoryRing>
    </Pressable>
  );
}
