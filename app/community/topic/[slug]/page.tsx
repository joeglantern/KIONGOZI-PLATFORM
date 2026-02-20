import { createClient as createSupabaseServer } from '@/app/utils/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import PostCard from '@/components/social/PostCard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

// NextJS 15 - params is async
export default async function TopicPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    // Admin client for profile lookups
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get topic details
    const { data: topic } = await supabase
        .from('social_topics')
        .select('*')
        .eq('slug', slug)
        .single();

    if (!topic) {
        notFound();
    }

    // Fetch posts for this topic with comment counts
    const { data: posts, error } = await supabase
        .from('social_posts')
        .select(`
      *,
      social_topics (
        name,
        slug
      ),
      social_comments (
        count
      )
    `)
        .eq('topic_id', topic.id)
        .order('created_at', { ascending: false });

    // Fetch profiles separately to bypass RLS join limits for guests
    let postsWithProfiles = [];
    if (posts && posts.length > 0) {
        const userIds = Array.from(new Set(posts.map(p => p.user_id).filter(Boolean)));

        const { data: profiles } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]));

        postsWithProfiles = posts.map(post => ({
            ...post,
            profiles: post.user_id ? profileMap.get(post.user_id) : null,
            comments_count: post.social_comments?.[0]?.count || 0
        }));
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/community">
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{topic.name}</h1>
                    <p className="text-muted-foreground">{topic.description}</p>
                </div>
            </div>

            <div className="space-y-4">
                {postsWithProfiles.length > 0 ? (
                    postsWithProfiles.map((post) => (
                        <PostCard key={post.id} post={post} currentUserId={user?.id} />
                    ))
                ) : (
                    <Card className="text-center py-10">
                        <CardContent>
                            <p className="text-muted-foreground mb-4">No posts in this topic yet.</p>
                            <Button asChild>
                                <Link href="/community/create">Start the discussion</Link>
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
