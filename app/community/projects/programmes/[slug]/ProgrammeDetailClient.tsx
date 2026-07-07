'use client';

import { useMemo, useState } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import { useUser } from '@/app/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
    ArrowLeft, Info, Loader2, MapPin, RefreshCw, Sparkles, ThumbsUp, ThumbsDown,
} from 'lucide-react';
import ImageUpload from '@/components/ui/ImageUpload';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Answer {
    bool: boolean | null;
    text: string;
    photoUrl: string;
}

export default function ProgrammeDetailClient({ programme, questions, responses: initialResponses, user, activeBrief: initialActiveBrief }: {
    programme: any; questions: any[]; responses: any[]; user: any; activeBrief: any;
}) {
    const { profile } = useUser();
    const { toast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const [ward, setWard] = useState('');
    const [responses, setResponses] = useState(initialResponses);
    const [answers, setAnswers] = useState<Record<string, Answer>>({});
    const [submittingId, setSubmittingId] = useState<string | null>(null);
    const [activeBrief, setActiveBrief] = useState<any>(initialActiveBrief);
    const [briefText, setBriefText] = useState<string>(initialActiveBrief?.content ?? '');
    const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);

    const getAnswer = (qid: string): Answer => answers[qid] ?? { bool: null, text: '', photoUrl: '' };
    const setAnswer = (qid: string, patch: Partial<Answer>) => {
        setAnswers(prev => ({ ...prev, [qid]: { ...getAnswer(qid), ...patch } }));
    };

    const submitResponse = async (question: any) => {
        if (!user) { toast({ title: 'Login required', variant: 'destructive' }); return; }
        const answer = getAnswer(question.id);

        if (question.response_type === 'yesno' && answer.bool === null) return;
        if (question.response_type === 'text' && !answer.text.trim() && !answer.photoUrl) return;
        if (question.requires_photo && !answer.photoUrl) {
            toast({ title: 'Photo required', description: 'This question requires a photo upload.', variant: 'destructive' });
            return;
        }

        setSubmittingId(question.id);
        try {
            const { data, error } = await supabase.from('civic_programme_responses').insert({
                programme_id: programme.id,
                question_id: question.id,
                user_id: user.id,
                county: profile?.county ?? null,
                ward: ward.trim() || null,
                response_bool: question.response_type === 'yesno' ? answer.bool : null,
                response_text: answer.text.trim() || null,
                photo_url: answer.photoUrl || null,
            }).select('*').single();

            if (error) throw error;
            setResponses(prev => [{ ...data, profiles: profile ?? null }, ...prev]);
            setAnswers(prev => ({ ...prev, [question.id]: { bool: null, text: '', photoUrl: '' } }));
            toast({ title: 'Response submitted', className: 'bg-civic-green text-white border-none' });
        } catch {
            toast({ title: 'Error', description: 'Failed to submit your response.', variant: 'destructive' });
        } finally {
            setSubmittingId(null);
        }
    };

    const generateBrief = async () => {
        setIsGeneratingBrief(true);
        try {
            const res = await fetch(`/api/community/projects/programmes/${programme.slug}/analyze`, { method: 'POST' });
            const data = await res.json();
            if (data.insights) {
                setBriefText(data.insights);
                toast({ title: 'Monitoring Brief Generated', className: 'bg-civic-green text-white border-none' });
            } else {
                toast({ title: 'Error', description: data.error ?? 'Failed to generate brief.', variant: 'destructive' });
            }
        } catch {
            toast({ title: 'Failed to generate brief', variant: 'destructive' });
        } finally {
            setIsGeneratingBrief(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8 py-4">
            <Button variant="ghost" asChild>
                <Link href="/community/projects"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Project Monitor</Link>
            </Button>

            {/* Header */}
            <div className="space-y-3">
                <Badge variant="outline">{programme.category}</Badge>
                <h1 className="text-3xl font-bold text-foreground">{programme.name}</h1>
                <p className="text-foreground/80 text-lg leading-relaxed">{programme.overview}</p>
            </div>

            <Card className="border-civic-green/10 bg-civic-green/[0.02] rounded-2xl">
                <CardHeader className="pb-2 pt-4 px-5">
                    <CardTitle className="text-sm font-bold text-civic-green-dark flex items-center gap-2">
                        <Info className="h-4 w-4" /> Why Monitor This Programme?
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-4 text-sm text-muted-foreground">
                    {programme.why_monitor}
                </CardContent>
            </Card>

            {/* Ward context (applies to every response submitted below) */}
            {user && (
                <div className="max-w-xs space-y-1.5">
                    <Label htmlFor="ward" className="text-xs font-semibold flex items-center gap-1"><MapPin className="h-3 w-3" /> Your ward (optional)</Label>
                    <Input id="ward" placeholder="e.g. Kibra" value={ward} onChange={e => setWard(e.target.value)} className="h-9 text-sm" />
                    <p className="text-[11px] text-muted-foreground">Applied to responses you submit below{profile?.county ? ` · County: ${profile.county}` : ''}.</p>
                </div>
            )}

            {/* Monitoring Questions */}
            <div className="space-y-6">
                {questions.map((q, qi) => {
                    const qResponses = responses.filter(r => r.question_id === q.id);
                    const answer = getAnswer(q.id);
                    const yes = qResponses.filter(r => r.response_bool === true).length;
                    const no = qResponses.filter(r => r.response_bool === false).length;

                    return (
                        <Card key={q.id} className="border-border/50 rounded-2xl overflow-hidden">
                            <CardHeader className="pb-3 bg-muted/20 border-b border-border/20">
                                <CardTitle className="text-base font-semibold text-foreground leading-snug">
                                    {qi + 1}. {q.question_text}
                                    {q.requires_photo && <span className="text-destructive ml-1 text-xs font-normal">(photo required)</span>}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-5 space-y-4">
                                {user ? (
                                    <div className="space-y-2 p-3 bg-muted/20 rounded-xl border border-border/50">
                                        {q.response_type === 'yesno' && (
                                            <div className="flex gap-2">
                                                <Button type="button" size="sm" variant={answer.bool === true ? 'default' : 'outline'}
                                                    className={answer.bool === true ? 'bg-civic-green hover:bg-civic-green-dark text-white' : ''}
                                                    onClick={() => setAnswer(q.id, { bool: true })}>
                                                    <ThumbsUp className="mr-1.5 h-3.5 w-3.5" /> Yes
                                                </Button>
                                                <Button type="button" size="sm" variant={answer.bool === false ? 'default' : 'outline'}
                                                    className={answer.bool === false ? 'bg-destructive hover:bg-destructive/90 text-white' : ''}
                                                    onClick={() => setAnswer(q.id, { bool: false })}>
                                                    <ThumbsDown className="mr-1.5 h-3.5 w-3.5" /> No
                                                </Button>
                                            </div>
                                        )}
                                        <Textarea
                                            placeholder={q.response_type === 'yesno' ? 'Add a comment (optional)…' : 'Describe what you observed…'}
                                            value={answer.text}
                                            onChange={e => setAnswer(q.id, { text: e.target.value })}
                                            className="min-h-[70px] bg-white"
                                        />
                                        <ImageUpload
                                            onUpload={url => setAnswer(q.id, { photoUrl: url })}
                                            current={answer.photoUrl}
                                            folder="kiongozi/programmes"
                                            label={q.requires_photo ? 'Upload photo (required)' : 'Attach photo evidence (optional)'}
                                            aspectHint="banner"
                                        />
                                        <Button size="sm" className="bg-civic-green hover:bg-civic-green-dark text-white"
                                            onClick={() => submitResponse(q)} disabled={submittingId === q.id}>
                                            {submittingId === q.id
                                                ? <><Loader2 className="mr-2 h-3 w-3 animate-spin" /> Submitting…</>
                                                : 'Submit Response'}
                                        </Button>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground p-3 bg-muted/20 rounded-lg">
                                        <Link href="/login" className="text-civic-green hover:underline">Sign in</Link> to respond.
                                    </p>
                                )}

                                {q.response_type === 'yesno' && (yes + no) > 0 && (
                                    <div className="flex items-center gap-3 text-xs">
                                        <span className="flex items-center gap-1 text-civic-green-dark font-semibold"><ThumbsUp className="h-3 w-3" /> {yes}</span>
                                        <span className="flex items-center gap-1 text-destructive font-semibold"><ThumbsDown className="h-3 w-3" /> {no}</span>
                                        <span className="text-muted-foreground">({yes + no} total)</span>
                                    </div>
                                )}

                                {qResponses.filter(r => r.response_text?.trim() || r.photo_url).length > 0 && (
                                    <div className="space-y-2 pl-1 border-t border-border/30 pt-3">
                                        {qResponses.filter(r => r.response_text?.trim() || r.photo_url).map(r => (
                                            <div key={r.id} className="flex gap-2 items-start text-sm">
                                                <div className="w-6 h-6 rounded-full bg-civic-green/20 flex items-center justify-center shrink-0 text-xs font-bold text-civic-green-dark mt-0.5">
                                                    {r.profiles?.full_name?.[0]?.toUpperCase() ?? '?'}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground mb-0.5">
                                                        <span className="font-medium text-foreground">{r.profiles?.full_name ?? 'Anonymous'}</span>
                                                        {(r.ward || r.county) && <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" /> {[r.ward, r.county].filter(Boolean).join(', ')}</span>}
                                                        <span>{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
                                                    </div>
                                                    {r.response_text && <p className="text-foreground/80">{r.response_text}</p>}
                                                    {r.photo_url && (
                                                        <a href={r.photo_url} target="_blank" rel="noopener noreferrer" className="text-xs text-civic-green hover:underline">View photo</a>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* AI Monitoring Brief */}
            {(responses.length >= 3 || briefText) && (
                <Card className="border-civic-green/20 overflow-hidden rounded-2xl shadow-md">
                    <div className="bg-gradient-to-r from-civic-green to-civic-green-dark px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-white">
                            <Sparkles className="h-5 w-5" />
                            <span className="font-semibold text-base">AI Monitoring Brief</span>
                            {activeBrief && (
                                <Badge className={`text-xs ml-2 border-none ${activeBrief.status === 'published' ? 'bg-green-500/20 text-green-200' : 'bg-orange-500/20 text-orange-200'}`}>
                                    {activeBrief.status === 'published' ? 'Official / Published' : 'Personal Draft'}
                                </Badge>
                            )}
                        </div>
                    </div>
                    <CardContent className="p-0">
                        {briefText ? (
                            <>
                                <div className="px-6 py-5 prose prose-sm prose-slate max-w-none
                                    prose-headings:font-bold prose-h2:text-sm prose-h2:mt-4 prose-h2:mb-1.5 prose-h2:text-civic-green-dark
                                    prose-strong:text-foreground prose-strong:font-semibold
                                    prose-em:text-muted-foreground prose-em:not-italic prose-em:text-xs
                                    prose-ul:my-2 prose-li:my-0.5 prose-li:text-foreground/80
                                    prose-p:text-foreground/80 prose-p:leading-relaxed prose-p:my-2
                                    prose-hr:border-border/40 prose-hr:my-4">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{briefText}</ReactMarkdown>
                                </div>
                                <div className="border-t border-border/50" />
                                <div className="px-6 py-3 flex items-center justify-between bg-muted/30">
                                    <p className="text-xs text-muted-foreground">
                                        Kiongozi AI Monitoring Analyst · {responses.length} responses analysed
                                    </p>
                                    {responses.length >= 3 && user && (
                                        <Button variant="ghost" size="sm" className="text-civic-green-dark hover:bg-civic-green/10 h-7 gap-1.5 text-xs"
                                            onClick={generateBrief} disabled={isGeneratingBrief}>
                                            {isGeneratingBrief
                                                ? <><Loader2 className="h-3 w-3 animate-spin" /> Regenerating…</>
                                                : <><RefreshCw className="h-3 w-3" /> Regenerate Draft</>}
                                        </Button>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="px-6 py-8 text-center space-y-3">
                                <Sparkles className="h-8 w-8 text-civic-green/30 mx-auto" />
                                <p className="text-sm text-muted-foreground">
                                    {user ? 'Run AI analysis to generate a monitoring brief from these citizen responses.' : 'No AI brief yet. Sign in to run the analysis.'}
                                </p>
                                {user && (
                                    <Button className="bg-civic-green hover:bg-civic-green-dark text-white gap-2"
                                        onClick={generateBrief} disabled={isGeneratingBrief}>
                                        {isGeneratingBrief
                                            ? <><Loader2 className="h-4 w-4 animate-spin" /> Analysing responses…</>
                                            : <><Sparkles className="h-4 w-4" /> Generate Monitoring Brief</>}
                                    </Button>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
