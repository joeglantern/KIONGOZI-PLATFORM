import { createClient } from '@/app/utils/supabase/server';
import { notFound } from 'next/navigation';
import FundDetailClient from './FundDetailClient';

export default async function FundDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: fund } = await supabase.from('public_funds').select('*').eq('id', id).single();
    if (!fund) notFound();

    const [{ data: allocations }, { data: disbursements }, { data: comments }] = await Promise.all([
        supabase.from('fund_allocations').select('*').eq('fund_id', fund.id).order('created_at'),
        supabase.from('fund_disbursements').select('*').eq('fund_id', fund.id).order('disbursement_date', { ascending: false }),
        supabase.from('fund_comments').select('*, profiles(full_name, avatar_url)').eq('fund_id', fund.id).order('created_at', { ascending: false }),
    ]);

    return (
        <FundDetailClient
            fund={fund}
            allocations={allocations ?? []}
            disbursements={disbursements ?? []}
            comments={comments ?? []}
            user={user}
        />
    );
}
