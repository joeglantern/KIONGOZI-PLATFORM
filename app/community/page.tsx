import { createClient as createSupabaseServer } from '@/app/utils/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { Suspense } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PostCard from '@/components/social/PostCard';

async function Feed() {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    // Create an admin client for profile lookups to bypass guest RLS restrictions
    const fallbackKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        fallbackKey!
    );

    // Fetch posts with topic info and comment ids (for count) — limit to 30 most recent
    const { data: posts, error } = await supabase
        .from('social_posts')
        .select(`*, social_topics(name, slug), social_comments(id)`)
        .order('created_at', { ascending: false })
        .limit(30);

    if (error) {
        console.error('Error fetching posts:', error.message, error.code, error.details, error.hint);
        return <div className="text-center py-10 text-destructive">Failed to load posts. Please try again later.</div>;
    }

    // Resolve profiles + liked post IDs in parallel — eliminates per-card like queries
    let postsWithProfiles: any[] = [];
    if (posts && posts.length > 0) {
        const postIds = posts.map((p: any) => p.id);
        const userIds = Array.from(new Set(posts.map((p: any) => p.user_id).filter(Boolean)));

        const [profilesResult, likesResult] = await Promise.all([
            userIds.length > 0
                ? supabaseAdmin.from('profiles').select('id, username, avatar_url').in('id', userIds as string[])
                : Promise.resolve({ data: [] }),
            user
                ? supabase.from('social_likes').select('post_id').eq('user_id', user.id).in('post_id', postIds)
                : Promise.resolve({ data: [] }),
        ]);

        const profileMap = new Map((profilesResult.data ?? []).map((p: any) => [p.id, p]));
        const likedSet = new Set((likesResult.data ?? []).map((l: any) => l.post_id));

        postsWithProfiles = posts.map((post: any) => ({
            ...post,
            profiles: post.user_id ? profileMap.get(post.user_id) : null,
            comments_count: post.social_comments?.length ?? 0,
            is_liked_by_user: likedSet.has(post.id),
        }));
    }

    if (!posts || posts.length === 0) {
        return (
            <Card className="text-center py-10">
                <CardContent>
                    <p className="text-muted-foreground mb-4">No posts yet. Be the first to start a conversation!</p>
                    <Button asChild>
                        <Link href="/community/create">Create a Post</Link>
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {postsWithProfiles.map((post) => (
                <PostCard key={post.id} post={post} currentUserId={user?.id} />
            ))}
        </div>
    );
}

export default function CommunityPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Community Feed</h1>
                <Button asChild>
                    <Link href="/community/create">Create Post</Link>
                </Button>
            </div>

            <Suspense fallback={<div className="text-center py-10">Loading community...</div>}>
                <Feed />
            </Suspense>
        </div>
    );
}
