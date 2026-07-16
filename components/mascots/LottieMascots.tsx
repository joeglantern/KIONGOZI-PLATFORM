"use client";

import React from 'react';
import LottieScene from '@/components/landing/LottieScene';

/**
 * Utility mascots, reusable Lottie animations for cross-cutting UI states
 * (loading, empty, celebration, errors). These complement the four themed
 * guides in components/landing/Characters.tsx.
 */

interface MascotProps {
  className?: string;
  eager?: boolean;
}

/** Elephant loader, for loading skeletons and pending states. */
export function MascotLoader({
  className = 'w-24 h-24',
  label = 'Loading…',
  showLabel = true,
}: MascotProps & { label?: string; showLabel?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2" role="status" aria-live="polite">
      <LottieScene src="/lottie/loading.lottie" className={className} eager ariaLabel={label} />
      {showLabel && <p className="text-sm font-semibold text-brand-primary/70">{label}</p>}
    </div>
  );
}

/** Dancing dino, for celebrations: quest complete, badge earned, streak milestones. */
export function MascotCelebration({ className = 'w-32 h-32' }: MascotProps) {
  return <LottieScene src="/lottie/dino-dance.lottie" className={className} eager ariaLabel="Celebration" />;
}

/** Corgi, friendly companion for empty states (no items yet). */
export function MascotEmptyState({ className = 'w-32 h-32' }: MascotProps) {
  return <LottieScene src="/lottie/cute-doggie.lottie" className={className} ariaLabel="Nothing here yet" />;
}

/** Grinning monkey, for 404 / error pages. */
export function Mascot404({ className = 'w-40 h-40' }: MascotProps) {
  return <LottieScene src="/lottie/tenor.lottie" className={className} eager ariaLabel="Page not found" />;
}

/** Juggler, for busy/multitasking contexts (active quests, dashboard). */
export function MascotJuggler({ className = 'w-24 h-24', eager }: MascotProps) {
  return <LottieScene src="/lottie/juggling-master.lottie" className={className} eager={eager} ariaLabel="Keeping your quests in motion" />;
}

/** Figure climbing stairs, for progress / journey / onboarding. */
export function MascotJourney({ className = 'w-28 h-28', eager }: MascotProps) {
  return <LottieScene src="/lottie/road-to-knowledge.lottie" className={className} eager={eager} ariaLabel="Your learning journey" />;
}

/** Relaxed figure, for "all caught up" / profile / completed states. */
export function MascotRelax({ className = 'w-32 h-32' }: MascotProps) {
  return <LottieScene src="/lottie/relax.lottie" className={className} ariaLabel="All caught up" />;
}
