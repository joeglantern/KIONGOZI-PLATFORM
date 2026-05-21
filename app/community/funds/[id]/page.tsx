import { createClient } from '@/app/utils/supabase/server';
import { notFound } from 'next/navigation';
import FundDetailClient from './FundDetailClient';

export default async function FundDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: fund } = await supabase.from('public_funds').select('*').eq('id', id).single();
    if (!fund) notFound();

    const [{ data: allocations }, { data: disbursements }, { data: commentsRaw }, currentUserProfileResult] = await Promise.all([
        supabase.from('fund_allocations').select('*').eq('fund_id', fund.id).order('created_at'),
        supabase.from('fund_disbursements').select('*').eq('fund_id', fund.id).order('disbursement_date', { ascending: false }),
        supabase.from('fund_comments').select('*').eq('fund_id', fund.id).order('created_at', { ascending: false }),
        user ? supabase.from('profiles').select('id, full_name, avatar_url').eq('id', user.id).maybeSingle() : Promise.resolve({ data: null }),
    ]);

    // Manually join profiles since fund_comments.user_id has no FK to profiles
    const commenterIds = [...new Set((commentsRaw ?? []).map((c: any) => c.user_id).filter(Boolean))];
    const { data: commentProfiles } = commenterIds.length > 0
        ? await supabase.from('profiles').select('id, full_name, avatar_url').in('id', commenterIds)
        : { data: [] };
    const profileMap = new Map((commentProfiles ?? []).map((p: any) => [p.id, p]));
    const comments = (commentsRaw ?? []).map((c: any) => ({
        ...c,
        profiles: c.user_id ? (profileMap.get(c.user_id) ?? null) : null,
    }));

    return (
        <FundDetailClient
            fund={fund}
            allocations={allocations ?? []}
            disbursements={disbursements ?? []}
            comments={comments}
            user={user}
            currentUserProfile={(currentUserProfileResult as any).data ?? null}
        />
    );
}
