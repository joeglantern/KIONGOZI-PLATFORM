// Kiongozi AI orb: a short seamless loop (generated keyframe → Higgsfield animation),
// shown inside a circle so it looks the same on any theme. A still poster shows until it plays.
import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';

const LOOP = require('../../../assets/ai/orb.mp4');
const POSTER = require('../../../assets/ai/orb.png');

export function OrbVideo({ size = 56, playing = true }: { size?: number; playing?: boolean }) {
  const [ready, setReady] = useState(false);
  const player = useVideoPlayer(LOOP, p => { p.loop = true; p.muted = true; p.play(); });

  useEffect(() => {
    const sub = player.addListener('playingChange', ({ isPlaying }) => { if (isPlaying) setReady(true); });
    return () => sub.remove();
  }, [player]);

  useEffect(() => { try { if (playing) player.play(); else player.pause(); } catch {} }, [playing, player]);

  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
      <Image source={POSTER} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <VideoView
        player={player}
        style={[StyleSheet.absoluteFill, { opacity: ready ? 1 : 0 }]}
        contentFit="cover"
        nativeControls={false}
        allowsFullscreen={false}
        allowsPictureInPicture={false}
      />
    </View>
  );
}

/** Tiny still orb for small places (avatars, list rows) — no video player cost. */
export function OrbStill({ size = 20 }: { size?: number }) {
  return <Image source={POSTER} style={{ width: size, height: size, borderRadius: size / 2 }} />;
}
