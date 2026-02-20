import { createClient } from '@/app/utils/supabase/server';
import TownHallCard from '@/components/social/TownHallCard';
import { Button } from '@/components/ui/button';
import { Video, Mic2, Plus } from 'lucide-react';
import Link from 'next/link';

export default async function TownHallsPage() {
    const supabase = await createClient();

    // Fetch Town Halls (Both upcoming and past)
    const { data: townhalls } = await supabase
        .from('social_events')
        .select('*')
        .eq('event_type', 'townhall')
        .order('start_time', { ascending: false });

    const now = new Date();

    // Categorize correctly using start and end times
    const live = townhalls?.filter(e => {
        const start = new Date(e.start_time);
        const end = new Date(e.end_time);
        return start <= now && end >= now;
    }) || [];

    const upcoming = townhalls?.filter(e => new Date(e.start_time) > now) || [];
    const past = townhalls?.filter(e => new Date(e.end_time) < now) || [];

    return (
        <div className="space-y-12">
            <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 border-b border-border pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-civic-green-dark flex items-center gap-3">
                        <Video className="h-8 w-8" />
                        Town Hall Stage
                    </h1>
                    <p className="text-muted-foreground text-lg mt-2 max-w-2xl">
                        Direct community governance. Join live sessions or watch past archive recordings.
                    </p>
                </div>
                <Button asChild className="bg-civic-green hover:bg-civic-green-dark text-white shadow-md">
                    <Link href="/community/events/create?type=townhall">
                        <Plus className="mr-2 h-4 w-4" />
                        Host Town Hall
                    </Link>
                </Button>
            </div>

            {/* Live Now Section */}
            {live.length > 0 && (
                <section className="bg-red-50/50 p-6 rounded-2xl border border-red-100 dark:bg-red-950/10 dark:border-red-900/20">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></div>
                        <h2 className="text-xl font-bold text-foreground uppercase tracking-tight">Active Now</h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {live.map((event) => (
                            <TownHallCard key={event.id} event={event} isPast={false} />
                        ))}
                    </div>
                </section>
            )}

            {/* Upcoming Section */}
            <section>
                <div className="flex items-center gap-2 mb-6">
                    <h2 className="text-xl font-bold text-foreground">Scheduled Sessions</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {upcoming.map((event) => (
                        <TownHallCard key={event.id} event={event} isPast={false} />
                    ))}

                    {upcoming.length === 0 && live.length === 0 && (
                        <div className="col-span-full py-12 text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border text-center">
                            <Mic2 className="h-10 w-10 mx-auto mb-3 opacity-20" />
                            <p>No live sessions currently scheduled.</p>
                        </div>
                    )}
                </div>
            </section>

            {/* Archive Section */}
            <section className="pt-8 border-t border-border/50">
                <h2 className="text-xl font-bold text-foreground mb-6 opacity-70">Archive & Recordings</h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {past.map((event) => (
                        <TownHallCard key={event.id} event={event} isPast={true} />
                    ))}

                    {past.length === 0 && (
                        <div className="col-span-full py-8 text-muted-foreground text-center text-sm italic">
                            The community vault is currently empty.
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
