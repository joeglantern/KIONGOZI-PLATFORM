"use client";

import confetti from 'canvas-confetti';

/**
 * Fires a burst of confetti. Call this when a course is completed.
 */
export function fireCourseConfetti() {
    // First burst
    confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f97316', '#fbbf24', '#ef4444', '#3b82f6', '#8b5cf6'],
    });

    // Second burst with delay
    setTimeout(() => {
        confetti({
            particleCount: 60,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#f97316', '#fbbf24', '#10b981'],
        });
    }, 250);

    setTimeout(() => {
        confetti({
            particleCount: 60,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#f97316', '#fbbf24', '#10b981'],
        });
    }, 400);
}

/**
 * Fires a smaller celebration for module completion.
 */
export function fireModuleConfetti() {
    confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.7 },
        colors: ['#f97316', '#fbbf24'],
        scalar: 0.8,
    });
}
