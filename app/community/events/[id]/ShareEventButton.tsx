'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check, Share2, Users } from 'lucide-react';

interface ShareEventButtonProps {
    eventId: string;
    eventTitle: string;
    isInternalStage: boolean;
    /** Renders as a single icon button — used inline next to the title */
    iconOnly?: boolean;
}

export default function ShareEventButton({ eventId, eventTitle, isInternalStage, iconOnly }: ShareEventButtonProps) {
    const [copiedEvent, setCopiedEvent] = useState(false);
    const [copiedRoom, setCopiedRoom] = useState(false);

    // Compute URLs inside handlers only — window is not available during SSR
    const getEventUrl = () => `${window.location.origin}/community/events/${eventId}`;
    const getRoomUrl = () => `${window.location.origin}/community/events/${eventId}/live`;

    const shareEvent = async () => {
        const url = getEventUrl();
        if (navigator.share) {
            try {
                await navigator.share({ title: eventTitle, url });
                return;
            } catch { /* cancelled */ }
        }
        await navigator.clipboard.writeText(url);
        setCopiedEvent(true);
        setTimeout(() => setCopiedEvent(false), 2000);
    };

    const copyRoom = async () => {
        await navigator.clipboard.writeText(getRoomUrl());
        setCopiedRoom(true);
        setTimeout(() => setCopiedRoom(false), 2000);
    };

    // ── Icon-only variant (next to title) ──
    if (iconOnly) {
        return (
            <button
                onClick={shareEvent}
                title="Share this event"
                className="shrink-0 mt-1 p-2 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
                {copiedEvent
                    ? <Check className="h-4 w-4 text-civic-green" />
                    : <Share2 className="h-4 w-4" />}
            </button>
        );
    }

    // ── Full variant (in sidebar) ──
    return (
        <div className="space-y-2">
            <p className="font-medium text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />
                Share this event
            </p>

            <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2 text-xs h-9 font-normal"
                onClick={shareEvent}
            >
                <Share2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate text-muted-foreground flex-1">Share / Copy event link</span>
                {copiedEvent && <Check className="h-3.5 w-3.5 text-civic-green shrink-0" />}
            </Button>

            {isInternalStage && (
                <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2 text-xs h-9 font-normal border-red-200 text-red-700"
                    onClick={copyRoom}
                >
                    <Copy className="h-3.5 w-3.5 shrink-0" />
                    <span className="flex-1">Copy live room link</span>
                    {copiedRoom && <Check className="h-3.5 w-3.5 text-civic-green shrink-0" />}
                </Button>
            )}
        </div>
    );
}
