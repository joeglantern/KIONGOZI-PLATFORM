"use client";

import { useEffect, useRef, useState } from 'react';
import { FileText, Gauge, ChevronDown } from 'lucide-react';

const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;
const SPEED_KEY = 'kiongozi-playback-speed';
const RESUME_PREFIX = 'kiongozi-media-position:';

interface LessonMediaProps {
    kind: 'video' | 'audio';
    src: string;
    /** Stable id used to remember the playback position (e.g. module id). */
    resumeKey: string;
    title: string;
    transcript?: string | null;
    className?: string;
    autoPlay?: boolean;
    onEnded?: () => void;
}

function readNumber(key: string): number | null {
    try {
        const raw = localStorage.getItem(key);
        const n = raw === null ? NaN : Number(raw);
        return Number.isFinite(n) ? n : null;
    } catch {
        return null;
    }
}

function writeValue(key: string, value: string | null) {
    try {
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
    } catch {
        // Storage can be blocked (private mode); playback still works.
    }
}

/**
 * Lesson video/audio with the controls learners expect from a course player:
 * resume where you left off, playback speed, inline playback on iOS, and an
 * expandable transcript.
 */
export function LessonMedia({ kind, src, resumeKey, title, transcript, className = '', autoPlay = false, onEnded }: LessonMediaProps) {
    const mediaRef = useRef<HTMLVideoElement & HTMLAudioElement>(null);
    const lastSavedRef = useRef(0);
    const [speed, setSpeed] = useState(1);
    const [resumedAt, setResumedAt] = useState<number | null>(null);
    const [showTranscript, setShowTranscript] = useState(false);
    const storageKey = `${RESUME_PREFIX}${resumeKey}`;

    useEffect(() => {
        const saved = readNumber(SPEED_KEY);
        if (saved && (SPEEDS as readonly number[]).includes(saved)) setSpeed(saved);
    }, []);

    useEffect(() => {
        if (mediaRef.current) mediaRef.current.playbackRate = speed;
    }, [speed]);

    const handleLoadedMetadata = () => {
        const el = mediaRef.current;
        if (!el) return;
        el.playbackRate = speed;
        const saved = readNumber(storageKey);
        // Skip trivial or near-finished positions; restarting is expected there.
        if (saved && saved > 5 && Number.isFinite(el.duration) && saved < el.duration - 10) {
            el.currentTime = saved;
            setResumedAt(saved);
        }
    };

    const handleTimeUpdate = () => {
        const el = mediaRef.current;
        if (!el) return;
        const now = Date.now();
        if (now - lastSavedRef.current < 5000) return;
        lastSavedRef.current = now;
        writeValue(storageKey, String(Math.floor(el.currentTime)));
    };

    const handleEnded = () => {
        writeValue(storageKey, null);
        onEnded?.();
    };

    const changeSpeed = (next: number) => {
        setSpeed(next);
        writeValue(SPEED_KEY, String(next));
    };

    const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

    const common = {
        ref: mediaRef,
        src,
        controls: true,
        preload: 'metadata' as const,
        controlsList: 'nodownload',
        onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
        onLoadedMetadata: handleLoadedMetadata,
        onTimeUpdate: handleTimeUpdate,
        onPause: () => {
            if (mediaRef.current) writeValue(storageKey, String(Math.floor(mediaRef.current.currentTime)));
        },
        onEnded: handleEnded,
        autoPlay,
    };

    return (
        <div className={className}>
            {kind === 'video' ? (
                <div className="rounded-2xl overflow-hidden aspect-video bg-black relative shadow-lg">
                    <video
                        {...common}
                        playsInline
                        title={title}
                        aria-label={title}
                        className="w-full h-full object-contain"
                    />
                </div>
            ) : (
                <audio {...common} title={title} aria-label={title} className="w-full" />
            )}

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5" role="group" aria-label="Playback speed">
                    <Gauge className="w-3.5 h-3.5 text-gray-400" aria-hidden="true" />
                    {SPEEDS.map((s) => (
                        <button
                            key={s}
                            type="button"
                            onClick={() => changeSpeed(s)}
                            aria-pressed={speed === s}
                            className={`px-2 py-1 rounded-lg font-bold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${speed === s
                                ? 'bg-orange-500 text-white'
                                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                                }`}
                        >
                            {s}x
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-3">
                    {resumedAt !== null && (
                        <button
                            type="button"
                            onClick={() => {
                                if (mediaRef.current) mediaRef.current.currentTime = 0;
                                setResumedAt(null);
                            }}
                            className="text-gray-500 hover:text-orange-600 font-semibold"
                        >
                            Resumed at {formatTime(resumedAt)} · Start over
                        </button>
                    )}
                    {transcript?.trim() && (
                        <button
                            type="button"
                            onClick={() => setShowTranscript((v) => !v)}
                            aria-expanded={showTranscript}
                            className="inline-flex items-center gap-1 font-bold text-gray-600 hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded"
                        >
                            <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                            Transcript
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showTranscript ? 'rotate-180' : ''}`} aria-hidden="true" />
                        </button>
                    )}
                </div>
            </div>

            {showTranscript && transcript?.trim() && (
                <div className="mt-3 max-h-72 overflow-y-auto rounded-2xl border border-gray-100 bg-white p-4 text-sm leading-relaxed text-gray-700 whitespace-pre-line">
                    {transcript}
                </div>
            )}
        </div>
    );
}
