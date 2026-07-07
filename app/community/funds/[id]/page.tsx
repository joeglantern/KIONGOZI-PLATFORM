import { createClient } from '@/app/utils/supabase/server';
import { notFound } from 'next/navigation';
import FundDetailClient from './FundDetailClient';

export default async function FundDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: fund } = await supabase.from('public_funds').select('*').eq('id', id).single();
    if (!fund) notFound();

    const [
        { data: allocations }, { data: disbursements }, { data: commentsRaw },
        currentUserProfileResult, { data: accountabilityQuestions }, { data: accountabilityResponsesRaw },
        { data: publishedBrief }, ownDraftBriefResult,
    ] = await Promise.all([
        supabase.from('fund_allocations').select('*').eq('fund_id', fund.id).order('created_at'),
        supabase.from('fund_disbursements').select('*').eq('fund_id', fund.id).order('disbursement_date', { ascending: false }),
        supabase.from('fund_comments').select('*').eq('fund_id', fund.id).order('created_at', { ascending: false }),
        user ? supabase.from('profiles').select('id, full_name, avatar_url').eq('id', user.id).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from('fund_accountability_questions').select('*').order('question_order'),
        supabase.from('fund_accountability_responses').select('*').eq('fund_id', fund.id).order('created_at', { ascending: false }),
        supabase.from('fund_briefs').select('*').eq('fund_id', fund.id).eq('status', 'published').maybeSingle(),
        user
            ? supabase.from('fund_briefs').select('*').eq('fund_id', fund.id).eq('generated_by', user.id).eq('status', 'draft').order('created_at', { ascending: false }).limit(1).maybeSingle()
            : Promise.resolve({ data: null }),
    ]);

    // Manually join profiles since these tables reference profiles but
    // PostgREST embedding isn't relied on here (kept consistent with the
    // existing comments join below).
    const commenterIds = [...new Set((commentsRaw ?? []).map((c: any) => c.user_id).filter(Boolean))];
    const responderIds = [...new Set((accountabilityResponsesRaw ?? []).map((r: any) => r.user_id).filter(Boolean))];
    const allProfileIds = [...new Set([...commenterIds, ...responderIds])];
    const { data: allProfiles } = allProfileIds.length > 0
        ? await supabase.from('profiles').select('id, full_name, avatar_url').in('id', allProfileIds)
        : { data: [] };
    const profileMap = new Map((allProfiles ?? []).map((p: any) => [p.id, p]));

    const comments = (commentsRaw ?? []).map((c: any) => ({
        ...c,
        profiles: c.user_id ? (profileMap.get(c.user_id) ?? null) : null,
    }));
    const accountabilityResponses = (accountabilityResponsesRaw ?? []).map((r: any) => ({
        ...r,
        profiles: r.user_id ? (profileMap.get(r.user_id) ?? null) : null,
    }));

    const activeBrief = publishedBrief ?? (ownDraftBriefResult as any).data ?? null;

    return (
        <FundDetailClient
            fund={fund}
            allocations={allocations ?? []}
            disbursements={disbursements ?? []}
            comments={comments}
            user={user}
            currentUserProfile={(currentUserProfileResult as any).data ?? null}
            accountabilityQuestions={accountabilityQuestions ?? []}
            accountabilityResponses={accountabilityResponses}
            activeBrief={activeBrief}
        />
    );
}
