'use client';

import { useState, useMemo } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, ExternalLink, DollarSign, Building2, Loader2, MessageSquare, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow, format } from 'date-fns';

function fmt(amount: number | null, currency = 'KES') {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

const STATUS_STYLES: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    disbursing: 'bg-blue-100 text-blue-800',
    closed: 'bg-gray-100 text-gray-700',
    suspended: 'bg-red-100 text-red-800',
};

export default function FundDetailClient({ fund, allocations, disbursements, comments: initialComments, user }: {
    fund: any; allocations: any[]; disbursements: any[]; comments: any[]; user: any;
}) {
    const [comments, setComments] = useState(initialComments);
    const [newComment, setNewComment] = useState('');
    const [commentType, setCommentType] = useState('comment');
    const [isPosting, setIsPosting] = useState(false);
    const { toast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const disbursedPct = fund.total_amount > 0
        ? Math.min((fund.amount_disbursed / fund.total_amount) * 100, 100)
        : 0;

    const totalAllocPct = allocations.reduce((s, a) => s + (a.percentage ?? 0), 0);

    const handleComment = async () => {
        if (!user) { toast({ title: 'Login required', variant: 'destructive' }); return; }
        if (!newComment.trim()) return;
        setIsPosting(true);
        try {
            const { data, error } = await supabase.from('fund_comments').insert({
                fund_id: fund.id,
                user_id: user.id,
                content: newComment.trim(),
                comment_type: commentType,
            }).select('*, profiles(full_name, avatar_url)').single();

            if (error) throw error;
            setComments(prev => [data, ...prev]);
            setNewComment('');
            toast({ title: 'Comment posted', className: 'bg-civic-green text-white border-none' });
        } catch {
            toast({ title: 'Error', description: 'Failed to post comment.', variant: 'destructive' });
        } finally {
            setIsPosting(false);
        }
    };

    const commentTypeColors: Record<string, string> = {
        comment: 'bg-gray-100 text-gray-700',
        concern: 'bg-red-100 text-red-700',
        feedback: 'bg-blue-100 text-blue-700',
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 py-4">
            <Button variant="ghost" asChild>
                <Link href="/community/funds"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Fund Tracker</Link>
            </Button>

            {/* Header */}
            <div className="space-y-3">
                <div className="flex flex-wrap gap-2 items-center">
                    {fund.sector && <Badge variant="outline">{fund.sector}</Badge>}
                    <Badge className={`capitalize ${STATUS_STYLES[fund.status] ?? STATUS_STYLES.active}`}>{fund.status}</Badge>
                </div>
                <h1 className="text-3xl font-bold text-foreground">{fund.title}</h1>
                {fund.managing_body && (
                    <p className="text-muted-foreground flex items-center gap-2">
                        <Building2 className="h-4 w-4" /> {fund.managing_body}
                        {fund.fund_source && <> · Source: {fund.fund_source}</>}
                    </p>
                )}
                {fund.description && <p className="text-foreground/80 text-lg leading-relaxed">{fund.description}</p>}
                {fund.official_url && (
                    <a href={fund.official_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-civic-green hover:underline">
                        Official Source <ExternalLink className="h-3 w-3" />
                    </a>
                )}
            </div>

            {/* Disbursement overview */}
            <Card className="border-civic-green/20 bg-civic-green/5">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base text-civic-green-dark flex items-center gap-2">
                        <DollarSign className="h-5 w-5" /> Fund Overview
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
                            <p className="text-xl font-bold text-civic-green-dark">{fmt(fund.total_amount, fund.currency)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Disbursed</p>
                            <p className="text-xl font-bold text-civic-clay">{fmt(fund.amount_disbursed, fund.currency)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Remaining</p>
                            <p className="text-xl font-bold">{fmt((fund.total_amount ?? 0) - (fund.amount_disbursed ?? 0), fund.currency)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Beneficiaries</p>
                            <p className="text-sm font-semibold mt-1">{fund.target_beneficiaries ?? 'N/A'}</p>
                        </div>
                    </div>
                    {fund.total_amount > 0 && (
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs font-medium">
                                <span className="text-muted-foreground">Disbursement Progress</span>
                                <span className="text-civic-green-dark">{disbursedPct.toFixed(1)}%</span>
                            </div>
                            <Progress value={disbursedPct} className="h-3 bg-muted [&>div]:bg-civic-green" />
                        </div>
                    )}
                    {fund.application_deadline && (
                        <p className="text-sm text-muted-foreground">
                            Application deadline: <strong>{format(new Date(fund.application_deadline), 'dd MMM yyyy')}</strong>
                            {new Date(fund.application_deadline) > new Date() && (
                                <span className="text-civic-green ml-1">({formatDistanceToNow(new Date(fund.application_deadline), { addSuffix: true })})</span>
                            )}
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Allocations */}
            {allocations.length > 0 && (
                <Card className="border-border/50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">How It's Allocated</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {allocations.map(a => (
                                <div key={a.id} className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="font-medium">{a.category}</span>
                                        <span className="text-muted-foreground">
                                            {a.percentage ? `${a.percentage}%` : ''} {a.amount ? `(${fmt(a.amount, fund.currency)})` : ''}
                                        </span>
                                    </div>
                                    {a.percentage && (
                                        <Progress value={a.percentage} className="h-2 bg-muted [&>div]:bg-civic-clay" />
                                    )}
                                    {a.notes && <p className="text-xs text-muted-foreground">{a.notes}</p>}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Disbursements timeline */}
            {disbursements.length > 0 && (
                <Card className="border-border/50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Disbursement History</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {disbursements.map(d => (
                                <div key={d.id} className="flex gap-4 items-start border-b border-border/40 pb-3 last:border-0 last:pb-0">
                                    <div className="text-xs text-muted-foreground shrink-0 w-24 pt-0.5">
                                        {format(new Date(d.disbursement_date), 'dd MMM yyyy')}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold text-sm text-civic-green-dark">{fmt(d.amount, fund.currency)}</span>
                                            <Badge variant="outline" className="text-xs capitalize">{d.disbursement_type}</Badge>
                                            {d.verified && (
                                                <span className="flex items-center gap-0.5 text-xs text-green-600">
                                                    <CheckCircle2 className="h-3 w-3" /> Verified
                                                </span>
                                            )}
                                        </div>
                                        {d.recipient_description && <p className="text-xs text-muted-foreground mt-0.5">{d.recipient_description}</p>}
                                        {d.source_url && (
                                            <a href={d.source_url} target="_blank" rel="noopener noreferrer"
                                                className="text-xs text-civic-green hover:underline flex items-center gap-0.5 mt-0.5">
                                                Source <ExternalLink className="h-2.5 w-2.5" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Comments */}
            <Card className="border-border/50">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" /> Public Comments ({comments.length})
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {user ? (
                        <div className="space-y-2 p-4 bg-muted/20 rounded-xl border border-border/50">
                            <Select value={commentType} onValueChange={setCommentType}>
                                <SelectTrigger className="w-40">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="comment">Comment</SelectItem>
                                    <SelectItem value="concern">Concern</SelectItem>
                                    <SelectItem value="feedback">Feedback</SelectItem>
                                </SelectContent>
                            </Select>
                            <Textarea placeholder="Share your thoughts, ask a question, or raise a concern…"
                                value={newComment} onChange={e => setNewComment(e.target.value)} className="min-h-[80px]" />
                            <Button size="sm" className="bg-civic-green hover:bg-civic-green-dark text-white"
                                onClick={handleComment} disabled={isPosting || !newComment.trim()}>
                                {isPosting ? <><Loader2 className="mr-2 h-3 w-3 animate-spin" /> Posting…</> : 'Post Comment'}
                            </Button>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground p-4 bg-muted/20 rounded-lg">
                            <Link href="/login" className="text-civic-green hover:underline">Sign in</Link> to comment.
                        </p>
                    )}

                    {comments.map(c => (
                        <div key={c.id} className="flex gap-3 items-start">
                            <div className="w-8 h-8 rounded-full bg-civic-green/20 flex items-center justify-center shrink-0 text-sm font-bold text-civic-green-dark">
                                {c.profiles?.full_name?.[0]?.toUpperCase() ?? '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-medium">{c.profiles?.full_name ?? 'Anonymous'}</span>
                                    <Badge className={`text-xs capitalize ${commentTypeColors[c.comment_type] ?? commentTypeColors.comment}`}>
                                        {c.comment_type}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                        {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                                    </span>
                                </div>
                                <p className="text-sm text-foreground/80">{c.content}</p>
                            </div>
                        </div>
                    ))}

                    {comments.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-6">No comments yet. Be the first to ask a question or raise a concern.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
