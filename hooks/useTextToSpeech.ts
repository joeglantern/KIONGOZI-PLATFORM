"use client";

import { useState, useCallback, useEffect } from 'react';

export function useTextToSpeech() {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [supported, setSupported] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            setSupported(true);
        }
    }, []);

    const speak = useCallback((text: string) => {
        if (!supported) return;

        // Stop any current speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1;
        utterance.pitch = 1;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
    }, [supported]);

    const stop = useCallback(() => {
        if (!supported) return;
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
    }, [supported]);

    const pause = useCallback(() => {
        if (!supported) return;
        window.speechSynthesis.pause();
    }, [supported]);

    const resume = useCallback(() => {
        if (!supported) return;
        window.speechSynthesis.resume();
    }, [supported]);

    return {
        speak,
        stop,
        pause,
        resume,
        isSpeaking,
        supported
    };
}
