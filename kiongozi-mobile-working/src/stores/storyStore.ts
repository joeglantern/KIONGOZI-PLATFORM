// Stories state: the rail's groups, what is open in the viewer, and the composer.
import { create } from 'zustand';
import apiClient from '../utils/apiClient';

export interface StoryOverlay {
  type: 'sticker' | 'text';
  key?: string;       // sticker id (see components/stories/storyAssets)
  text?: string;
  color?: string;
  bg?: string;
  x: number;          // centre, 0–1 of the canvas width
  y: number;          // centre, 0–1 of the canvas height
  scale: number;
  rotation: number;   // degrees
}

export interface Story {
  id: string;
  user_id: string;
  media_type: 'image' | 'video' | 'text';
  media_url?: string | null;
  thumbnail_url?: string | null;
  width?: number | null;
  height?: number | null;
  duration_ms?: number | null;
  text_content?: string | null;
  bg?: string | null;
  text_color?: string | null;
  font?: string | null;
  overlays: StoryOverlay[];
  caption?: string | null;
  audience: 'everyone' | 'followers';
  view_count?: number;
  created_at: string;
  expires_at: string;
  seen: boolean;
  my_reaction?: string | null;
}

export interface StoryUser {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string | null;
  is_verified?: boolean;
}

export interface StoryGroup {
  user: StoryUser;
  stories: Story[];
  has_unseen: boolean;
  latest_at: string;
}

interface StoryState {
  groups: StoryGroup[];
  loading: boolean;
  loaded: boolean;
  /** viewer: the list of groups being paged through and where to start */
  viewer: { groups: StoryGroup[]; index: number } | null;
  composerOpen: boolean;
  posting: boolean;
  meId: string | null;

  fetchFeed: () => Promise<void>;
  openViewer: (groups: StoryGroup[], index: number) => void;
  openUser: (userId: string) => Promise<boolean>;
  closeViewer: () => void;
  setMeId: (id: string | null) => void;
  markSeen: (storyId: string) => void;
  setReaction: (storyId: string, emoji: string) => void;
  addMine: (story: Story, me: StoryUser) => void;
  removeStory: (storyId: string) => void;
  setComposerOpen: (open: boolean) => void;
  setPosting: (p: boolean) => void;
  reset: () => void;
}

// Views are sent once per story per app session
const sentViews = new Set<string>();

const mapStories = (groups: StoryGroup[], storyId: string, fn: (s: Story) => Story) =>
  groups.map(g => {
    if (!g.stories.some(s => s.id === storyId)) return g;
    const stories = g.stories.map(s => (s.id === storyId ? fn(s) : s));
    return { ...g, stories, has_unseen: stories.some(s => !s.seen) };
  });

export const sortGroups = (groups: StoryGroup[], meId: string | null) =>
  [...groups].sort((a, b) =>
    (Number(b.user.id === meId) - Number(a.user.id === meId)) ||
    (Number(b.has_unseen) - Number(a.has_unseen)) ||
    b.latest_at.localeCompare(a.latest_at));

export const useStoryStore = create<StoryState>((set, get) => ({
  groups: [],
  loading: false,
  loaded: false,
  viewer: null,
  composerOpen: false,
  posting: false,
  meId: null,

  fetchFeed: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const res: any = await apiClient.getStoryFeed();
      if (res.success && Array.isArray(res.data)) set({ groups: res.data, loaded: true });
    } catch {
      // keep whatever we had; the rail still offers "Ongeza story"
    } finally {
      set({ loading: false, loaded: true });
    }
  },

  openViewer: (groups, index) => set({ viewer: { groups, index } }),

  // From a profile: open just that person's stories
  openUser: async (userId) => {
    const inRail = get().groups.findIndex(g => g.user.id === userId);
    if (inRail >= 0) { set({ viewer: { groups: [get().groups[inRail]], index: 0 } }); return true; }
    const res: any = await apiClient.getUserStories(userId);
    if (res.success && res.data?.stories?.length) { set({ viewer: { groups: [res.data], index: 0 } }); return true; }
    return false;
  },

  closeViewer: () => {
    // Re-sort so people you've now fully watched move behind unseen ones; yours stays first
    set(s => ({ viewer: null, groups: sortGroups(s.groups, s.meId) }));
  },

  setMeId: (id) => set({ meId: id }),

  markSeen: (storyId) => {
    set(s => ({
      groups: mapStories(s.groups, storyId, st => ({ ...st, seen: true })),
      viewer: s.viewer && { ...s.viewer, groups: mapStories(s.viewer.groups, storyId, st => ({ ...st, seen: true })) },
    }));
    if (sentViews.has(storyId)) return;
    sentViews.add(storyId);
    apiClient.viewStory(storyId).catch(() => sentViews.delete(storyId));
  },

  setReaction: (storyId, emoji) => {
    set(s => ({
      groups: mapStories(s.groups, storyId, st => ({ ...st, my_reaction: emoji })),
      viewer: s.viewer && { ...s.viewer, groups: mapStories(s.viewer.groups, storyId, st => ({ ...st, my_reaction: emoji })) },
    }));
    apiClient.viewStory(storyId, emoji).catch(() => {});
  },

  addMine: (story, me) => {
    set(s => {
      const idx = s.groups.findIndex(g => g.user.id === me.id);
      if (idx >= 0) {
        const g = s.groups[idx];
        const updated = { ...g, stories: [...g.stories, story], latest_at: story.created_at };
        return { groups: [updated, ...s.groups.filter((_, i) => i !== idx)] };
      }
      return { groups: [{ user: me, stories: [story], has_unseen: false, latest_at: story.created_at }, ...s.groups] };
    });
  },

  removeStory: (storyId) => {
    const strip = (groups: StoryGroup[]) => groups
      .map(g => ({ ...g, stories: g.stories.filter(s => s.id !== storyId) }))
      .filter(g => g.stories.length > 0);
    set(s => ({
      groups: strip(s.groups),
      viewer: s.viewer && strip(s.viewer.groups).length ? { ...s.viewer, groups: strip(s.viewer.groups) } : null,
    }));
  },

  setComposerOpen: (open) => set({ composerOpen: open }),
  setPosting: (p) => set({ posting: p }),
  reset: () => set({ groups: [], loaded: false, viewer: null, composerOpen: false, posting: false }),
}));
