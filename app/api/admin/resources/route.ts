import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/guard';

const FIELDS = [
    'title', 'description', 'category', 'file_url', 'resource_type', 'topic',
    'county', 'governance_sector', 'sdg', 'summary', 'policy_references', 'is_youth_kb',
] as const;

function sanitize(body: Record<string, unknown>) {
    const out: Record<string, unknown> = {};
    for (const f of FIELDS) if (body[f] !== undefined) out[f] = body[f];
    return out;
}

export async function POST(req: NextRequest) {
    const auth = await requireAdmin();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const fields = sanitize(body);
    if (typeof fields.title !== 'string' || !fields.title.trim()) {
        return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const { data, error } = await auth.supabase.from('social_law_resources').insert(fields).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ resource: data });
}

export async function PATCH(req: NextRequest) {
    const auth = await requireAdmin();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown> & { id?: string };
    const id = body.id ?? req.nextUrl.searchParams.get('id') ?? undefined;
    if (!id) return NextResponse.json({ error: 'Resource id is required' }, { status: 400 });

    const fields = sanitize(body);
    if (fields.title !== undefined && (typeof fields.title !== 'string' || !fields.title.trim())) {
        return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
    }

    const { data, error } = await auth.supabase.from('social_law_resources').update(fields).eq('id', id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ resource: data });
}

export async function DELETE(req: NextRequest) {
    const auth = await requireAdmin();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = (await req.json().catch(() => ({}))) as { id?: string };
    const id = body.id ?? req.nextUrl.searchParams.get('id') ?? undefined;
    if (!id) return NextResponse.json({ error: 'Resource id is required' }, { status: 400 });

    const { error } = await auth.supabase.from('social_law_resources').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
}
