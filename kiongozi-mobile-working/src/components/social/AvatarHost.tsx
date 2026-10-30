// Opening someone's profile photo full screen, and the "View story / View photo" choice
// for people who have a story. Mounted once in AppNavigator; anything can call openAvatar / avatarChoice.
import React from 'react';
import { create } from 'zustand';
import * as Haptics from 'expo-haptics';
import { MediaViewerModal } from './MediaViewerModal';
import { BottomSheet } from './BottomSheet';
import { useStoryStore, StoryGroup } from '../../stores/storyStore';

type Choice = {
  name?: string;
  avatarUrl?: string | null;
  group?: StoryGroup | null;
  /** extra rows, e.g. "Change photo" on your own profile or "View profile" in the feed */
  extra?: { label: string; icon: string; onPress: () => void }[];
};

const useAvatarHost = create<{ photo: string | null; choice: Choice | null }>(() => ({ photo: null, choice: null }));

/** Show a profile photo full screen (pinch to zoom, swipe down to close). */
export function openAvatar(url?: string | null) {
  if (!url) return;
  Haptics.selectionAsync().catch(() => {});
  useAvatarHost.setState({ photo: url });
}

/** Ask what to open. With nothing to choose between, it opens the one thing there is. */
export function avatarChoice(c: Choice) {
  const hasStory = !!c.group?.stories.length;
  const options = (hasStory ? 1 : 0) + (c.avatarUrl ? 1 : 0) + (c.extra?.length || 0);
  if (options === 0) return;
  if (options === 1) {
    if (hasStory) return useStoryStore.getState().openViewer([c.group!], 0);
    if (c.avatarUrl) return openAvatar(c.avatarUrl);
    return c.extra![0].onPress();
  }
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  useAvatarHost.setState({ choice: c });
}

export function AvatarHost() {
  const photo = useAvatarHost(s => s.photo);
  const choice = useAvatarHost(s => s.choice);
  const close = () => useAvatarHost.setState({ choice: null });

  const actions: any[] = [];
  if (choice?.group?.stories.length) {
    const g = choice.group;
    actions.push({
      label: g.has_unseen ? 'View story' : 'View story again',
      icon: 'play-circle-outline',
      onPress: () => { close(); setTimeout(() => useStoryStore.getState().openViewer([g], 0), 220); },
    });
  }
  if (choice?.avatarUrl) {
    const url = choice.avatarUrl;
    actions.push({ label: 'View profile photo', icon: 'image-outline', onPress: () => { close(); setTimeout(() => openAvatar(url), 220); } });
  }
  for (const e of choice?.extra || []) actions.push({ label: e.label, icon: e.icon, onPress: () => { close(); setTimeout(e.onPress, 220); } });

  return (
    <>
      <BottomSheet visible={!!choice} onClose={close} title={choice?.name} actions={actions} />
      <MediaViewerModal
        visible={!!photo}
        onClose={() => useAvatarHost.setState({ photo: null })}
        media={photo ? [{ url: photo, media_type: 'image' }] : []}
      />
    </>
  );
}
