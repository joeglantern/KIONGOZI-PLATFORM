import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/guard';

const CATEGORIES = ['Governance', 'Environment', 'Economy', 'Education', 'Health', 'Technology', 'Other'];
const STATUSES = ['active', 'draft', 'closed'];

const POLL_FIELDS = [
    'title', 'description', 'category', 'status', 'closes_at',
    'what_context', 'why_context', 'how_context', 'impact_context',
] as const;

type PollPayload = Partial<Record<(typeof POLL_FIELDS)[number], unknown>>;

/** Keep only known poll columns; coerce empty closes_at to null. */
function sanitize(body: PollPayload) {
    const out: Record<string, unknown> = {};
    for (const field of POLL_FIELDS) {
        if (body[field] !== undefined) out[field] = body[field];
    }
    if (out.closes_at === '') out.closes_at = null;
    return out;
}

function validate(fields: Record<string, unknown>): string | null {
    if (typeof fields.title !== 'string' || !fields.title.trim()) return 'Title is required';
    if (fields.category !== undefined && !CATEGORIES.includes(String(fields.category))) return 'Invalid category';
    if (fields.status !== undefined && !STATUSES.includes(String(fields.status))) return 'Invalid status';
    return null;
}

// Create a poll.
export async function POST(req: NextRequest) {
    const auth = await requireAdmin();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = (await req.json().catch(() => ({}))) as PollPayload;
    const fields = sanitize(body);
    const invalid = validate(fields);
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

    // created_by must equal auth.uid() to satisfy RLS.
    const { data, error } = await auth.supabase
        .from('policy_polls')
        .insert({ ...fields, created_by: auth.userId })
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ poll: data });
}

// Update a poll by id (?id= or body.id).
export async function PATCH(req: NextRequest) {
    const auth = await requireAdmin();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = (await req.json().catch(() => ({}))) as PollPayload & { id?: string };
    const id = body.id ?? req.nextUrl.searchParams.get('id') ?? undefined;
    if (!id) return NextResponse.json({ error: 'Poll id is required' }, { status: 400 });

    const fields = sanitize(body);
    const invalid = validate(fields);
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

    const { data, error } = await auth.supabase
        .from('policy_polls')
        .update(fields)
        .eq('id', id)
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ poll: data });
}

// Delete a poll by id (?id= or body.id).
export async function DELETE(req: NextRequest) {
    const auth = await requireAdmin();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = (await req.json().catch(() => ({}))) as { id?: string };
    const id = body.id ?? req.nextUrl.searchParams.get('id') ?? undefined;
    if (!id) return NextResponse.json({ error: 'Poll id is required' }, { status: 400 });

    const { error } = await auth.supabase.from('policy_polls').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
}
