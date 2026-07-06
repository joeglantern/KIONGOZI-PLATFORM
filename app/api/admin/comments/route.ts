import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/guard';

// Delete a poll comment (moderation).
export async function DELETE(req: NextRequest) {
    const auth = await requireAdmin();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = (await req.json().catch(() => ({}))) as { id?: string };
    const id = body.id ?? req.nextUrl.searchParams.get('id') ?? undefined;
    if (!id) return NextResponse.json({ error: 'Comment id is required' }, { status: 400 });

    const { error } = await auth.supabase.from('poll_comments').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
}
