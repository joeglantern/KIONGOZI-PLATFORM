'use client';

import { useState } from 'react';
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
import { Loader2 } from 'lucide-react';

interface Topic {
    id: string;
    name: string;
    slug: string;
}

interface CreatePostFormProps {
    topics: Topic[];
    user: any; // User object or null
}

export default function CreatePostForm({ topics, user }: CreatePostFormProps) {
    const router = useRouter();
    const [content, setContent] = useState('');
    const [topicId, setTopicId] = useState<string>('');
    // If user is not logged in, default is anonymous.
    // If user is logged in, they can toggle anonymous posting.
    const [isAnonymous, setIsAnonymous] = useState(!user);
    const [anonymousName, setAnonymousName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        if (!topicId) {
            setError('Please select a topic.');
            setIsLoading(false);
            return;
        }

        if (!content.trim()) {
            setError('Content cannot be empty.');
            setIsLoading(false);
            return;
        }

        const supabase = createClient();

        try {
            const postData: any = {
                content,
                topic_id: topicId,
            };

            if (user && !isAnonymous) {
                // Authenticated post
                postData.user_id = user.id;
            } else {
                // Anonymous post
                postData.user_id = null; // Explicitly null for anon policy
                postData.anonymous_name = anonymousName.trim() || 'Anonymous';
            }

            const { error: insertError } = await supabase
                .from('social_posts')
                .insert(postData);

            if (insertError) {
                throw insertError;
            }

            router.push('/community');
            router.refresh();

        } catch (err: any) {
            console.error('Error creating post:', err);
            setError(err.message || 'Failed to create post. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Create a New Post</CardTitle>
                <CardDescription>
                    Share your thoughts, ask questions, or start a discussion.
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                    {error && (
                        <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="topic">Topic</Label>
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
                        <Label htmlFor="content">Content</Label>
                        <Textarea
                            id="content"
                            placeholder="What's on your mind?"
                            className="min-h-[150px]"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />
                    </div>

                    <div className="space-y-4 pt-2">
                        {user ? (
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
                                    onChange={(e) => setAnonymousName(e.target.value)}
                                />
                            </div>
                        )}
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button variant="ghost" type="button" onClick={() => router.back()}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Post
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}
