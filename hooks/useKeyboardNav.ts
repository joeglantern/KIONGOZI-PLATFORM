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
            // Ignore when typing, when a media element owns the arrow keys
            // (seeking), when another handler already acted, or with modifiers
            // (browser back/forward, text selection shortcuts).
            if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
            const target = e.target as HTMLElement | null;
            const tag = target?.tagName?.toLowerCase();
            if (tag === 'input' || tag === 'textarea' || tag === 'select' || tag === 'video' || tag === 'audio') return;
            if (target?.isContentEditable) return;

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
