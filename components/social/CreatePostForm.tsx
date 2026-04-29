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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, MessageSquarePlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const MAX_CONTENT = 2000;
const MAX_ANON_NAME = 40;

interface Topic {
    id: string;
    name: string;
    slug: string;
}

interface CreatePostFormProps {
    topics: Topic[];
    user: any;
}

export default function CreatePostForm({ topics, user }: CreatePostFormProps) {
    const router = useRouter();
    const { toast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const [content, setContent] = useState('');
    const [topicId, setTopicId] = useState<string>('');
    const [isAnonymous, setIsAnonymous] = useState(!user);
    const [anonymousName, setAnonymousName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const trimmedContent = content.trim();
    const contentOver = content.length > MAX_CONTENT;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!topicId) {
            toast({ title: 'Select a topic', description: 'Please choose a topic before posting.', variant: 'destructive' });
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
            const postData: any = {
                content: trimmedContent,
                topic_id: topicId,
            };

            if (user && !isAnonymous) {
                postData.user_id = user.id;
            } else {
                // Null user_id — RLS allows authenticated users to post anonymously
                postData.user_id = null;
                postData.anonymous_name = anonymousName.trim().slice(0, MAX_ANON_NAME) || 'Anonymous';
            }

            const { error: insertError } = await supabase
                .from('social_posts')
                .insert(postData);

            if (insertError) throw insertError;

            toast({ title: 'Posted!', description: 'Your post is now live in the community.' });
            router.push('/community');
            router.refresh();
        } catch (err: any) {
            console.error('Error creating post:', err);
            toast({
                title: 'Failed to post',
                description: err.message || 'Something went wrong. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <MessageSquarePlus className="h-5 w-5 text-civic-green" />
                    Create a New Post
                </CardTitle>
                <CardDescription>
                    Share your thoughts, ask questions, or start a discussion.
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="topic">
                            Topic <span className="text-destructive">*</span>
                        </Label>
                        <Select value={topicId} onValueChange={setTopicId}>
                            <SelectTrigger id="topic">
                                <SelectValue placeholder="Select a topic" />
                            </SelectTrigger>
                            <SelectContent>
                                {topics.map((topic) => (
                                    <SelectItem key={topic.id} value={topic.id}>
                                        {topic.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="content">
                            Content <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                            id="content"
                            placeholder="What's on your mind?"
                            className="min-h-[150px]"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            maxLength={MAX_CONTENT + 100}
                        />
                        <p className={`text-xs text-right ${contentOver ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                            {content.length} / {MAX_CONTENT}
                        </p>
                    </div>

                    <div className="space-y-4 pt-2">
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
                                        Posting as <span className="font-medium">{user.user_metadata?.full_name || user.email}</span>
                                    </p>
                                )}
                            </>
                        ) : (
                            <div className="text-sm text-muted-foreground">
                                You are posting as a guest.
                            </div>
                        )}

                        {(isAnonymous || !user) && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                                <Label htmlFor="anon-name">Display Name (Optional)</Label>
                                <Input
                                    id="anon-name"
                                    placeholder="e.g. Curious Learner (defaults to Anonymous)"
                                    value={anonymousName}
                                    onChange={(e) => setAnonymousName(e.target.value.slice(0, MAX_ANON_NAME))}
                                    maxLength={MAX_ANON_NAME}
                                />
                                <p className="text-xs text-muted-foreground text-right">
                                    {anonymousName.length} / {MAX_ANON_NAME}
                                </p>
                            </div>
                        )}
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button variant="ghost" type="button" asChild>
                        <Link href="/community">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Cancel
                        </Link>
                    </Button>
                    <Button type="submit" disabled={isLoading || contentOver}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Post
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}
