import { createClient } from '@/app/utils/supabase/server';
import CreatePostForm from '@/components/social/CreatePostForm';
import { redirect } from 'next/navigation';

export default async function CreatePostPage() {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch topics for the dropdown
    const { data: topics, error } = await supabase
        .from('social_topics')
        .select('id, name, slug')
        .order('name');

    if (error) {
        console.error("Error fetching topics:", error);
        // Handle error gracefully or redirect
    }

    return (
        <div className="max-w-2xl mx-auto py-8">
            <CreatePostForm topics={topics || []} user={user} />
        </div>
    );
}
