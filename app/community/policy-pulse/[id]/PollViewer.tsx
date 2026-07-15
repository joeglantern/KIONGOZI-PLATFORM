'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/app/utils/supabase/client';
import { useUser } from '@/app/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
    ArrowLeft, Check, CheckCircle2, ClipboardCopy, Download, Loader2, Printer, RefreshCw,
    Sparkles, Trash2, Users, FileText, BarChart2, Compass, Zap, Target, ShieldAlert, Megaphone, FlaskConical, Info,
    Layers, AlertTriangle, MapPin, Landmark, Building2, Scale
} from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DeliberationPanel from '@/components/social/DeliberationPanel';
import PollComments from '@/components/social/PollComments';

interface PollViewerProps {
    poll: any;
    questions: any[];
    user: any;
    hasSubmitted: boolean;
    isClosed: boolean;
}

export default function PollViewer({ poll, questions, user, hasSubmitted, isClosed }: PollViewerProps) {
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [insightsText, setInsightsText] = useState(poll.ai_insights ?? '');
    const [activeBrief, setActiveBrief] = useState<any>(null);

    const { profile } = useUser();
    const isOwner = user?.id && poll.created_by === user.id;
    const isAnonymous = !user;

    const anonSessionId = useMemo(() => {
        if (typeof window === 'undefined') return null;
        const KEY = 'kiongozi.anon_session_id';
        let id = window.localStorage.getItem(KEY);
        if (!id) {
            id = (crypto?.randomUUID?.() ?? (Date.now().toString(36) + Math.random().toString(36).slice(2)));
            window.localStorage.setItem(KEY, id);
        }
        return id;
    }, []);

    const [submitted, setSubmitted] = useState(hasSubmitted);
    const [liveQuestions, setLiveQuestions] = useState(questions);
    const router = useRouter();
    const { toast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const ANON_VOTED_KEY = `kiongozi.poll_voted.${poll.id}`;
    const [anonVoted, setAnonVoted] = useState(false);
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (window.localStorage.getItem(ANON_VOTED_KEY) === '1') setAnonVoted(true);
    }, [ANON_VOTED_KEY]);
    
    const showResults = submitted || isClosed || (isAnonymous && anonVoted);

    // Fetch the versioned brief (Published first, then user's draft)
    const loadBrief = async () => {
        try {
            // 1. Fetch published brief
            const { data: pubData } = await supabase
                .from('policy_briefs')
                .select('*')
                .eq('poll_id', poll.id)
                .eq('status', 'published')
                .maybeSingle();

            if (pubData) {
                setActiveBrief(pubData);
                setInsightsText(pubData.content);
                return;
            }

            // 2. Fetch current user's draft brief
            if (user) {
                const { data: draftData } = await supabase
                    .from('policy_briefs')
                    .select('*')
                    .eq('poll_id', poll.id)
                    .eq('generated_by', user.id)
                    .eq('status', 'draft')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (draftData) {
                    setActiveBrief(draftData);
                    setInsightsText(draftData.content);
                }
            }
        } catch (err) {
            console.error('Error loading brief:', err);
        }
    };

    useEffect(() => {
        if (showResults) loadBrief();
    }, [showResults, user]);

    const handleDelete = async () => {
        if (!window.confirm('Delete this poll? This cannot be undone.')) return;
        setIsDeleting(true);
        try {
            const { error } = await supabase.from('policy_polls').delete().eq('id', poll.id);
            if (error) throw error;
            toast({ title: 'Poll deleted', className: 'bg-destructive text-white border-none' });
            router.push('/community/policy-pulse');
        } catch {
            toast({ title: 'Failed to delete poll', variant: 'destructive' });
            setIsDeleting(false);
        }
    };

    const setAnswer = (questionId: string, value: any) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    };

    const toggleMulti = (questionId: string, optionId: string) => {
        setAnswers(prev => {
            const current: string[] = prev[questionId] ?? [];
            return {
                ...prev,
                [questionId]: current.includes(optionId)
                    ? current.filter(id => id !== optionId)
                    : [...current, optionId],
            };
        });
    };

    const handleSubmit = async () => {
        const unanswered = liveQuestions.filter(q => q.required && !answers[q.id]);
        if (unanswered.length > 0) {
            toast({ title: 'Incomplete', description: 'Please answer all required questions.', variant: 'destructive' });
            return;
        }

        // County is sourced from the respondent's profile (captured at
        // onboarding) so the AI brief can report regional differences.
        // Anonymous respondents have no profile, so this stays null for them.
        const identityFields = user
            ? { user_id: user.id as string, anon_session_id: null, county: profile?.county ?? null }
            : { user_id: null, anon_session_id: anonSessionId, county: null };

        setIsSubmitting(true);
        try {
            const responseRows = (liveQuestions as any[]).flatMap((q: any): Record<string, unknown>[] => {
                const ans = answers[q.id];
                if (ans === undefined || ans === null || ans === '') return [];

                if (q.question_type === 'single_choice') {
                    return [{ poll_id: poll.id, question_id: q.id, option_id: ans, ...identityFields }];
                }
                if (q.question_type === 'multiple_choice') {
                    const selected = ans as string[];
                    if (!selected.length) return [];
                    return selected.map((optId: string) => ({
                        poll_id: poll.id,
                        question_id: q.id,
                        option_id: optId,
                        ...identityFields,
                    }));
                }
                if (q.question_type === 'scale') {
                    return [{ poll_id: poll.id, question_id: q.id, scale_value: ans, ...identityFields }];
                }
                return [{ poll_id: poll.id, question_id: q.id, text_response: ans, ...identityFields }];
            });

            if (responseRows.length > 0) {
                const { error: respErr } = await supabase.from('poll_responses').insert(responseRows);
                if (respErr) throw new Error(respErr.message);
            }

            const { error: subErr } = await supabase.from('poll_submissions').insert({ poll_id: poll.id, ...identityFields });
            if (subErr && subErr.code !== '23505') throw new Error(subErr.message);

            const { data: freshQuestions } = await supabase
                .from('poll_questions')
                .select('*, poll_options(*)')
                .eq('poll_id', poll.id)
                .order('question_order');
            if (freshQuestions) setLiveQuestions(freshQuestions);

            if (typeof window !== 'undefined') window.localStorage.setItem(ANON_VOTED_KEY, '1');

            setSubmitted(true);
            toast({ title: 'Response submitted!', className: 'bg-civic-green text-white border-none' });
            router.refresh();
        } catch (err: any) {
            console.error('Poll submit failed:', err?.message ?? err);
            toast({ title: 'Error', description: err?.message || 'Failed to submit. Try again.', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const generateInsights = async () => {
        setIsGeneratingInsights(true);
        try {
            const res = await fetch(`/api/community/policy-pulse/${poll.id}/analyze`, { method: 'POST' });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Policy brief generation failed');
            }
            if (data.insights) {
                setInsightsText(data.insights);
                await loadBrief(); // Reload brief version history
                toast({
                    title: data.fallback ? 'Policy Brief Generated' : 'AI Insights Generated',
                    description: data.warning,
                    className: 'bg-civic-green text-white border-none'
                });
            } else {
                throw new Error('No policy brief was returned');
            }
        } catch (err: any) {
            toast({
                title: 'Failed to generate insights',
                description: err?.message || 'Please try again',
                variant: 'destructive'
            });
        } finally {
            setIsGeneratingInsights(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8 py-4">
            <div className="flex items-center justify-between gap-4">
                <Button variant="ghost" asChild>
                    <Link href="/community/policy-pulse">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Link>
                </Button>
                {isOwner && (
                    <Button variant="outline" size="sm"
                        className="border-destructive/40 text-destructive hover:bg-destructive/5"
                        onClick={handleDelete} disabled={isDeleting}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        {isDeleting ? 'Deleting…' : 'Delete Poll'}
                    </Button>
                )}
            </div>

            {/* Poll Header */}
            <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                    <Badge className="capitalize bg-civic-green/10 text-civic-green-dark border-civic-green/20">{poll.category}</Badge>
                    {isClosed
                        ? <Badge variant="secondary">Closed</Badge>
                        : <Badge className="bg-civic-clay/10 text-civic-clay border-civic-clay/20">Open</Badge>}
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-foreground leading-tight">{poll.title}</h1>
                    {poll.description && <p className="text-muted-foreground text-base mt-2 leading-relaxed">{poll.description}</p>}
                </div>

                {/* Poll Context Parameters */}
                {(poll.what_context || poll.why_context || poll.how_context || poll.impact_context) && (
                    <Card className="border-civic-green/10 bg-civic-green/[0.02] rounded-2xl">
                        <CardHeader className="pb-2 pt-4 px-5">
                            <CardTitle className="text-sm font-bold text-civic-green-dark flex items-center gap-2">
                                <Info className="h-4 w-4" /> About this Policy Issue
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-5 pb-4 space-y-3 text-xs md:text-sm">
                            {poll.what_context && (
                                <div>
                                    <span className="font-bold text-foreground/80 block">What is the proposal?</span>
                                    <span className="text-muted-foreground">{poll.what_context}</span>
                                </div>
                            )}
                            {poll.why_context && (
                                <div>
                                    <span className="font-bold text-foreground/80 block">Why is this being proposed?</span>
                                    <span className="text-muted-foreground">{poll.why_context}</span>
                                </div>
                            )}
                            {poll.how_context && (
                                <div>
                                    <span className="font-bold text-foreground/80 block">How will it be implemented?</span>
                                    <span className="text-muted-foreground">{poll.how_context}</span>
                                </div>
                            )}
                            {poll.impact_context && (
                                <div>
                                    <span className="font-bold text-foreground/80 block">What is the expected impact on youth?</span>
                                    <span className="text-muted-foreground">{poll.impact_context}</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Users className="h-4 w-4" /> {poll.response_count} {poll.response_count === 1 ? 'response' : 'responses'} recorded
                </p>
            </div>

            {/* Submitted banner */}
            {submitted && (
                <div className="flex items-center gap-3 p-4 bg-civic-green/5 rounded-xl border border-civic-green/20 text-civic-green-dark">
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    <span className="font-medium">Thank you for participating! Your responses are included in the results below.</span>
                </div>
            )}

            {/* Anonymous voting notice on open polls */}
            {isAnonymous && !isClosed && !anonVoted && (
                <div className="flex items-start gap-3 p-4 bg-civic-green/5 rounded-xl border border-civic-green/20 text-civic-green-dark">
                    <Megaphone className="h-5 w-5 shrink-0 mt-0.5" />
                    <div className="text-sm">
                        <p className="font-semibold text-foreground">Vote anonymously</p>
                        <p className="text-muted-foreground">No account needed — your responses are tied to a private browser token, not to you personally.</p>
                    </div>
                </div>
            )}

            {/* Questions */}
            <div className="space-y-6">
                {liveQuestions.map((q, qi) => (
                    <Card key={q.id} className="border-border/50 rounded-2xl shadow-sm overflow-hidden">
                        <CardHeader className="pb-3 bg-muted/20 border-b border-border/20">
                            <CardTitle className="text-base font-semibold text-foreground leading-snug">
                                {qi + 1}. {q.question_text}
                                {q.required && <span className="text-destructive ml-1">*</span>}
                            </CardTitle>
                            
                            {/* Question Level Explanations / Context */}
                            {(q.why_important || q.relation_context || q.expected_action) && (
                                <div className="mt-2.5 p-3 bg-white border rounded-xl space-y-2 text-xs text-muted-foreground">
                                    {q.why_important && (
                                        <div>
                                            <span className="font-bold text-foreground/80">Importance:</span> {q.why_important}
                                        </div>
                                    )}
                                    {q.relation_context && (
                                        <div>
                                            <span className="font-bold text-foreground/80">Relevance:</span> {q.relation_context}
                                        </div>
                                    )}
                                    {q.expected_action && (
                                        <div>
                                            <span className="font-bold text-foreground/80">Action Outcome:</span> {q.expected_action}
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardHeader>
                        <CardContent className="pt-5">
                            {showResults ? (
                                <ResultsView question={q} />
                            ) : (
                                <QuestionInput question={q} answer={answers[q.id]}
                                    setAnswer={v => setAnswer(q.id, v)}
                                    toggleMulti={optId => toggleMulti(q.id, optId)} />
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Submit button */}
            {!showResults && (
                <Button className="w-full bg-civic-green hover:bg-civic-green-dark text-white h-12 text-lg rounded-xl"
                    onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</> : 'Submit My Responses'}
                </Button>
            )}

            {/* AI Insights Panel */}
            {(showResults || insightsText) && (
                <PolicyInsightsPanel
                    poll={poll}
                    insightsText={insightsText}
                    isGenerating={isGeneratingInsights}
                    onGenerate={generateInsights}
                    canGenerate={!!user}
                    activeBrief={activeBrief}
                />
            )}

            {/* Deliberation & Threaded Discussions (Visible once results/submissions are loaded) */}
            {showResults && (
                <div className="space-y-8 border-t pt-8">
                    <DeliberationPanel parentType="poll" parentId={poll.id} currentUser={user} />
                    <PollComments pollId={poll.id} currentUser={user} />
                </div>
            )}
        </div>
    );
}

function QuestionInput({ question, answer, setAnswer, toggleMulti }: {
    question: any; answer: any; setAnswer: (v: any) => void; toggleMulti: (optId: string) => void;
}) {
    if (question.question_type === 'single_choice') {
        return (
            <div className="space-y-2">
                {(question.poll_options ?? []).sort((a: any, b: any) => a.option_order - b.option_order).map((opt: any) => (
                    <label key={opt.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors
                            ${answer === opt.id
                                ? 'border-civic-green bg-civic-green/[0.03] text-civic-green-dark font-semibold'
                                : 'border-border hover:border-civic-green/30 hover:bg-muted/30'}`}>
                        <input type="radio" name={question.id} value={opt.id}
                            checked={answer === opt.id} onChange={() => setAnswer(opt.id)} className="accent-[#2e7d32]" />
                        {opt.option_text}
                    </label>
                ))}
            </div>
        );
    }
    if (question.question_type === 'multiple_choice') {
        const selected: string[] = answer ?? [];
        return (
            <div className="space-y-2">
                {(question.poll_options ?? []).sort((a: any, b: any) => a.option_order - b.option_order).map((opt: any) => (
                    <label key={opt.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors
                            ${selected.includes(opt.id)
                                ? 'border-civic-green bg-civic-green/[0.03] text-civic-green-dark font-semibold'
                                : 'border-border hover:border-civic-green/30 hover:bg-muted/30'}`}>
                        <input type="checkbox" value={opt.id}
                            checked={selected.includes(opt.id)} onChange={() => toggleMulti(opt.id)} className="accent-[#2e7d32]" />
                        {opt.option_text}
                    </label>
                ))}
            </div>
        );
    }
    if (question.question_type === 'scale') {
        return (
            <div className="space-y-3">
                <div className="flex justify-between text-xs text-muted-foreground font-semibold">
                    <span>Strongly Disagree (1)</span>
                    <span>Strongly Agree (10)</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                        <button key={n} type="button"
                            className={`w-10 h-10 rounded-xl border text-sm font-semibold transition-all
                                ${answer === n ? 'bg-civic-green border-civic-green text-white shadow' : 'border-border hover:border-civic-green/50'}`}
                            onClick={() => setAnswer(n)}>
                            {n}
                        </button>
                    ))}
                </div>
            </div>
        );
    }
    return (
        <Textarea placeholder="Explain your reasoning here..." value={answer ?? ''}
            onChange={e => setAnswer(e.target.value)} className="min-h-[100px] rounded-xl" />
    );
}

function ResultsView({ question }: { question: any }) {
    if (question.question_type === 'single_choice' || question.question_type === 'multiple_choice') {
        const opts = (question.poll_options ?? []).sort((a: any, b: any) => a.option_order - b.option_order);
        const total = opts.reduce((sum: number, o: any) => sum + (o.vote_count ?? 0), 0);
        return (
            <div className="space-y-3">
                {opts.map((opt: any) => {
                    const pct = total > 0 ? Math.round((opt.vote_count / total) * 100) : 0;
                    return (
                        <div key={opt.id} className="space-y-1">
                            <div className="flex justify-between text-sm font-medium">
                                <span>{opt.option_text}</span>
                                <span className="text-muted-foreground font-semibold">{pct}% ({opt.vote_count})</span>
                            </div>
                            <Progress value={pct} className="h-2.5 bg-muted rounded-full overflow-hidden [&>div]:bg-civic-green" />
                        </div>
                    );
                })}
                <p className="text-xs text-muted-foreground pt-1">{total} total {total === 1 ? 'response' : 'responses'}</p>
            </div>
        );
    }
    if (question.question_type === 'scale') {
        return (
            <p className="text-sm text-muted-foreground italic">
                Scale responses are included in the AI brief analysis below.
            </p>
        );
    }
    return (
        <p className="text-sm text-muted-foreground italic">
            Written responses are included in the AI brief analysis below.
        </p>
    );
}

const SECTION_ICONS: Record<string, React.ElementType> = {
    'executive summary':                        FileText,
    'key findings':                             BarChart2,
    'emerging themes':                          Layers,
    'frequently mentioned barriers':            AlertTriangle,
    'youth sentiment profile':                  Compass,
    'surprising signals':                       Zap,
    'regional differences':                     MapPin,
    'suggested actions for parliament':         Landmark,
    'suggested actions for county governments': Building2,
    'suggested legislative & policy amendments': Scale,
    'policy recommendations':                   Target,
    'risks and watchpoints':                    ShieldAlert,
    'curated youth voices':                     Megaphone,
    'youth voice':                               Megaphone,
    'research gaps':                             FlaskConical,
};

function InsightSectionHeading({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement> & { children?: React.ReactNode }) {
    const text = (typeof children === 'string' ? children : String(children ?? '')).toLowerCase().trim();
    const Icon = SECTION_ICONS[text] ?? BarChart2;
    return (
        <h2 className="flex items-center gap-2 text-base font-bold text-civic-green-dark border-b border-civic-green/10 pb-1 mt-6 mb-3 not-prose" {...props}>
            <span className="flex items-center justify-center w-6 h-6 rounded-md bg-civic-green/10 shrink-0">
                <Icon className="w-3.5 h-3.5 text-civic-green-dark" />
            </span>
            {children}
        </h2>
    );
}

function PolicyInsightsPanel({ poll, insightsText, isGenerating, onGenerate, canGenerate = true, activeBrief = null }: {
    poll: any;
    insightsText: string;
    isGenerating: boolean;
    onGenerate: () => void;
    canGenerate?: boolean;
    activeBrief?: any;
}) {
    const { toast } = useToast();
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(insightsText);
        setCopied(true);
        toast({ title: 'Copied to clipboard' });
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        const filename = `${poll.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_insights.md`;
        const blob = new Blob([`# Policy Insights: ${poll.title}\n\n${insightsText}`], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handlePrint = () => {
        const win = window.open('', '_blank');
        if (!win) return;
        win.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Policy Insights: ${poll.title}</title>
                <style>
                    body { font-family: Georgia, serif; max-width: 780px; margin: 40px auto; padding: 0 24px; color: #1a1a1a; line-height: 1.7; }
                    h1 { font-size: 22px; border-bottom: 2px solid #2e7d32; padding-bottom: 8px; }
                    h3 { font-size: 17px; color: #1b5e20; margin-top: 24px; }
                    h4 { font-size: 15px; color: #2e7d32; }
                    ul { padding-left: 20px; }
                    li { margin-bottom: 6px; }
                    strong { color: #1a1a1a; }
                    .meta { font-size: 12px; color: #666; margin-bottom: 24px; }
                </style>
            </head>
            <body>
                <h1>Policy Insights Report</h1>
                <p class="meta">Poll: <strong>${poll.title}</strong> &nbsp;·&nbsp; Category: ${poll.category} &nbsp;·&nbsp; ${poll.response_count} responses &nbsp;·&nbsp; Generated by Kiongozi AI</p>
                <div id="content"></div>
                <script>
                    const raw = ${JSON.stringify(insightsText)};
                    const html = raw
                        .replace(/#### (.+)/g, '<h4>$1</h4>')
                        .replace(/### (.+)/g, '<h3>$1</h3>')
                        .replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>')
                        .replace(/^- (.+)/gm, '<li>$1</li>')
                        .replace(/(<li>.*<\\/li>\\n?)+/g, '<ul>$&</ul>')
                        .replace(/\\n\\n/g, '<br><br>');
                    document.getElementById('content').innerHTML = html;
                    window.print();
                </script>
            </body>
            </html>
        `);
        win.document.close();
    };

    return (
        <Card className="border-civic-green/20 overflow-hidden rounded-2xl shadow-md">
            <div className="bg-gradient-to-r from-civic-green to-civic-green-dark px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                    <Sparkles className="h-5 w-5" />
                    <span className="font-semibold text-base">AI Policy Insights Brief</span>
                    {activeBrief && (
                        <Badge className={`text-xs ml-2 border-none ${
                            activeBrief.status === 'published' ? 'bg-green-500/20 text-green-200' : 'bg-orange-500/20 text-orange-200'
                        }`}>
                            {activeBrief.status === 'published' ? 'Official / Published' : 'Personal Draft'}
                        </Badge>
                    )}
                </div>
                {insightsText && (
                    <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost"
                            className="text-white hover:bg-white/20 h-8 px-2 gap-1"
                            onClick={handleCopy}>
                            {copied ? <Check className="h-3.5 w-3.5" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
                            <span className="text-xs hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
                        </Button>
                        <Button size="sm" variant="ghost"
                            className="text-white hover:bg-white/20 h-8 px-2 gap-1"
                            onClick={handleDownload}>
                            <Download className="h-3.5 w-3.5" />
                            <span className="text-xs hidden sm:inline">Download</span>
                        </Button>
                        <Button size="sm" variant="ghost"
                            className="text-white hover:bg-white/20 h-8 px-2 gap-1"
                            onClick={handlePrint}>
                            <Printer className="h-3.5 w-3.5" />
                            <span className="text-xs hidden sm:inline">Print</span>
                        </Button>
                    </div>
                )}
            </div>

            <CardContent className="p-0">
                {insightsText ? (
                    <>
                        <div className="px-6 py-5 prose prose-sm prose-slate max-w-none
                            prose-headings:font-bold
                            prose-h3:text-sm prose-h3:mt-4 prose-h3:mb-1.5 prose-h3:text-foreground
                            prose-h4:text-sm prose-h4:mt-3 prose-h4:mb-1 prose-h4:text-civic-clay
                            prose-strong:text-foreground prose-strong:font-semibold
                            prose-em:text-muted-foreground prose-em:not-italic prose-em:text-xs
                            prose-ul:my-2 prose-li:my-0.5 prose-li:text-foreground/80
                            prose-blockquote:border-l-4 prose-blockquote:border-civic-green/40 prose-blockquote:bg-civic-green/[0.03] prose-blockquote:rounded-r prose-blockquote:py-1 prose-blockquote:text-foreground/70
                            prose-p:text-foreground/80 prose-p:leading-relaxed prose-p:my-2
                            prose-hr:border-border/40 prose-hr:my-4
                            prose-code:text-xs prose-code:bg-muted prose-code:px-1 prose-code:rounded">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{ h2: InsightSectionHeading }}
                            >
                                {insightsText}
                            </ReactMarkdown>
                        </div>

                        <div className="border-t border-border/50" />

                        <div className="px-6 py-3 flex items-center justify-between bg-muted/30">
                            <p className="text-xs text-muted-foreground">
                                Kiongozi AI Policy Analyst · {poll.response_count} responses analysed
                            </p>
                            {poll.response_count >= 3 && canGenerate && (
                                <Button variant="ghost" size="sm"
                                    className="text-civic-green-dark hover:bg-civic-green/10 h-7 gap-1.5 text-xs"
                                    onClick={onGenerate} disabled={isGenerating}>
                                    {isGenerating
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
                            {poll.response_count >= 3
                                ? canGenerate
                                    ? 'Run AI analysis to generate a full policy brief from these responses.'
                                    : 'No AI brief yet. Sign in to run the analysis.'
                                : `Needs at least 3 responses to generate insights. Currently ${poll.response_count}.`}
                        </p>
                        {poll.response_count >= 3 && canGenerate && (
                            <Button className="bg-civic-green hover:bg-civic-green-dark text-white gap-2"
                                onClick={onGenerate} disabled={isGenerating}>
                                {isGenerating
                                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Analysing responses…</>
                                    : <><Sparkles className="h-4 w-4" /> Generate Policy Brief</>}
                                </Button>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
