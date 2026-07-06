import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/guard';

const QUESTION_TYPES = ['single_choice', 'multiple_choice', 'scale', 'text'];
const CHOICE_TYPES = ['single_choice', 'multiple_choice'];

// Create a poll question and (for choice questions) its options atomically.
// If option insertion fails, the question is rolled back so no orphan remains.
export async function POST(req: NextRequest) {
    const auth = await requireAdmin();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const {
        poll_id, question_text, question_type, question_order,
        why_important, relation_context, expected_action, options,
    } = body ?? {};

    if (!poll_id || typeof poll_id !== 'string') {
        return NextResponse.json({ error: 'poll_id is required' }, { status: 400 });
    }
    if (typeof question_text !== 'string' || !question_text.trim()) {
        return NextResponse.json({ error: 'Question text is required' }, { status: 400 });
    }
    if (typeof question_type !== 'string' || !QUESTION_TYPES.includes(question_type)) {
        return NextResponse.json({ error: 'Invalid question type' }, { status: 400 });
    }

    // RLS restricts poll_questions inserts to the parent poll's owner.
    const { data: question, error: qErr } = await auth.supabase
        .from('poll_questions')
        .insert({
            poll_id,
            question_text,
            question_type,
            question_order: Number(question_order) || 0,
            why_important: why_important || null,
            relation_context: relation_context || null,
            expected_action: expected_action || null,
        })
        .select()
        .single();

    if (qErr) return NextResponse.json({ error: qErr.message }, { status: 400 });

    if (CHOICE_TYPES.includes(question_type) && typeof options === 'string' && options.trim()) {
        const optionRows = options
            .split(',')
            .map((o) => o.trim())
            .filter(Boolean)
            .map((text, idx) => ({ question_id: question.id, option_text: text, option_order: idx }));

        if (optionRows.length > 0) {
            const { error: optErr } = await auth.supabase.from('poll_options').insert(optionRows);
            if (optErr) {
                // Compensating delete — don't leave a question with no options.
                await auth.supabase.from('poll_questions').delete().eq('id', question.id);
                return NextResponse.json({ error: optErr.message }, { status: 400 });
            }
        }
    }

    return NextResponse.json({ question });
}
