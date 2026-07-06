import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/guard';

// Moderate an AI policy brief: approve, publish (also mirrors content onto the
// parent poll), or save edited title/content.
export async function PATCH(req: NextRequest) {
    const auth = await requireAdmin();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = (await req.json().catch(() => ({}))) as {
        id?: string; action?: 'approve' | 'publish' | 'save'; title?: string; content?: string;
    };
    const { id, action } = body;
    if (!id) return NextResponse.json({ error: 'Brief id is required' }, { status: 400 });

    if (action === 'approve') {
        const { error } = await auth.supabase.from('policy_briefs').update({ status: 'approved' }).eq('id', id);
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        return NextResponse.json({ ok: true });
    }

    if (action === 'publish') {
        // Read the brief server-side — never trust client-supplied content here.
        const { data: brief, error: readErr } = await auth.supabase
            .from('policy_briefs')
            .select('poll_id, content')
            .eq('id', id)
            .single();
        if (readErr || !brief) return NextResponse.json({ error: readErr?.message || 'Brief not found' }, { status: 404 });

        const { error: statusErr } = await auth.supabase
            .from('policy_briefs')
            .update({ status: 'published' })
            .eq('id', id);
        if (statusErr) return NextResponse.json({ error: statusErr.message }, { status: 400 });

        if (brief.poll_id) {
            const { error: pollErr } = await auth.supabase
                .from('policy_polls')
                .update({ ai_insights: brief.content, insights_generated_at: new Date().toISOString() })
                .eq('id', brief.poll_id);
            if (pollErr) return NextResponse.json({ error: pollErr.message }, { status: 400 });
        }
        return NextResponse.json({ ok: true });
    }

    if (action === 'save') {
        if (typeof body.title !== 'string' || !body.title.trim()) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }
        const { error } = await auth.supabase
            .from('policy_briefs')
            .update({ title: body.title, content: body.content ?? '' })
            .eq('id', id);
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
