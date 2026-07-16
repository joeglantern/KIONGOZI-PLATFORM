import { createClient } from '@/app/utils/supabase/server';
import { getCurrentUser } from '@/lib/auth/current-user';
import { notFound } from 'next/navigation';
import ProgrammeDetailClient from './ProgrammeDetailClient';

export default async function ProgrammeDetailPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const supabase = await createClient();
    const user = await getCurrentUser();

    const { data: programme } = await supabase.from('civic_programmes').select('*').eq('slug', slug).single();
    if (!programme) notFound();

    const [
        { data: questions }, { data: responsesRaw }, { data: publishedBrief }, ownDraftBriefResult,
    ] = await Promise.all([
        supabase.from('civic_programme_questions').select('*').eq('programme_id', programme.id).order('question_order'),
        supabase.from('civic_programme_responses').select('*').eq('programme_id', programme.id).order('created_at', { ascending: false }),
        supabase.from('programme_briefs').select('*').eq('programme_id', programme.id).eq('status', 'published').maybeSingle(),
        user
            ? supabase.from('programme_briefs').select('*').eq('programme_id', programme.id).eq('generated_by', user.id).eq('status', 'draft').order('created_at', { ascending: false }).limit(1).maybeSingle()
            : Promise.resolve({ data: null }),
    ]);

    const responderIds = [...new Set((responsesRaw ?? []).map((r: any) => r.user_id).filter(Boolean))];
    const { data: profiles } = responderIds.length > 0
        ? await supabase.from('profiles').select('id, full_name, avatar_url').in('id', responderIds)
        : { data: [] };
    const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    const responses = (responsesRaw ?? []).map((r: any) => ({
        ...r,
        profiles: r.user_id ? (profileMap.get(r.user_id) ?? null) : null,
    }));

    const activeBrief = publishedBrief ?? (ownDraftBriefResult as any).data ?? null;

    return (
        <ProgrammeDetailClient
            programme={programme}
            questions={questions ?? []}
            responses={responses}
            user={user}
            activeBrief={activeBrief}
        />
    );
}
