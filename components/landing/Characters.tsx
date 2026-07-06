"use client";

import React from 'react';
import LottieScene from './LottieScene';

/**
 * Mascot system — dotLottie edition.
 *
 * The four named guides (Mwanzo, Zola, Ken, Tumi) and the onboarding reward
 * (TreasureChest) now render licensed Lottie animations instead of the old
 * hand-built SVG rigs. Component names and prop signatures are preserved so
 * every existing call site keeps working unchanged; the `expression`/`action`
 * props are accepted for backward compatibility but no longer drive discrete
 * emotional states (the Lottie loops continuously).
 *
 * Mapping (theme-matched):
 *   Mwanzo  → student            (learning / courses guide)
 *   Zola    → walk cycling shoes (green economy / sustainable mobility)
 *   Ken     → county sheriff     (civic accountability / governance)
 *   Tumi    → chatting           (community / youth voice)
 *   Treasure→ dino dance         (celebration / reward)
 */

interface MascotProps {
  className?: string;
  /** Load immediately instead of waiting for the viewport (above-the-fold use). */
  eager?: boolean;
}

// --- Mwanzo (Learning Guide) ---
export function Mwanzo({
  className = '',
  eager,
}: MascotProps & { expression?: 'happy' | 'excited' | 'wave' | 'thinking' }) {
  return (
    <LottieScene
      src="/lottie/student.lottie"
      className={className}
      eager={eager}
      ariaLabel="Mwanzo, the Kiongozi learning guide"
    />
  );
}

// --- Zola (Green Economy Guide) ---
export function Zola({
  className = '',
  eager,
}: MascotProps & { action?: 'idle' | 'cheer' | 'thinking' | 'excited' }) {
  return (
    <LottieScene
      src="/lottie/walk-cycling-shoes.lottie"
      className={className}
      eager={eager}
      ariaLabel="Zola, the Kiongozi green economy guide"
    />
  );
}

// --- Ken (Civic Accountability Guide) ---
export function Ken({
  className = '',
  eager,
}: MascotProps & { action?: 'idle' | 'adjust' | 'thinking' | 'excited' }) {
  return (
    <LottieScene
      src="/lottie/county-sheriff.lottie"
      className={className}
      eager={eager}
      ariaLabel="Ken, the Kiongozi civic accountability guide"
    />
  );
}

// --- Tumi (Community Guide) ---
export function Tumi({
  className = '',
  eager,
}: MascotProps & { action?: 'idle' | 'spin' | 'cheer' }) {
  return (
    <LottieScene
      src="/lottie/chatting.lottie"
      className={className}
      eager={eager}
      ariaLabel="Tumi, the Kiongozi community guide"
    />
  );
}

// --- Treasure Chest (Onboarding Reward) ---
export function TreasureChest({ className = '' }: MascotProps & { isOpen?: boolean }) {
  return (
    <LottieScene
      src="/lottie/dino-dance.lottie"
      className={className}
      ariaLabel="Reward unlocked"
    />
  );
}
