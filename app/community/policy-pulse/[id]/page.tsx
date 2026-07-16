import { createClient } from '@/app/utils/supabase/server';
import { getCurrentUser } from '@/lib/auth/current-user';
import { notFound } from 'next/navigation';
import PollViewer from './PollViewer';

export default async function PollPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();
    const user = await getCurrentUser();

    const { data: poll } = await supabase
        .from('policy_polls')
        .select('*')
        .eq('id', id)
        .single();

    if (!poll) notFound();

    const { data: questions } = await supabase
        .from('poll_questions')
        .select('*, poll_options(*)')
        .eq('poll_id', poll.id)
        .order('question_order');

    let hasSubmitted = false;

    if (user) {
        const { data: submission } = await supabase
            .from('poll_submissions')
            .select('id')
            .eq('poll_id', poll.id)
            .eq('user_id', user.id)
            .maybeSingle();

        hasSubmitted = !!submission;
    }

    const isClosed = poll.status === 'closed' || (poll.closes_at && new Date(poll.closes_at) < new Date());

    return (
        <PollViewer
            poll={poll}
            questions={questions ?? []}
            user={user}
            hasSubmitted={hasSubmitted || !!isClosed}
            isClosed={!!isClosed}
        />
    );
}
