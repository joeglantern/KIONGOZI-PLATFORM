import { createClient } from '@/app/utils/supabase/server';
import LiveSession from '@/components/social/LiveSession';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield } from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

export default async function LiveRoomPage({ params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient();
    const { id } = await params;

    // Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect(`/login?next=/community/events/${id}/live`);
    }

    // Fetch Event
    const { data: event, error } = await supabase
        .from('social_events')
        .select('*')
        .eq('id', id)
        .maybeSingle();

    if (error || !event) {
        notFound();
    }

    // Fetch Event Creator Profile separately
    const { data: creatorProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', event.created_by)
        .maybeSingle();

    // Fetch Profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

    const isHost = event.created_by === user.id;

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)]">
            <div className="flex items-center justify-between px-6 py-4 bg-background border-b border-border">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" asChild>
                        <Link href={`/community/events/${id}`}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Leave Stage
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-lg font-bold flex items-center gap-2">
                            {event.title}
                            <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                                Live
                            </span>
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            Hosted by {creatorProfile?.full_name || 'Community Leader'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Shield className="h-3 w-3 text-civic-green" />
                    End-to-End Encrypted
                </div>
            </div>

            <div className="flex-1 bg-slate-950 p-4">
                <LiveSession
                    roomName={event.id} // Using Event ID as secure room name
                    userName={profile?.full_name || 'Community Member'}
                    userEmail={profile?.email} // Passed for Gravatar if available
                    isHost={isHost}
                />
            </div>
        </div>
    );
}
