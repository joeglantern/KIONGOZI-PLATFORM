import { createClient } from '@/app/utils/supabase/server';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle2, Share2, Flag, FileText } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { notFound } from 'next/navigation';
import PetitionCard from '@/components/social/PetitionCard'; // Reuse logic if possible, but detail view is custom

// We'll create a client component for the interactive parts of the detail view
// to keep the page server-side rendered for SEO
import PetitionActions from './PetitionActions';

export default async function PetitionDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { id } = await params;

    const { data: petition, error } = await supabase
        .from('social_petitions')
        .select(`
            *,
            profiles:created_by (
                username
            )
        `)
        .eq('id', id)
        .single();

    if (error || !petition) {
        notFound();
    }

    // Check if user has signed
    let hasSigned = false;
    if (user) {
        const { data: signature } = await supabase
            .from('social_petition_signatures')
            .select('id')
            .eq('petition_id', id)
            .eq('user_id', user.id)
            .maybeSingle();

        if (signature) hasSigned = true;
    }

    const progress = Math.min((petition.current_signatures / (petition.target_signatures || 100)) * 100, 100);

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <Button variant="ghost" asChild className="mb-4">
                <Link href="/community/petitions">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Petitions
                </Link>
            </Button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {petition.image_url && (
                        <div className="rounded-xl overflow-hidden shadow-sm aspect-video relative">
                            <img
                                src={petition.image_url}
                                alt={petition.title}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}

                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-4">{petition.title}</h1>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6 pb-6 border-b border-border">
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-civic-green/10 flex items-center justify-center text-civic-green-dark font-bold uppercase tracking-widest text-xs">
                                    {(petition.profiles?.username || 'AN').slice(0, 2).toUpperCase()}
                                </div>
                                <span>Started by <span className="font-medium text-foreground">@{petition.profiles?.username || 'anonymous'}</span></span>
                            </div>
                            <span>•</span>
                            <span>{formatDistanceToNow(new Date(petition.created_at), { addSuffix: true })}</span>
                        </div>

                        <div className="prose prose-stone dark:prose-invert max-w-none">
                            <p className="whitespace-pre-wrap leading-relaxed text-lg text-foreground/90">
                                {petition.description}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Sidebar Actions */}
                <div className="space-y-6">
                    <div className="bg-card border border-border rounded-xl p-6 shadow-sm sticky top-24">
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between items-baseline mb-2">
                                    <span className="text-2xl font-bold text-civic-green-dark">{petition.current_signatures}</span>
                                    <span className="text-muted-foreground">of {petition.target_signatures} signatures</span>
                                </div>
                                <Progress value={progress} className="h-3 bg-civic-earth/10 [&>div]:bg-civic-green" />
                            </div>

                            <p className="text-sm text-muted-foreground italic">
                                {petition.current_signatures >= petition.target_signatures
                                    ? "Goal reached! Let's keep going!"
                                    : "Only " + (petition.target_signatures - petition.current_signatures) + " more to reach the next goal!"
                                }
                            </p>

                            <PetitionActions
                                petition={petition}
                                currentUser={user}
                                hasSignedProp={hasSigned}
                            />

                            <div className="pt-4 border-t border-border space-y-3">
                                <div className="flex items-start gap-3 text-sm text-muted-foreground">
                                    <Flag className="h-4 w-4 mt-1 shrink-0" />
                                    <p>The creator of this petition is verified community member.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
