"use client";

import { useEffect, useCallback } from 'react';

/**
 * Hook that adds keyboard shortcuts for module navigation.
 * - Left arrow → previous module
 * - Right arrow → next module
 * - Shift+Enter → mark complete
 * 
 * Disabled when user is typing in an input/textarea.
 */
export function useKeyboardNav({
    onPrev,
    onNext,
    onComplete,
    hasPrev,
    hasNext,
    canComplete,
}: {
    onPrev: () => void;
    onNext: () => void;
    onComplete: () => void;
    hasPrev: boolean;
    hasNext: boolean;
    canComplete: boolean;
}) {
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            // Ignore when typing in inputs
            const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
            if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

            if (e.key === 'ArrowLeft' && hasPrev) {
                e.preventDefault();
                onPrev();
            } else if (e.key === 'ArrowRight' && hasNext) {
                e.preventDefault();
                onNext();
            } else if (e.key === 'Enter' && e.shiftKey && canComplete) {
                e.preventDefault();
                onComplete();
            }
        },
        [onPrev, onNext, onComplete, hasPrev, hasNext, canComplete]
    );

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
}
