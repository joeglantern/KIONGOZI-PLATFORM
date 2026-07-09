import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/guard';
import { approveQueueItem, rejectQueueItem, runBotEngagement } from '@/lib/bot-engagement/engine';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    const auth = await requireAdmin();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const status = request.nextUrl.searchParams.get('status') || 'drafted';
    const limit = Math.max(1, Math.min(Number(request.nextUrl.searchParams.get('limit') || 50), 100));

    const { data, error } = await auth.supabase
        .from('bot_engagement_queue')
        .select(`
            *,
            profiles:persona_user_id (
                full_name,
                username,
                county,
                learning_interests,
                focus_path
            )
        `)
        .eq('status', status)
        .order('scheduled_for', { ascending: false })
        .limit(limit);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ items: data || [] });
}

export async function PATCH(request: NextRequest) {
    const auth = await requireAdmin();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await request.json().catch(() => ({}));
    const id = body.id as string | undefined;
    const action = body.action as 'approve' | 'reject' | undefined;

    if (!id || !action) {
        return NextResponse.json({ error: 'id and action are required' }, { status: 400 });
    }

    try {
        if (action === 'approve') await approveQueueItem(auth.supabase, id);
        if (action === 'reject') await rejectQueueItem(auth.supabase, id);
        return NextResponse.json({ ok: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Queue update failed' }, { status: 400 });
    }
}

export async function POST(request: NextRequest) {
    const auth = await requireAdmin();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await request.json().catch(() => ({}));
    const mode = body.mode === 'publish_approved' || body.mode === 'auto_publish' || body.mode === 'draft'
        ? body.mode
        : 'publish_approved';

    try {
        const result = await runBotEngagement(createServiceClient(), {
            mode,
            limit: Number(body.limit || 10),
            planIfEmpty: body.planIfEmpty,
        });
        return NextResponse.json({ ok: true, ...result });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Bot engagement run failed' }, { status: 500 });
    }
}
