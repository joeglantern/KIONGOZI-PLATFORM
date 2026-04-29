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
import { Loader2, ArrowLeft, DollarSign } from 'lucide-react';
import Link from 'next/link';

export default function SubmitFundPage() {
    const [form, setForm] = useState({
        title: '', description: '', fund_source: '', managing_body: '',
        total_amount: '', currency: 'KES', target_beneficiaries: '',
        sector: '', status: 'active', official_url: '', application_deadline: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();
    const { toast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const set = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim()) {
            toast({ title: 'Missing title', variant: 'destructive' });
            return;
        }
        setIsSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { toast({ title: 'Login required', variant: 'destructive' }); return; }

            const { data: fund, error } = await supabase.from('public_funds').insert({
                title: form.title.trim(),
                description: form.description.trim() || null,
                fund_source: form.fund_source.trim() || null,
                managing_body: form.managing_body.trim() || null,
                total_amount: form.total_amount ? parseFloat(form.total_amount) : null,
                currency: form.currency,
                target_beneficiaries: form.target_beneficiaries.trim() || null,
                sector: form.sector || null,
                status: form.status,
                official_url: form.official_url.trim() || null,
                application_deadline: form.application_deadline || null,
                created_by: user.id,
            }).select().single();

            if (error) throw error;

            toast({ title: 'Fund submitted!', description: 'Thank you for contributing to transparency.', className: 'bg-civic-green text-white border-none' });
            router.push(`/community/funds/${fund.id}`);
        } catch (err: any) {
            console.error(err);
            toast({ title: 'Error', description: 'Failed to submit fund.', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto py-8">
            <Button variant="ghost" asChild className="mb-6">
                <Link href="/community/funds"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Fund Tracker</Link>
            </Button>

            <Card className="border-civic-green/20 shadow-lg">
                <CardHeader>
                    <CardTitle className="text-2xl text-civic-green-dark flex items-center gap-2">
                        <DollarSign className="h-6 w-6" /> Submit a Youth Fund
                    </CardTitle>
                    <CardDescription>
                        Help the community track public funds meant for youth. Add a grant, government program, or development fund.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label>Fund / Program Title *</Label>
                            <Input placeholder="E.g., Ajira Digital Programme 2026" value={form.title} onChange={e => set('title', e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea placeholder="What is this fund for? Who benefits?" value={form.description} onChange={e => set('description', e.target.value)} className="min-h-[100px]" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Fund Source</Label>
                                <Input placeholder="E.g., National Government, World Bank" value={form.fund_source} onChange={e => set('fund_source', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Managing Body</Label>
                                <Input placeholder="E.g., Ministry of Youth" value={form.managing_body} onChange={e => set('managing_body', e.target.value)} />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-2 space-y-2">
                                <Label>Total Amount</Label>
                                <Input type="number" min="0" placeholder="0" value={form.total_amount} onChange={e => set('total_amount', e.target.value)} />
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
                                <Label>Sector</Label>
                                <Select value={form.sector} onValueChange={v => set('sector', v)}>
                                    <SelectTrigger><SelectValue placeholder="Select sector" /></SelectTrigger>
                                    <SelectContent>
                                        {['Education', 'Agriculture', 'ICT', 'Health', 'Environment', 'Infrastructure', 'Arts & Culture', 'Sports', 'Business', 'Other'].map(s =>
                                            <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select value={form.status} onValueChange={v => set('status', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active (applications open)</SelectItem>
                                        <SelectItem value="disbursing">Disbursing</SelectItem>
                                        <SelectItem value="closed">Closed</SelectItem>
                                        <SelectItem value="suspended">Suspended</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Target Beneficiaries</Label>
                            <Input placeholder="E.g., Youth aged 18–35, Small businesses" value={form.target_beneficiaries} onChange={e => set('target_beneficiaries', e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Application Deadline</Label>
                                <Input type="datetime-local" value={form.application_deadline} onChange={e => set('application_deadline', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Official URL</Label>
                                <Input type="url" placeholder="https://..." value={form.official_url} onChange={e => set('official_url', e.target.value)} />
                            </div>
                        </div>

                        <Button type="submit" className="w-full bg-civic-green hover:bg-civic-green-dark text-white h-12 text-lg" disabled={isSubmitting}>
                            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</> : 'Submit Fund'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
