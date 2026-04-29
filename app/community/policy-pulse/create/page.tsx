'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/app/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, BarChart2, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface Question {
    text: string;
    type: 'single_choice' | 'multiple_choice' | 'scale' | 'text';
    options: string[];
}

const defaultQuestion = (): Question => ({
    text: '',
    type: 'single_choice',
    options: ['', ''],
});

export default function CreatePollPage() {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('general');
    const [closesAt, setClosesAt] = useState('');
    const [questions, setQuestions] = useState<Question[]>([defaultQuestion()]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();
    const { toast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const updateQuestion = (qi: number, field: keyof Question, value: any) => {
        setQuestions(prev => prev.map((q, i) => i === qi ? { ...q, [field]: value } : q));
    };

    const updateOption = (qi: number, oi: number, value: string) => {
        setQuestions(prev => prev.map((q, i) =>
            i === qi ? { ...q, options: q.options.map((o, j) => j === oi ? value : o) } : q
        ));
    };

    const addOption = (qi: number) => {
        setQuestions(prev => prev.map((q, i) =>
            i === qi ? { ...q, options: [...q.options, ''] } : q
        ));
    };

    const removeOption = (qi: number, oi: number) => {
        setQuestions(prev => prev.map((q, i) =>
            i === qi ? { ...q, options: q.options.filter((_, j) => j !== oi) } : q
        ));
    };

    const addQuestion = () => setQuestions(prev => [...prev, defaultQuestion()]);
    const removeQuestion = (qi: number) => setQuestions(prev => prev.filter((_, i) => i !== qi));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || questions.some(q => !q.text.trim())) {
            toast({ title: 'Missing fields', description: 'Fill in all question texts.', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast({ title: 'Login required', variant: 'destructive' });
                return;
            }

            const { data: poll, error: pollError } = await supabase
                .from('policy_polls')
                .insert({
                    title: title.trim(),
                    description: description.trim(),
                    category,
                    closes_at: closesAt || null,
                    created_by: user.id,
                    status: 'active',
                })
                .select()
                .single();

            if (pollError || !poll) throw pollError;

            for (let qi = 0; qi < questions.length; qi++) {
                const q = questions[qi];
                const { data: question, error: qErr } = await supabase
                    .from('poll_questions')
                    .insert({
                        poll_id: poll.id,
                        question_text: q.text.trim(),
                        question_type: q.type,
                        question_order: qi,
                    })
                    .select()
                    .single();

                if (qErr || !question) throw qErr;

                if (q.type === 'single_choice' || q.type === 'multiple_choice') {
                    const opts = q.options.filter(o => o.trim()).map((o, oi) => ({
                        question_id: question.id,
                        option_text: o.trim(),
                        option_order: oi,
                    }));
                    if (opts.length > 0) {
                        const { error: optsErr } = await supabase.from('poll_options').insert(opts);
                        if (optsErr) throw optsErr;
                    }
                }
            }

            toast({
                title: 'Poll Created',
                description: 'Your poll is now live.',
                className: 'bg-civic-green text-white border-none',
            });
            router.push(`/community/policy-pulse/${poll.id}`);
        } catch (err: any) {
            console.error(err);
            toast({ title: 'Error', description: 'Failed to create poll.', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto py-8">
            <Button variant="ghost" asChild className="mb-6">
                <Link href="/community/policy-pulse">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Policy Pulse
                </Link>
            </Button>

            <Card className="border-civic-green/20 shadow-lg">
                <CardHeader>
                    <CardTitle className="text-2xl text-civic-green-dark flex items-center gap-2">
                        <BarChart2 className="h-6 w-6" /> Create a Policy Poll
                    </CardTitle>
                    <CardDescription>
                        Gather youth opinions on issues that matter. Responses will be analyzed with AI to generate policymaker insights.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="title">Poll Title</Label>
                            <Input id="title" placeholder="E.g., Should free TVET training be expanded?" value={title}
                                onChange={e => setTitle(e.target.value)} maxLength={150} required />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="desc">Description</Label>
                            <Textarea id="desc" placeholder="Provide context about this policy issue…" value={description}
                                onChange={e => setDescription(e.target.value)} className="min-h-[100px]" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Category</Label>
                                <Select value={category} onValueChange={setCategory}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {['general', 'environment', 'education', 'health', 'economy', 'governance'].map(c => (
                                            <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="closes">Closes At (optional)</Label>
                                <Input id="closes" type="datetime-local" value={closesAt}
                                    onChange={e => setClosesAt(e.target.value)} />
                            </div>
                        </div>

                        {/* Questions */}
                        <div className="space-y-4">
                            <Label className="text-base font-semibold">Questions</Label>
                            {questions.map((q, qi) => (
                                <Card key={qi} className="border-border/50 bg-muted/20">
                                    <CardContent className="pt-4 space-y-3">
                                        <div className="flex items-start gap-2">
                                            <span className="text-sm font-medium text-muted-foreground mt-2 shrink-0">Q{qi + 1}</span>
                                            <Input placeholder="Question text" value={q.text}
                                                onChange={e => updateQuestion(qi, 'text', e.target.value)} />
                                            {questions.length > 1 && (
                                                <Button type="button" variant="ghost" size="icon" onClick={() => removeQuestion(qi)}
                                                    className="shrink-0 text-destructive hover:text-destructive">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>

                                        <Select value={q.type} onValueChange={v => updateQuestion(qi, 'type', v)}>
                                            <SelectTrigger className="w-48">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="single_choice">Single Choice</SelectItem>
                                                <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                                                <SelectItem value="scale">Scale (1–10)</SelectItem>
                                                <SelectItem value="text">Open Text</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        {(q.type === 'single_choice' || q.type === 'multiple_choice') && (
                                            <div className="space-y-2 ml-6">
                                                {q.options.map((opt, oi) => (
                                                    <div key={oi} className="flex gap-2">
                                                        <Input placeholder={`Option ${oi + 1}`} value={opt}
                                                            onChange={e => updateOption(qi, oi, e.target.value)} />
                                                        {q.options.length > 2 && (
                                                            <Button type="button" variant="ghost" size="icon"
                                                                onClick={() => removeOption(qi, oi)} className="shrink-0 text-muted-foreground">
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                ))}
                                                <Button type="button" variant="ghost" size="sm" onClick={() => addOption(qi)}
                                                    className="text-civic-green">
                                                    <Plus className="mr-1 h-3 w-3" /> Add Option
                                                </Button>
                                            </div>
                                        )}
                                        {q.type === 'scale' && (
                                            <p className="text-xs text-muted-foreground ml-6">Respondents will rate from 1 (strongly disagree) to 10 (strongly agree).</p>
                                        )}
                                        {q.type === 'text' && (
                                            <p className="text-xs text-muted-foreground ml-6">Respondents will provide a written answer.</p>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}

                            <Button type="button" variant="outline" onClick={addQuestion}
                                className="border-civic-green/30 text-civic-green w-full">
                                <Plus className="mr-2 h-4 w-4" /> Add Question
                            </Button>
                        </div>

                        <Button type="submit" className="w-full bg-civic-green hover:bg-civic-green-dark text-white h-12 text-lg"
                            disabled={isSubmitting}>
                            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating…</> : 'Publish Poll'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
