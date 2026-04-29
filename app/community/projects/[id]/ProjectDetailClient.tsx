'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/app/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
    ArrowLeft, MapPin, Users, Bell, BellOff, Loader2,
    ThumbsUp, Plus, Image, Clipboard, Calendar
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow, format } from 'date-fns';

const MILESTONE_LABELS: Record<string, string> = {
    announced: 'Announced', funded: 'Funded', in_progress: 'In Progress',
    stalled: 'Stalled', completed: 'Completed', audited: 'Audited',
};
const MILESTONE_STEPS = ['announced', 'funded', 'in_progress', 'completed', 'audited'];
const MILESTONE_STYLES: Record<string, string> = {
    announced: 'bg-yellow-100 text-yellow-800', funded: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-green-100 text-green-800', stalled: 'bg-red-100 text-red-800',
    completed: 'bg-emerald-100 text-emerald-800', audited: 'bg-purple-100 text-purple-800',
};
const UPDATE_TYPE_STYLES: Record<string, string> = {
    progress: 'bg-blue-50 border-blue-200 text-blue-700',
    concern: 'bg-red-50 border-red-200 text-red-700',
    milestone: 'bg-green-50 border-green-200 text-green-700',
    official_response: 'bg-purple-50 border-purple-200 text-purple-700',
};

function fmt(n: number | null, currency = 'KES') {
    if (!n) return null;
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
}

export default function ProjectDetailClient({ project, updates: initialUpdates, media: initialMedia, user, isFollowing: initFollowing }: {
    project: any; updates: any[]; media: any[]; user: any; isFollowing: boolean;
}) {
    const [updates, setUpdates] = useState(initialUpdates);
    const [media, setMedia] = useState(initialMedia);
    const [following, setFollowing] = useState(initFollowing);
    const [showUpdateForm, setShowUpdateForm] = useState(false);
    const [updateContent, setUpdateContent] = useState('');
    const [updateType, setUpdateType] = useState('progress');
    const [newMilestone, setNewMilestone] = useState('');
    const [mediaUrl, setMediaUrl] = useState('');
    const [mediaCaption, setMediaCaption] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const [isTogglingFollow, setIsTogglingFollow] = useState(false);
    const router = useRouter();
    const { toast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const milestoneIndex = MILESTONE_STEPS.indexOf(project.milestone);

    const toggleFollow = async () => {
        if (!user) { toast({ title: 'Login required', variant: 'destructive' }); return; }
        setIsTogglingFollow(true);
        try {
            if (following) {
                await supabase.from('project_follows').delete()
                    .eq('project_id', project.id).eq('user_id', user.id);
                setFollowing(false);
            } else {
                await supabase.from('project_follows').insert({ project_id: project.id, user_id: user.id });
                setFollowing(true);
            }
        } catch {
            toast({ title: 'Error', variant: 'destructive' });
        } finally {
            setIsTogglingFollow(false);
        }
    };

    const handleUpvote = async (updateId: string, currentUpvotes: number, hasUpvoted: boolean) => {
        if (!user) { toast({ title: 'Login required', variant: 'destructive' }); return; }
        try {
            if (hasUpvoted) {
                await supabase.from('project_update_upvotes').delete()
                    .eq('update_id', updateId).eq('user_id', user.id);
            } else {
                await supabase.from('project_update_upvotes').insert({ update_id: updateId, user_id: user.id });
            }
            setUpdates(prev => prev.map(u => u.id === updateId ? {
                ...u,
                upvote_count: hasUpvoted ? u.upvote_count - 1 : u.upvote_count + 1,
                project_update_upvotes: hasUpvoted
                    ? u.project_update_upvotes.filter((v: any) => v.user_id !== user.id)
                    : [...u.project_update_upvotes, { user_id: user.id }],
            } : u));
        } catch {
            toast({ title: 'Error', variant: 'destructive' });
        }
    };

    const submitUpdate = async () => {
        if (!user) { toast({ title: 'Login required', variant: 'destructive' }); return; }
        if (!updateContent.trim()) { toast({ title: 'Content required', variant: 'destructive' }); return; }
        setIsPosting(true);
        try {
            const { data: newUpdate, error: updateErr } = await supabase
                .from('project_updates')
                .insert({
                    project_id: project.id,
                    content: updateContent.trim(),
                    update_type: updateType,
                    new_milestone: newMilestone || null,
                    submitted_by: user.id,
                })
                .select('*, profiles(full_name, avatar_url), project_update_upvotes(user_id)')
                .single();

            if (updateErr) throw updateErr;

            if (newMilestone) {
                await supabase.from('public_projects').update({ milestone: newMilestone }).eq('id', project.id);
                project.milestone = newMilestone;
            }

            if (mediaUrl.trim()) {
                const { data: newMedia } = await supabase.from('project_media').insert({
                    project_id: project.id,
                    update_id: newUpdate.id,
                    media_url: mediaUrl.trim(),
                    media_type: 'image',
                    caption: mediaCaption.trim() || null,
                    uploaded_by: user.id,
                }).select().single();
                if (newMedia) setMedia(prev => [newMedia, ...prev]);
            }

            setUpdates(prev => [newUpdate, ...prev]);
            setUpdateContent('');
            setUpdateType('progress');
            setNewMilestone('');
            setMediaUrl('');
            setMediaCaption('');
            setShowUpdateForm(false);
            toast({ title: 'Update posted!', className: 'bg-civic-green text-white border-none' });
            router.refresh();
        } catch {
            toast({ title: 'Error posting update.', variant: 'destructive' });
        } finally {
            setIsPosting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 py-4">
            <div className="flex items-center justify-between gap-4">
                <Button variant="ghost" asChild>
                    <Link href="/community/projects"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Link>
                </Button>
                <Button variant="outline" size="sm" onClick={toggleFollow} disabled={isTogglingFollow}
                    className={following ? 'border-civic-green text-civic-green' : 'border-border'}>
                    {isTogglingFollow ? <Loader2 className="h-4 w-4 animate-spin" /> :
                        following ? <><BellOff className="mr-2 h-4 w-4" /> Unfollow</> : <><Bell className="mr-2 h-4 w-4" /> Follow</>}
                </Button>
            </div>

            {/* Project header */}
            <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                    <Badge className="capitalize bg-orange-100 text-orange-800">{project.project_type.replace('_', ' ')}</Badge>
                    <Badge className={MILESTONE_STYLES[project.milestone] ?? ''}>{MILESTONE_LABELS[project.milestone]}</Badge>
                </div>
                <h1 className="text-3xl font-bold">{project.title}</h1>
                {project.implementing_body && (
                    <p className="text-muted-foreground">{project.implementing_body}</p>
                )}
                {project.description && <p className="text-foreground/80 text-lg leading-relaxed">{project.description}</p>}

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {project.location_name && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {project.location_name}</span>}
                    <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {project.follower_count} following</span>
                    {fmt(project.budget, project.currency) && <span>Budget: <strong>{fmt(project.budget, project.currency)}</strong></span>}
                    {project.start_date && <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> Started {format(new Date(project.start_date), 'MMM yyyy')}</span>}
                    {project.expected_end_date && <span>Expected: {format(new Date(project.expected_end_date), 'MMM yyyy')}</span>}
                </div>
            </div>

            {/* Milestone tracker */}
            <Card className="border-border/50">
                <CardContent className="pt-4">
                    <div className="relative">
                        <div className="flex items-center justify-between">
                            {MILESTONE_STEPS.map((ms, i) => {
                                const isActive = project.milestone === ms;
                                const isPast = milestoneIndex > i;
                                return (
                                    <div key={ms} className="flex flex-col items-center gap-1 flex-1">
                                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold z-10
                                            ${isActive ? 'bg-civic-clay border-civic-clay text-white' :
                                              isPast ? 'bg-civic-green border-civic-green text-white' :
                                              'bg-background border-border text-muted-foreground'}`}>
                                            {i + 1}
                                        </div>
                                        <span className={`text-xs text-center leading-tight max-w-[60px] ${isActive ? 'font-semibold text-civic-clay' : isPast ? 'text-civic-green' : 'text-muted-foreground'}`}>
                                            {MILESTONE_LABELS[ms]}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="absolute top-4 left-4 right-4 h-0.5 bg-muted -z-10">
                            <div className="h-full bg-civic-green transition-all duration-500"
                                style={{ width: `${(milestoneIndex / (MILESTONE_STEPS.length - 1)) * 100}%` }} />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Photo gallery */}
            {media.length > 0 && (
                <div>
                    <h2 className="text-xl font-semibold mb-3">Photos</h2>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                        {media.map(m => (
                            <a key={m.id} href={m.media_url} target="_blank" rel="noopener noreferrer"
                                className="aspect-square rounded-lg overflow-hidden bg-muted border border-border hover:opacity-90 transition-opacity block">
                                <img src={m.media_url} alt={m.caption ?? ''} className="w-full h-full object-cover" />
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {/* Post Update */}
            {user && (
                <div>
                    {!showUpdateForm ? (
                        <Button variant="outline" onClick={() => setShowUpdateForm(true)}
                            className="border-civic-clay/30 text-civic-clay hover:bg-civic-clay/5">
                            <Plus className="mr-2 h-4 w-4" /> Post an Update
                        </Button>
                    ) : (
                        <Card className="border-civic-clay/20">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base">Post a Project Update</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium">Update Type</label>
                                        <Select value={updateType} onValueChange={setUpdateType}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="progress">Progress Update</SelectItem>
                                                <SelectItem value="concern">Raise a Concern</SelectItem>
                                                <SelectItem value="milestone">Milestone Reached</SelectItem>
                                                <SelectItem value="official_response">Official Response</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium">Change Stage To (optional)</label>
                                        <Select value={newMilestone || 'none'} onValueChange={v => setNewMilestone(v === 'none' ? '' : v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">No change</SelectItem>
                                                {Object.entries(MILESTONE_LABELS).map(([k, v]) => (
                                                    <SelectItem key={k} value={k}>{v}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <Textarea placeholder="Describe what you observed, any progress made, or concerns…"
                                    value={updateContent} onChange={e => setUpdateContent(e.target.value)} className="min-h-[100px]" />

                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium flex items-center gap-1"><Image className="h-4 w-4" /> Photo URL (optional)</label>
                                    <Input placeholder="https://example.com/photo.jpg" value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} />
                                    {mediaUrl && <Input placeholder="Caption…" value={mediaCaption} onChange={e => setMediaCaption(e.target.value)} />}
                                </div>

                                <div className="flex gap-2">
                                    <Button className="bg-civic-clay hover:bg-civic-clay/90 text-white" onClick={submitUpdate} disabled={isPosting}>
                                        {isPosting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Posting…</> : 'Post Update'}
                                    </Button>
                                    <Button variant="ghost" onClick={() => setShowUpdateForm(false)}>Cancel</Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* Updates timeline */}
            <div>
                <h2 className="text-xl font-semibold mb-4">Community Updates ({updates.length})</h2>
                <div className="space-y-4">
                    {updates.map(u => {
                        const hasUpvoted = u.project_update_upvotes?.some((v: any) => v.user_id === user?.id);
                        const typeStyle = UPDATE_TYPE_STYLES[u.update_type] ?? UPDATE_TYPE_STYLES.progress;
                        return (
                            <Card key={u.id} className="border-border/50">
                                <CardContent className="pt-4">
                                    <div className="flex gap-3 items-start">
                                        <div className="w-8 h-8 rounded-full bg-civic-clay/20 flex items-center justify-center shrink-0 text-sm font-bold text-civic-clay">
                                            {u.profiles?.full_name?.[0]?.toUpperCase() ?? '?'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <span className="text-sm font-medium">{u.profiles?.full_name ?? 'Community Member'}</span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${typeStyle}`}>
                                                    {u.update_type.replace('_', ' ')}
                                                </span>
                                                {u.new_milestone && (
                                                    <Badge className={`text-xs ${MILESTONE_STYLES[u.new_milestone] ?? ''}`}>
                                                        → {MILESTONE_LABELS[u.new_milestone]}
                                                    </Badge>
                                                )}
                                                <span className="text-xs text-muted-foreground ml-auto">
                                                    {formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}
                                                </span>
                                            </div>
                                            <p className="text-sm text-foreground/80 leading-relaxed">{u.content}</p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <button
                                                    className={`flex items-center gap-1 text-xs transition-colors ${hasUpvoted ? 'text-civic-green font-medium' : 'text-muted-foreground hover:text-civic-green'}`}
                                                    onClick={() => handleUpvote(u.id, u.upvote_count, hasUpvoted)}>
                                                    <ThumbsUp className="h-3.5 w-3.5" />
                                                    {u.upvote_count} {u.upvote_count === 1 ? 'upvote' : 'upvotes'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}

                    {updates.length === 0 && (
                        <p className="text-center py-10 text-muted-foreground text-sm bg-muted/20 rounded-xl border border-dashed border-border">
                            No updates yet. Be the first to report progress on this project.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
