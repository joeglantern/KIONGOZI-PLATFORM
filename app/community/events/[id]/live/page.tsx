import { createClient } from '@/app/utils/supabase/server';
import LiveSession from '@/components/social/LiveSession';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Lock } from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

export default async function LiveRoomPage({ params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient();
    const { id } = await params;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect(`/login?next=/community/events/${id}/live`);
    }

    const [{ data: event, error }, { data: profile }] = await Promise.all([
        supabase.from('social_events').select('*').eq('id', id).maybeSingle(),
        supabase.from('profiles').select('full_name, username, email').eq('id', user.id).maybeSingle(),
    ]);

    if (error || !event) notFound();

    const { data: creatorProfile } = event.created_by
        ? await supabase.from('profiles').select('full_name, username').eq('id', event.created_by).maybeSingle()
        : { data: null };

    const isHost = event.created_by === user.id;
    const displayName = profile?.full_name || profile?.username || 'Community Member';
    const hostName = creatorProfile?.full_name || creatorProfile?.username || 'Community Leader';

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)]">
            {/* Top bar */}
            <div className="flex items-center justify-between px-6 py-3 bg-background border-b border-border shrink-0">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" asChild>
                        <Link href={`/community/events/${id}`}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Leave Stage
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-base font-bold flex items-center gap-2">
                            {event.title}
                            <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                                Live
                            </span>
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            {isHost ? 'You are hosting this session' : `Hosted by ${hostName}`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Lock className="h-3 w-3 text-civic-green" />
                    Transport encrypted
                </div>
            </div>

            {/* Jitsi area */}
            <div className="flex-1 min-h-0 bg-slate-950 p-4">
                <LiveSession
                    roomName={event.id}
                    userName={displayName}
                    userEmail={profile?.email ?? undefined}
                    isHost={isHost}
                />
            </div>
        </div>
    );
}
