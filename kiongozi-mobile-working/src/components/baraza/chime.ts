// The Baraza chimes: a two-note bell when a hand goes up, three notes when the stick lands on you.
// Synthesized bells (assets/sounds), played through expo-audio only on builds that have it.
import { audioAvailable } from './barazaAudio';

const SOUNDS = {
  hand: require('../../../assets/sounds/chime_hand.m4a'),
  turn: require('../../../assets/sounds/chime_turn.m4a'),
};

const players: Partial<Record<keyof typeof SOUNDS, any>> = {};
let last = 0;

/** Play a chime. Quietly does nothing on builds without audio; never more than one every 700ms. */
export function chime(kind: keyof typeof SOUNDS) {
  if (!audioAvailable) return;
  const now = Date.now();
  if (now - last < 700) return;
  last = now;
  try {
    const A = require('expo-audio');
    let p = players[kind];
    if (!p) { p = A.createAudioPlayer(SOUNDS[kind]); p.volume = 0.7; players[kind] = p; }
    p.seekTo(0);
    p.play();
  } catch {}
}
