import { createClient } from '@/app/utils/supabase/server';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, ArrowLeft, Clock, Users, CheckCircle2, Share2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import EventActions from './EventActions';
import RecordingManager from '../create/RecordingManager';

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { id } = await params;

    const { data: event, error } = await supabase
        .from('social_events')
        .select('*')
        .eq('id', id)
        .maybeSingle();

    if (error || !event) {
        notFound();
    }

    // Fetch profile separately to avoid RLS join failures
    const { data: creatorProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', event.created_by)
        .maybeSingle();

    // Check RSVP status
    let rsvpStatus: 'going' | 'interested' | null = null;
    if (user) {
        const { data: rsvp } = await supabase
            .from('social_event_rsvps')
            .select('status')
            .eq('event_id', id)
            .eq('user_id', user.id)
            .maybeSingle();

        if (rsvp) rsvpStatus = rsvp.status as 'going' | 'interested';
    }

    const EVENT_TYPE_COLORS: Record<string, string> = {
        protest: 'bg-red-100 text-red-800 border-red-200',
        cleanup: 'bg-civic-green/20 text-civic-green-dark border-civic-green/30',
        townhall: 'bg-blue-100 text-blue-800 border-blue-200',
        workshop: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        meetup: 'bg-purple-100 text-purple-800 border-purple-200',
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <Button variant="ghost" asChild className="mb-4">
                <Link href="/community/events">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Calendar
                </Link>
            </Button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="rounded-xl overflow-hidden shadow-sm aspect-video relative bg-muted">
                        {event.image_url ? (
                            <img
                                src={event.image_url}
                                alt={event.title}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-civic-earth/10">
                                <Calendar className="h-20 w-20 text-civic-earth/30" />
                            </div>
                        )}
                        <div className="absolute top-4 left-4">
                            <Badge className={`uppercase text-sm font-bold shadow-sm ${EVENT_TYPE_COLORS[event.event_type] || 'bg-gray-100'}`}>
                                {event.event_type}
                            </Badge>
                        </div>
                    </div>

                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">{event.title}</h1>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
                            <span>Organized by <span className="font-medium text-foreground">@{creatorProfile?.username || 'anonymous'}</span></span>
                        </div>

                        <div className="space-y-4 border-t border-b border-border py-6 mb-6">
                            <div className="flex items-start gap-4">
                                <Clock className="h-5 w-5 text-civic-green mt-0.5" />
                                <div>
                                    <p className="font-medium text-foreground">
                                        {format(new Date(event.start_time), 'EEEE, MMMM d, yyyy')}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {format(new Date(event.start_time), 'h:mm a')} - {format(new Date(event.end_time), 'h:mm a')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <MapPin className="h-5 w-5 text-civic-clay mt-0.5" />
                                <div>
                                    <p className="font-medium text-foreground">Location</p>
                                    <p className="text-sm text-muted-foreground">{event.location}</p>
                                </div>
                            </div>
                        </div>

                        <div className="prose prose-stone dark:prose-invert max-w-none">
                            <h3 className="text-lg font-semibold">About this Event</h3>
                            <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">
                                {event.description}
                            </p>

                            {/* Virtual Event Logic */}
                            {(event.meeting_url || event.meeting_url === 'INTERNAL_LIVE_STAGE') && (
                                <div className="mt-8 p-4 bg-muted/50 border border-border rounded-lg flex flex-col md:flex-row items-center justify-between shadow-sm gap-4">
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-foreground flex items-center gap-2">
                                            <div className={cn(
                                                "h-2 w-2 rounded-full",
                                                new Date(event.end_time) > new Date() ? "bg-red-500 animate-pulse" : "bg-gray-400"
                                            )}></div>
                                            {new Date(event.end_time) > new Date() ? "Live Stage" : "Past Session"}
                                        </h4>
                                        <p className="text-sm text-muted-foreground">
                                            {event.meeting_url === 'INTERNAL_LIVE_STAGE'
                                                ? (new Date(event.end_time) > new Date()
                                                    ? "Session is active. Join the conversation!"
                                                    : "This session has ended, but the room remains open for catch-up.")
                                                : "This event is hosted externally."}
                                        </p>
                                    </div>

                                    <div className="flex gap-2">
                                        {event.recording_url && (
                                            <Button variant="outline" asChild className="gap-2 border-civic-green/30 text-civic-green-dark">
                                                <a href={event.recording_url} target="_blank" rel="noopener noreferrer">
                                                    <Calendar className="h-4 w-4" />
                                                    Watch Recording
                                                </a>
                                            </Button>
                                        )}

                                        {event.meeting_url === 'INTERNAL_LIVE_STAGE' ? (
                                            <Button asChild className="gap-2 bg-red-600 hover:bg-red-700 text-white shadow-md">
                                                <Link href={`/community/events/${event.id}/live`}>
                                                    <Users className="h-4 w-4" />
                                                    {new Date(event.end_time) > new Date() ? "Join Room" : "Re-open Room"}
                                                </Link>
                                            </Button>
                                        ) : (
                                            new Date(event.end_time) > new Date() && (
                                                <Button asChild className="gap-2">
                                                    <a href={event.meeting_url} target="_blank" rel="noopener noreferrer">
                                                        External Link
                                                        <Share2 className="h-4 w-4" />
                                                    </a>
                                                </Button>
                                            )
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar Actions */}
                <div className="space-y-6">
                    <div className="bg-card border border-border rounded-xl p-6 shadow-sm sticky top-24">
                        <div className="space-y-6">
                            <div className="text-center">
                                <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold mb-2">Are you going?</p>
                                <EventActions
                                    event={event}
                                    currentUser={user}
                                    rsvpStatusProp={rsvpStatus}
                                />
                            </div>

                            {user?.id === event.created_by && (
                                <div className="pt-2">
                                    <RecordingManager
                                        eventId={event.id}
                                        initialRecordingUrl={event.recording_url}
                                    />
                                </div>
                            )}

                            <hr className="border-border" />

                            <div className="space-y-3">
                                <p className="font-medium text-sm flex items-center gap-2">
                                    <Users className="h-4 w-4" />
                                    Attendees
                                </p>
                                {/* We can fetch attendee count/avatars here in future */}
                                <p className="text-sm text-muted-foreground">
                                    Join others from your community.
                                </p>
                            </div>

                            <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground border border-border/50">
                                <p>
                                    <strong>Safety Note:</strong> Always follow local laws and regulations when attending public gatherings.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
