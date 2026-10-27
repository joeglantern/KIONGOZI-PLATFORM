// Full-screen story viewer.
// Tap right/left = next/previous, hold = pause, swipe down = close, swipe sideways = next/previous person.
// Replies and reactions go to the author as DMs. Your own stories show who has seen them.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, Image, Modal, Pressable, StyleSheet, Animated, Dimensions, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator, FlatList, Alert, Keyboard, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Reanimated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, interpolate, Extrapolation, runOnJS, Easing } from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useStoryStore, StoryGroup, Story } from '../../stores/storyStore';
import { useAuthStore } from '../../stores/authStore';
import apiClient from '../../utils/apiClient';
import { setFeedPaused } from '../social/videoPlayback';
import { UserAvatar } from '../social/UserAvatar';
import { VerifiedBadge } from '../social/VerifiedBadge';
import { StoryBackground, StoryText, StoryOverlays, POLL_H } from './StoryParts';
import { PollCard, POLL_W } from './PollCard';
import { REACTIONS, storyAge } from './storyAssets';

const { width: W, height: H } = Dimensions.get('window');
const IMAGE_MS = 5000;
const textMs = (t?: string | null) => Math.min(10000, 5000 + (t?.length ?? 0) * 40);

export function StoryViewer() {
  const viewer = useStoryStore(s => s.viewer);
  const closeViewer = useStoryStore(s => s.closeViewer);
  const visible = !!viewer;

  useEffect(() => { setFeedPaused('stories', visible); }, [visible]);

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent onRequestClose={closeViewer}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        {viewer && <ViewerBody groups={viewer.groups} startIndex={viewer.index} onClose={closeViewer} />}
      </GestureHandlerRootView>
    </Modal>
  );
}

function ViewerBody({ groups, startIndex, onClose }: { groups: StoryGroup[]; startIndex: number; onClose: () => void }) {
  const listRef = useRef<FlatList>(null);
  const [page, setPage] = useState(Math.max(0, startIndex));
  const scrollX = useRef(new Animated.Value(startIndex * W)).current;
  const drag = useSharedValue(0); // swipe-down distance, driven on the UI thread

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
        <Animated.FlatList
          ref={listRef as any}
          data={groups}
          horizontal
          pagingEnabled
          bounces={false}
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
      </Reanimated.View>
      </GestureDetector>
    </Reanimated.View>
  );
}

function GroupPage({ group, active, onPrevGroup, onNextGroup, onClose }: {
  group: StoryGroup; active: boolean; onPrevGroup: () => void; onNextGroup: () => void; onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { markSeen, setReaction, removeStory, setPoll } = useStoryStore();
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
  const [videoMs, setVideoMs] = useState<number | null>(null);
  const paused = !active || holding || typing || sheet || !ready;

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
  useEffect(() => { if (!active) setTyping(false); }, [active]);

  if (!story) return null;

  const onTap = (x: number) => (x < W * 0.3 ? prev() : next());

  return (
    <View style={styles.page}>
      {/* Media */}
      <View style={styles.media}>
        {story.media_type === 'text' && (
          <>
            <StoryBackground bg={story.bg} />
            <StoryText text={story.text_content || ''} color={story.text_color} font={story.font} bg={story.bg} />
          </>
        )}
        {story.media_type === 'image' && !!story.media_url && (
          <Image source={{ uri: story.media_url }} style={StyleSheet.absoluteFill} resizeMode="cover"
            onLoad={() => setReady(true)} onError={() => setReady(true)} />
        )}
        {story.media_type === 'video' && !!story.media_url && (
          <StoryVideo
            key={story.id}
            url={story.media_url}
            poster={story.thumbnail_url}
            playing={!paused || (!ready && active)}
            muted={muted}
            onReady={ms => { if (ms > 0) setVideoMs(Math.min(60000, ms)); setReady(true); }}
          />
        )}
        <StoryOverlays overlays={story.overlays} width={W} height={H} skipPolls />
        {!ready && active && <ActivityIndicator style={StyleSheet.absoluteFill} color="#fff" />}
      </View>

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
        return (
          <View
            style={{ position: 'absolute', left: p.x * W - (POLL_W * k) / 2, top: p.y * H - (POLL_H * k) / 2, transform: [{ rotate: `${p.rotation || 0}deg` }, { scale: p.scale || 1 }], opacity: longHold ? 0 : 1 }}
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

      {/* Chrome */}
      <View style={[styles.chrome, { opacity: longHold ? 0 : 1 }]} pointerEvents="box-none">
        <LinearGradient colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0)']} style={[styles.topScrim, { height: insets.top + 110 }]} pointerEvents="none" />
        <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.6)']} style={styles.bottomScrim} pointerEvents="none" />

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
          <UserAvatar avatarUrl={group.user.avatar_url ?? undefined} size={34} />
          <View style={styles.headerText}>
            <Text style={styles.username} numberOfLines={1}>{isMine ? 'Your story' : group.user.username}</Text>
            {group.user.is_verified && !isMine && <VerifiedBadge size={14} />}
            <Text style={styles.age}>{storyAge(story.created_at)}</Text>
          </View>
          {story.media_type === 'video' && (
            <Pressable style={styles.iconBtn} onPress={() => setMuted(m => !m)} accessibilityLabel={muted ? 'Unmute' : 'Mute'}>
              <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={22} color="#fff" />
            </Pressable>
          )}
          <Pressable style={styles.iconBtn} onPress={onClose} accessibilityLabel="Close stories">
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
        </View>

        {!!story.caption && (
          <Text style={[styles.caption, { bottom: insets.bottom + 86 }]} numberOfLines={3}>{story.caption}</Text>
        )}

        {isMine ? (
          <OwnFooter
            story={story}
            bottom={insets.bottom}
            onOpenViewers={() => setSheet(true)}
            onDelete={() => {
              setHolding(true);
              Alert.alert('Delete this story?', 'It will be removed for everyone.', [
                { text: 'Cancel', style: 'cancel', onPress: () => setHolding(false) },
                {
                  text: 'Delete', style: 'destructive', onPress: async () => {
                    setHolding(false);
                    const res: any = await apiClient.deleteStory(story.id);
                    if (res.success) {
                      if (stories.length === 1) onClose();
                      else if (idx === stories.length - 1) setIdx(i => i - 1);
                      removeStory(story.id);
                    } else Alert.alert('Could not delete', res.error || 'Try again.');
                  },
                },
              ]);
            }}
          />
        ) : (
          <ReplyBar
            story={story}
            group={group}
            bottom={insets.bottom}
            onFocusChange={setTyping}
            onReact={emoji => setReaction(story.id, emoji)}
          />
        )}
      </View>

      {sheet && <ViewersSheet story={story} onClose={() => setSheet(false)} />}
    </View>
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
function ReplyBar({ story, group, bottom, onFocusChange, onReact }: {
  story: Story; group: StoryGroup; bottom: number; onFocusChange: (f: boolean) => void; onReact: (e: string) => void;
}) {
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
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

  const setFocus = (f: boolean) => { setFocused(f); onFocusChange(f); };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.footerWrap, { bottom: 0, paddingBottom: bottom + 12 }]}>
      {focused && (
        <View style={styles.reactRow}>
          {REACTIONS.map(e => (
            <Pressable key={e} onPress={() => react(e)} style={({ pressed }) => [styles.reactBtn, pressed && { transform: [{ scale: 0.9 }] }]} accessibilityLabel={`React ${e}`}>
              <Text style={styles.reactEmoji}>{e}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {!!sent && <Text style={styles.sent}>{sent}</Text>}
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
            <Ionicons name={story.my_reaction ? 'heart' : 'heart-outline'} size={28} color={story.my_reaction ? '#FF3040' : '#fff'} />
          </Pressable>
        )}
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

function OwnFooter({ story, bottom, onOpenViewers, onDelete }: { story: Story; bottom: number; onOpenViewers: () => void; onDelete: () => void }) {
  return (
    <View style={[styles.footer, { position: 'absolute', left: 12, right: 12, bottom: bottom + 14 }]}>
      <Pressable style={styles.seenBtn} onPress={onOpenViewers} accessibilityLabel="See who viewed your story">
        <Ionicons name="eye-outline" size={20} color="#fff" />
        <Text style={styles.seenText}>Imeonekana na {story.view_count ?? 0}</Text>
      </Pressable>
      <View style={{ flex: 1 }} />
      <Pressable style={styles.footerBtn} onPress={onDelete} accessibilityLabel="Delete story">
        <Ionicons name="trash-outline" size={22} color="#fff" />
      </Pressable>
    </View>
  );
}

function ViewersSheet({ story, onClose }: { story: Story; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<any[] | null>(null);
  const [count, setCount] = useState(story.view_count ?? 0);
  const slide = useRef(new Animated.Value(H)).current;

  useEffect(() => {
    Animated.spring(slide, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 220 }).start();
    apiClient.getStoryViewers(story.id).then((r: any) => {
      if (r.success) { setRows(r.data.viewers || []); setCount(r.data.count ?? 0); } else setRows([]);
    }).catch(() => setRows([]));
  }, [story.id]);

  const close = () => Animated.timing(slide, { toValue: H, duration: 200, useNativeDriver: true }).start(onClose);

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]} onPress={close} accessibilityLabel="Close viewers" />
      <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + 12, transform: [{ translateY: slide }] }]}>
        <View style={styles.grabber} />
        <View style={styles.sheetHead}>
          <Ionicons name="eye-outline" size={20} color="#fff" />
          <Text style={styles.sheetTitle}>Imeonekana na {count}</Text>
        </View>
        {rows === null ? (
          <ActivityIndicator color="#fff" style={{ marginTop: 24 }} />
        ) : rows.length === 0 ? (
          <Text style={styles.sheetEmpty}>Bado hakuna aliyeona. Shiriki zaidi!</Text>
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(r, i) => r.profiles?.id || String(i)}
            renderItem={({ item }) => (
              <View style={styles.viewerRow}>
                <UserAvatar avatarUrl={item.profiles?.avatar_url} size={42} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.viewerName} numberOfLines={1}>{item.profiles?.full_name || item.profiles?.username}</Text>
                  <Text style={styles.viewerSub} numberOfLines={1}>@{item.profiles?.username} · {storyAge(item.viewed_at)}</Text>
                </View>
                {!!item.reaction && <Text style={{ fontSize: 22 }}>{item.reaction}</Text>}
              </View>
            )}
          />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000' },
  page: { width: W, height: H, backgroundColor: '#000', overflow: 'hidden' },
  media: { ...StyleSheet.absoluteFillObject, borderRadius: 12, overflow: 'hidden', backgroundColor: '#111' },
  chrome: { ...StyleSheet.absoluteFillObject },
  topScrim: { position: 'absolute', left: 0, right: 0, top: 0 },
  bottomScrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 220 },
  bars: { position: 'absolute', left: 8, right: 8, flexDirection: 'row', gap: 3 },
  barTrack: { flex: 1, height: 2.5, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)', overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#fff', borderRadius: 2 },
  header: { position: 'absolute', left: 12, right: 4, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerText: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
  username: { color: '#fff', fontSize: 14, fontWeight: '700', flexShrink: 1, textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 4 },
  age: { color: 'rgba(255,255,255,0.8)', fontSize: 13, textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 4 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  caption: { position: 'absolute', left: 20, right: 20, color: '#fff', fontSize: 15, lineHeight: 21, textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 6 },
  footerWrap: { position: 'absolute', left: 0, right: 0 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12 },
  replyPill: { flex: 1, height: 46, borderRadius: 23, borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)', justifyContent: 'center', paddingHorizontal: 16 },
  replyInput: { color: '#fff', fontSize: 15, paddingVertical: 0 },
  footerBtn: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  reactRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 14 },
  reactBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  reactEmoji: { fontSize: 26 },
  sent: { alignSelf: 'center', color: '#fff', fontWeight: '600', marginBottom: 8, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, overflow: 'hidden' },
  burst: { position: 'absolute', alignSelf: 'center', bottom: 70, fontSize: 64 },
  seenBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 14, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.45)' },
  seenText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: H * 0.62, backgroundColor: '#111', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, borderColor: '#FFFFFF14' },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: '#3A3A3C', marginTop: 10 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10 },
  sheetTitle: { color: '#fff', fontSize: 18, fontWeight: '700', fontFamily: 'SpaceGrotesk_700Bold' },
  sheetEmpty: { color: '#8E8E93', textAlign: 'center', marginTop: 24, marginBottom: 24, fontSize: 15 },
  viewerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 9 },
  viewerName: { color: '#fff', fontSize: 15, fontWeight: '600' },
  viewerSub: { color: '#8E8E93', fontSize: 13, marginTop: 2 },
});
