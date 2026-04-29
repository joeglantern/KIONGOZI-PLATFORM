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

    const eventUrl = `${window.location.origin}/community/events/${eventId}`;
    const roomUrl = `${window.location.origin}/community/events/${eventId}/live`;

    const shareEvent = async () => {
        // Use native share sheet if available (mobile/modern browsers), fall back to clipboard
        if (navigator.share) {
            try {
                await navigator.share({ title: eventTitle, url: eventUrl });
                return;
            } catch {
                // User cancelled or share not supported — fall through to clipboard
            }
        }
        await navigator.clipboard.writeText(eventUrl);
        setCopiedEvent(true);
        setTimeout(() => setCopiedEvent(false), 2000);
    };

    const copyRoom = async () => {
        await navigator.clipboard.writeText(roomUrl);
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
                className="w-full justify-between text-xs h-9 font-normal"
                onClick={shareEvent}
            >
                <span className="truncate text-muted-foreground">{eventUrl.replace(/^https?:\/\//, '')}</span>
                {copiedEvent
                    ? <Check className="h-3.5 w-3.5 text-civic-green shrink-0 ml-2" />
                    : <Copy className="h-3.5 w-3.5 shrink-0 ml-2 text-muted-foreground" />}
            </Button>

            {isInternalStage && (
                <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-between text-xs h-9 font-normal border-red-200 text-red-700"
                    onClick={copyRoom}
                >
                    <span className="truncate">Copy live room link</span>
                    {copiedRoom
                        ? <Check className="h-3.5 w-3.5 text-civic-green shrink-0 ml-2" />
                        : <Copy className="h-3.5 w-3.5 shrink-0 ml-2" />}
                </Button>
            )}
        </div>
    );
}
