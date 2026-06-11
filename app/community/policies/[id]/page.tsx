import { createClient } from '@/app/utils/supabase/server';
import { notFound } from 'next/navigation';
import PolicyDetailClient from './PolicyDetailClient';

export default async function PolicyDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch policy
    const { data: policy } = await supabase
        .from('policies')
        .select('*')
        .eq('id', id)
        .single();

    if (!policy) notFound();

    return (
        <PolicyDetailClient 
            policy={policy} 
            currentUser={user} 
        />
    );
}
