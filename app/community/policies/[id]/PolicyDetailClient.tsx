'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    ArrowLeft, Download, FileText, HelpCircle, AlertTriangle, 
    TrendingUp, Lightbulb, BookOpen, Layers
} from 'lucide-react';
import Link from 'next/link';
import DeliberationPanel from '@/components/social/DeliberationPanel';

interface PolicyDetailClientProps {
    policy: any;
    currentUser: any;
}

export default function PolicyDetailClient({ policy, currentUser }: PolicyDetailClientProps) {
    const [activeTab, setActiveTab] = useState('summary');
    const [faqOpen, setFaqOpen] = useState<Record<number, boolean>>({});

    const toggleFaq = (index: number) => {
        setFaqOpen(prev => ({ ...prev, [index]: !prev[index] }));
    };

    const handleDownload = () => {
        // Download policy details as formatted brief
        const filename = `${policy.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_brief.md`;
        
        let mdContent = `# Policy Brief: ${policy.title}\n\n`;
        mdContent += `## Executive Summary\n${policy.summary}\n\n`;
        mdContent += `## Why it Matters\n${policy.why_matters}\n\n`;
        mdContent += `## Impact on Youth & Opportunities\n${policy.impact_on_youth}\n\n`;
        mdContent += `### Opportunities Created\n${policy.opportunities}\n\n`;
        mdContent += `## Risks & Challenges\n${policy.risks_challenges}\n\n`;
        mdContent += `## Real-World Examples\n${policy.real_world_examples}\n\n`;
        
        const blob = new Blob([mdContent], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    const faqsList = Array.isArray(policy.faqs) ? policy.faqs : [];

    return (
        <div className="space-y-6 py-4">
            <div className="flex items-center justify-between gap-4">
                <Button variant="ghost" asChild>
                    <Link href="/community/policies">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Policies
                    </Link>
                </Button>
                <Button onClick={handleDownload} className="bg-civic-green hover:bg-civic-green-dark text-white gap-2 rounded-xl">
                    <Download className="h-4 w-4" /> Download Policy Brief
                </Button>
            </div>

            {/* Header info */}
            <div className="space-y-2">
                <Badge className="bg-civic-green/10 text-civic-green-dark border-civic-green/20">Official Framework</Badge>
                <h1 className="text-3xl font-extrabold text-foreground leading-tight">{policy.title}</h1>
            </div>

            {/* Main grid layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left side: Interactive Policy Details */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-3 md:grid-cols-6 h-auto p-1 bg-muted/40 rounded-xl border">
                        {[
                            { value: 'summary', label: 'Summary' },
                            { value: 'importance', label: 'Rationale' },
                            { value: 'youth', label: 'Youth Impact' },
                            { value: 'risks', label: 'Risks' },
                            { value: 'examples', label: 'Examples' },
                            { value: 'faq', label: 'FAQ' }
                        ].map((t) => (
                            <button
                                key={t.value}
                                onClick={() => setActiveTab(t.value)}
                                className={`py-2 text-xs md:text-sm rounded-lg font-semibold transition-all ${
                                    activeTab === t.value
                                        ? 'bg-white text-civic-green shadow-sm'
                                        : 'text-muted-foreground hover:bg-muted'
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    <Card className="border-border/50 rounded-2xl shadow-sm mt-5 bg-white">
                        <CardContent className="pt-6">
                            {activeTab === 'summary' && (
                                <div className="space-y-4 mt-0">
                                    <div className="flex items-center gap-2 text-civic-green font-bold text-base border-b pb-2 mb-3">
                                        <FileText className="h-5 w-5" /> Executive Summary
                                    </div>
                                    <p className="text-sm md:text-base leading-relaxed text-foreground/80 whitespace-pre-wrap">
                                        {policy.summary}
                                    </p>
                                    <div className="p-4 bg-muted/20 border rounded-2xl space-y-2 mt-6">
                                        <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                                            <Lightbulb className="h-4 w-4 text-amber-500" /> Key Takeaway
                                        </h4>
                                        <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                                            This policy seeks to align regional guidelines with youth integration metrics. Understanding the baseline enables local advocacy.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'importance' && (
                                <div className="space-y-4 mt-0">
                                    <div className="flex items-center gap-2 text-civic-green font-bold text-base border-b pb-2 mb-3">
                                        <BookOpen className="h-5 w-5" /> Why it Matters
                                    </div>
                                    <p className="text-sm md:text-base leading-relaxed text-foreground/80 whitespace-pre-wrap">
                                        {policy.why_matters}
                                    </p>
                                </div>
                            )}

                            {activeTab === 'youth' && (
                                <div className="space-y-4 mt-0">
                                    <div className="flex items-center gap-2 text-civic-green font-bold text-base border-b pb-2 mb-3">
                                        <TrendingUp className="h-5 w-5" /> Youth Impact & Opportunities
                                    </div>
                                    <p className="text-sm md:text-base leading-relaxed text-foreground/80 whitespace-pre-wrap">
                                        {policy.impact_on_youth}
                                    </p>
                                    {policy.opportunities && (
                                        <div className="mt-6 space-y-3">
                                            <h4 className="font-bold text-foreground">Opportunities Created:</h4>
                                            <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                                                {policy.opportunities}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'risks' && (
                                <div className="space-y-4 mt-0">
                                    <div className="flex items-center gap-2 text-civic-clay font-bold text-base border-b pb-2 mb-3">
                                        <AlertTriangle className="h-5 w-5" /> Risks & Challenges
                                    </div>
                                    <p className="text-sm md:text-base leading-relaxed text-foreground/80 whitespace-pre-wrap">
                                        {policy.risks_challenges}
                                    </p>
                                </div>
                            )}

                            {activeTab === 'examples' && (
                                <div className="space-y-4 mt-0">
                                    <div className="flex items-center gap-2 text-civic-green font-bold text-base border-b pb-2 mb-3">
                                        <Layers className="h-5 w-5" /> Real-World Examples
                                    </div>
                                    <p className="text-sm md:text-base leading-relaxed text-foreground/80 whitespace-pre-wrap">
                                        {policy.real_world_examples}
                                    </p>
                                </div>
                            )}

                            {activeTab === 'faq' && (
                                <div className="space-y-4 mt-0">
                                    <div className="flex items-center gap-2 text-civic-green font-bold text-base border-b pb-2 mb-3">
                                        <HelpCircle className="h-5 w-5" /> Frequently Asked Questions
                                    </div>
                                    {faqsList.length === 0 ? (
                                        <p className="text-sm text-muted-foreground text-center py-6">No FAQs added for this policy.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {faqsList.map((faq: any, idx: number) => (
                                                <div key={idx} className="border rounded-xl overflow-hidden">
                                                    <button 
                                                        onClick={() => toggleFaq(idx)}
                                                        className="w-full text-left p-4 font-semibold text-sm flex justify-between items-center hover:bg-muted/40 transition-colors"
                                                    >
                                                        <span>{faq.question}</span>
                                                        <span className="text-muted-foreground font-bold">{faqOpen[idx] ? '−' : '+'}</span>
                                                    </button>
                                                    {faqOpen[idx] && (
                                                        <div className="p-4 bg-muted/10 border-t text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                                                            {faq.answer}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right side: Deliberation consensus panel */}
                <div className="space-y-6">
                    <DeliberationPanel 
                        parentType="policy" 
                        parentId={policy.id} 
                        currentUser={currentUser} 
                    />
                </div>

            </div>
        </div>
    );
}
