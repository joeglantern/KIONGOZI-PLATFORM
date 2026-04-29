import { createClient } from '@/app/utils/supabase/server';
import { notFound } from 'next/navigation';
import PollViewer from './PollViewer';

export default async function PollPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

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
    let myResponses: Record<string, any> = {};

    if (user) {
        const { data: submission } = await supabase
            .from('poll_submissions')
            .select('id')
            .eq('poll_id', poll.id)
            .eq('user_id', user.id)
            .single();

        hasSubmitted = !!submission;

        if (hasSubmitted) {
            const { data: responses } = await supabase
                .from('poll_responses')
                .select('*')
                .eq('poll_id', poll.id)
                .eq('user_id', user.id);

            responses?.forEach(r => { myResponses[r.question_id] = r; });
        }
    }

    const isClosed = poll.status === 'closed' || (poll.closes_at && new Date(poll.closes_at) < new Date());

    return (
        <PollViewer
            poll={poll}
            questions={questions ?? []}
            user={user}
            hasSubmitted={hasSubmitted || !!isClosed}
            myResponses={myResponses}
            isClosed={!!isClosed}
        />
    );
}
