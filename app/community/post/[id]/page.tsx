import { createClient } from '@/app/utils/supabase/server';
import { notFound } from 'next/navigation';
import PostCard from '@/components/social/PostCard';
import CommentSection from '@/components/social/CommentSection';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';


// NextJS 15 - params is async
export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    // Get current user for like functionality checking
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch the post
    const { data: post, error } = await supabase
        .from('social_posts')
        .select(`
      *,
      profiles:user_id (
        full_name
      ),
      social_topics (
        name,
        slug
      )
    `)
        .eq('id', id)
        .single();

    if (error || !post) {
        console.error("Error fetching post:", error);
        notFound();
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/community">
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Back to Feed
                    </Link>
                </Button>
            </div>

            <PostCard post={post} currentUserId={user?.id} />

            <div className="pl-2 md:pl-4 border-l-2 border-muted ml-4 md:ml-6">
                <CommentSection postId={post.id} currentUser={user} />
            </div>
        </div>
    );
}
