'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/app/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, MessageSquarePlus, Plus, Hash, X } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

const MAX_CONTENT = 2000;
const MAX_ANON_NAME = 40;
const MAX_TOPIC_NAME = 50;

const NEW_TOPIC_SENTINEL = '__new__';

interface Topic {
    id: string;
    name: string;
    slug: string;
}

interface CreatePostFormProps {
    topics: Topic[];
    user: any;
}

function slugify(str: string) {
    return str
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 80);
}

export default function CreatePostForm({ topics: initialTopics, user }: CreatePostFormProps) {
    const router = useRouter();
    const { toast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const [topics, setTopics] = useState<Topic[]>(initialTopics);
    const [content, setContent] = useState('');
    const [topicId, setTopicId] = useState<string>('');
    const [isAnonymous, setIsAnonymous] = useState(!user);
    const [anonymousName, setAnonymousName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // New topic state
    const [showNewTopic, setShowNewTopic] = useState(false);
    const [newTopicName, setNewTopicName] = useState('');
    const [isCreatingTopic, setIsCreatingTopic] = useState(false);

    const trimmedContent = content.trim();
    const contentOver = content.length > MAX_CONTENT;

    const handleCreateTopic = async () => {
        const name = newTopicName.trim();
        if (!name) return;

        if (!user) {
            toast({ title: 'Sign in required', description: 'You must be logged in to create a topic.', variant: 'destructive' });
            return;
        }

        setIsCreatingTopic(true);
        try {
            const slug = slugify(name);
            const { data, error } = await supabase
                .from('social_topics')
                .insert({ name, slug })
                .select('id, name, slug')
                .single();

            if (error) {
                // Unique constraint — topic already exists
                if (error.code === '23505') {
                    toast({ title: 'Topic exists', description: `"${name}" already exists. Select it from the list.`, variant: 'destructive' });
                } else {
                    throw error;
                }
                return;
            }

            setTopics(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
            setTopicId(data.id);
            setNewTopicName('');
            setShowNewTopic(false);
            toast({ title: 'Topic created', description: `#${data.name} is ready to use.`, className: 'bg-civic-green text-white border-none' });
        } catch (err: any) {
            toast({ title: 'Failed to create topic', description: err.message, variant: 'destructive' });
        } finally {
            setIsCreatingTopic(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!topicId || topicId === NEW_TOPIC_SENTINEL) {
            toast({ title: 'Select a topic', description: 'Choose or create a topic before posting.', variant: 'destructive' });
            return;
        }
        if (!trimmedContent) {
            toast({ title: 'Content required', description: 'Post content cannot be empty.', variant: 'destructive' });
            return;
        }
        if (contentOver) {
            toast({ title: 'Too long', description: `Content must be under ${MAX_CONTENT} characters.`, variant: 'destructive' });
            return;
        }

        setIsLoading(true);
        try {
            const postData: any = { content: trimmedContent, topic_id: topicId };

            if (user && !isAnonymous) {
                postData.user_id = user.id;
            } else {
                postData.user_id = null;
                postData.anonymous_name = anonymousName.trim().slice(0, MAX_ANON_NAME) || 'Anonymous';
            }

            const { error: insertError } = await supabase.from('social_posts').insert(postData);
            if (insertError) throw insertError;

            toast({ title: 'Posted!', description: 'Your post is now live.', className: 'bg-civic-green text-white border-none' });
            router.push('/community');
            router.refresh();
        } catch (err: any) {
            toast({ title: 'Failed to post', description: err.message || 'Please try again.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const selectedTopic = topics.find(t => t.id === topicId);

    return (
        <div className="bg-white rounded-2xl border border-border/50 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-border/50">
                <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
                    <MessageSquarePlus className="h-5 w-5 text-civic-green" />
                    Start a Discussion
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">Share your thoughts with the Kiongozi community.</p>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
                {/* Topic selector */}
                <div className="space-y-2">
                    <Label>
                        Topic <span className="text-destructive">*</span>
                    </Label>

                    {selectedTopic && !showNewTopic ? (
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="flex items-center gap-1.5 text-sm py-1 px-3 bg-civic-green/10 text-civic-green-dark border-civic-green/20">
                                <Hash className="h-3 w-3" />
                                {selectedTopic.name}
                            </Badge>
                            <button
                                type="button"
                                onClick={() => setTopicId('')}
                                className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
                            >
                                <X className="h-3.5 w-3.5" /> Change
                            </button>
                        </div>
                    ) : !showNewTopic ? (
                        <div className="flex gap-2">
                            <Select value={topicId} onValueChange={(v) => {
                                if (v === NEW_TOPIC_SENTINEL) {
                                    setShowNewTopic(true);
                                    setTopicId('');
                                } else {
                                    setTopicId(v);
                                }
                            }}>
                                <SelectTrigger className="flex-1">
                                    <SelectValue placeholder="Choose a topic…" />
                                </SelectTrigger>
                                <SelectContent>
                                    {topics.map((topic) => (
                                        <SelectItem key={topic.id} value={topic.id}>
                                            #{topic.name}
                                        </SelectItem>
                                    ))}
                                    <SelectItem value={NEW_TOPIC_SENTINEL} className="text-civic-green font-medium">
                                        <span className="flex items-center gap-1.5">
                                            <Plus className="h-3.5 w-3.5" /> Create new topic…
                                        </span>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    ) : null}

                    {/* New topic input */}
                    {showNewTopic && (
                        <div className="space-y-2 p-4 bg-civic-green/5 border border-civic-green/20 rounded-xl">
                            <Label className="text-sm font-medium text-civic-green-dark flex items-center gap-1.5">
                                <Hash className="h-3.5 w-3.5" /> New Topic Name
                            </Label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="e.g. Climate Action, Youth Employment…"
                                    value={newTopicName}
                                    onChange={e => setNewTopicName(e.target.value.slice(0, MAX_TOPIC_NAME))}
                                    className="flex-1"
                                    autoFocus
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreateTopic(); } }}
                                />
                                <Button
                                    type="button"
                                    size="sm"
                                    className="bg-civic-green hover:bg-civic-green-dark text-white shrink-0"
                                    onClick={handleCreateTopic}
                                    disabled={!newTopicName.trim() || isCreatingTopic}
                                >
                                    {isCreatingTopic ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                                </Button>
                            </div>
                            <div className="flex items-center justify-between">
                                <p className="text-xs text-muted-foreground">{newTopicName.length}/{MAX_TOPIC_NAME}</p>
                                <button
                                    type="button"
                                    onClick={() => { setShowNewTopic(false); setNewTopicName(''); }}
                                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {!showNewTopic && !selectedTopic && (
                        <button
                            type="button"
                            onClick={() => setShowNewTopic(true)}
                            className="text-xs text-civic-green hover:text-civic-green-dark flex items-center gap-1 transition-colors"
                        >
                            <Plus className="h-3.5 w-3.5" /> Don't see your topic? Create one
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="space-y-2">
                    <Label htmlFor="content">
                        What's on your mind? <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                        id="content"
                        placeholder="Share your thoughts, ask a question, or start a debate…"
                        className="min-h-[160px] resize-none"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        maxLength={MAX_CONTENT + 100}
                    />
                    <p className={`text-xs text-right ${contentOver ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                        {content.length} / {MAX_CONTENT}
                    </p>
                </div>

                {/* Anonymous / identity */}
                <div className="space-y-3 pt-1">
                    {user ? (
                        <>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="anonymous"
                                    checked={isAnonymous}
                                    onCheckedChange={(checked) => setIsAnonymous(checked as boolean)}
                                />
                                <Label htmlFor="anonymous" className="text-sm font-normal cursor-pointer">
                                    Post anonymously
                                </Label>
                            </div>
                            {!isAnonymous && (
                                <p className="text-xs text-muted-foreground">
                                    Posting as <span className="font-medium text-foreground">{user.user_metadata?.full_name || user.email}</span>
                                </p>
                            )}
                        </>
                    ) : (
                        <p className="text-xs text-muted-foreground">Posting as a guest.</p>
                    )}

                    {(isAnonymous || !user) && (
                        <div className="space-y-2">
                            <Label htmlFor="anon-name" className="text-sm">Display Name <span className="text-muted-foreground font-normal">(optional)</span></Label>
                            <Input
                                id="anon-name"
                                placeholder="e.g. Curious Kenyan (defaults to Anonymous)"
                                value={anonymousName}
                                onChange={(e) => setAnonymousName(e.target.value.slice(0, MAX_ANON_NAME))}
                                maxLength={MAX_ANON_NAME}
                            />
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <Button variant="ghost" type="button" asChild className="text-muted-foreground">
                        <Link href="/community">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Cancel
                        </Link>
                    </Button>
                    <Button
                        type="submit"
                        className="bg-civic-green hover:bg-civic-green-dark text-white px-8"
                        disabled={isLoading || contentOver || !trimmedContent || !topicId}
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Post
                    </Button>
                </div>
            </form>
        </div>
    );
}
