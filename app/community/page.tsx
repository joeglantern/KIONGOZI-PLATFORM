import { createClient as createSupabaseServer } from '@/app/utils/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { Suspense } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import PostCard from '@/components/social/PostCard';
import { PenSquare, Loader2 } from 'lucide-react';

async function Feed() {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    const fallbackKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        fallbackKey!
    );

    const { data: posts, error } = await supabase
        .from('social_posts')
        .select(`*, social_topics(name, slug), social_comments(id)`)
        .order('created_at', { ascending: false })
        .limit(30);

    if (error) {
        console.error('Error fetching posts:', error.message);
        return <p className="text-center py-10 text-destructive text-sm">Failed to load posts. Please try again.</p>;
    }

    if (!posts || posts.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-border/50 shadow-sm text-center py-16 px-8">
                <p className="text-2xl font-bold text-foreground mb-2">Nothing here yet</p>
                <p className="text-muted-foreground text-sm mb-6">Be the first to spark a conversation in your community.</p>
                <Button asChild className="bg-civic-green hover:bg-civic-green-dark text-white">
                    <Link href="/community/create">
                        <PenSquare className="mr-2 h-4 w-4" />
                        Create First Post
                    </Link>
                </Button>
            </div>
        );
    }

    let postsWithProfiles: any[] = [];
    const postIds = posts.map((p: any) => p.id);
    const userIds = Array.from(new Set(posts.map((p: any) => p.user_id).filter(Boolean)));

    const [profilesResult, likesResult] = await Promise.all([
        userIds.length > 0
            ? supabaseAdmin.from('profiles').select('id, username, full_name, first_name, last_name, avatar_url').in('id', userIds as string[])
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

    return (
        <div className="space-y-3">
            {postsWithProfiles.map((post) => (
                <PostCard key={post.id} post={post} currentUserId={user?.id} />
            ))}
        </div>
    );
}

export default async function CommunityPage() {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    return (
        <div className="space-y-4">
            {/* Compose prompt */}
            <Link href="/community/create" className="block">
                <div className="bg-white rounded-2xl border border-border/40 shadow-sm px-5 py-4 flex items-center gap-3 hover:border-civic-green/40 hover:shadow-md transition-all cursor-pointer group">
                    <div className="w-9 h-9 rounded-full bg-civic-green/10 flex items-center justify-center shrink-0">
                        <PenSquare className="h-4 w-4 text-civic-green" />
                    </div>
                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors flex-1">
                        {user ? "What's happening in your community?" : 'Share a thought or question…'}
                    </span>
                    <span className="text-xs font-semibold text-civic-green border border-civic-green/30 rounded-full px-3 py-1 group-hover:bg-civic-green group-hover:text-white transition-all">
                        Post
                    </span>
                </div>
            </Link>

            {/* Feed */}
            <Suspense fallback={
                <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Loading feed…</span>
                </div>
            }>
                <Feed />
            </Suspense>
        </div>
    );
}
