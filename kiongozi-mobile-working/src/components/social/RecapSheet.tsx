// "Your week": opens the Spotify Wrapped style story (components/wrapped/WrappedStory). This file keeps the
// entry point every screen already uses (Profile chip, Settings, the Monday push) and owns the data and actions:
// GET /social/recap for the numbers, and the server-drawn 1080x1920 card (POST /social/recap/card) for sharing
// to your story, your feed, or any other app. The old one-page sheet lives in components/wrapped/RecapClassic.tsx.
import React, { useEffect, useState } from 'react';
import { Share, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import apiClient from '../../utils/apiClient';
import { useStoryStore } from '../../stores/storyStore';
import { useSocialStore } from '../../stores/socialStore';
import { useProfileStore } from '../../stores/profileStore';
import { useDMStore } from '../../stores/dmStore';
import { storyNav } from '../stories/storyAssets';
import { WrappedStory } from '../wrapped/WrappedStory';
import type { WeekStats } from '../wrapped/wrappedData';
import { kchatLink } from '../../utils/links';
import { shareImageFile } from '../../utils/shareImage';

let cachedStats: { at: number; stats: WeekStats } | null = null; // the week changes slowly; reuse for 10 min

export function RecapSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [stats, setStats] = useState<WeekStats | null>(cachedStats?.stats ?? null);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>(cachedStats ? 'ready' : 'loading');
  const [busy, setBusy] = useState<null | 'story' | 'post' | 'more'>(null);
  const [done, setDone] = useState<string | null>(null);
  const [thanking, setThanking] = useState(false);
  const me = useProfileStore(s => s.currentUserProfile);

  const load = () => {
    if (cachedStats && Date.now() - cachedStats.at < 10 * 60 * 1000) { setStats(cachedStats.stats); setStatus('ready'); return; }
    setStatus('loading');
    apiClient.getRecap().then((r: any) => {
      if (r?.success && r.data) { cachedStats = { at: Date.now(), stats: r.data }; setStats(r.data); setStatus('ready'); }
      else setStatus('error');
    }).catch(() => setStatus('error'));
  };

  useEffect(() => {
    if (!visible) { setDone(null); setBusy(null); setThanking(false); return; }
    load();
    if (!useProfileStore.getState().currentUserProfile) useProfileStore.getState().fetchCurrentUserProfile().catch(() => {});
  }, [visible]);

  const finish = (msg: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setDone(msg);
    setTimeout(onClose, 1100);
  };
  // Native alerts, because they show above the story's modal
  const fail = (e: any) => {
    setBusy(null);
    Alert.alert('Could not share', e?.message || 'Something went wrong. Try again.');
  };

  const makeFull = async () => {
    const r: any = await apiClient.getRecapCard(false);
    if (!r?.success || !r.data?.url) throw new Error(r?.error || 'Could not make your recap');
    return r.data as { url: string; storage_path: string; width: number; height: number };
  };

  const toStory = async () => {
    setBusy('story');
    try {
      const c = await makeFull();
      const res: any = await apiClient.createStory({
        media_type: 'image', media_url: c.url, storage_path: c.storage_path, width: c.width, height: c.height, audience: 'everyone',
        // "See your week": anyone watching taps it and their own Your Week opens (Spotify Wrapped's loop)
        overlays: [{ type: 'link', url: kchatLink.week, x: 0.5, y: 0.885, scale: 1, rotation: -2 }],
      });
      if (!res?.success) throw new Error(res?.error || 'Could not post');
      useStoryStore.getState().fetchFeed().catch(() => {});
      finish('Added to your story');
    } catch (e: any) { fail(e); }
  };

  const toPost = async () => {
    setBusy('post');
    try {
      const c = await makeFull();
      const res: any = await apiClient.createPost('My week on KChat #WikiYangu', [{ media_type: 'image', url: c.url, storage_path: c.storage_path, width: c.width, height: c.height }]);
      if (!res?.success) throw new Error(res?.error || 'Could not post');
      if (res.data) useSocialStore.getState().prependPost(res.data);
      finish('Posted to your feed');
    } catch (e: any) { fail(e); }
  };

  const toMore = async () => {
    setBusy('more');
    try {
      const c = await makeFull();
      setBusy(null);
      // The card itself as a photo (it used to send the raw storage URL); the /week link goes on the clipboard
      await shareImageFile(c.url, `My week on KChat\n${kchatLink.week}`);
    } catch { setBusy(null); }
  };

  // Leaving the story for somewhere else in the app: close first, then go once the modal is out of the way
  const leaveTo = (screen: string, params: Record<string, any>) => {
    const nav = storyNav.current;
    if (!nav) return;
    onClose();
    setTimeout(() => nav.navigate('Feed', { screen, params }), 280);
  };

  const openPost = (postId: string) => {
    Haptics.selectionAsync().catch(() => {});
    leaveTo('PostDetail', { postId });
  };

  // "Say thanks" opens a chat with your biggest fan, starting one if you have never talked
  const thank = async () => {
    const f = stats?.topFan;
    if (!f || thanking) return;
    const go = (conversationId: string) => leaveTo('DMConversation', {
      conversationId, participantName: f.full_name || f.username, participantUsername: f.username, participantAvatar: f.avatar_url,
    });
    const existing = useDMStore.getState().conversations.find(c => c.participants?.some((x: any) => x.id === f.id));
    if (existing) { go(existing.id); return; }
    setThanking(true);
    try {
      const res: any = await apiClient.startDMConversation(f.id);
      if (!res?.success || !res.data?.id) throw new Error(res?.error || 'Could not open chat');
      go(res.data.id);
    } catch (e: any) {
      Alert.alert('Could not open chat', e?.message || 'Try again.');
    } finally {
      setThanking(false);
    }
  };

  return (
    <WrappedStory
      visible={visible}
      onClose={onClose}
      stats={stats}
      status={status}
      onRetry={() => { cachedStats = null; load(); }}
      me={me ? { username: me.username, full_name: me.full_name, avatar_url: me.avatar_url } : null}
      share={{ busy, done, toStory, toMore, toPost }}
      onOpenPost={openPost}
      onThanks={thank}
      thanking={thanking}
    />
  );
}
