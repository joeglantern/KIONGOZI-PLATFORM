// Full-screen story viewer.
// Tap right/left = next/previous, hold = pause, swipe down = close, swipe sideways = next/previous person.
// Replies and reactions go to the author as DMs. Your own stories show who has seen them.
import { appAlert } from '../../utils/alert';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, Image, Modal, Pressable, StyleSheet, Animated, Dimensions, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator, FlatList, Keyboard, StatusBar, Share, Linking, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Reanimated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, interpolate, Extrapolation, runOnJS, Easing, SharedValue } from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useStoryStore, StoryGroup, Story, StoryOverlay } from '../../stores/storyStore';
import { useAuthStore } from '../../stores/authStore';
import { useSocialStore } from '../../stores/socialStore';
import ReportModal from '../../screens/social/ReportModal';
import apiClient from '../../utils/apiClient';
import { setFeedPaused } from '../social/videoPlayback';
import { UserAvatar } from '../social/UserAvatar';
import { VerifiedBadge } from '../social/VerifiedBadge';
import { StoryBackground, StoryText, StoryOverlays, POLL_H, FramedMedia, mediaFrameOf, LinkPill, LINK_H, linkLabel, CLOSE_RING } from './StoryParts';
import { MentionPill, QuestionCard, SliderCard, CountdownCard, PostSticker, stickerSize, isInteractive, QUESTION_COLORS } from './StoryStickers';
import { PollCard, POLL_W } from './PollCard';
import { REACTIONS, storyAge, storyNav } from './storyAssets';

// Public preview page: opens the story in the app, or the store if it isn't installed
const STORY_SHARE = (id: string) => `https://api.kiongozi.org/api/v1/social/stories/${id}/share`;

const { width: W, height: H } = Dimensions.get('window'); // first guess only (module-level sizes below)
// The real page size, measured from the modal itself. On Android (edge-to-edge) the full-screen modal
// is a different height from Dimensions 'window', which put the reply bar and likes in odd places.
const SizeCtx = createContext({ W, H });
const useSize = () => useContext(SizeCtx);
// Stops paging between people while a finger is on the emoji slider
const ScrollLockCtx = createContext<(locked: boolean) => void>(() => {});
const IMAGE_MS = 5000;
const textMs = (t?: string | null) => Math.min(10000, 5000 + (t?.length ?? 0) * 40);
// Viewers sheet: 470 by design, but never more than ~62% of the screen so the shrunken story
// card above it stays a usable size on 568/667-tall phones (568 -> 352, 667 -> 414, 844 -> 470).
const SHEET_H = Math.min(470, Math.round(H * 0.62));
// Quick reactions: 6 round buttons, 48px by design, shrunk to fit narrow screens (320 -> 41px)
const REACT_GAP = 8;
const REACT_SIZE = Math.min(48, Math.floor((W - 32 - 5 * REACT_GAP) / 6));
const CLAMP = Extrapolation.CLAMP;

export function StoryViewer() {
  const viewer = useStoryStore(s => s.viewer);
  const closeViewer = useStoryStore(s => s.closeViewer);
  const visible = !!viewer;

  useEffect(() => { setFeedPaused('stories', visible); }, [visible]);
  const [box, setBox] = useState({ W, H });
  const [measured, setMeasured] = useState(false);
  useEffect(() => { if (!visible) setMeasured(false); }, [visible]);
  useEffect(() => { if (visible && !measured) { const t = setTimeout(() => setMeasured(true), 0); return () => clearTimeout(t); } }, [visible, box, measured]);

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent navigationBarTranslucent onRequestClose={closeViewer}>
      <GestureHandlerRootView
        style={{ flex: 1, backgroundColor: '#000' }}
        onLayout={e => {
          const { width, height } = e.nativeEvent.layout;
          if (!(width > 0 && height > 0)) return;
          // Size is locked once per opening (the keyboard must not shrink the story); rotation re-measures
          if (!measured ? (Math.abs(width - box.W) > 1 || Math.abs(height - box.H) > 1) : Math.abs(width - box.W) > 1) setBox({ W: width, H: height });
        }}
      >
        <SizeCtx.Provider value={box}>
          {viewer && measured && <ViewerBody groups={viewer.groups} startIndex={viewer.index} onClose={closeViewer} />}
        </SizeCtx.Provider>
      </GestureHandlerRootView>
    </Modal>
  );
}

function ViewerBody({ groups, startIndex, onClose }: { groups: StoryGroup[]; startIndex: number; onClose: () => void }) {
  const { W, H } = useSize();
  const listRef = useRef<FlatList>(null);
  const [page, setPage] = useState(Math.max(0, startIndex));
  const scrollX = useRef(new Animated.Value(startIndex * W)).current;
  const drag = useSharedValue(0); // swipe-down distance, driven on the UI thread
  const [locked, setLocked] = useState(false);

  const goPage = useCallback((next: number) => {
    if (next < 0) return;
    if (next >= groups.length) { onClose(); return; }
    listRef.current?.scrollToOffset({ offset: next * W, animated: true });
    setPage(next);
  }, [groups.length, onClose]);

  // Swipe down anywhere to close — runs on the native UI thread, so it follows the finger smoothly
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const finish = useCallback(() => closeRef.current(), []);
  const dismiss = Gesture.Pan()
    .maxPointers(1)
    .activeOffsetY(14)
    .failOffsetX([-18, 18])
    .onUpdate(e => { drag.value = Math.max(0, e.translationY); })
    .onEnd(e => {
      if (e.translationY > 120 || e.velocityY > 800) {
        drag.value = withTiming(H, { duration: 200, easing: Easing.out(Easing.quad) }, done => { if (done) runOnJS(finish)(); });
      } else {
        drag.value = withSpring(0, { damping: 22, stiffness: 240, velocity: e.velocityY });
      }
    });

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(drag.value, [0, 300], [1, 0.2], Extrapolation.CLAMP),
  }));
  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: drag.value },
      { scale: interpolate(drag.value, [0, H], [1, 0.75], Extrapolation.CLAMP) },
    ],
    borderRadius: interpolate(drag.value, [0, 80], [0, 24], Extrapolation.CLAMP),
    overflow: 'hidden',
  }));

  return (
    <Reanimated.View style={[styles.backdrop, backdropStyle]}>
      <StatusBar barStyle="light-content" />
      <GestureDetector gesture={dismiss}>
      <Reanimated.View style={[{ flex: 1 }, cardStyle]}>
        <ScrollLockCtx.Provider value={setLocked}>
        <Animated.FlatList
          ref={listRef as any}
          data={groups}
          horizontal
          pagingEnabled
          bounces={false}
          scrollEnabled={!locked}
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={Math.max(0, startIndex)}
          getItemLayout={(_, i) => ({ length: W, offset: W * i, index: i })}
          keyExtractor={g => g.user.id}
          windowSize={3}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          keyboardShouldPersistTaps="handled"
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
          scrollEventThrottle={16}
          onMomentumScrollEnd={e => setPage(Math.round(e.nativeEvent.contentOffset.x / W))}
          renderItem={({ item, index }) => {
            // Neighbouring people sit slightly smaller and darker while you swipe
            const range = [(index - 1) * W, index * W, (index + 1) * W];
            const s = scrollX.interpolate({ inputRange: range, outputRange: [0.9, 1, 0.9], extrapolate: 'clamp' });
            const o = scrollX.interpolate({ inputRange: range, outputRange: [0.5, 1, 0.5], extrapolate: 'clamp' });
            return (
              <Animated.View style={{ width: W, height: H, transform: [{ scale: s }], opacity: o }}>
                <GroupPage
                  group={item}
                  active={index === page}
                  onPrevGroup={() => goPage(index - 1)}
                  onNextGroup={() => goPage(index + 1)}
                  onClose={onClose}
                />
              </Animated.View>
            );
          }}
        />
        </ScrollLockCtx.Provider>
      </Reanimated.View>
      </GestureDetector>
    </Reanimated.View>
  );
}

function GroupPage({ group, active, onPrevGroup, onNextGroup, onClose }: {
  group: StoryGroup; active: boolean; onPrevGroup: () => void; onNextGroup: () => void; onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { W, H } = useSize();
  const { user } = useAuthStore();
  const { markSeen, setReaction, removeStory, setPoll, setSlider, setReminded } = useStoryStore();
  const stories = group.stories;
  const isMine = group.user.id === user?.id;

  const [idx, setIdx] = useState(() => {
    const firstUnseen = stories.findIndex(s => !s.seen);
    return firstUnseen >= 0 ? firstUnseen : 0;
  });
  const story: Story | undefined = stories[Math.min(idx, stories.length - 1)];

  const [ready, setReady] = useState(false);       // media loaded
  const [holding, setHolding] = useState(false);   // finger down
  const [longHold, setLongHold] = useState(false); // held long enough to hide the chrome
  const [typing, setTyping] = useState(false);     // reply box focused
  const [sheet, setSheet] = useState(false);       // viewers sheet open
  const [muted, setMuted] = useState(false);
  const [report, setReport] = useState<null | { type: 'story' | 'user'; id: string }>(null); // report modal target
  const [videoMs, setVideoMs] = useState<number | null>(null);
  const [answering, setAnswering] = useState<StoryOverlay | null>(null); // question box being answered
  const paused = !active || holding || typing || sheet || !!report || !ready || !!answering;
  const muteUser = useSocialStore(s => s.muteUser);

  // Own story + viewers sheet: the story shrinks into a small card above the sheet (UI thread)
  const sheetP = useSharedValue(0);
  const cardTop = insets.top + 12;
  const cardH = Math.max(140, Math.min(356, H - SHEET_H - cardTop + 38)); // tucks 38px behind the sheet
  const cardW = (cardH * 200) / 356;
  const cardS = Math.max(cardW / W, cardH / H);
  const boxStyle = useAnimatedStyle(() => {
    const p = sheetP.value;
    const top = interpolate(p, [0, 1], [0, 18], CLAMP);
    const bottom = interpolate(p, [0, 1], [20, 18], CLAMP);
    return {
      left: interpolate(p, [0, 1], [0, (W - cardW) / 2], CLAMP),
      top: interpolate(p, [0, 1], [0, cardTop], CLAMP),
      width: interpolate(p, [0, 1], [W, cardW], CLAMP),
      height: interpolate(p, [0, 1], [H, cardH], CLAMP),
      borderTopLeftRadius: top, borderTopRightRadius: top,
      borderBottomLeftRadius: bottom, borderBottomRightRadius: bottom,
    };
  });
  const innerStyle = useAnimatedStyle(() => {
    const p = sheetP.value;
    const bw = interpolate(p, [0, 1], [W, cardW], CLAMP);
    const bh = interpolate(p, [0, 1], [H, cardH], CLAMP);
    return { left: (bw - W) / 2, top: (bh - H) / 2, transform: [{ scale: interpolate(p, [0, 1], [1, cardS], CLAMP) }] };
  });
  const chromeFade = useAnimatedStyle(() => ({ opacity: interpolate(sheetP.value, [0, 0.35], [1, 0], CLAMP) }));

  // Top edge of the bottom controls (reply bar + reactions, or the own-story footer), measured, so
  // the caption and poll always sit above them whatever the screen size / inset / keyboard.
  const [footerTop, setFooterTop] = useState(H - insets.bottom - (isMine ? 60 : 130));
  const [pollH, setPollH] = useState(POLL_H * (W / 390)); // measured poll card height (unscaled)

  const progress = useRef(new Animated.Value(0)).current;
  const anim = useRef<Animated.CompositeAnimation | null>(null);
  const done = useRef(0); // ms already played of the current segment

  // New story: reset state
  useEffect(() => {
    progress.setValue(0); done.current = 0; setVideoMs(null);
    setReady(story?.media_type === 'text');
  }, [story?.id]);

  const next = useCallback(() => {
    if (idx < stories.length - 1) setIdx(i => i + 1);
    else onNextGroup();
  }, [idx, stories.length, onNextGroup]);

  const prev = useCallback(() => {
    if (idx > 0) setIdx(i => i - 1);
    else { progress.setValue(0); done.current = 0; onPrevGroup(); }
  }, [idx, onPrevGroup]);

  const total = !story ? IMAGE_MS
    : story.media_type === 'video' ? (videoMs ?? story.duration_ms ?? 15000)
    : story.media_type === 'text' ? textMs(story.text_content)
    : IMAGE_MS;

  // Drive the progress bar; pause/resume keeps the elapsed time
  useEffect(() => {
    if (!story) return;
    if (paused) {
      anim.current?.stop();
      progress.stopAnimation(v => { done.current = v * total; });
      return;
    }
    const remaining = Math.max(0, total - done.current);
    anim.current = Animated.timing(progress, { toValue: 1, duration: remaining, useNativeDriver: false, easing: t => t });
    anim.current.start(({ finished }) => { if (finished) { done.current = 0; next(); } });
    return () => anim.current?.stop();
  }, [paused, story?.id, total]);

  // Seen after a second on screen
  useEffect(() => {
    if (!active || !ready || !story || isMine || story.seen) return;
    const t = setTimeout(() => markSeen(story.id), 1000);
    return () => clearTimeout(t);
  }, [active, ready, story?.id]);

  // Warm the next image
  useEffect(() => {
    const n = stories[idx + 1];
    const url = n?.media_type === 'image' ? n.media_url : n?.thumbnail_url;
    if (url) Image.prefetch(url).catch(() => {});
  }, [idx]);

  // Leaving this person: stop where we are
  useEffect(() => { if (!active) { setTyping(false); setAnswering(null); } }, [active]);

  if (!story) return null;

  const onTap = (x: number) => (x < W * 0.3 ? prev() : next());

  // Mention / post stickers leave the viewer for the profile or the post
  const goTo = (screen: 'PublicProfile' | 'PostDetail', params: Record<string, any>) => {
    const nav = storyNav.current;
    if (!nav) return;
    Haptics.selectionAsync().catch(() => {});
    onClose();
    nav.navigate('Feed', { screen, params });
  };

  const slide = async (v: number) => {
    const before = story.slider || { avg: null, count: 0, mine: null };
    const count = before.count + 1;
    setSlider(story.id, { avg: ((before.avg ?? 0) * before.count + v) / count, count, mine: v });
    const r: any = await apiClient.slideStory(story.id, v).catch(() => null);
    setSlider(story.id, r?.success ? r.data : before);
  };

  const toggleRemind = async () => {
    const was = !!story.countdown?.reminded;
    setReminded(story.id, !was);
    const r: any = await apiClient.remindStoryCountdown(story.id, !was).catch(() => null);
    if (!r?.success) { setReminded(story.id, was); appAlert('Could not save', r?.error || 'Try again.'); }
  };

  const confirmDelete = () => {
    setHolding(true);
    appAlert('Delete this story?', 'It will be removed for everyone.', [
      { text: 'Cancel', style: 'cancel', onPress: () => setHolding(false) },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          setHolding(false);
          const res: any = await apiClient.deleteStory(story.id);
          if (res.success) {
            setSheet(false); sheetP.value = 0;
            if (stories.length === 1) onClose();
            else if (idx === stories.length - 1) setIdx(i => i - 1);
            removeStory(story.id);
          } else appAlert('Could not delete', res.error || 'Try again.');
        },
      },
    ], { cancelable: true, onDismiss: () => setHolding(false) });
  };

  // ... on someone else's story: mute or report them
  const openMore = () => {
    const u = group.user.username;
    setHolding(true);
    appAlert(`@${u}`, undefined, [
      {
        text: `Mute @${u}`, onPress: async () => {
          setHolding(false);
          try {
            await muteUser(group.user.id);
            appAlert('Muted', `You won't see posts from @${u} in your feed.`);
          } catch { appAlert('Could not mute', 'Try again.'); }
        },
      },
      ...(story ? [{ text: 'Report story', style: 'destructive' as const, onPress: () => { setHolding(false); setReport({ type: 'story', id: story.id }); } }] : []),
      { text: `Report @${u}`, style: 'destructive', onPress: () => { setHolding(false); setReport({ type: 'user', id: group.user.id }); } },
      { text: 'Cancel', style: 'cancel', onPress: () => setHolding(false) },
    ], { cancelable: true, onDismiss: () => setHolding(false) });
  };

  return (
    <View style={[styles.page, { width: W, height: H }]}>
      {/* Media (shrinks to a card while the viewers sheet is open) */}
      <Reanimated.View style={[styles.media, boxStyle]}>
      <Reanimated.View style={[styles.mediaInner, { width: W, height: H }, innerStyle]}>
        {story.media_type === 'text' && (
          <>
            <StoryBackground bg={story.bg} />
            <StoryText text={story.text_content || ''} color={story.text_color} font={story.font} bg={story.bg} textStyle={story.text_style} />
          </>
        )}
        {story.media_type !== 'text' && !!story.media_url && (
          // Applies the author's pinch/drag framing ('__media' overlay); plain cover-fill without one
          <FramedMedia
            frame={mediaFrameOf(story.overlays)}
            mw={story.width}
            mh={story.height}
            width={W}
            height={H}
            backdropUri={story.media_type === 'image' ? story.media_url : story.thumbnail_url}
          >
            {story.media_type === 'image' && !!story.placeholder && (
              <Image source={{ uri: story.placeholder }} style={StyleSheet.absoluteFill} resizeMode="cover" blurRadius={6} />
            )}
            {story.media_type === 'image' ? (
              <Image source={{ uri: story.media_url, cache: 'force-cache' }} style={StyleSheet.absoluteFill} resizeMode="cover"
                onLoad={() => setReady(true)} onError={() => setReady(true)} />
            ) : (
              <StoryVideo
                key={story.id}
                url={story.media_url}
                poster={story.thumbnail_url}
                playing={!paused || (!ready && active)}
                muted={muted}
                onReady={ms => { if (ms > 0) setVideoMs(Math.min(60000, ms)); setReady(true); }}
              />
            )}
          </FramedMedia>
        )}
        <StoryOverlays overlays={story.overlays} width={W} height={H} skipPolls />
        {!ready && active && <ActivityIndicator style={StyleSheet.absoluteFill} color="#fff" />}
      </Reanimated.View>
      </Reanimated.View>

      {/* Tap / hold zones */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={e => onTap(e.nativeEvent.locationX)}
        onLongPress={() => setLongHold(true)}
        delayLongPress={220}
        onPressIn={() => setHolding(true)}
        onPressOut={() => { setHolding(false); setLongHold(false); }}
        accessibilityRole="button"
        accessibilityLabel={`Story ${idx + 1} of ${stories.length} from ${group.user.username}. Tap right for next, left for previous.`}
        accessibilityActions={[{ name: 'increment', label: 'Next' }, { name: 'decrement', label: 'Previous' }]}
        onAccessibilityAction={e => (e.nativeEvent.actionName === 'increment' ? next() : prev())}
      />

      {/* Poll sticker: tappable, so it sits above the tap zones */}
      {(() => {
        const p = story.overlays?.find(o => o.type === 'poll');
        if (!p) return null;
        const k = W / 390;
        const vote = async (option: number) => {
          const prevPoll = story.poll || { counts: [0, 0] as [number, number], mine: null };
          const counts = [...prevPoll.counts] as [number, number];
          if (prevPoll.mine === 0 || prevPoll.mine === 1) counts[prevPoll.mine] = Math.max(0, counts[prevPoll.mine] - 1);
          counts[option] += 1;
          setPoll(story.id, { counts, mine: option });
          const r: any = await apiClient.voteStoryPoll(story.id, option).catch(() => null);
          if (r?.success) setPoll(story.id, r.data);
          else setPoll(story.id, prevPoll);
        };
        // Keep the card between the header and the bottom controls (it may have been dragged low
        // in the composer, and screens differ in height); hidden while replying (keyboard is up).
        const half = (pollH * (p.scale || 1)) / 2;
        const minC = insets.top + 64 + half, maxC = footerTop - 12 - half;
        const cy = maxC >= minC ? Math.min(maxC, Math.max(minC, p.y * H)) : (minC + maxC) / 2;
        const hidden = longHold || sheet || typing;
        return (
          <View
            style={{ position: 'absolute', left: p.x * W - (POLL_W * k) / 2, top: cy - pollH / 2, transform: [{ rotate: `${p.rotation || 0}deg` }, { scale: p.scale || 1 }], opacity: hidden ? 0 : 1 }}
            onLayout={e => { const h = e.nativeEvent.layout.height; if (Math.abs(h - pollH) > 1) setPollH(h); }}
            pointerEvents={hidden ? 'none' : 'auto'}
            onTouchStart={() => setHolding(true)}
            onTouchEnd={() => setHolding(false)}
          >
            <PollCard
              question={p.text || ''}
              options={p.options || []}
              counts={story.poll?.counts}
              mine={story.poll?.mine}
              showResults={isMine}
              onVote={isMine ? undefined : vote}
              k={k}
            />
          </View>
        );
      })()}

      {/* Link stickers: tappable, above the tap zones */}
      {(story.overlays || []).filter(o => o.type === 'link' && o.url).map((o, i) => {
        const k = W / 390;
        const hidden = longHold || sheet || typing;
        const minC = insets.top + 64, maxC = footerTop - 12 - (LINK_H * k) / 2;
        const cy = maxC >= minC ? Math.min(maxC, Math.max(minC, o.y * H)) : (minC + maxC) / 2;
        return (
          <View key={`link${i}`} pointerEvents={hidden ? 'none' : 'box-none'}
            style={{ position: 'absolute', left: 0, width: W, top: cy - (LINK_H * k) / 2, alignItems: 'center', opacity: hidden ? 0 : 1, transform: [{ translateX: (o.x - 0.5) * W }, { rotate: `${o.rotation || 0}deg` }, { scale: o.scale || 1 }] }}>
            <Pressable
              onPress={() => { setHolding(true); Linking.openURL(o.url!).catch(() => {}).finally(() => setHolding(false)); }}
              accessibilityRole="link" accessibilityLabel={`Open ${linkLabel(o.url!)}`}
            >
              <LinkPill url={o.url!} k={k} />
            </Pressable>
          </View>
        );
      })}

      {/* Mention, question, slider, countdown and post stickers: live, above the tap zones */}
      {(story.overlays || []).map((o, i) => {
        if (!isInteractive(o)) return null;
        const k = W / 390;
        let body: React.ReactNode = null;
        if (o.type === 'mention' && o.text) {
          body = (
            <Pressable onPress={() => goTo('PublicProfile', { username: o.text })} style={({ pressed }) => pressed && { transform: [{ scale: 0.96 }] }}
              accessibilityRole="link" accessibilityLabel={`Open @${o.text}'s profile`}>
              <MentionPill username={o.text} k={k} />
            </Pressable>
          );
        } else if (o.type === 'question') {
          body = (
            <QuestionCard prompt={o.text || ''} color={o.bg} avatarUrl={group.user.avatar_url} name={group.user.full_name || group.user.username} k={k}
              onPress={() => (isMine ? setSheet(true) : setAnswering(o))} />
          );
        } else if (o.type === 'slider') {
          body = (
            <SliderCard question={o.text} emoji={o.emoji} k={k} mine={story.slider?.mine} avg={story.slider?.avg} count={story.slider?.count}
              showResults={isMine} onSlide={isMine ? undefined : slide} />
          );
        } else if (o.type === 'countdown' && o.ends_at) {
          body = <CountdownCard title={o.text} endsAt={o.ends_at} k={k} reminded={story.countdown?.reminded} onToggleRemind={isMine ? undefined : toggleRemind} live={active} />;
        } else if (o.type === 'post' && o.post) {
          body = (
            <Pressable onPress={() => goTo('PostDetail', { postId: o.post!.id })} style={({ pressed }) => pressed && { transform: [{ scale: 0.97 }] }}
              accessibilityRole="button" accessibilityLabel={`Open @${o.post.username}'s post`}>
              <PostSticker post={o.post} k={k} />
            </Pressable>
          );
        }
        if (!body) return null;
        return (
          <StickerSlot key={`s${i}`} o={o} minTop={insets.top + 64} maxBottom={footerTop - 12} hidden={longHold || sheet || typing || !!answering} onHold={setHolding}>
            {body}
          </StickerSlot>
        );
      })}

      {/* Chrome */}
      <View style={[styles.chrome, { opacity: longHold ? 0 : 1 }]} pointerEvents={sheet ? 'none' : 'box-none'}>
      <Reanimated.View style={[styles.chrome, chromeFade]} pointerEvents="box-none">
        <LinearGradient colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0)']} style={[styles.topScrim, { height: insets.top + 108 }]} pointerEvents="none" />
        <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)']} style={styles.bottomScrim} pointerEvents="none" />

        <View style={[styles.bars, { top: insets.top + 8 }]} pointerEvents="none">
          {stories.map((s, i) => (
            <View key={s.id} style={styles.barTrack}>
              {i < idx && <View style={[styles.barFill, { width: '100%' }]} />}
              {i === idx && (
                <Animated.View style={[styles.barFill, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
              )}
            </View>
          ))}
        </View>

        <View style={[styles.header, { top: insets.top + 18 }]}>
          <View style={styles.headerAvatar}>
            <UserAvatar avatarUrl={group.user.avatar_url ?? undefined} size={31} name={group.user.full_name || group.user.username} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.username} numberOfLines={1}>{isMine ? 'Your story' : group.user.username}</Text>
            {group.user.is_verified && !isMine && <VerifiedBadge size={14} />}
            <Text style={styles.age}>{storyAge(story.created_at)}</Text>
            {story.audience === 'close_friends' && (
              <View style={styles.closeBadge} accessibilityLabel="Close friends">
                <Ionicons name="star" size={10} color="#fff" />
              </View>
            )}
          </View>
          {story.media_type === 'video' && (
            <Pressable style={styles.iconBtn} onPress={() => setMuted(m => !m)} accessibilityLabel={muted ? 'Unmute' : 'Mute'}>
              <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={22} color="#fff" />
            </Pressable>
          )}
          {!isMine && (
            <Pressable style={styles.iconBtn} onPress={openMore} accessibilityLabel="More options">
              <Ionicons name="ellipsis-horizontal" size={22} color="#fff" />
            </Pressable>
          )}
          <Pressable style={styles.iconBtn} onPress={onClose} accessibilityLabel="Close stories">
            <Ionicons name="close" size={22} color="#fff" />
          </Pressable>
        </View>

        {!!story.caption && (
          <Text style={[styles.caption, { bottom: H - footerTop + 10 }]} numberOfLines={3}>{story.caption}</Text>
        )}

        {isMine ? (
          <OwnFooter
            story={story}
            bottom={insets.bottom}
            onOpenViewers={() => setSheet(true)}
            onDelete={confirmDelete}
            onTop={setFooterTop}
          />
        ) : (
          <ReplyBar
            story={story}
            group={group}
            bottom={insets.bottom}
            onFocusChange={setTyping}
            onReact={emoji => setReaction(story.id, emoji)}
            onTop={setFooterTop}
          />
        )}
      </Reanimated.View>
      </View>

      {sheet && (
        <ViewersSheet
          story={story}
          progress={sheetP}
          onClose={() => setSheet(false)}
          onDelete={confirmDelete}
          onCloseViewer={onClose}
        />
      )}
      {answering && (
        <AnswerSheet
          storyId={story.id}
          prompt={answering.text || ''}
          color={answering.bg}
          to={group.user.username}
          onClose={() => setAnswering(null)}
        />
      )}
      {report && (
        <ReportModal
          target={{ type: report.type, id: report.id, displayName: report.type === 'story' ? `@${group.user.username}'s story` : group.user.username }}
          onClose={() => setReport(null)}
        />
      )}
    </View>
  );
}

/**
 * Places a live sticker at its x/y, kept between the header and the bottom controls (it may have
 * been dragged low in the composer, and screens differ). Touching it pauses the story.
 */
function StickerSlot({ o, minTop, maxBottom, hidden, onHold, children }: {
  o: StoryOverlay; minTop: number; maxBottom: number; hidden: boolean; onHold: (h: boolean) => void; children: React.ReactNode;
}) {
  const { W, H } = useSize();
  const lock = useContext(ScrollLockCtx);
  const [h, setH] = useState(() => stickerSize(o, W / 390)?.h ?? 100);
  const hold = (on: boolean) => { onHold(on); if (o.type === 'slider') lock(on); };
  const half = (h * (o.scale || 1)) / 2;
  const minC = minTop + half, maxC = maxBottom - half;
  const cy = maxC >= minC ? Math.min(maxC, Math.max(minC, o.y * H)) : (minC + maxC) / 2;
  return (
    <View
      pointerEvents={hidden ? 'none' : 'box-none'}
      style={{ position: 'absolute', left: 0, width: W, top: cy - h / 2, alignItems: 'center', opacity: hidden ? 0 : 1,
        transform: [{ translateX: (o.x - 0.5) * W }, { rotate: `${o.rotation || 0}deg` }, { scale: o.scale || 1 }] }}
    >
      <View
        onLayout={e => { const nh = e.nativeEvent.layout.height; if (Math.abs(nh - h) > 1) setH(nh); }}
        onTouchStart={() => hold(true)} onTouchEnd={() => hold(false)} onTouchCancel={() => hold(false)}
      >
        {children}
      </View>
    </View>
  );
}

/** Answer a question box: the card with a text field; the answer goes to the author's viewers sheet. */
function AnswerSheet({ storyId, prompt, color, to, onClose }: {
  storyId: string; prompt: string; color?: string; to: string; onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [kb, setKb] = useState(0);
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, damping: 16, stiffness: 240 }).start();
    if (Platform.OS !== 'android') return;
    // Edge-to-edge modal: lift above the keyboard ourselves (as the reply bar does)
    const show = Keyboard.addListener('keyboardDidShow', e => setKb(e.endCoordinates?.height || 0));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKb(0));
    return () => { show.remove(); hide.remove(); };
  }, []);
  const send = async () => {
    const t = text.trim();
    if (!t || state !== 'idle') return;
    setState('sending');
    const r: any = await apiClient.answerStoryQuestion(storyId, t).catch(() => null);
    if (r?.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setState('sent');
      Keyboard.dismiss();
      setTimeout(onClose, 900);
    } else {
      setState('idle');
      appAlert("Couldn't send", r?.error || 'Check your connection and try again.');
    }
  };
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[StyleSheet.absoluteFill, styles.answerWrap, { paddingTop: insets.top + 40, paddingBottom: kb ? kb + 16 : insets.bottom + 40 }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => { Keyboard.dismiss(); onClose(); }} accessibilityLabel="Close" />
      <Animated.View style={[styles.answerCard, { opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }]}>
        <View style={[styles.answerHead, { backgroundColor: color || QUESTION_COLORS[0] }]}>
          <Text style={styles.answerPrompt} numberOfLines={3}>{prompt}</Text>
        </View>
        {state === 'sent' ? (
          <View style={styles.answerSent}>
            <Ionicons name="checkmark-circle" size={22} color="#1DB954" />
            <Text style={styles.answerSentText}>Imetumwa kwa @{to}</Text>
          </View>
        ) : (
          <View style={styles.answerRow}>
            <TextInput
              autoFocus value={text} onChangeText={setText} placeholder="Andika jibu…" placeholderTextColor="#8E8E93"
              style={styles.answerInput} multiline maxLength={300}
            />
            <Pressable onPress={send} disabled={!text.trim() || state !== 'idle'} style={[styles.answerSend, (!text.trim() || state !== 'idle') && { opacity: 0.4 }]}
              accessibilityLabel="Send answer">
              {state === 'sending' ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="arrow-up" size={20} color="#fff" />}
            </Pressable>
          </View>
        )}
      </Animated.View>
      <Text style={styles.answerNote}>@{to} ndiye pekee atakayeona jibu lako</Text>
    </KeyboardAvoidingView>
  );
}

function StoryVideo({ url, poster, playing, muted, onReady }: {
  url: string; poster?: string | null; playing: boolean; muted: boolean; onReady: (ms: number) => void;
}) {
  const [shown, setShown] = useState(false);
  const player = useVideoPlayer(url, p => { p.loop = false; p.muted = muted; });
  const readyRef = useRef(false);

  useEffect(() => {
    const subs = [
      player.addListener('statusChange', ({ status }) => {
        if (status === 'readyToPlay' && !readyRef.current) { readyRef.current = true; onReady(Math.round((player.duration || 0) * 1000)); }
        if (status === 'error' && !readyRef.current) { readyRef.current = true; onReady(0); }
      }),
      player.addListener('playingChange', ({ isPlaying }) => { if (isPlaying) setShown(true); }),
    ];
    return () => subs.forEach(s => s.remove());
  }, [player]);

  useEffect(() => { try { if (playing) player.play(); else player.pause(); } catch {} }, [playing, player]);
  useEffect(() => { player.muted = muted; }, [muted, player]);

  return (
    <View style={StyleSheet.absoluteFill}>
      {!!poster && !shown && <Image source={{ uri: poster }} style={StyleSheet.absoluteFill} resizeMode="cover" />}
      <VideoView player={player} style={[StyleSheet.absoluteFill, { opacity: shown ? 1 : 0 }]} contentFit="cover" nativeControls={false} />
    </View>
  );
}

/** Reply box + quick reactions; both arrive in the author's DMs. */
function ReplyBar({ story, group, bottom, onFocusChange, onReact, onTop }: {
  story: Story; group: StoryGroup; bottom: number; onFocusChange: (f: boolean) => void; onReact: (e: string) => void;
  onTop: (y: number) => void;
}) {
  const { H } = useSize();
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  // Android: the viewer is full-screen (edge-to-edge), so lift the reply bar above the keyboard ourselves
  const [kb, setKb] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', e => setKb(e.endCoordinates?.height || 0));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKb(0));
    return () => { show.remove(); hide.remove(); };
  }, []);
  const [sent, setSent] = useState<string | null>(null);
  const burst = useRef(new Animated.Value(0)).current;
  const [burstEmoji, setBurstEmoji] = useState('❤️');
  const media = story.media_type === 'image' ? story.media_url : story.thumbnail_url;

  const sendDM = async (content: string) => {
    try {
      const conv: any = await apiClient.startDMConversation(group.user.id);
      const id = conv?.data?.id;
      if (!id) throw new Error(conv?.error || 'Could not open chat');
      const res: any = await apiClient.sendDM(id, content, media || undefined, media ? 'image' : undefined);
      if (!res.success) throw new Error(res.error);
      setSent('Imetumwa ✓');
    } catch (e: any) {
      setSent(e?.message || 'Haikutumwa');
    }
    setTimeout(() => setSent(null), 1800);
  };

  const react = (emoji: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBurstEmoji(emoji);
    burst.setValue(0);
    Animated.sequence([
      Animated.spring(burst, { toValue: 1, useNativeDriver: true, damping: 7, stiffness: 260 }),
      Animated.timing(burst, { toValue: 2, duration: 350, delay: 250, useNativeDriver: true }),
    ]).start();
    onReact(emoji);
    sendDM(`${emoji} reacted to your story`);
    Keyboard.dismiss();
  };

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    setText('');
    Keyboard.dismiss();
    sendDM(`Replied to your story: ${t}`);
  };

  // Share via the system sheet (no server); the story pauses while it is open
  const share = async () => {
    onFocusChange(true);
    try {
      await Share.share({ message: `Check out @${group.user.username}'s story on KChat\n${STORY_SHARE(story.id)}` });
    } catch {}
    onFocusChange(focused);
  };

  const setFocus = (f: boolean) => { setFocused(f); onFocusChange(f); };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.footerWrap, { bottom: 0, paddingBottom: kb > 0 ? kb + 8 : Math.max(bottom + 6, 14) }]}
      onLayout={e => onTop(e.nativeEvent.layout.y)}
    >
      {!!sent && <Text style={styles.sent}>{sent}</Text>}
      <View style={styles.reactRow}>
        {REACTIONS.map(e => (
          <Pressable key={e} onPress={() => react(e)} style={({ pressed }) => [styles.reactBtn, pressed && { transform: [{ scale: 0.9 }] }]} accessibilityLabel={`React ${e}`}>
            <Text style={styles.reactEmoji} allowFontScaling={false}>{e}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.footer}>
        <View style={styles.replyPill}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={`Jibu ${group.user.username}…`}
            placeholderTextColor="rgba(255,255,255,0.75)"
            style={styles.replyInput}
            onFocus={() => setFocus(true)}
            onBlur={() => setFocus(false)}
            onSubmitEditing={submit}
            returnKeyType="send"
            maxLength={500}
          />
        </View>
        {text.trim() ? (
          <Pressable style={styles.footerBtn} onPress={submit} accessibilityLabel="Send reply">
            <Ionicons name="send" size={24} color="#fff" />
          </Pressable>
        ) : (
          <Pressable style={styles.footerBtn} onPress={() => react('❤️')} accessibilityLabel="Like story">
            <Ionicons name={story.my_reaction ? 'heart' : 'heart-outline'} size={26} color={story.my_reaction ? '#FF3040' : '#fff'} />
          </Pressable>
        )}
        <Pressable style={styles.footerBtn} onPress={share} accessibilityLabel="Share story">
          <Ionicons name="paper-plane-outline" size={24} color="#fff" />
        </Pressable>
      </View>
      <Animated.Text
        pointerEvents="none"
        style={[styles.burst, {
          opacity: burst.interpolate({ inputRange: [0, 0.3, 1, 2], outputRange: [0, 1, 1, 0] }),
          transform: [
            { translateY: burst.interpolate({ inputRange: [0, 1, 2], outputRange: [0, -H * 0.3, -H * 0.42] }) },
            { scale: burst.interpolate({ inputRange: [0, 1, 2], outputRange: [0.3, 1.6, 1.2] }) },
          ],
        }]}
      >{burstEmoji}</Animated.Text>
    </KeyboardAvoidingView>
  );
}

function OwnFooter({ story, bottom, onOpenViewers, onDelete, onTop }: {
  story: Story; bottom: number; onOpenViewers: () => void; onDelete: () => void; onTop: (y: number) => void;
}) {
  return (
    <View style={[styles.footer, { position: 'absolute', left: 0, right: 0, bottom: Math.max(bottom + 8, 14) }]} onLayout={e => onTop(e.nativeEvent.layout.y)}>
      <Pressable style={styles.seenBtn} onPress={onOpenViewers} accessibilityLabel="See who viewed your story">
        <Ionicons name="eye-outline" size={20} color="#fff" />
        <Text style={styles.seenText} numberOfLines={1}>Imeonekana na {story.view_count ?? 0}</Text>
      </Pressable>
      <View style={{ flex: 1 }} />
      <Pressable style={styles.footerBtn} onPress={onDelete} accessibilityLabel="Delete story">
        <Ionicons name="trash-outline" size={22} color="#fff" />
      </Pressable>
    </View>
  );
}

function ViewersSheet({ story, progress, onClose, onDelete, onCloseViewer }: {
  story: Story; progress: SharedValue<number>; onClose: () => void; onDelete: () => void; onCloseViewer: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<any[] | null>(null);
  const [count, setCount] = useState(story.view_count ?? 0);
  const [responses, setResponses] = useState<any[]>([]);
  const [sliderStats, setSliderStats] = useState<{ avg: number | null; count: number } | null>(null);
  const sliderEmoji = story.overlays?.find(o => o.type === 'slider')?.emoji || '😍';
  const [sort, setSort] = useState<'reactions' | 'recent'>('reactions');
  const [opening, setOpening] = useState<string | null>(null);
  const canMessage = !!storyNav.current;

  useEffect(() => {
    progress.value = withSpring(1, { damping: 24, stiffness: 220 });
    apiClient.getStoryViewers(story.id).then((r: any) => {
      if (r.success) {
        setRows(r.data.viewers || []); setCount(r.data.count ?? 0);
        setResponses(r.data.responses || []); setSliderStats(r.data.slider || null);
      } else setRows([]);
    }).catch(() => setRows([]));
  }, [story.id]);

  // Server returns reactors first; "Mpya kwanza" re-sorts by most recent view
  const shown = useMemo(() => {
    if (!rows || sort === 'reactions') return rows;
    return [...rows].sort((a, b) => new Date(b.viewed_at).getTime() - new Date(a.viewed_at).getTime());
  }, [rows, sort]);

  const close = () => {
    progress.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.quad) }, done => { if (done) runOnJS(onClose)(); });
  };

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(progress.value, [0, 1], [SHEET_H + 40, 0], CLAMP) }],
  }));

  const message = async (p: any) => {
    const nav = storyNav.current;
    if (!p?.id || !nav || opening) return;
    setOpening(p.id);
    try {
      const res: any = await apiClient.startDMConversation(p.id);
      if (!res?.success || !res.data?.id) throw new Error(res?.error || 'Could not open chat');
      onCloseViewer();
      nav.navigate('Feed', {
        screen: 'DMConversation',
        params: { conversationId: res.data.id, participantName: p.full_name || p.username, participantUsername: p.username, participantAvatar: p.avatar_url },
      });
    } catch (e: any) {
      appAlert('Could not open chat', e?.message || 'Try again.');
    } finally {
      setOpening(null);
    }
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close viewers" />
      <Reanimated.View style={[styles.sheet, { paddingBottom: insets.bottom }, sheetStyle]}>
        <View style={styles.grabber} />
        <View style={styles.sheetHead}>
          <Ionicons name="eye-outline" size={20} color="#fff" />
          <Text style={styles.sheetTitle} numberOfLines={1}>Imeonekana na {count}</Text>
          <Pressable style={styles.sheetDelete} onPress={onDelete} accessibilityLabel="Delete story">
            <Ionicons name="trash-outline" size={18} color="#fff" />
          </Pressable>
        </View>
        <View style={styles.chips}>
          {([['reactions', 'Reactions kwanza'], ['recent', 'Mpya kwanza']] as const).map(([key, label]) => {
            const on = sort === key;
            return (
              <Pressable key={key} onPress={() => setSort(key)} style={[styles.chip, on && styles.chipOn]}
                accessibilityRole="button" accessibilityState={{ selected: on }}>
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
        {shown === null ? (
          <ActivityIndicator color="#fff" style={{ marginTop: 24 }} />
        ) : shown.length === 0 && !responses.length ? (
          <Text style={styles.sheetEmpty}>Bado hakuna aliyeona. Shiriki zaidi!</Text>
        ) : (
          <FlatList
            data={shown}
            keyExtractor={(r, i) => r.profiles?.id || String(i)}
            contentContainerStyle={{ paddingHorizontal: 8 }}
            ListHeaderComponent={(responses.length || sliderStats) ? (
              <View style={{ paddingBottom: 6 }}>
                {!!sliderStats && (
                  <View style={styles.sliderSum} accessibilityLabel={`Slider average ${Math.round((sliderStats.avg ?? 0) * 100)} percent`}>
                    <Text style={{ fontSize: 22 }}>{sliderEmoji}</Text>
                    <View style={styles.sliderSumTrack}>
                      <View style={[styles.sliderSumFill, { width: `${Math.round((sliderStats.avg ?? 0) * 100)}%` }]} />
                    </View>
                    <Text style={styles.sliderSumText}>{sliderStats.count ? `${Math.round((sliderStats.avg ?? 0) * 100)}% · ${sliderStats.count}` : 'Bado'}</Text>
                  </View>
                )}
                {responses.length > 0 && (
                  <>
                    <Text style={styles.respTitle}>Majibu · {responses.length}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 12 }}>
                      {responses.map((a: any) => {
                        const p = a.profiles;
                        return (
                          <Pressable key={a.id} onPress={() => message(p)} disabled={!canMessage}
                            style={({ pressed }) => [styles.respCard, pressed && { transform: [{ scale: 0.97 }] }]}
                            accessibilityLabel={`Answer from ${p?.username}: ${a.answer}. Tap to reply.`}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <UserAvatar avatarUrl={p?.avatar_url} size={22} name={p?.full_name || p?.username} />
                              <Text style={styles.respName} numberOfLines={1}>{p?.username}</Text>
                            </View>
                            <Text style={styles.respText} numberOfLines={4}>{a.answer}</Text>
                            {canMessage && <Text style={styles.respReply}>{opening === p?.id ? 'Inafungua…' : 'Jibu kwa DM'}</Text>}
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </>
                )}
              </View>
            ) : null}
            renderItem={({ item }) => {
              const p = item.profiles;
              const name = p?.full_name || p?.username;
              return (
                <View style={styles.viewerRow}>
                  <UserAvatar avatarUrl={p?.avatar_url} size={44} name={name} />
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text style={styles.viewerName} numberOfLines={1}>{name}</Text>
                    <Text style={styles.viewerSub} numberOfLines={1}>@{p?.username} · {storyAge(item.viewed_at)}</Text>
                  </View>
                  {item.slide !== undefined && (
                    <View style={styles.viewerSlide}>
                      <Text style={{ fontSize: 15 }}>{sliderEmoji}</Text>
                      <Text style={styles.viewerSlideText}>{Math.round(item.slide * 100)}%</Text>
                    </View>
                  )}
                  {!!item.reaction && <Text style={{ fontSize: 22 }}>{item.reaction}</Text>}
                  {canMessage && !!p?.id && (
                    <Pressable style={styles.viewerMsg} onPress={() => message(p)} accessibilityLabel={`Message ${name}`}>
                      {opening === p.id
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <Ionicons name="paper-plane-outline" size={20} color="#fff" />}
                    </Pressable>
                  )}
                </View>
              );
            }}
          />
        )}
      </Reanimated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000' },
  page: { width: W, height: H, backgroundColor: '#000', overflow: 'hidden' },
  media: { position: 'absolute', overflow: 'hidden', backgroundColor: '#111' },
  mediaInner: { position: 'absolute', width: W, height: H },
  chrome: { ...StyleSheet.absoluteFillObject },
  topScrim: { position: 'absolute', left: 0, right: 0, top: 0 },
  bottomScrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 260 },
  bars: { position: 'absolute', left: 8, right: 8, flexDirection: 'row', gap: 3 },
  barTrack: { flex: 1, height: 2.5, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)', overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#fff', borderRadius: 2 },
  header: { position: 'absolute', left: 12, right: 4, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  headerText: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
  username: { color: '#fff', fontSize: 14, fontWeight: '600', flexShrink: 1, textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 4 },
  age: { color: 'rgba(255,255,255,0.75)', fontSize: 14, textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 4 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  caption: { position: 'absolute', left: 20, right: 20, color: '#fff', fontSize: 15, lineHeight: 21, textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 6 },
  footerWrap: { position: 'absolute', left: 0, right: 0 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 12, paddingRight: 8 },
  replyPill: { flex: 1, minWidth: 0, height: 46, borderRadius: 23, borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)', justifyContent: 'center', paddingHorizontal: 16 },
  replyInput: { color: '#fff', fontSize: 15, paddingVertical: 0 },
  footerBtn: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  reactRow: { flexDirection: 'row', justifyContent: 'center', gap: REACT_GAP, marginBottom: H < 700 ? 10 : 16, paddingHorizontal: 16 },
  reactBtn: { width: REACT_SIZE, height: REACT_SIZE, borderRadius: REACT_SIZE / 2, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  reactEmoji: { fontSize: Math.round(REACT_SIZE / 2) },
  sent: { alignSelf: 'center', color: '#fff', fontWeight: '600', marginBottom: 8, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, overflow: 'hidden' },
  burst: { position: 'absolute', alignSelf: 'center', bottom: 70, fontSize: 64 },
  seenBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 14, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.45)', flexShrink: 1, minWidth: 0 },
  seenText: { color: '#fff', fontWeight: '600', fontSize: 14, flexShrink: 1 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, height: SHEET_H, backgroundColor: '#111', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, borderColor: '#FFFFFF14' },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: '#3A3A3C', marginTop: 10 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10 },
  sheetTitle: { flex: 1, color: '#fff', fontSize: 19, fontFamily: 'SpaceGrotesk_700Bold' },
  sheetDelete: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1C1C1E', alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingBottom: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#1C1C1E' },
  chipOn: { backgroundColor: '#FFFFFF' },
  chipText: { color: '#AEAEB2', fontSize: 13, fontWeight: '600' },
  chipTextOn: { color: '#000000' },
  viewerMsg: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sheetEmpty: { color: '#8E8E93', textAlign: 'center', marginTop: 24, marginBottom: 24, fontSize: 15 },
  viewerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 9 },
  viewerName: { color: '#fff', fontSize: 15, fontWeight: '600' },
  closeBadge: { width: 18, height: 18, borderRadius: 9, backgroundColor: CLOSE_RING[0], alignItems: 'center', justifyContent: 'center' },
  answerWrap: { backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  answerCard: { width: '100%', maxWidth: 340, backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden' },
  answerHead: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 16 },
  answerPrompt: { color: '#fff', fontSize: 19, lineHeight: 24, fontWeight: '800', textAlign: 'center' },
  answerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 10 },
  answerInput: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 14, backgroundColor: '#F1F1F3', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12, color: '#111', fontSize: 15 },
  answerSend: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  answerSent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 64 },
  answerSentText: { color: '#111', fontSize: 15, fontWeight: '700' },
  answerNote: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 12, fontWeight: '600' },
  sliderSum: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 12, marginBottom: 8, padding: 12, borderRadius: 16, backgroundColor: '#1C1C1E' },
  sliderSumTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: '#3A3A3C', overflow: 'hidden' },
  sliderSumFill: { height: '100%', borderRadius: 3, backgroundColor: '#FF5A5F' },
  sliderSumText: { color: '#fff', fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  respTitle: { color: '#AEAEB2', fontSize: 12, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase', paddingHorizontal: 14, paddingTop: 4, paddingBottom: 8 },
  respCard: { width: 188, minHeight: 104, borderRadius: 16, backgroundColor: '#1C1C1E', padding: 12, gap: 8 },
  respName: { color: '#fff', fontSize: 13, fontWeight: '700', flexShrink: 1 },
  respText: { color: '#fff', fontSize: 14, lineHeight: 19, flex: 1 },
  respReply: { color: '#8E8E93', fontSize: 12, fontWeight: '600' },
  viewerSlide: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, height: 26, borderRadius: 13, backgroundColor: '#1C1C1E' },
  viewerSlideText: { color: '#fff', fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
  viewerSub: { color: '#8E8E93', fontSize: 13 },
});
