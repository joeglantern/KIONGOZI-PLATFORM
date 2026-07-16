import { createClient } from '@/app/utils/supabase/server';
import { getCurrentUser } from '@/lib/auth/current-user';
import PolicyPulseClient from '@/components/social/PolicyPulseClient';

export default async function PolicyPulsePage() {
    const supabase = await createClient();
    const user = await getCurrentUser();

    const { data: polls } = await supabase
        .from('policy_polls')
        .select('*')
        .neq('status', 'draft')
        .order('created_at', { ascending: false })
        .limit(50);

    let submittedPollIds = new Set<string>();
    if (user && polls?.length) {
        const { data: submissions } = await supabase
            .from('poll_submissions')
            .select('poll_id')
            .eq('user_id', user.id)
            .in('poll_id', polls.map(p => p.id));
        submissions?.forEach(s => submittedPollIds.add(s.poll_id));
    }

    return (
        <PolicyPulseClient
            initialPolls={polls || []}
            initialRespondedIds={Array.from(submittedPollIds)}
        />
    );
}
