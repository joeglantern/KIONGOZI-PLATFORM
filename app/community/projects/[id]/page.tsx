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

    const [{ data: updatesRaw }, { data: media }, followResult, currentUserProfileResult] = await Promise.all([
        supabase
            .from('project_updates')
            .select('*, project_update_upvotes(user_id)')
            .eq('project_id', project.id)
            .order('created_at', { ascending: false }),
        supabase
            .from('project_media')
            .select('*')
            .eq('project_id', project.id)
            .order('created_at', { ascending: false })
            .limit(12),
        user
            ? supabase.from('project_follows').select('id').eq('project_id', project.id).eq('user_id', user.id).maybeSingle()
            : Promise.resolve({ data: null }),
        user
            ? supabase.from('profiles').select('id, full_name, avatar_url').eq('id', user.id).maybeSingle()
            : Promise.resolve({ data: null }),
    ]);

    // Manually join profiles since project_updates.submitted_by has no FK to profiles
    const submitterIds = [...new Set((updatesRaw ?? []).map((u: any) => u.submitted_by).filter(Boolean))];
    const { data: updateProfiles } = submitterIds.length > 0
        ? await supabase.from('profiles').select('id, full_name, avatar_url').in('id', submitterIds)
        : { data: [] };
    const profileMap = new Map((updateProfiles ?? []).map((p: any) => [p.id, p]));
    const updates = (updatesRaw ?? []).map((u: any) => ({
        ...u,
        profiles: u.submitted_by ? (profileMap.get(u.submitted_by) ?? null) : null,
    }));

    const isFollowing = !!(followResult as any).data;

    return (
        <ProjectDetailClient
            project={project}
            updates={updates}
            media={media ?? []}
            user={user}
            isFollowing={isFollowing}
            currentUserProfile={(currentUserProfileResult as any).data ?? null}
        />
    );
}
