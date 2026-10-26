// Inline feed video: plays silently when it is the most visible video on screen,
// pauses when scrolled away, shows a poster until the first frame, mute toggle + time left.
import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, Image, Pressable, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NavigationContext } from '@react-navigation/native';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import {
  nextVideoId, registerVideo, setVideoEnabled, isMuted, setMuted, onMuteChange, getPosition, setPosition,
} from './videoPlayback';

const fmt = (s: number) => {
  const t = Math.max(0, Math.round(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};

function useScreenFocused() {
  const nav = useContext(NavigationContext);
  const [focused, setFocused] = useState(() => (nav ? nav.isFocused() : true));
  useEffect(() => {
    if (!nav) return;
    const a = nav.addListener('focus', () => setFocused(true));
    const b = nav.addListener('blur', () => setFocused(false));
    return () => { a(); b(); };
  }, [nav]);
  return focused;
}

export function FeedVideo({
  url, thumbnailUrl, width, height, durationSeconds, onPress, onWatched,
}: {
  url: string;
  thumbnailUrl?: string | null;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
  onPress: () => void;
  onWatched?: () => void;
}) {
  const T = useTheme();
  const idRef = useRef(nextVideoId());
  const viewRef = useRef<View>(null);
  const focused = useScreenFocused();
  const [active, setActiveState] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [muted, setMutedState] = useState(isMuted());
  const [left, setLeft] = useState<number | null>(durationSeconds ?? null);
  const [poster, setPoster] = useState<string | null>(thumbnailUrl ?? null);
  const [ratio, setRatio] = useState(width && height ? width / height : 0.8);
  const watchedRef = useRef(false);

  // Poster: use the stored thumbnail, or generate one.
  useEffect(() => {
    if (thumbnailUrl) return;
    VideoThumbnails.getThumbnailAsync(url, { time: 0 })
      .then(t => { setPoster(t.uri); if (!width && t.width && t.height) setRatio(t.width / t.height); })
      .catch(() => {});
  }, [url, thumbnailUrl]);

  useEffect(() => registerVideo(idRef.current, { ref: viewRef, enabled: focused, setActive: setActiveState }), []);
  useEffect(() => { setVideoEnabled(idRef.current, focused); }, [focused]);
  useEffect(() => onMuteChange(setMutedState), []);

  // Only the active video holds a player, so scrolling a long feed never loads many videos at once.
  const player = useVideoPlayer(active ? url : null, p => {
    p.loop = true;
    p.muted = isMuted();
    p.timeUpdateEventInterval = 0.5;
    const start = getPosition(url);
    if (start > 0) p.currentTime = start;
    p.play();
  });

  useEffect(() => {
    if (!active) { setShowVideo(false); return; }
    const subs = [
      player.addListener('playingChange', ({ isPlaying }) => { if (isPlaying) setShowVideo(true); }),
      player.addListener('timeUpdate', ({ currentTime }) => {
        setPosition(url, currentTime);
        if (player.duration > 0) setLeft(player.duration - currentTime);
        if (!watchedRef.current && currentTime >= 2) { watchedRef.current = true; onWatched?.(); }
      }),
    ];
    return () => {
      try { setPosition(url, player.currentTime); } catch {}
      subs.forEach(s => s.remove());
    };
  }, [active, player]);

  useEffect(() => { if (active) player.muted = muted; }, [muted, active, player]);

  const clamped = Math.min(Math.max(ratio, 0.8), 1.78); // tall videos show as 4:5 in the feed

  return (
    <Pressable
      ref={viewRef}
      onPress={onPress}
      style={[styles.box, { aspectRatio: clamped, backgroundColor: T.surface }]}
      collapsable={false}
    >
      {poster ? <Image source={{ uri: poster }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
      {active && (
        <VideoView
          player={player}
          style={[StyleSheet.absoluteFill, { opacity: showVideo ? 1 : 0 }]}
          contentFit="cover"
          nativeControls={false}
          allowsFullscreen={false}
          allowsPictureInPicture={false}
        />
      )}
      {!active && (
        <View style={styles.center} pointerEvents="none">
          <View style={styles.playBadge}>
            <Ionicons name="play" size={22} color="#fff" style={{ marginLeft: 3 }} />
          </View>
        </View>
      )}
      {left != null && left > 0 && (
        <View style={[styles.pill, styles.timePill]} pointerEvents="none">
          <Text style={styles.pillText}>{fmt(left)}</Text>
        </View>
      )}
      <TouchableOpacity
        style={[styles.pill, styles.mutePill]}
        onPress={() => setMuted(!muted)}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityLabel={muted ? 'Unmute video' : 'Mute video'}
      >
        <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={15} color="#fff" />
      </TouchableOpacity>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: { width: '100%', borderRadius: 12, overflow: 'hidden', marginTop: 4 },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  playBadge: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  pill: {
    position: 'absolute', bottom: 10, backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4,
  },
  timePill: { left: 10 },
  mutePill: { right: 10, paddingHorizontal: 7, paddingVertical: 6, borderRadius: 16 },
  pillText: { color: '#fff', fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
