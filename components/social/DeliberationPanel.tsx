'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/app/utils/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
    Award, BarChart2, CheckCircle2, ChevronDown, ChevronUp, Loader2, 
    MessageSquare, Plus, Send, ShieldAlert, Sparkles, TrendingUp, Users 
} from 'lucide-react';
import { getProfileDisplayName, getProfileInitials } from '@/lib/social/profile-display';

interface DeliberationPanelProps {
    parentType: 'poll' | 'post' | 'fund' | 'project' | 'petition' | 'course' | 'policy';
    parentId: string;
    currentUser: any;
}

export default function DeliberationPanel({ parentType, parentId, currentUser }: DeliberationPanelProps) {
    const [track, setTrack] = useState<'funding' | 'governance'>('governance');
    const [recs, setRecs] = useState<any[]>([]);
    const [votes, setVotes] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form fields
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [showForm, setShowForm] = useState(false);

    const supabase = useMemo(() => createClient(), []);
    const { toast } = useToast();

    // Fetch recommendations and user's votes
    const fetchData = async () => {
        setLoading(true);
        try {
            // Get recommendations
            const { data: recsData, error: recsErr } = await supabase
                .from('deliberation_recommendations')
                .select(`
                    *,
                    profiles(username, full_name, avatar_url)
                `)
                .eq('parent_type', parentType)
                .eq('parent_id', parentId)
                .eq('track', track)
                .order('consensus_score', { ascending: false });

            if (recsErr) throw recsErr;
            setRecs(recsData ?? []);

            // Get user votes if logged in
            if (currentUser && recsData?.length) {
                const recIds = recsData.map(r => r.id);
                const { data: votesData, error: votesErr } = await supabase
                    .from('recommendation_votes')
                    .select('recommendation_id, vote_type')
                    .eq('user_id', currentUser.id)
                    .in('recommendation_id', recIds);

                if (votesErr) throw votesErr;
                
                const votesMap: Record<string, string> = {};
                votesData?.forEach(v => {
                    votesMap[v.recommendation_id] = v.vote_type;
                });
                setVotes(votesMap);
            }
        } catch (err: any) {
            console.error('Error fetching deliberation data:', err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (parentId) fetchData();
    }, [parentId, track, currentUser]);

    // Handle Upvote/Downvote
    const handleVote = async (recId: string, type: 'upvote' | 'downvote') => {
        if (!currentUser) {
            toast({ title: 'Authentication Required', description: 'Please sign in to vote and participate.', variant: 'destructive' });
            return;
        }

        const currentVote = votes[recId];
        
        try {
            if (currentVote === type) {
                // Remove vote if clicked again
                const { error } = await supabase
                    .from('recommendation_votes')
                    .delete()
                    .eq('recommendation_id', recId)
                    .eq('user_id', currentUser.id);

                if (error) throw error;
                
                setVotes(prev => {
                    const next = { ...prev };
                    delete next[recId];
                    return next;
                });
                
                setRecs(prev => prev.map(r => {
                    if (r.id === recId) {
                        return {
                            ...r,
                            consensus_score: r.consensus_score + (type === 'upvote' ? -1 : 1)
                        };
                    }
                    return r;
                }));
            } else {
                // Replace any existing vote first so the INSERT/DELETE score
                // trigger stays correct and repeated clicks never hit the
                // composite unique constraint.
                const { error: clearErr } = await supabase
                    .from('recommendation_votes')
                    .delete()
                    .eq('recommendation_id', recId)
                    .eq('user_id', currentUser.id);

                if (clearErr) throw clearErr;

                const { error } = await supabase
                    .from('recommendation_votes')
                    .upsert({
                        recommendation_id: recId,
                        user_id: currentUser.id,
                        vote_type: type
                    }, {
                        onConflict: 'recommendation_id,user_id',
                        ignoreDuplicates: true
                    });

                if (error) throw error;

                setVotes(prev => ({ ...prev, [recId]: type }));
                
                setRecs(prev => prev.map(r => {
                    if (r.id === recId) {
                        let scoreDiff = 0;
                        if (!currentVote) {
                            scoreDiff = type === 'upvote' ? 1 : -1;
                        } else {
                            scoreDiff = type === 'upvote' ? 2 : -2;
                        }
                        return {
                            ...r,
                            consensus_score: r.consensus_score + scoreDiff
                        };
                    }
                    return r;
                }));
            }
        } catch (err: any) {
            toast({ title: 'Vote Failed', description: err.message, variant: 'destructive' });
        }
    };

    // Add new recommendation
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) {
            toast({ title: 'Authentication Required', description: 'Please sign in to add a recommendation.', variant: 'destructive' });
            return;
        }

        if (!newTitle.trim() || !newDesc.trim()) {
            toast({ title: 'Missing Fields', description: 'Please provide both a title and description.', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        try {
            const { data, error } = await supabase
                .from('deliberation_recommendations')
                .insert({
                    track,
                    parent_type: parentType,
                    parent_id: parentId,
                    title: newTitle.trim(),
                    description: newDesc.trim(),
                    created_by: currentUser.id
                })
                .select(`
                    *,
                    profiles(username, full_name, avatar_url)
                `)
                .single();

            if (error) throw error;

            setRecs(prev => [data, ...prev]);
            setNewTitle('');
            setNewDesc('');
            setShowForm(false);
            toast({ title: 'Recommendation Added', className: 'bg-civic-green text-white border-none' });
        } catch (err: any) {
            toast({ title: 'Failed to Add', description: err.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Calculate consensus state
    const consensusState = useMemo(() => {
        const total = recs.length;
        if (total === 0) return { label: 'Awaiting proposals', color: 'bg-muted text-muted-foreground' };
        
        const sumScore = recs.reduce((sum, r) => sum + r.consensus_score, 0);
        const avg = sumScore / total;
        
        if (avg >= 5) return { label: 'High Consensus Built', color: 'bg-green-100 text-green-800 border-green-200' };
        if (avg >= 1) return { label: 'Consensus Building', color: 'bg-orange-100 text-orange-800 border-orange-200' };
        return { label: 'Divided / Debate Ongoing', color: 'bg-civic-clay/10 text-civic-clay border-civic-clay/20' };
    }, [recs]);

    return (
        <Card className="border-civic-green/20 shadow-md">
            <CardHeader className="border-b border-border/40 pb-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <CardTitle className="text-xl font-bold text-civic-green-dark flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-civic-green" />
                            Youth Deliberation & Consensus Space
                        </CardTitle>
                        <CardDescription className="text-sm">
                            Debate ideas, submit recommendations, and vote to build youth consensus on this initiative.
                        </CardDescription>
                    </div>
                    <Badge variant="outline" className={`py-1 px-3 font-semibold border ${consensusState.color}`}>
                        {consensusState.label}
                    </Badge>
                </div>

                {/* Track Switcher */}
                <div className="flex gap-2 mt-5 bg-muted/40 p-1.5 rounded-xl border">
                    <button
                        onClick={() => { setTrack('governance'); setShowForm(false); }}
                        className={`flex-1 py-2 text-xs md:text-sm font-semibold rounded-lg transition-all
                            ${track === 'governance'
                                ? 'bg-white text-civic-green-dark shadow-sm border border-border/40'
                                : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        🗳️ Track 1: Inclusion in Governance
                    </button>
                    <button
                        onClick={() => { setTrack('funding'); setShowForm(false); }}
                        className={`flex-1 py-2 text-xs md:text-sm font-semibold rounded-lg transition-all
                            ${track === 'funding'
                                ? 'bg-white text-civic-green-dark shadow-sm border border-border/40'
                                : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        💰 Track 2: Inclusion in Funding
                    </button>
                </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
                
                {/* Add recommendation panel */}
                {!showForm ? (
                    currentUser ? (
                        <Button 
                            variant="outline" 
                            className="w-full border-dashed border-civic-green/40 hover:bg-civic-green/5 text-civic-green-dark h-11"
                            onClick={() => setShowForm(true)}
                        >
                            <Plus className="mr-2 h-4 w-4" /> Submit a Deliberative Recommendation
                        </Button>
                    ) : (
                        <div className="p-4 bg-muted/30 rounded-xl text-center text-sm text-muted-foreground">
                            Please <Link href="/login" className="text-civic-green font-semibold hover:underline">sign in</Link> to submit recommendations.
                        </div>
                    )
                ) : (
                    <form onSubmit={handleSubmit} className="p-4 bg-muted/20 border border-border/50 rounded-2xl space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-foreground">Recommendation Title</label>
                            <Input 
                                placeholder="E.g., Require 30% Youth Quota in local Ward committees" 
                                value={newTitle}
                                onChange={e => setNewTitle(e.target.value)}
                                maxLength={100}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-foreground">Actionable Details & Rationale</label>
                            <Textarea 
                                placeholder="Explain what specifically should be done, why it matters, and how to execute it..." 
                                value={newDesc}
                                onChange={e => setNewDesc(e.target.value)}
                                className="min-h-[100px]"
                                required
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                            <Button type="submit" className="bg-civic-green hover:bg-civic-green-dark text-white gap-2" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                Submit proposal
                            </Button>
                        </div>
                    </form>
                )}

                {/* Recommendations List */}
                {loading ? (
                    <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Loading recommendations…</span>
                    </div>
                ) : recs.length === 0 ? (
                    <div className="text-center py-12 bg-muted/10 rounded-xl border border-dashed border-border/60">
                        <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                        <h4 className="text-base font-semibold text-foreground mb-1">No Recommendations Yet</h4>
                        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                            Be the first to submit a proposal on how youth can be included under this track!
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {recs.map(rec => {
                            const userVote = votes[rec.id];
                            return (
                                <div 
                                    key={rec.id} 
                                    className="flex items-start gap-4 p-4 bg-white border border-border/50 rounded-2xl hover:shadow-sm transition-all"
                                >
                                    {/* Voting arrows */}
                                    <div className="flex flex-col items-center shrink-0 bg-muted/30 px-2.5 py-2 rounded-xl">
                                        <button
                                            onClick={() => handleVote(rec.id, 'upvote')}
                                            className={`p-1 rounded-md transition-colors ${
                                                userVote === 'upvote'
                                                    ? 'text-green-600 bg-green-50'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            <ChevronUp className="h-5 w-5" />
                                        </button>
                                        <span className={`text-sm font-bold my-1 ${
                                            rec.consensus_score > 0 
                                                ? 'text-green-600' 
                                                : rec.consensus_score < 0 
                                                    ? 'text-red-500' 
                                                    : 'text-muted-foreground'
                                        }`}>
                                            {rec.consensus_score}
                                        </span>
                                        <button
                                            onClick={() => handleVote(rec.id, 'downvote')}
                                            className={`p-1 rounded-md transition-colors ${
                                                userVote === 'downvote'
                                                    ? 'text-red-500 bg-red-50'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            <ChevronDown className="h-5 w-5" />
                                        </button>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0 space-y-2">
                                        <div>
                                            <h4 className="text-base font-bold text-foreground leading-snug">
                                                {rec.title}
                                            </h4>
                                            <p className="text-sm text-muted-foreground leading-relaxed mt-1 whitespace-pre-wrap">
                                                {rec.description}
                                            </p>
                                        </div>

                                        {/* Metadata */}
                                        <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-muted-foreground pt-1 border-t border-border/30">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-5 h-5 rounded-full bg-civic-green/10 flex items-center justify-center font-bold text-civic-green text-[10px]">
                                                    {getProfileInitials(rec.profiles, 'Y')}
                                                </div>
                                                <span className="font-semibold text-foreground/80">
                                                    {getProfileDisplayName(rec.profiles, 'Youth leader')}
                                                </span>
                                            </div>
                                            <span>
                                                {new Date(rec.created_at).toLocaleDateString('en-KE', { 
                                                    dateStyle: 'medium' 
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
