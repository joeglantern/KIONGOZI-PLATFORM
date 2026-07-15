"use client";

import React from 'react';
import LottieScene from './LottieScene';

interface MascotProps {
  className?: string;
  /** Load immediately instead of waiting for the viewport (above-the-fold use). */
  eager?: boolean;
}

type AnimationConfig = {
  src: string;
  label: string;
};

type MwanzoExpression = 'happy' | 'excited' | 'wave' | 'thinking';
type ZolaAction = 'idle' | 'cheer' | 'thinking' | 'excited';
type KenAction = 'idle' | 'adjust' | 'thinking' | 'excited';
type TumiAction = 'idle' | 'spin' | 'cheer';

const mwanzoAnimations: Record<MwanzoExpression, AnimationConfig> = {
  happy: {
    src: '/lottie/student.lottie',
    label: 'Mwanzo, the Kiongozi learning guide',
  },
  excited: {
    src: '/lottie/road-to-knowledge.lottie',
    label: 'Learning journey progress',
  },
  wave: {
    src: '/lottie/wave.json',
    label: 'Welcome wave',
  },
  thinking: {
    src: '/lottie/walkthrough.json',
    label: 'Thinking through the next learning step',
  },
};

const zolaAnimations: Record<ZolaAction, AnimationConfig> = {
  idle: {
    src: '/lottie/walk-cycling-shoes.lottie',
    label: 'Zola, the Kiongozi green economy guide',
  },
  cheer: {
    src: '/lottie/ripple.json',
    label: 'Green impact ripple',
  },
  thinking: {
    src: '/lottie/bullseye.json',
    label: 'Green mission target',
  },
  excited: {
    src: '/lottie/walk-cycling-shoes.lottie',
    label: 'Sustainable mobility in motion',
  },
};

const kenAnimations: Record<KenAction, AnimationConfig> = {
  idle: {
    src: '/lottie/county-sheriff.lottie',
    label: 'Ken, the Kiongozi civic accountability guide',
  },
  adjust: {
    src: '/lottie/county-sheriff.lottie',
    label: 'Civic accountability guide',
  },
  thinking: {
    src: '/lottie/bullseye.json',
    label: 'Civic accountability target',
  },
  excited: {
    src: '/lottie/success.json',
    label: 'Civic win unlocked',
  },
};

const tumiAnimations: Record<TumiAction, AnimationConfig> = {
  idle: {
    src: '/lottie/chatting.lottie',
    label: 'Tumi, the Kiongozi community guide',
  },
  cheer: {
    src: '/lottie/chatting.lottie',
    label: 'Community voices in conversation',
  },
  spin: {
    src: '/lottie/dino-dance.lottie',
    label: 'Community achievement celebration',
  },
};

function MascotAnimation({
  animation,
  className,
  eager,
}: MascotProps & { animation: AnimationConfig }) {
  return (
    <LottieScene
      src={animation.src}
      className={className}
      eager={eager}
      ariaLabel={animation.label}
    />
  );
}

export function Mwanzo({
  className = '',
  eager,
  expression = 'happy',
}: MascotProps & { expression?: MwanzoExpression }) {
  return <MascotAnimation animation={mwanzoAnimations[expression] ?? mwanzoAnimations.happy} className={className} eager={eager} />;
}

export function Zola({
  className = '',
  eager,
  action = 'idle',
}: MascotProps & { action?: ZolaAction }) {
  return <MascotAnimation animation={zolaAnimations[action] ?? zolaAnimations.idle} className={className} eager={eager} />;
}

export function Ken({
  className = '',
  eager,
  action = 'idle',
}: MascotProps & { action?: KenAction }) {
  return <MascotAnimation animation={kenAnimations[action] ?? kenAnimations.idle} className={className} eager={eager} />;
}

export function Tumi({
  className = '',
  eager,
  action = 'idle',
}: MascotProps & { action?: TumiAction }) {
  return <MascotAnimation animation={tumiAnimations[action] ?? tumiAnimations.idle} className={className} eager={eager} />;
}
