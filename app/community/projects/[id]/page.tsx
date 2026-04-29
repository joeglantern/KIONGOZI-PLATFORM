import { createClient } from '@/app/utils/supabase/server';
import { notFound } from 'next/navigation';
import ProjectDetailClient from './ProjectDetailClient';

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: project } = await supabase
        .from('public_projects')
        .select('*')
        .eq('id', id)
        .single();

    if (!project) notFound();

    const [{ data: updates }, { data: media }] = await Promise.all([
        supabase
            .from('project_updates')
            .select('*, profiles(full_name, avatar_url), project_update_upvotes(user_id)')
            .eq('project_id', project.id)
            .order('created_at', { ascending: false }),
        supabase
            .from('project_media')
            .select('*')
            .eq('project_id', project.id)
            .order('created_at', { ascending: false })
            .limit(12),
    ]);

    let isFollowing = false;
    if (user) {
        const { data: follow } = await supabase
            .from('project_follows')
            .select('id')
            .eq('project_id', project.id)
            .eq('user_id', user.id)
            .single();
        isFollowing = !!follow;
    }

    return (
        <ProjectDetailClient
            project={project}
            updates={updates ?? []}
            media={media ?? []}
            user={user}
            isFollowing={isFollowing}
        />
    );
}
