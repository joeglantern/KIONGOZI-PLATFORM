import { createClient } from '@/app/utils/supabase/server';
import PolicyPollCard from '@/components/social/PolicyPollCard';
import { Button } from '@/components/ui/button';
import { PlusCircle, BarChart2 } from 'lucide-react';
import Link from 'next/link';

export default async function PolicyPulsePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: polls } = await supabase
        .from('policy_polls')
        .select('*')
        .neq('status', 'draft')
        .order('created_at', { ascending: false })
        .limit(50);

    let submittedPollIds = new Set<string>();
    if (user && polls?.length) {
        const { data: submissions } = await supabase
            .from('poll_submissions')
            .select('poll_id')
            .eq('user_id', user.id)
            .in('poll_id', polls.map(p => p.id));
        submissions?.forEach(s => submittedPollIds.add(s.poll_id));
    }

    const activePolls = polls?.filter(p => p.status === 'active' && (!p.closes_at || new Date(p.closes_at) > new Date())) ?? [];
    const closedPolls = polls?.filter(p => p.status === 'closed' || (p.closes_at && new Date(p.closes_at) <= new Date())) ?? [];

    return (
        <div className="space-y-10">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-civic-earth/10 pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-civic-green-dark flex items-center gap-3">
                        <BarChart2 className="h-8 w-8" />
                        Youth Policy Pulse
                    </h1>
                    <p className="text-muted-foreground text-lg mt-1 max-w-2xl">
                        Share your voice on policy issues. Your responses are analyzed to inform policymakers and support youth advocacy.
                    </p>
                </div>
                {user && (
                    <Button asChild className="bg-civic-green hover:bg-civic-green-dark text-white shadow-md shrink-0">
                        <Link href="/community/policy-pulse/create">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Create Poll
                        </Link>
                    </Button>
                )}
            </div>

            {/* Active Polls */}
            {activePolls.length > 0 && (
                <section>
                    <h2 className="text-xl font-semibold mb-4 text-foreground">Active Polls</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {activePolls.map(poll => (
                            <PolicyPollCard
                                key={poll.id}
                                poll={poll}
                                hasResponded={submittedPollIds.has(poll.id)}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* Closed / Completed Polls */}
            {closedPolls.length > 0 && (
                <section>
                    <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
                        Completed Polls
                        <span className="text-sm font-normal text-muted-foreground">— view results & AI insights</span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {closedPolls.map(poll => (
                            <PolicyPollCard
                                key={poll.id}
                                poll={poll}
                                hasResponded={submittedPollIds.has(poll.id)}
                            />
                        ))}
                    </div>
                </section>
            )}

            {(!polls || polls.length === 0) && (
                <div className="text-center py-20 bg-muted/20 rounded-xl border border-dashed border-border">
                    <BarChart2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                    <h3 className="text-xl font-medium text-foreground mb-2">No Polls Yet</h3>
                    <p className="text-muted-foreground mb-6">Be the first to start a policy conversation.</p>
                    {user && (
                        <Button asChild variant="outline" className="border-civic-green text-civic-green">
                            <Link href="/community/policy-pulse/create">Create a Poll</Link>
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
