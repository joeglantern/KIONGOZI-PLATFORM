'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check, Users } from 'lucide-react';

interface ShareEventButtonProps {
    eventId: string;
    eventTitle: string;
    isInternalStage: boolean;
}

export default function ShareEventButton({ eventId, eventTitle, isInternalStage }: ShareEventButtonProps) {
    const [copiedEvent, setCopiedEvent] = useState(false);
    const [copiedRoom, setCopiedRoom] = useState(false);

    const eventUrl = `${window.location.origin}/community/events/${eventId}`;
    const roomUrl = `${window.location.origin}/community/events/${eventId}/live`;

    const copy = async (text: string, which: 'event' | 'room') => {
        await navigator.clipboard.writeText(text);
        if (which === 'event') {
            setCopiedEvent(true);
            setTimeout(() => setCopiedEvent(false), 2000);
        } else {
            setCopiedRoom(true);
            setTimeout(() => setCopiedRoom(false), 2000);
        }
    };

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
                onClick={() => copy(eventUrl, 'event')}
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
                    onClick={() => copy(roomUrl, 'room')}
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
