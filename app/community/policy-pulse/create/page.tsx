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
import { Loader2, ArrowLeft, BarChart2, Plus, Trash2, Info } from 'lucide-react';
import Link from 'next/link';

interface Question {
    text: string;
    type: 'text';
    whyImportant: string;
    relationContext: string;
    expectedAction: string;
}

const defaultQuestion = (): Question => ({
    text: '',
    type: 'text',
    whyImportant: '',
    relationContext: '',
    expectedAction: '',
});

export default function CreatePollPage() {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('general');
    const [closesAt, setClosesAt] = useState('');
    const [whatContext, setWhatContext] = useState('');
    const [whyContext, setWhyContext] = useState('');
    const [howContext, setHowContext] = useState('');
    const [impactContext, setImpactContext] = useState('');
    const [questions, setQuestions] = useState<Question[]>([defaultQuestion()]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();
    const { toast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const updateQuestion = (qi: number, field: keyof Question, value: any) => {
        setQuestions(prev => prev.map((q, i) => i === qi ? { ...q, [field]: value } : q));
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
                    what_context: whatContext.trim() || null,
                    why_context: whyContext.trim() || null,
                    how_context: howContext.trim() || null,
                    impact_context: impactContext.trim() || null,
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
                        why_important: q.whyImportant.trim() || null,
                        relation_context: q.relationContext.trim() || null,
                        expected_action: q.expectedAction.trim() || null,
                    })
                    .select()
                    .single();

                if (qErr || !question) throw qErr;
            }

            toast({
                title: 'Poll Created',
                description: 'Your deliberative poll is now live.',
                className: 'bg-civic-green text-white border-none',
            });
            router.push('/community/policy-pulse');
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
                        <BarChart2 className="h-6 w-6" /> Create a Deliberative Policy Poll
                    </CardTitle>
                    <CardDescription>
                        Gather open-ended, discussion-driven youth viewpoints on critical issues to inform policymakers.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Core Details */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Poll Title</Label>
                                <Input id="title" placeholder="E.g., Should free TVET training be expanded?" value={title}
                                    onChange={e => setTitle(e.target.value)} maxLength={150} required />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="desc">Description</Label>
                                <Textarea id="desc" placeholder="Provide general context about this policy issue…" value={description}
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
                        </div>

                        {/* Deliberation Framework Parameters */}
                        <div className="space-y-4 border-t pt-4">
                            <h3 className="font-bold text-civic-green-dark text-lg flex items-center gap-2">
                                <Info className="h-5 w-5" /> Deliberative Background Context
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Answer these core design questions to establish a robust foundation for youth debate.
                            </p>
                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="what_context">What? (What is the proposal?)</Label>
                                    <Textarea id="what_context" placeholder="Define the policy proposal clearly..." value={whatContext}
                                        onChange={e => setWhatContext(e.target.value)} className="min-h-[80px]" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="why_context">Why? (Why is this being proposed?)</Label>
                                    <Textarea id="why_context" placeholder="Describe the background and problem statement..." value={whyContext}
                                        onChange={e => setWhyContext(e.target.value)} className="min-h-[80px]" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="how_context">How? (How will it be implemented?)</Label>
                                    <Textarea id="how_context" placeholder="Explain execution steps and mechanisms..." value={howContext}
                                        onChange={e => setHowContext(e.target.value)} className="min-h-[80px]" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="impact_context">Expected Impact? (What is the expected impact on youth?)</Label>
                                    <Textarea id="impact_context" placeholder="Outline specific consequences, benefits, or risks for youth..." value={impactContext}
                                        onChange={e => setImpactContext(e.target.value)} className="min-h-[80px]" />
                                </div>
                            </div>
                        </div>

                        {/* Questions & Redesigned Question Tool */}
                        <div className="space-y-4 border-t pt-4">
                            <Label className="text-base font-bold text-civic-green-dark">Questions & Deliberative Design</Label>
                            {questions.map((q, qi) => (
                                <Card key={qi} className="border-border/50 bg-muted/20">
                                    <CardContent className="pt-4 space-y-3">
                                        <div className="flex items-start gap-2">
                                            <span className="text-sm font-medium text-muted-foreground mt-2 shrink-0">Q{qi + 1}</span>
                                            <Input placeholder="Enter your open-ended question..." value={q.text}
                                                onChange={e => updateQuestion(qi, 'text', e.target.value)} />
                                            {questions.length > 1 && (
                                                <Button type="button" variant="ghost" size="icon" onClick={() => removeQuestion(qi)}
                                                    className="shrink-0 text-destructive hover:text-destructive">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                        
                                        {/* Question Tool Enhancements */}
                                        <div className="pl-9 space-y-3 border-l-2 border-civic-green/20 mt-2">
                                            <div className="space-y-1">
                                                <Label className="text-xs font-semibold text-foreground/80">Why is this question important?</Label>
                                                <Input className="h-8 text-xs" placeholder="E.g., Helps capture barriers to access..." value={q.whyImportant}
                                                    onChange={e => updateQuestion(qi, 'whyImportant', e.target.value)} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs font-semibold text-foreground/80">How does this relate to governance, accountability, sustainability, or youth participation?</Label>
                                                <Input className="h-8 text-xs" placeholder="E.g., Highlights youth-led monitoring..." value={q.relationContext}
                                                    onChange={e => updateQuestion(qi, 'relationContext', e.target.value)} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs font-semibold text-foreground/80">What action can result from the answers?</Label>
                                                <Input className="h-8 text-xs" placeholder="E.g., Directly informs the county draft policy..." value={q.expectedAction}
                                                    onChange={e => updateQuestion(qi, 'expectedAction', e.target.value)} />
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground pl-9">Respondents will provide an open-ended written answer to drive discussion.</p>
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
