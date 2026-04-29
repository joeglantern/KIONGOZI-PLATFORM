'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/app/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Check, CheckCircle2, ClipboardCopy, Download, Loader2, Printer, RefreshCw, Sparkles, Users } from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface PollViewerProps {
    poll: any;
    questions: any[];
    user: any;
    hasSubmitted: boolean;
    myResponses: Record<string, any>;
    isClosed: boolean;
}

export default function PollViewer({ poll, questions, user, hasSubmitted, myResponses, isClosed }: PollViewerProps) {
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
    const [insightsText, setInsightsText] = useState(poll.ai_insights ?? '');
    const [submitted, setSubmitted] = useState(hasSubmitted);
    const [liveQuestions, setLiveQuestions] = useState(questions);
    const router = useRouter();
    const { toast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const showResults = submitted || isClosed;

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
        if (!user) {
            toast({ title: 'Login required', description: 'Sign in to submit your responses.', variant: 'destructive' });
            return;
        }

        const unanswered = liveQuestions.filter(q => q.required && !answers[q.id]);
        if (unanswered.length > 0) {
            toast({ title: 'Incomplete', description: 'Please answer all required questions.', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        try {
            // Build response rows — skip optional questions with no answer
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const responseRows = (liveQuestions as any[]).flatMap((q: any): Record<string, unknown>[] => {
                const ans = answers[q.id];
                if (ans === undefined || ans === null || ans === '') return [];

                if (q.question_type === 'single_choice') {
                    return [{ poll_id: poll.id, question_id: q.id, option_id: ans, user_id: user.id }];
                }
                if (q.question_type === 'multiple_choice') {
                    const selected = ans as string[];
                    if (!selected.length) return [];
                    return selected.map((optId: string) => ({
                        poll_id: poll.id, question_id: q.id, option_id: optId, user_id: user.id,
                    }));
                }
                if (q.question_type === 'scale') {
                    return [{ poll_id: poll.id, question_id: q.id, scale_value: ans, user_id: user.id }];
                }
                return [{ poll_id: poll.id, question_id: q.id, text_response: ans, user_id: user.id }];
            });

            if (responseRows.length > 0) {
                const { error: respErr } = await supabase.from('poll_responses').insert(responseRows);
                if (respErr) {
                    console.error('poll_responses insert error:', respErr.message, respErr.code, respErr.details, respErr.hint);
                    throw new Error(respErr.message);
                }
            }

            const { error: subErr } = await supabase.from('poll_submissions').insert({ poll_id: poll.id, user_id: user.id });
            if (subErr && subErr.code !== '23505') {
                console.error('poll_submissions insert error:', subErr.message, subErr.code, subErr.details, subErr.hint);
                throw new Error(subErr.message);
            }

            // Re-fetch questions so ResultsView shows up-to-date vote counts immediately
            const { data: freshQuestions } = await supabase
                .from('poll_questions')
                .select('*, poll_options(*)')
                .eq('poll_id', poll.id)
                .order('question_order');
            if (freshQuestions) setLiveQuestions(freshQuestions);

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
            if (data.insights) {
                setInsightsText(data.insights);
                toast({ title: 'AI Insights Generated', className: 'bg-civic-green text-white border-none' });
            }
        } catch {
            toast({ title: 'Failed to generate insights', variant: 'destructive' });
        } finally {
            setIsGeneratingInsights(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8 py-4">
            <div className="flex items-center gap-4">
                <Button variant="ghost" asChild>
                    <Link href="/community/policy-pulse">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Link>
                </Button>
            </div>

            {/* Poll Header */}
            <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                    <Badge className="capitalize bg-civic-green/10 text-civic-green-dark border-civic-green/20">{poll.category}</Badge>
                    {isClosed
                        ? <Badge variant="secondary">Closed</Badge>
                        : <Badge className="bg-civic-clay/10 text-civic-clay border-civic-clay/20">Open</Badge>}
                </div>
                <h1 className="text-3xl font-bold text-foreground">{poll.title}</h1>
                {poll.description && <p className="text-muted-foreground text-lg">{poll.description}</p>}
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Users className="h-4 w-4" /> {poll.response_count} {poll.response_count === 1 ? 'response' : 'responses'}
                </p>
            </div>

            {/* Submitted banner */}
            {submitted && (
                <div className="flex items-center gap-3 p-4 bg-civic-green/5 rounded-xl border border-civic-green/20 text-civic-green-dark">
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    <span className="font-medium">Thank you for participating! Your responses are included in the results below.</span>
                </div>
            )}

            {/* Questions */}
            <div className="space-y-6">
                {liveQuestions.map((q, qi) => (
                    <Card key={q.id} className="border-border/50">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold text-foreground">
                                {qi + 1}. {q.question_text}
                                {q.required && <span className="text-destructive ml-1">*</span>}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
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
                <Button className="w-full bg-civic-green hover:bg-civic-green-dark text-white h-12 text-lg"
                    onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</> : 'Submit My Responses'}
                </Button>
            )}

            {/* AI Insights panel */}
            {showResults && (
                <PolicyInsightsPanel
                    poll={poll}
                    insightsText={insightsText}
                    isGenerating={isGeneratingInsights}
                    onGenerate={generateInsights}
                />
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
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                            ${answer === opt.id
                                ? 'border-civic-green bg-civic-green/5 text-civic-green-dark font-medium'
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
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                            ${selected.includes(opt.id)
                                ? 'border-civic-green bg-civic-green/5 text-civic-green-dark font-medium'
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
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Strongly Disagree (1)</span>
                    <span>Strongly Agree (10)</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                        <button key={n} type="button"
                            className={`w-10 h-10 rounded-lg border text-sm font-medium transition-colors
                                ${answer === n ? 'bg-civic-green border-civic-green text-white' : 'border-border hover:border-civic-green/50'}`}
                            onClick={() => setAnswer(n)}>
                            {n}
                        </button>
                    ))}
                </div>
            </div>
        );
    }
    return (
        <Textarea placeholder="Your response…" value={answer ?? ''}
            onChange={e => setAnswer(e.target.value)} className="min-h-[100px]" />
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
                            <div className="flex justify-between text-sm">
                                <span>{opt.option_text}</span>
                                <span className="text-muted-foreground font-medium">{pct}% ({opt.vote_count})</span>
                            </div>
                            <Progress value={pct} className="h-2 bg-muted [&>div]:bg-civic-green" />
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
                Scale responses are included in the AI analysis above.
            </p>
        );
    }
    return (
        <p className="text-sm text-muted-foreground italic">
            Written responses are included in the AI analysis above.
        </p>
    );
}

function PolicyInsightsPanel({ poll, insightsText, isGenerating, onGenerate }: {
    poll: any;
    insightsText: string;
    isGenerating: boolean;
    onGenerate: () => void;
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
                    // Simple markdown to HTML for print
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
        <Card className="border-civic-green/20 overflow-hidden">
            {/* Header bar */}
            <div className="bg-gradient-to-r from-civic-green to-civic-green-dark px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                    <Sparkles className="h-5 w-5" />
                    <span className="font-semibold text-base">AI Policy Insights</span>
                    {insightsText && (
                        <Badge className="bg-white/20 text-white border-none text-xs ml-1">
                            {poll.response_count} {poll.response_count === 1 ? 'response' : 'responses'} analysed
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
                        {/* Rendered markdown */}
                        <div className="px-6 py-5 prose prose-sm prose-slate max-w-none
                            prose-headings:text-civic-green-dark prose-headings:font-semibold
                            prose-h3:text-base prose-h3:mt-5 prose-h3:mb-2
                            prose-h4:text-sm prose-h4:mt-4 prose-h4:mb-1
                            prose-strong:text-foreground prose-strong:font-semibold
                            prose-ul:my-2 prose-li:my-0.5 prose-li:text-foreground/80
                            prose-p:text-foreground/80 prose-p:leading-relaxed">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {insightsText}
                            </ReactMarkdown>
                        </div>

                        <div className="border-t border-border/50" />

                        {/* Footer: regenerate + meta */}
                        <div className="px-6 py-3 flex items-center justify-between bg-muted/30">
                            <p className="text-xs text-muted-foreground">
                                Generated by Kiongozi AI · {poll.response_count} {poll.response_count === 1 ? 'response' : 'responses'}
                            </p>
                            {poll.response_count >= 3 && (
                                <Button variant="ghost" size="sm"
                                    className="text-civic-green-dark hover:bg-civic-green/10 h-7 gap-1.5 text-xs"
                                    onClick={onGenerate} disabled={isGenerating}>
                                    {isGenerating
                                        ? <><Loader2 className="h-3 w-3 animate-spin" /> Regenerating…</>
                                        : <><RefreshCw className="h-3 w-3" /> Regenerate</>}
                                </Button>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="px-6 py-8 text-center space-y-3">
                        <Sparkles className="h-8 w-8 text-civic-green/30 mx-auto" />
                        <p className="text-sm text-muted-foreground">
                            {poll.response_count >= 3
                                ? 'Run AI analysis to generate a policy insights report from these responses.'
                                : `Needs at least 3 responses to generate insights. Currently ${poll.response_count}.`}
                        </p>
                        {poll.response_count >= 3 && (
                            <Button className="bg-civic-green hover:bg-civic-green-dark text-white gap-2"
                                onClick={onGenerate} disabled={isGenerating}>
                                {isGenerating
                                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Analysing responses…</>
                                    : <><Sparkles className="h-4 w-4" /> Generate Policy Insights</>}
                            </Button>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
