'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { createClient } from '@/app/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
    Users, BookOpen, BarChart3, Settings, Shield, Plus, Edit, 
    Trash2, CheckCircle2, FileText, FileCheck, MessageSquare, AlertTriangle,
    SlidersHorizontal, Eye, Save, X, Globe, MapPin, Tag, Briefcase, Info
} from 'lucide-react';

type Tab = 'overview' | 'polls' | 'policies' | 'library' | 'briefs' | 'comments';

export default function AdminDashboardPage() {
    const supabase = createClient();
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Platform Stats
    const [stats, setStats] = useState({
        totalPolls: 0,
        totalPolicies: 0,
        totalResources: 0,
        totalBriefs: 0,
        totalComments: 0
    });

    // Lists
    const [polls, setPolls] = useState<any[]>([]);
    const [policies, setPolicies] = useState<any[]>([]);
    const [resources, setResources] = useState<any[]>([]);
    const [briefs, setBriefs] = useState<any[]>([]);
    const [comments, setComments] = useState<any[]>([]);

    // Loading states
    const [loading, setLoading] = useState(true);

    // Form states
    const [editingId, setEditingId] = useState<string | null>(null);

    // 1. Poll Form
    const [pollForm, setPollForm] = useState({
        title: '',
        description: '',
        category: 'Governance',
        status: 'active',
        closes_at: '',
        what_context: '',
        why_context: '',
        how_context: '',
        impact_context: ''
    });

    // 2. Question Form
    const [showQuestionForm, setShowQuestionForm] = useState(false);
    const [activePollForQuestion, setActivePollForQuestion] = useState<string>('');
    const [questionForm, setQuestionForm] = useState({
        question_text: '',
        question_type: 'single_choice',
        question_order: 0,
        why_important: '',
        relation_context: '',
        expected_action: '',
        options: '' // Comma separated options e.g. "Yes, No, Neutral"
    });

    // 3. Policy Form
    const [policyForm, setPolicyForm] = useState({
        title: '',
        summary: '',
        why_matters: '',
        impact_on_youth: '',
        opportunities: '',
        risks_challenges: '',
        real_world_examples: '',
        faqs: [] as any[]
    });
    const [faqQuestion, setFaqQuestion] = useState('');
    const [faqAnswer, setFaqAnswer] = useState('');

    // 4. Resource Form
    const [resourceForm, setResourceForm] = useState({
        title: '',
        description: '',
        category: 'constitution',
        file_url: '',
        resource_type: 'pdf',
        topic: '',
        county: '',
        governance_sector: '',
        sdg: '',
        summary: '',
        policy_references: '',
        is_youth_kb: false
    });

    // 5. Brief Form
    const [editingBrief, setEditingBrief] = useState<any | null>(null);

    // Show Toast
    const showToast = (text: string, type: 'success' | 'error' = 'success') => {
        setToastMsg({ text, type });
        setTimeout(() => setToastMsg(null), 4000);
    };

    // Fetch All Data
    const fetchData = async () => {
        setLoading(true);
        try {
            // Stats
            const [
                { count: pollsCount },
                { count: policiesCount },
                { count: resourcesCount },
                { count: briefsCount },
                { count: commentsCount }
            ] = await Promise.all([
                supabase.from('policy_polls').select('*', { count: 'exact', head: true }),
                supabase.from('policies').select('*', { count: 'exact', head: true }),
                supabase.from('social_law_resources').select('*', { count: 'exact', head: true }),
                supabase.from('policy_briefs').select('*', { count: 'exact', head: true }),
                supabase.from('poll_comments').select('*', { count: 'exact', head: true })
            ]);

            setStats({
                totalPolls: pollsCount || 0,
                totalPolicies: policiesCount || 0,
                totalResources: resourcesCount || 0,
                totalBriefs: briefsCount || 0,
                totalComments: commentsCount || 0
            });

            // Polls
            const { data: pollsData } = await supabase.from('policy_polls').select('*').order('created_at', { ascending: false });
            setPolls(pollsData || []);

            // Policies
            const { data: policiesData } = await supabase.from('policies').select('*').order('created_at', { ascending: false });
            setPolicies(policiesData || []);

            // Resources
            const { data: resourcesData } = await supabase.from('social_law_resources').select('*').order('created_at', { ascending: false });
            setResources(resourcesData || []);

            // Briefs
            const { data: briefsData } = await supabase.from('policy_briefs').select('*, policy_polls(title)').order('created_at', { ascending: false });
            setBriefs(briefsData || []);

            // Comments
            const { data: commentsData } = await supabase.from('poll_comments').select('*, policy_polls(title), profiles(email, full_name)').order('created_at', { ascending: false });
            setComments(commentsData || []);

        } catch (error: any) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // 1. Policy Poll CRUD
    const handlePollSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Route writes through the server API: it verifies admin role, sets
            // created_by, and validates input server-side (no trusting the client).
            const res = await fetch('/api/admin/polls', {
                method: editingId ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingId ? { ...pollForm, id: editingId } : pollForm),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Request failed');
            showToast(editingId ? 'Poll updated successfully' : 'Poll created successfully');
            setEditingId(null);
            setPollForm({
                title: '',
                description: '',
                category: 'Governance',
                status: 'active',
                closes_at: '',
                what_context: '',
                why_context: '',
                how_context: '',
                impact_context: ''
            });
            fetchData();
        } catch (err: any) {
            showToast(err.message, 'error');
        }
    };

    const handleEditPoll = (poll: any) => {
        setEditingId(poll.id);
        setPollForm({
            title: poll.title || '',
            description: poll.description || '',
            category: poll.category || 'Governance',
            status: poll.status || 'active',
            closes_at: poll.closes_at ? new Date(poll.closes_at).toISOString().split('T')[0] : '',
            what_context: poll.what_context || '',
            why_context: poll.why_context || '',
            how_context: poll.how_context || '',
            impact_context: poll.impact_context || ''
        });
    };

    const handleDeletePoll = async (id: string) => {
        if (!confirm('Are you sure you want to delete this poll? All questions and comments will be lost.')) return;
        try {
            const res = await fetch('/api/admin/polls', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Delete failed');
            showToast('Poll deleted');
            fetchData();
        } catch (err: any) {
            showToast(err.message, 'error');
        }
    };

    // Add Poll Question
    const handleQuestionSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Atomic server insert: question + options roll back together, and
            // admin role + poll ownership are enforced server-side.
            const res = await fetch('/api/admin/poll-questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    poll_id: activePollForQuestion,
                    question_text: questionForm.question_text,
                    question_type: questionForm.question_type,
                    question_order: Number(questionForm.question_order),
                    why_important: questionForm.why_important,
                    relation_context: questionForm.relation_context,
                    expected_action: questionForm.expected_action,
                    options: questionForm.options,
                }),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Failed to add question');

            showToast('Question added successfully');
            setShowQuestionForm(false);
            setQuestionForm({
                question_text: '',
                question_type: 'single_choice',
                question_order: 0,
                why_important: '',
                relation_context: '',
                expected_action: '',
                options: ''
            });
        } catch (err: any) {
            showToast(err.message, 'error');
        }
    };

    // 2. Policies CRUD
    const handleAddFaq = () => {
        if (!faqQuestion || !faqAnswer) return;
        setPolicyForm(prev => ({
            ...prev,
            faqs: [...prev.faqs, { question: faqQuestion, answer: faqAnswer }]
        }));
        setFaqQuestion('');
        setFaqAnswer('');
    };

    const handleRemoveFaq = (index: number) => {
        setPolicyForm(prev => ({
            ...prev,
            faqs: prev.faqs.filter((_, i) => i !== index)
        }));
    };

    const handlePolicySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/admin/policies', {
                method: editingId ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingId ? { ...policyForm, id: editingId } : policyForm),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Request failed');
            showToast(editingId ? 'Policy updated' : 'Policy created');
            setEditingId(null);
            setPolicyForm({
                title: '',
                summary: '',
                why_matters: '',
                impact_on_youth: '',
                opportunities: '',
                risks_challenges: '',
                real_world_examples: '',
                faqs: []
            });
            fetchData();
        } catch (err: any) {
            showToast(err.message, 'error');
        }
    };

    const handleEditPolicy = (policy: any) => {
        setEditingId(policy.id);
        setPolicyForm({
            title: policy.title || '',
            summary: policy.summary || '',
            why_matters: policy.why_matters || '',
            impact_on_youth: policy.impact_on_youth || '',
            opportunities: policy.opportunities || '',
            risks_challenges: policy.risks_challenges || '',
            real_world_examples: policy.real_world_examples || '',
            faqs: Array.isArray(policy.faqs) ? policy.faqs : []
        });
    };

    const handleDeletePolicy = async (id: string) => {
        if (!confirm('Are you sure you want to delete this policy?')) return;
        try {
            const res = await fetch('/api/admin/policies', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Delete failed');
            showToast('Policy deleted');
            fetchData();
        } catch (err: any) {
            showToast(err.message, 'error');
        }
    };

    // 3. Research Library CRUD
    const handleResourceSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/admin/resources', {
                method: editingId ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingId ? { ...resourceForm, id: editingId } : resourceForm),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Request failed');
            showToast(editingId ? 'Resource updated' : 'Resource added to library');
            setEditingId(null);
            setResourceForm({
                title: '',
                description: '',
                category: 'constitution',
                file_url: '',
                resource_type: 'pdf',
                topic: '',
                county: '',
                governance_sector: '',
                sdg: '',
                summary: '',
                policy_references: '',
                is_youth_kb: false
            });
            fetchData();
        } catch (err: any) {
            showToast(err.message, 'error');
        }
    };

    const handleEditResource = (res: any) => {
        setEditingId(res.id);
        setResourceForm({
            title: res.title || '',
            description: res.description || '',
            category: res.category || 'constitution',
            file_url: res.file_url || '',
            resource_type: res.resource_type || 'pdf',
            topic: res.topic || '',
            county: res.county || '',
            governance_sector: res.governance_sector || '',
            sdg: res.sdg || '',
            summary: res.summary || '',
            policy_references: res.policy_references || '',
            is_youth_kb: !!res.is_youth_kb
        });
    };

    const handleDeleteResource = async (id: string) => {
        if (!confirm('Are you sure you want to delete this library resource?')) return;
        try {
            const res = await fetch('/api/admin/resources', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Delete failed');
            showToast('Resource deleted');
            fetchData();
        } catch (err: any) {
            showToast(err.message, 'error');
        }
    };

    // 4. AI Brief Moderation
    const patchBrief = async (payload: Record<string, unknown>, successMsg: string) => {
        const res = await fetch('/api/admin/briefs', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Request failed');
        showToast(successMsg);
        fetchData();
    };

    const handleApproveBrief = async (brief: any) => {
        try {
            await patchBrief({ id: brief.id, action: 'approve' }, 'Brief marked as Approved!');
        } catch (err: any) {
            showToast(err.message, 'error');
        }
    };

    const handlePublishBrief = async (brief: any) => {
        try {
            // The server reads the brief's content + poll_id; we only send the action.
            await patchBrief({ id: brief.id, action: 'publish' }, 'Brief published successfully to the Policy Pulse details!');
        } catch (err: any) {
            showToast(err.message, 'error');
        }
    };

    const handleSaveBriefContent = async () => {
        if (!editingBrief) return;
        try {
            await patchBrief(
                { id: editingBrief.id, action: 'save', title: editingBrief.title, content: editingBrief.content },
                'Brief content saved'
            );
            setEditingBrief(null);
        } catch (err: any) {
            showToast(err.message, 'error');
        }
    };

    // 5. Comment Moderation
    const handleDeleteComment = async (id: string) => {
        if (!confirm('Are you sure you want to delete this comment?')) return;
        try {
            const res = await fetch('/api/admin/comments', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Delete failed');
            showToast('Comment deleted');
            fetchData();
        } catch (err: any) {
            showToast(err.message, 'error');
        }
    };

    return (
        <ProtectedRoute allowedRoles={['admin']}>
            <div className="min-h-screen bg-slate-50 dark:bg-gray-950 pb-16">
                
                {/* Visual Banner */}
                <div className="bg-gradient-to-r from-civic-green-dark to-slate-900 text-white py-8 px-6 shadow-sm border-b">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <span className="text-[10px] font-bold tracking-widest uppercase bg-civic-green text-white px-2.5 py-1 rounded-full border border-civic-green/30">
                                Ecosystem Control
                            </span>
                            <h1 className="text-3xl font-extrabold mt-2 tracking-tight flex items-center gap-2">
                                <Shield className="h-8 w-8 text-civic-green" />
                                Kiongozi Deliberation Panel
                            </h1>
                            <p className="text-slate-300 text-sm mt-1">
                                Moderation portal for polls, policies, research library, and AI policy briefs.
                            </p>
                        </div>
                        <Button 
                            onClick={fetchData}
                            className="bg-civic-green hover:bg-civic-green-dark text-white rounded-xl shadow-sm text-xs font-semibold gap-2 border border-civic-green/30"
                        >
                            Refresh System
                        </Button>
                    </div>
                </div>

                {/* Toast alerts */}
                {toastMsg && (
                    <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-lg border transition-all animate-slide-up flex items-center gap-2 text-xs font-bold ${
                        toastMsg.type === 'success' 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                            : 'bg-red-50 text-red-800 border-red-200'
                    }`}>
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        {toastMsg.text}
                    </div>
                )}

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
                    
                    {/* Navigation Tabs */}
                    <div className="flex flex-wrap gap-2 border-b pb-4 mb-6">
                        {(['overview', 'polls', 'policies', 'library', 'briefs', 'comments'] as Tab[]).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => { setActiveTab(tab); setEditingId(null); }}
                                className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                                    activeTab === tab
                                        ? 'bg-civic-green text-white shadow-sm'
                                        : 'bg-white hover:bg-slate-100 border text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Loading indicator */}
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-8 h-8 rounded-full border-4 border-civic-green border-t-transparent animate-spin mb-4" />
                            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Syncing database...</p>
                        </div>
                    )}

                    {!loading && (
                        <div className="space-y-8 animate-fadeIn">
                            
                            {/* OVERVIEW TAB */}
                            {activeTab === 'overview' && (
                                <div className="space-y-8">
                                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                                        <Card className="bg-white border rounded-2xl p-5 shadow-sm">
                                            <span className="text-[10px] uppercase font-extrabold text-muted-foreground">Pulse Polls</span>
                                            <div className="text-3xl font-extrabold text-slate-900 mt-1">{stats.totalPolls}</div>
                                        </Card>
                                        <Card className="bg-white border rounded-2xl p-5 shadow-sm">
                                            <span className="text-[10px] uppercase font-extrabold text-muted-foreground">Frameworks</span>
                                            <div className="text-3xl font-extrabold text-slate-900 mt-1">{stats.totalPolicies}</div>
                                        </Card>
                                        <Card className="bg-white border rounded-2xl p-5 shadow-sm">
                                            <span className="text-[10px] uppercase font-extrabold text-muted-foreground">Library Resources</span>
                                            <div className="text-3xl font-extrabold text-slate-900 mt-1">{stats.totalResources}</div>
                                        </Card>
                                        <Card className="bg-white border rounded-2xl p-5 shadow-sm">
                                            <span className="text-[10px] uppercase font-extrabold text-muted-foreground">AI Policy Briefs</span>
                                            <div className="text-3xl font-extrabold text-slate-900 mt-1">{stats.totalBriefs}</div>
                                        </Card>
                                        <Card className="bg-white border rounded-2xl p-5 shadow-sm">
                                            <span className="text-[10px] uppercase font-extrabold text-muted-foreground">Comment Activity</span>
                                            <div className="text-3xl font-extrabold text-slate-900 mt-1">{stats.totalComments}</div>
                                        </Card>
                                    </div>

                                    {/* Action Cards */}
                                    <div className="grid md:grid-cols-3 gap-6">
                                        <Card className="bg-white border rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between">
                                            <CardHeader className="pb-3">
                                                <CardTitle className="text-lg font-bold flex items-center gap-2">
                                                    <SlidersHorizontal className="h-5 w-5 text-civic-green" />
                                                    Active Polls
                                                </CardTitle>
                                                <CardDescription className="text-xs leading-relaxed">
                                                    Configure engagement pools. Set What, Why, How context areas and expected actions for each question.
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent className="pt-0">
                                                <Button onClick={() => setActiveTab('polls')} className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold">
                                                    Manage Polls
                                                </Button>
                                            </CardContent>
                                        </Card>

                                        <Card className="bg-white border rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between">
                                            <CardHeader className="pb-3">
                                                <CardTitle className="text-lg font-bold flex items-center gap-2">
                                                    <FileCheck className="h-5 w-5 text-civic-green" />
                                                    Pending Briefs
                                                </CardTitle>
                                                <CardDescription className="text-xs leading-relaxed">
                                                    Review AI-drafted policy briefs generated by youth survey responses. Approve and publish to the policy track.
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent className="pt-0">
                                                <Button onClick={() => setActiveTab('briefs')} className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold">
                                                    Review Briefs
                                                </Button>
                                            </CardContent>
                                        </Card>

                                        <Card className="bg-white border rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between">
                                            <CardHeader className="pb-3">
                                                <CardTitle className="text-lg font-bold flex items-center gap-2">
                                                    <MessageSquare className="h-5 w-5 text-civic-green" />
                                                    Comment Moderation
                                                </CardTitle>
                                                <CardDescription className="text-xs leading-relaxed">
                                                    Inspect threaded conversations on policy polls. Take down remarks that do not comply with community values.
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent className="pt-0">
                                                <Button onClick={() => setActiveTab('comments')} className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold">
                                                    Moderate Comments
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>
                            )}

                            {/* POLLS TAB */}
                            {activeTab === 'polls' && (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    
                                    {/* Left 2 Cols: Poll Listing */}
                                    <div className="lg:col-span-2 space-y-6">
                                        <Card className="bg-white border rounded-2xl shadow-sm overflow-hidden">
                                            <div className="p-5 border-b font-bold text-sm text-foreground flex items-center justify-between">
                                                <span>Active Pulse Polls ({polls.length})</span>
                                            </div>
                                            <div className="divide-y text-xs">
                                                {polls.map((poll) => (
                                                    <div key={poll.id} className="p-5 space-y-3 hover:bg-slate-50 transition-colors">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <h4 className="font-bold text-sm text-foreground">{poll.title}</h4>
                                                                <div className="flex gap-2 items-center mt-1">
                                                                    <Badge className="bg-slate-100 hover:bg-slate-200 text-slate-700 border-none font-semibold text-[10px]">
                                                                        {poll.category}
                                                                    </Badge>
                                                                    <Badge className={`text-[10px] font-semibold border-none ${
                                                                        poll.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                                                                    }`}>
                                                                        {poll.status}
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-1">
                                                                <Button 
                                                                    onClick={() => {
                                                                        setActivePollForQuestion(poll.id);
                                                                        setShowQuestionForm(true);
                                                                    }}
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-8 rounded-lg text-civic-green border-civic-green/20 hover:bg-civic-green/5 text-[10px] font-bold"
                                                                >
                                                                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Question
                                                                </Button>
                                                                <Button 
                                                                    onClick={() => handleEditPoll(poll)}
                                                                    size="icon" 
                                                                    variant="ghost" 
                                                                    className="h-8 w-8 text-blue-600 rounded-lg hover:bg-blue-50"
                                                                >
                                                                    <Edit className="h-4 w-4" />
                                                                </Button>
                                                                <Button 
                                                                    onClick={() => handleDeletePoll(poll.id)}
                                                                    size="icon" 
                                                                    variant="ghost" 
                                                                    className="h-8 w-8 text-red-600 rounded-lg hover:bg-red-50"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        <p className="text-muted-foreground leading-relaxed line-clamp-2">{poll.description}</p>
                                                        
                                                        {/* Context indicator stats */}
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t text-[10px] text-muted-foreground">
                                                            <div>What Context: {poll.what_context ? '✅ Set' : '❌ Empty'}</div>
                                                            <div>Why Context: {poll.why_context ? '✅ Set' : '❌ Empty'}</div>
                                                            <div>How Context: {poll.how_context ? '✅ Set' : '❌ Empty'}</div>
                                                            <div>Impact Context: {poll.impact_context ? '✅ Set' : '❌ Empty'}</div>
                                                        </div>
                                                    </div>
                                                ))}

                                                {polls.length === 0 && (
                                                    <div className="py-12 text-center text-muted-foreground">No polls created yet.</div>
                                                )}
                                            </div>
                                        </Card>
                                    </div>

                                    {/* Right Col: Forms */}
                                    <div className="space-y-6">
                                        {/* Create/Edit Poll Form */}
                                        <Card className="bg-white border rounded-2xl shadow-sm">
                                            <div className="p-5 border-b font-bold text-sm text-foreground">
                                                {editingId ? 'Edit Poll details' : 'Create new Pulse Poll'}
                                            </div>
                                            <form onSubmit={handlePollSubmit} className="p-5 space-y-4">
                                                <div className="space-y-1">
                                                    <label className="text-[11px] font-bold text-muted-foreground uppercase">Poll Title</label>
                                                    <Input 
                                                        value={pollForm.title} 
                                                        onChange={(e) => setPollForm({...pollForm, title: e.target.value})}
                                                        placeholder="e.g. Climate Fund Distribution Survey" 
                                                        required
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-[11px] font-bold text-muted-foreground uppercase">Description</label>
                                                    <textarea 
                                                        value={pollForm.description} 
                                                        onChange={(e) => setPollForm({...pollForm, description: e.target.value})}
                                                        placeholder="A brief overview of the poll purpose..." 
                                                        className="w-full min-h-[80px] p-2.5 text-xs bg-background rounded-xl border border-input focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                                                        required
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <label className="text-[11px] font-bold text-muted-foreground uppercase">Category</label>
                                                        <select 
                                                            value={pollForm.category}
                                                            onChange={(e) => setPollForm({...pollForm, category: e.target.value})}
                                                            className="w-full p-2 text-xs bg-background rounded-xl border"
                                                        >
                                                            <option>Governance</option>
                                                            <option>Funding</option>
                                                            <option>LMS & Skills</option>
                                                            <option>Environment</option>
                                                        </select>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[11px] font-bold text-muted-foreground uppercase">Status</label>
                                                        <select 
                                                            value={pollForm.status}
                                                            onChange={(e) => setPollForm({...pollForm, status: e.target.value})}
                                                            className="w-full p-2 text-xs bg-background rounded-xl border"
                                                        >
                                                            <option value="draft">Draft</option>
                                                            <option value="active">Active</option>
                                                            <option value="closed">Closed</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-[11px] font-bold text-muted-foreground uppercase">Closes At</label>
                                                    <Input 
                                                        type="date"
                                                        value={pollForm.closes_at} 
                                                        onChange={(e) => setPollForm({...pollForm, closes_at: e.target.value})}
                                                    />
                                                </div>

                                                {/* What, Why, How, Impact Context fields */}
                                                <div className="border-t border-dashed pt-4 space-y-3">
                                                    <h5 className="font-bold text-xs text-civic-green uppercase tracking-wide">Deliberative Context Contexts</h5>
                                                    
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-muted-foreground uppercase">What is this bill/framework? (Context)</label>
                                                        <textarea 
                                                            value={pollForm.what_context} 
                                                            onChange={(e) => setPollForm({...pollForm, what_context: e.target.value})}
                                                            placeholder="Describe what this policy is in simple terms..." 
                                                            className="w-full min-h-[60px] p-2 text-xs bg-background rounded-xl border"
                                                        />
                                                    </div>

                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Why is it being introduced? (Context)</label>
                                                        <textarea 
                                                            value={pollForm.why_context} 
                                                            onChange={(e) => setPollForm({...pollForm, why_context: e.target.value})}
                                                            placeholder="State the underlying rationale or problem statement..." 
                                                            className="w-full min-h-[60px] p-2 text-xs bg-background rounded-xl border"
                                                        />
                                                    </div>

                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-muted-foreground uppercase">How can youth get involved? (Context)</label>
                                                        <textarea 
                                                            value={pollForm.how_context} 
                                                            onChange={(e) => setPollForm({...pollForm, how_context: e.target.value})}
                                                            placeholder="Outline clear channels of action, links, or hearings..." 
                                                            className="w-full min-h-[60px] p-2 text-xs bg-background rounded-xl border"
                                                        />
                                                    </div>

                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Expected Impact on Youth (Context)</label>
                                                        <textarea 
                                                            value={pollForm.impact_context} 
                                                            onChange={(e) => setPollForm({...pollForm, impact_context: e.target.value})}
                                                            placeholder="Identify funding, checks & balances, or key outcomes..." 
                                                            className="w-full min-h-[60px] p-2 text-xs bg-background rounded-xl border"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex gap-2">
                                                    <Button type="submit" className="flex-1 bg-civic-green hover:bg-civic-green-dark text-white rounded-xl text-xs font-bold">
                                                        {editingId ? 'Save Poll Changes' : 'Create Poll'}
                                                    </Button>
                                                    {editingId && (
                                                        <Button 
                                                            type="button" 
                                                            variant="outline" 
                                                            onClick={() => {
                                                                setEditingId(null);
                                                                setPollForm({ title: '', description: '', category: 'Governance', status: 'active', closes_at: '', what_context: '', why_context: '', how_context: '', impact_context: '' });
                                                            }}
                                                            className="rounded-xl text-xs"
                                                        >
                                                            Cancel
                                                        </Button>
                                                    )}
                                                </div>
                                            </form>
                                        </Card>

                                        {/* Question Form Dialog Overlay Mock */}
                                        {showQuestionForm && (
                                            <Card className="bg-amber-50/40 border border-amber-200 rounded-2xl shadow-sm">
                                                <div className="p-5 border-b border-amber-200/50 font-bold text-sm text-foreground flex justify-between items-center">
                                                    <span>Add Question to Poll</span>
                                                    <button onClick={() => setShowQuestionForm(false)}>
                                                        <X className="h-4 w-4 text-muted-foreground" />
                                                    </button>
                                                </div>
                                                <form onSubmit={handleQuestionSubmit} className="p-5 space-y-4">
                                                    <div className="space-y-1">
                                                        <label className="text-[11px] font-bold text-muted-foreground uppercase">Question text</label>
                                                        <Input 
                                                            value={questionForm.question_text}
                                                            onChange={(e) => setQuestionForm({...questionForm, question_text: e.target.value})}
                                                            placeholder="e.g. Do you support allocating 30% of the fund directly to youth-led green hubs?"
                                                            required
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="space-y-1">
                                                            <label className="text-[11px] font-bold text-muted-foreground uppercase">Type</label>
                                                            <select 
                                                                value={questionForm.question_type}
                                                                onChange={(e) => setQuestionForm({...questionForm, question_type: e.target.value})}
                                                                className="w-full p-2 text-xs bg-background rounded-xl border"
                                                            >
                                                                <option value="single_choice">Single Choice</option>
                                                                <option value="multiple_choice">Multiple Choice</option>
                                                                <option value="scale">1-10 Slider scale</option>
                                                                <option value="text">Open ended text</option>
                                                            </select>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[11px] font-bold text-muted-foreground uppercase">Order (0-indexed)</label>
                                                            <Input 
                                                                type="number"
                                                                value={questionForm.question_order}
                                                                onChange={(e) => setQuestionForm({...questionForm, question_order: Number(e.target.value)})}
                                                                required
                                                            />
                                                        </div>
                                                    </div>

                                                    {['single_choice', 'multiple_choice'].includes(questionForm.question_type) && (
                                                        <div className="space-y-1">
                                                            <label className="text-[11px] font-bold text-muted-foreground uppercase">Options (Comma separated)</label>
                                                            <Input 
                                                                value={questionForm.options}
                                                                onChange={(e) => setQuestionForm({...questionForm, options: e.target.value})}
                                                                placeholder="e.g. Agree, Disagree, Undecided"
                                                                required
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Expected contexts */}
                                                    <div className="space-y-2 border-t pt-3">
                                                        <h6 className="font-bold text-[10px] text-amber-800 uppercase">Question Contextual Anchors</h6>
                                                        <div className="space-y-1">
                                                            <label className="text-[9px] font-bold text-muted-foreground uppercase">Why is this specific question important?</label>
                                                            <Input 
                                                                value={questionForm.why_important}
                                                                onChange={(e) => setQuestionForm({...questionForm, why_important: e.target.value})}
                                                                placeholder="Explain the stakes..."
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[9px] font-bold text-muted-foreground uppercase">How does this relate to other policies?</label>
                                                            <Input 
                                                                value={questionForm.relation_context}
                                                                onChange={(e) => setQuestionForm({...questionForm, relation_context: e.target.value})}
                                                                placeholder="References..."
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[9px] font-bold text-muted-foreground uppercase">What action is expected post-survey?</label>
                                                            <Input 
                                                                value={questionForm.expected_action}
                                                                onChange={(e) => setQuestionForm({...questionForm, expected_action: e.target.value})}
                                                                placeholder="Next steps..."
                                                            />
                                                        </div>
                                                    </div>

                                                    <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold">
                                                        Save Question to Poll
                                                    </Button>
                                                </form>
                                            </Card>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* POLICIES TAB */}
                            {activeTab === 'policies' && (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    
                                    {/* Left 2 Cols: Policies Listing */}
                                    <div className="lg:col-span-2 space-y-6">
                                        <Card className="bg-white border rounded-2xl shadow-sm overflow-hidden">
                                            <div className="p-5 border-b font-bold text-sm text-foreground flex items-center justify-between">
                                                <span>Active Policy Frameworks ({policies.length})</span>
                                            </div>
                                            <div className="divide-y text-xs">
                                                {policies.map((p) => (
                                                    <div key={p.id} className="p-5 space-y-3 hover:bg-slate-50 transition-colors">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <h4 className="font-bold text-sm text-foreground">{p.title}</h4>
                                                                <p className="text-[10px] text-muted-foreground">FAQ Items Count: {Array.isArray(p.faqs) ? p.faqs.length : 0}</p>
                                                            </div>
                                                            <div className="flex gap-1">
                                                                <Button 
                                                                    onClick={() => handleEditPolicy(p)}
                                                                    size="icon" 
                                                                    variant="ghost" 
                                                                    className="h-8 w-8 text-blue-600 rounded-lg hover:bg-blue-50"
                                                                >
                                                                    <Edit className="h-4 w-4" />
                                                                </Button>
                                                                <Button 
                                                                    onClick={() => handleDeletePolicy(p.id)}
                                                                    size="icon" 
                                                                    variant="ghost" 
                                                                    className="h-8 w-8 text-red-600 rounded-lg hover:bg-red-50"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        <p className="text-muted-foreground leading-relaxed line-clamp-3">{p.summary}</p>
                                                    </div>
                                                ))}

                                                {policies.length === 0 && (
                                                    <div className="py-12 text-center text-muted-foreground">No policy frameworks added.</div>
                                                )}
                                            </div>
                                        </Card>
                                    </div>

                                    {/* Right Col: Forms */}
                                    <div className="space-y-6">
                                        <Card className="bg-white border rounded-2xl shadow-sm">
                                            <div className="p-5 border-b font-bold text-sm text-foreground">
                                                {editingId ? 'Edit Policy' : 'Create new Policy Framework'}
                                            </div>
                                            <form onSubmit={handlePolicySubmit} className="p-5 space-y-4">
                                                <div className="space-y-1">
                                                    <label className="text-[11px] font-bold text-muted-foreground uppercase">Policy Title</label>
                                                    <Input 
                                                        value={policyForm.title} 
                                                        onChange={(e) => setPolicyForm({...policyForm, title: e.target.value})}
                                                        placeholder="e.g. Kenya Climate Change Act 2026" 
                                                        required
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-[11px] font-bold text-muted-foreground uppercase">Executive Summary</label>
                                                    <textarea 
                                                        value={policyForm.summary} 
                                                        onChange={(e) => setPolicyForm({...policyForm, summary: e.target.value})}
                                                        placeholder="Quick overview..." 
                                                        className="w-full min-h-[60px] p-2 text-xs bg-background rounded-xl border"
                                                        required
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-[11px] font-bold text-muted-foreground uppercase">Why it Matters (Rationale)</label>
                                                    <textarea 
                                                        value={policyForm.why_matters} 
                                                        onChange={(e) => setPolicyForm({...policyForm, why_matters: e.target.value})}
                                                        placeholder="Underlying motivation..." 
                                                        className="w-full min-h-[60px] p-2 text-xs bg-background rounded-xl border"
                                                        required
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-[11px] font-bold text-muted-foreground uppercase">Impact on Youth & Opportunities</label>
                                                    <textarea 
                                                        value={policyForm.impact_on_youth} 
                                                        onChange={(e) => setPolicyForm({...policyForm, impact_on_youth: e.target.value})}
                                                        placeholder="Direct consequences for youth..." 
                                                        className="w-full min-h-[60px] p-2 text-xs bg-background rounded-xl border"
                                                        required
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-[11px] font-bold text-muted-foreground uppercase">Specific Opportunities Created</label>
                                                    <textarea 
                                                        value={policyForm.opportunities} 
                                                        onChange={(e) => setPolicyForm({...policyForm, opportunities: e.target.value})}
                                                        placeholder="Jobs, funding tracks, representation, internships..." 
                                                        className="w-full min-h-[60px] p-2 text-xs bg-background rounded-xl border"
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-[11px] font-bold text-muted-foreground uppercase">Risks & Challenges</label>
                                                    <textarea 
                                                        value={policyForm.risks_challenges} 
                                                        onChange={(e) => setPolicyForm({...policyForm, risks_challenges: e.target.value})}
                                                        placeholder="Implementation gaps, corruption, red tape..." 
                                                        className="w-full min-h-[60px] p-2 text-xs bg-background rounded-xl border"
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-[11px] font-bold text-muted-foreground uppercase">Real-World Examples</label>
                                                    <textarea 
                                                        value={policyForm.real_world_examples} 
                                                        onChange={(e) => setPolicyForm({...policyForm, real_world_examples: e.target.value})}
                                                        placeholder="Specific county achievements or case studies..." 
                                                        className="w-full min-h-[60px] p-2 text-xs bg-background rounded-xl border"
                                                    />
                                                </div>

                                                {/* FAQ Builder */}
                                                <div className="border-t border-dashed pt-4 space-y-3">
                                                    <h5 className="font-bold text-xs text-civic-green uppercase tracking-wide">FAQ Accordion Builder</h5>
                                                    
                                                    {/* Render FAQs */}
                                                    <div className="space-y-1.5">
                                                        {policyForm.faqs.map((faq, idx) => (
                                                            <div key={idx} className="bg-slate-50 border p-2 rounded-lg flex justify-between items-start text-[10px]">
                                                                <div className="space-y-0.5">
                                                                    <div className="font-bold text-slate-800">Q: {faq.question}</div>
                                                                    <div className="text-slate-600">A: {faq.answer}</div>
                                                                </div>
                                                                <button type="button" onClick={() => handleRemoveFaq(idx)} className="text-red-500 hover:text-red-700">
                                                                    <X className="h-3 w-3" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-dashed">
                                                        <Input 
                                                            value={faqQuestion}
                                                            onChange={(e) => setFaqQuestion(e.target.value)}
                                                            placeholder="FAQ Question..."
                                                            className="bg-white text-xs"
                                                        />
                                                        <textarea 
                                                            value={faqAnswer}
                                                            onChange={(e) => setFaqAnswer(e.target.value)}
                                                            placeholder="FAQ Answer..."
                                                            className="w-full min-h-[50px] p-2 text-xs bg-white rounded-xl border"
                                                        />
                                                        <Button 
                                                            type="button" 
                                                            onClick={handleAddFaq}
                                                            className="w-full h-8 bg-slate-900 text-white rounded-lg text-[10px] font-bold"
                                                        >
                                                            Add FAQ Item
                                                        </Button>
                                                    </div>
                                                </div>

                                                <div className="flex gap-2">
                                                    <Button type="submit" className="flex-1 bg-civic-green hover:bg-civic-green-dark text-white rounded-xl text-xs font-bold">
                                                        {editingId ? 'Update Policy' : 'Publish Policy'}
                                                    </Button>
                                                    {editingId && (
                                                        <Button 
                                                            type="button" 
                                                            variant="outline" 
                                                            onClick={() => {
                                                                setEditingId(null);
                                                                setPolicyForm({ title: '', summary: '', why_matters: '', impact_on_youth: '', opportunities: '', risks_challenges: '', real_world_examples: '', faqs: [] });
                                                            }}
                                                            className="rounded-xl text-xs"
                                                        >
                                                            Cancel
                                                        </Button>
                                                    )}
                                                </div>
                                            </form>
                                        </Card>
                                    </div>
                                </div>
                            )}

                            {/* LIBRARY TAB */}
                            {activeTab === 'library' && (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    
                                    {/* Left 2 Cols: Resources Listing */}
                                    <div className="lg:col-span-2 space-y-6">
                                        <Card className="bg-white border rounded-2xl shadow-sm overflow-hidden">
                                            <div className="p-5 border-b font-bold text-sm text-foreground flex items-center justify-between">
                                                <span>Library Resources ({resources.length})</span>
                                            </div>
                                            <div className="divide-y text-xs">
                                                {resources.map((res) => (
                                                    <div key={res.id} className="p-5 space-y-3 hover:bg-slate-50 transition-colors">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                                                                    {res.title}
                                                                    {res.is_youth_kb && (
                                                                        <Badge className="bg-amber-50 hover:bg-amber-100 text-amber-700 border-none text-[8px] py-0 px-1.5 font-extrabold uppercase">
                                                                            Youth KB
                                                                        </Badge>
                                                                    )}
                                                                </h4>
                                                                <div className="flex flex-wrap gap-1.5 mt-1 text-[9px]">
                                                                    <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-semibold">{res.category}</span>
                                                                    {res.sdg && <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded font-semibold">{res.sdg}</span>}
                                                                    {res.county && <span className="bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded font-semibold">{res.county}</span>}
                                                                    {res.topic && <span className="bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded font-semibold">{res.topic}</span>}
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-1">
                                                                <Button 
                                                                    onClick={() => handleEditResource(res)}
                                                                    size="icon" 
                                                                    variant="ghost" 
                                                                    className="h-8 w-8 text-blue-600 rounded-lg hover:bg-blue-50"
                                                                >
                                                                    <Edit className="h-4 w-4" />
                                                                </Button>
                                                                <Button 
                                                                    onClick={() => handleDeleteResource(res.id)}
                                                                    size="icon" 
                                                                    variant="ghost" 
                                                                    className="h-8 w-8 text-red-600 rounded-lg hover:bg-red-50"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        <p className="text-muted-foreground leading-relaxed line-clamp-2">{res.description}</p>
                                                    </div>
                                                ))}

                                                {resources.length === 0 && (
                                                    <div className="py-12 text-center text-muted-foreground">No resources in the library.</div>
                                                )}
                                            </div>
                                        </Card>
                                    </div>

                                    {/* Right Col: Forms */}
                                    <div className="space-y-6">
                                        <Card className="bg-white border rounded-2xl shadow-sm">
                                            <div className="p-5 border-b font-bold text-sm text-foreground">
                                                {editingId ? 'Edit Library Resource' : 'Add Library Resource'}
                                            </div>
                                            <form onSubmit={handleResourceSubmit} className="p-5 space-y-4 text-xs">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Document Title</label>
                                                    <Input 
                                                        value={resourceForm.title} 
                                                        onChange={(e) => setResourceForm({...resourceForm, title: e.target.value})}
                                                        placeholder="e.g. County Allocation Act 2026" 
                                                        required
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Short Description</label>
                                                    <textarea 
                                                        value={resourceForm.description} 
                                                        onChange={(e) => setResourceForm({...resourceForm, description: e.target.value})}
                                                        placeholder="Brief user preview..." 
                                                        className="w-full min-h-[50px] p-2 text-xs bg-background rounded-xl border"
                                                        required
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Category</label>
                                                        <select 
                                                            value={resourceForm.category}
                                                            onChange={(e) => setResourceForm({...resourceForm, category: e.target.value})}
                                                            className="w-full p-2 text-xs bg-background rounded-xl border"
                                                        >
                                                            <option value="constitution">Constitution</option>
                                                            <option value="local_bylaws">Local Bylaws</option>
                                                            <option value="human_rights">Human Rights</option>
                                                            <option value="environmental">Environmental</option>
                                                            <option value="forms">Forms & Tools</option>
                                                        </select>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Resource Type</label>
                                                        <select 
                                                            value={resourceForm.resource_type}
                                                            onChange={(e) => setResourceForm({...resourceForm, resource_type: e.target.value})}
                                                            className="w-full p-2 text-xs bg-background rounded-xl border"
                                                        >
                                                            <option value="pdf">PDF Download</option>
                                                            <option value="link">External Link</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Document / File URL</label>
                                                    <Input 
                                                        value={resourceForm.file_url} 
                                                        onChange={(e) => setResourceForm({...resourceForm, file_url: e.target.value})}
                                                        placeholder="https://example.com/docs/file.pdf" 
                                                        required
                                                    />
                                                </div>

                                                {/* Advanced Library Fields */}
                                                <div className="border-t border-dashed pt-4 space-y-3">
                                                    <h5 className="font-bold text-xs text-civic-green uppercase tracking-wide">Multi-faceted Metadata</h5>
                                                    
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="space-y-1">
                                                            <label className="text-[9px] font-bold text-muted-foreground uppercase">SDG Tag</label>
                                                            <Input 
                                                                value={resourceForm.sdg} 
                                                                onChange={(e) => setResourceForm({...resourceForm, sdg: e.target.value})}
                                                                placeholder="e.g. SDG 13: Climate Action" 
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[9px] font-bold text-muted-foreground uppercase">County Context</label>
                                                            <Input 
                                                                value={resourceForm.county} 
                                                                onChange={(e) => setResourceForm({...resourceForm, county: e.target.value})}
                                                                placeholder="e.g. Nairobi, Mombasa" 
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="space-y-1">
                                                            <label className="text-[9px] font-bold text-muted-foreground uppercase">Key Topic</label>
                                                            <Input 
                                                                value={resourceForm.topic} 
                                                                onChange={(e) => setResourceForm({...resourceForm, topic: e.target.value})}
                                                                placeholder="e.g. Climate, Funding" 
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[9px] font-bold text-muted-foreground uppercase">Governance Sector</label>
                                                            <Input 
                                                                value={resourceForm.governance_sector} 
                                                                onChange={(e) => setResourceForm({...resourceForm, governance_sector: e.target.value})}
                                                                placeholder="e.g. Budget, Legislature" 
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-bold text-muted-foreground uppercase">Executive Summary (Detailed)</label>
                                                        <textarea 
                                                            value={resourceForm.summary} 
                                                            onChange={(e) => setResourceForm({...resourceForm, summary: e.target.value})}
                                                            placeholder="Add a detailed analytical summary of the document contents..." 
                                                            className="w-full min-h-[50px] p-2 text-xs bg-background rounded-xl border"
                                                        />
                                                    </div>

                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-bold text-muted-foreground uppercase">Policy References</label>
                                                        <Input 
                                                            value={resourceForm.policy_references} 
                                                            onChange={(e) => setResourceForm({...resourceForm, policy_references: e.target.value})}
                                                            placeholder="e.g. Reference to Climate Act Section 5" 
                                                        />
                                                    </div>

                                                    <div className="flex items-center gap-2 pt-2">
                                                        <input 
                                                            type="checkbox" 
                                                            id="youth_kb"
                                                            checked={resourceForm.is_youth_kb}
                                                            onChange={(e) => setResourceForm({...resourceForm, is_youth_kb: e.target.checked})}
                                                            className="w-4 h-4 accent-civic-green rounded"
                                                        />
                                                        <label htmlFor="youth_kb" className="font-bold text-slate-800 cursor-pointer">
                                                            Publish to Youth Knowledge Base
                                                        </label>
                                                    </div>
                                                </div>

                                                <div className="flex gap-2">
                                                    <Button type="submit" className="flex-1 bg-civic-green hover:bg-civic-green-dark text-white rounded-xl text-xs font-bold">
                                                        {editingId ? 'Save Resource Changes' : 'Add to Library'}
                                                    </Button>
                                                    {editingId && (
                                                        <Button 
                                                            type="button" 
                                                            variant="outline" 
                                                            onClick={() => {
                                                                setEditingId(null);
                                                                setResourceForm({ title: '', description: '', category: 'constitution', file_url: '', resource_type: 'pdf', topic: '', county: '', governance_sector: '', sdg: '', summary: '', policy_references: '', is_youth_kb: false });
                                                            }}
                                                            className="rounded-xl text-xs"
                                                        >
                                                            Cancel
                                                        </Button>
                                                    )}
                                                </div>
                                            </form>
                                        </Card>
                                    </div>
                                </div>
                            )}

                            {/* AI POLICY BRIEFS TAB */}
                            {activeTab === 'briefs' && (
                                <div className="space-y-6">
                                    <Card className="bg-white border rounded-2xl shadow-sm overflow-hidden">
                                        <div className="p-5 border-b font-bold text-sm text-foreground flex items-center justify-between">
                                            <span>AI Policy Briefs Workflow Queue ({briefs.length})</span>
                                        </div>
                                        <div className="divide-y text-xs">
                                            {briefs.map((brief) => (
                                                <div key={brief.id} className="p-5 space-y-4 hover:bg-slate-50 transition-colors">
                                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                                                        <div>
                                                            <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                                                                {brief.title}
                                                                <Badge className={`text-[9px] font-extrabold uppercase border-none ${
                                                                    brief.status === 'published' 
                                                                        ? 'bg-emerald-50 text-emerald-800' 
                                                                        : brief.status === 'approved' 
                                                                        ? 'bg-blue-50 text-blue-800' 
                                                                        : 'bg-amber-50 text-amber-800'
                                                                }`}>
                                                                    {brief.status}
                                                                </Badge>
                                                            </h4>
                                                            <div className="text-[10px] text-muted-foreground mt-1">
                                                                Generated on: {new Date(brief.created_at).toLocaleDateString()} · Poll Source: <strong className="text-slate-800">{brief.policy_polls?.title}</strong>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Button
                                                                onClick={() => setEditingBrief(brief)}
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-8 rounded-lg text-slate-700 hover:text-slate-900 border-border font-bold text-[10px] gap-1"
                                                            >
                                                                <Edit className="h-3.5 w-3.5" /> Edit Brief Text
                                                            </Button>
                                                            
                                                            {brief.status === 'draft' && (
                                                                <Button
                                                                    onClick={() => handleApproveBrief(brief)}
                                                                    size="sm"
                                                                    className="h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] gap-1"
                                                                >
                                                                    <CheckCircle2 className="h-3.5 w-3.5" /> Approve Draft
                                                                </Button>
                                                            )}

                                                            {(brief.status === 'approved' || brief.status === 'draft') && (
                                                                <Button
                                                                    onClick={() => handlePublishBrief(brief)}
                                                                    size="sm"
                                                                    className="h-8 rounded-lg bg-civic-green hover:bg-civic-green-dark text-white font-bold text-[10px] gap-1"
                                                                >
                                                                    <Globe className="h-3.5 w-3.5" /> Publish to Policy Pulse
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="p-4 bg-muted/20 border border-border/40 rounded-xl max-h-[200px] overflow-y-auto font-mono text-[10px] leading-relaxed text-foreground/80 whitespace-pre-wrap">
                                                        {brief.content}
                                                    </div>
                                                </div>
                                            ))}

                                            {briefs.length === 0 && (
                                                <div className="py-12 text-center text-muted-foreground">No briefs generated yet. Run analysis on a poll to generate drafts.</div>
                                            )}
                                        </div>
                                    </Card>

                                    {/* Edit Brief Dialog/Overlay */}
                                    {editingBrief && (
                                        <Card className="bg-slate-900 text-white border-none rounded-2xl shadow-xl p-6 space-y-4">
                                            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                                                <h4 className="font-bold text-base flex items-center gap-1.5">
                                                    <Edit className="h-5 w-5 text-civic-green" />
                                                    Editing AI Brief Content
                                                </h4>
                                                <button onClick={() => setEditingBrief(null)}>
                                                    <X className="h-5 w-5 text-slate-400 hover:text-white" />
                                                </button>
                                            </div>

                                            <div className="space-y-2 text-xs">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase">Brief Title</label>
                                                <Input 
                                                    value={editingBrief.title}
                                                    onChange={(e) => setEditingBrief({...editingBrief, title: e.target.value})}
                                                    className="bg-slate-800 border-slate-700 text-white text-xs rounded-xl focus-visible:ring-civic-green/30"
                                                />
                                            </div>

                                            <div className="space-y-2 text-xs">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase">Brief Body Markdown</label>
                                                <textarea 
                                                    value={editingBrief.content}
                                                    onChange={(e) => setEditingBrief({...editingBrief, content: e.target.value})}
                                                    className="w-full min-h-[400px] p-3 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-100 font-mono focus:outline-none focus:border-civic-green"
                                                />
                                            </div>

                                            <div className="flex justify-end gap-2 pt-2">
                                                <Button variant="ghost" onClick={() => setEditingBrief(null)} className="text-slate-400 hover:text-white">
                                                    Cancel
                                                </Button>
                                                <Button onClick={handleSaveBriefContent} className="bg-civic-green hover:bg-civic-green-dark text-white font-bold rounded-xl text-xs gap-1">
                                                    <Save className="h-4 w-4" /> Save brief modifications
                                                </Button>
                                            </div>
                                        </Card>
                                    )}
                                </div>
                            )}

                            {/* COMMENTS TAB */}
                            {activeTab === 'comments' && (
                                <Card className="bg-white border rounded-2xl shadow-sm overflow-hidden">
                                    <div className="p-5 border-b font-bold text-sm text-foreground">
                                        <span>Poll Comments Moderation Pool ({comments.length})</span>
                                    </div>
                                    <div className="divide-y text-xs">
                                        {comments.map((comment) => (
                                            <div key={comment.id} className="p-5 flex justify-between items-start gap-4 hover:bg-slate-50 transition-colors">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-800">{comment.profiles?.full_name || 'Anonymous Advocate'}</span>
                                                        <span className="text-[10px] text-muted-foreground">({comment.profiles?.email || 'No Email'})</span>
                                                        <span className="text-[9px] text-muted-foreground">· {new Date(comment.created_at).toLocaleString()}</span>
                                                    </div>
                                                    <div className="text-[10px] text-civic-green font-semibold">
                                                        Source Poll: {comment.policy_polls?.title || 'Unknown Poll'}
                                                    </div>
                                                    <p className="text-slate-700 leading-relaxed text-sm pt-1">{comment.content}</p>
                                                </div>
                                                <Button
                                                    onClick={() => handleDeleteComment(comment.id)}
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl h-8 w-8 p-0"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}

                                        {comments.length === 0 && (
                                            <div className="py-12 text-center text-muted-foreground">No comments found to moderate.</div>
                                        )}
                                    </div>
                                </Card>
                            )}

                        </div>
                    )}

                </div>
            </div>
        </ProtectedRoute>
    );
}
