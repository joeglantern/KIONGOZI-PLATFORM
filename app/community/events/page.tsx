import { createClient } from '@/app/utils/supabase/server';
import EventCard from '@/components/social/EventCard';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Filter, Plus } from 'lucide-react';
import Link from 'next/link';

export default async function EventsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch upcoming events
    const { data: events } = await supabase
        .from('social_events')
        .select('*')
        .gte('end_time', new Date().toISOString())
        .order('start_time', { ascending: true });

    // Fetch user RSVPs if logged in
    const rsvpMap: Record<string, 'going' | 'interested'> = {};
    if (user && events?.length) {
        const { data: rsvps } = await supabase
            .from('social_event_rsvps')
            .select('event_id, status')
            .eq('user_id', user.id)
            .in('event_id', events.map(e => e.id));

        if (rsvps) {
            rsvps.forEach(r => {
                rsvpMap[r.event_id] = r.status as 'going' | 'interested';
            });
        }
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 border-b border-border pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-civic-green-dark flex items-center gap-3">
                        <CalendarIcon className="h-8 w-8" />
                        Community Calendar
                    </h1>
                    <p className="text-muted-foreground text-lg mt-2 max-w-2xl">
                        Discover local meetups, town halls, cleanups, and protests. Show up and make a difference.
                    </p>
                </div>
                <div className="flex gap-2">
                    {/* <Button variant="outline" size="sm">
                        <Filter className="mr-2 h-4 w-4" />
                        Filter
                    </Button> */}
                    <Button asChild className="bg-civic-green hover:bg-civic-green-dark text-white shadow-md">
                        <Link href="/community/events/create">
                            <Plus className="mr-2 h-4 w-4" />
                            Host Event
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events?.map((event) => (
                    <EventCard
                        key={event.id}
                        event={event}
                        currentUser={user}
                        rsvpStatusProp={rsvpMap[event.id]}
                    />
                ))}

                {(!events || events.length === 0) && (
                    <div className="col-span-full text-center py-20 bg-muted/20 rounded-xl border border-dashed border-border">
                        <CalendarIcon className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                        <h3 className="text-xl font-medium text-foreground mb-2">No Upcoming Events</h3>
                        <p className="text-muted-foreground mb-6">There are no events scheduled right now. Why not host one?</p>
                        <Button asChild variant="outline" className="border-civic-green text-civic-green">
                            <Link href="/community/events/create">Host an Event</Link>
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
