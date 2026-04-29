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
import { Loader2, ArrowLeft, Clipboard } from 'lucide-react';
import Link from 'next/link';

export default function CreateProjectPage() {
    const [form, setForm] = useState({
        title: '', description: '', project_type: 'infrastructure',
        implementing_body: '', location_name: '', budget: '',
        currency: 'KES', milestone: 'announced',
        start_date: '', expected_end_date: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();
    const { toast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const set = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim()) { toast({ title: 'Title required', variant: 'destructive' }); return; }

        setIsSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { toast({ title: 'Login required', variant: 'destructive' }); return; }

            const { data: project, error } = await supabase.from('public_projects').insert({
                title: form.title.trim(),
                description: form.description.trim() || null,
                project_type: form.project_type,
                implementing_body: form.implementing_body.trim() || null,
                location_name: form.location_name.trim() || null,
                budget: form.budget ? parseFloat(form.budget) : null,
                currency: form.currency,
                milestone: form.milestone,
                start_date: form.start_date || null,
                expected_end_date: form.expected_end_date || null,
                created_by: user.id,
            }).select().single();

            if (error) throw error;

            toast({ title: 'Project added!', description: 'Start submitting updates to track its progress.', className: 'bg-civic-green text-white border-none' });
            router.push(`/community/projects/${project.id}`);
        } catch (err: any) {
            console.error(err);
            toast({ title: 'Error', description: 'Failed to add project.', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto py-8">
            <Button variant="ghost" asChild className="mb-6">
                <Link href="/community/projects"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Projects</Link>
            </Button>

            <Card className="border-civic-clay/20 shadow-lg">
                <CardHeader>
                    <CardTitle className="text-2xl text-civic-clay flex items-center gap-2">
                        <Clipboard className="h-6 w-6" /> Add a Public Project
                    </CardTitle>
                    <CardDescription>
                        Know about a government or donor-funded project in your community? Add it so youth can monitor its progress.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label>Project Title *</Label>
                            <Input placeholder="E.g., Kibera Road Rehabilitation Phase 2" value={form.title} onChange={e => set('title', e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea placeholder="Describe the project — what it aims to achieve, who it benefits…" value={form.description} onChange={e => set('description', e.target.value)} className="min-h-[100px]" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Project Type</Label>
                                <Select value={form.project_type} onValueChange={v => set('project_type', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {['infrastructure', 'social', 'environment', 'health', 'education', 'other'].map(t => (
                                            <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Current Stage</Label>
                                <Select value={form.milestone} onValueChange={v => set('milestone', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="announced">Announced</SelectItem>
                                        <SelectItem value="funded">Funded</SelectItem>
                                        <SelectItem value="in_progress">In Progress</SelectItem>
                                        <SelectItem value="stalled">Stalled</SelectItem>
                                        <SelectItem value="completed">Completed</SelectItem>
                                        <SelectItem value="audited">Audited</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Implementing Body</Label>
                            <Input placeholder="E.g., Kenya National Highways Authority (KeNHA)" value={form.implementing_body} onChange={e => set('implementing_body', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Location</Label>
                            <Input placeholder="E.g., Kibera, Nairobi" value={form.location_name} onChange={e => set('location_name', e.target.value)} />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-2 space-y-2">
                                <Label>Project Budget</Label>
                                <Input type="number" min="0" placeholder="0" value={form.budget} onChange={e => set('budget', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Currency</Label>
                                <Select value={form.currency} onValueChange={v => set('currency', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {['KES', 'USD', 'EUR', 'UGX', 'TZS'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Start Date</Label>
                                <Input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Expected End Date</Label>
                                <Input type="date" value={form.expected_end_date} onChange={e => set('expected_end_date', e.target.value)} />
                            </div>
                        </div>

                        <Button type="submit" className="w-full bg-civic-clay hover:bg-civic-clay/90 text-white h-12 text-lg" disabled={isSubmitting}>
                            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding…</> : 'Add Project'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
