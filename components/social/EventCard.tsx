'use client';

import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Users, Clock, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { createClient } from '@/app/utils/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface EventProps {
    event: any;
    currentUser: any;
    rsvpStatusProp?: 'going' | 'interested' | null;
}

const EVENT_TYPE_COLORS: Record<string, string> = {
    protest: 'bg-red-100 text-red-800 border-red-200',
    cleanup: 'bg-civic-green/20 text-civic-green-dark border-civic-green/30',
    townhall: 'bg-blue-100 text-blue-800 border-blue-200',
    workshop: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    meetup: 'bg-purple-100 text-purple-800 border-purple-200',
};

export default function EventCard({ event, currentUser, rsvpStatusProp = null }: EventProps) {
    const [rsvpStatus, setRsvpStatus] = useState<string | null>(rsvpStatusProp);
    const [isRsvping, setIsRsvping] = useState(false);
    const { toast } = useToast();
    const supabase = createClient();

    const handleRsvp = async (status: 'going' | 'interested') => {
        if (!currentUser) {
            toast({
                title: "Login Required",
                description: "You must be logged in to RSVP.",
            });
            return;
        }

        if (isRsvping) return;
        setIsRsvping(true);

        try {
            if (rsvpStatus === status) {
                // Toggle off (remove RSVP)
                const { error } = await supabase
                    .from('social_event_rsvps')
                    .delete()
                    .eq('event_id', event.id)
                    .eq('user_id', currentUser.id);

                if (error) throw error;
                setRsvpStatus(null);
                toast({ description: "RSVP removed." });
            } else {
                // Upsert RSVP
                const { error } = await supabase
                    .from('social_event_rsvps')
                    .upsert({
                        event_id: event.id,
                        user_id: currentUser.id,
                        status: status
                    });

                if (error) throw error;
                setRsvpStatus(status);
                toast({
                    title: status === 'going' ? "You're going!" : "Interest saved.",
                    className: "bg-civic-green text-white border-none"
                });
            }
        } catch (error: any) {
            console.error('RSVP Error:', error);
            toast({
                title: "Error",
                description: "Failed to update RSVP.",
                variant: "destructive",
            });
        } finally {
            setIsRsvping(false);
        }
    };

    return (
        <Card className="flex flex-col h-full overflow-hidden border-border/60 hover:shadow-md transition-all duration-300 group">
            <div className="relative h-40 bg-muted">
                {event.image_url ? (
                    <img
                        src={event.image_url}
                        alt={event.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-civic-earth/10">
                        <Calendar className="h-10 w-10 text-civic-earth/40" />
                    </div>
                )}
                <div className="absolute top-3 left-3">
                    <Badge className={cn("uppercase text-xs font-bold shadow-sm", EVENT_TYPE_COLORS[event.event_type] || 'bg-gray-100 text-gray-800')}>
                        {event.event_type}
                    </Badge>
                </div>
                {rsvpStatus && (
                    <div className="absolute top-3 right-3 bg-white/90 text-civic-green-dark text-xs font-bold px-2 py-1 rounded-full shadow-sm flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {rsvpStatus === 'going' ? 'Going' : 'Interested'}
                    </div>
                )}
            </div>

            <CardContent className="flex-1 pt-4 space-y-3">
                <div>
                    <div className="text-xs text-civic-green mb-1 font-semibold uppercase tracking-wider flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(event.start_time), 'MMM d, h:mm a')}
                    </div>
                    <CardTitle className="text-lg leading-tight group-hover:text-civic-clay transition-colors line-clamp-2">
                        <Link href={`/community/events/${event.id}`}>
                            {event.title}
                        </Link>
                    </CardTitle>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                        <span className="line-clamp-1">{event.location}</span>
                    </div>
                    {/* Placeholder for attendee count until we join that data */}
                    <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 shrink-0" />
                        <span>Join the community</span>
                    </div>
                </div>

                <p className="text-sm text-foreground/80 line-clamp-2">
                    {event.description}
                </p>
            </CardContent>

            <CardFooter className="pt-0 pb-4 flex gap-2">
                <Button
                    variant={rsvpStatus === 'going' ? 'default' : 'outline'}
                    size="sm"
                    className={cn("flex-1", rsvpStatus === 'going' && "bg-civic-green hover:bg-civic-green-dark")}
                    onClick={() => handleRsvp('going')}
                    disabled={isRsvping}
                >
                    {rsvpStatus === 'going' ? 'Going' : 'Attend'}
                </Button>
                <Button
                    variant={rsvpStatus === 'interested' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="flex-1"
                    onClick={() => handleRsvp('interested')}
                    disabled={isRsvping}
                >
                    Interested
                </Button>
            </CardFooter>
        </Card>
    );
}
