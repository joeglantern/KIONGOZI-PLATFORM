import { NextRequest, NextResponse } from 'next/server';
import { runBotEngagement } from '@/lib/bot-engagement/engine';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function isAuthorized(request: NextRequest) {
    const secret = process.env.BOT_ENGAGEMENT_CRON_SECRET || process.env.CRON_SECRET;

    if (!secret && process.env.NODE_ENV !== 'production') return true;
    if (!secret) return false;

    const auth = request.headers.get('authorization');
    const headerSecret = request.headers.get('x-cron-secret');
    return auth === `Bearer ${secret}` || headerSecret === secret;
}

export async function GET(request: NextRequest) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();
    const limit = Number(request.nextUrl.searchParams.get('limit') || process.env.BOT_ENGAGEMENT_RUN_LIMIT || 5);
    const modeParam = request.nextUrl.searchParams.get('mode');
    const mode = modeParam === 'auto_publish' || modeParam === 'publish_approved' || modeParam === 'draft'
        ? modeParam
        : undefined;

    try {
        const result = await runBotEngagement(supabase, { limit, mode });
        return NextResponse.json({ ok: true, ...result });
    } catch (error: any) {
        console.error('[bot-engagement-cron]', error);
        return NextResponse.json({ error: error.message || 'Bot engagement failed' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const supabase = createServiceClient();

    try {
        const result = await runBotEngagement(supabase, {
            limit: Number(body.limit || process.env.BOT_ENGAGEMENT_RUN_LIMIT || 5),
            mode: body.mode,
            planIfEmpty: body.planIfEmpty,
        });
        return NextResponse.json({ ok: true, ...result });
    } catch (error: any) {
        console.error('[bot-engagement-cron]', error);
        return NextResponse.json({ error: error.message || 'Bot engagement failed' }, { status: 500 });
    }
}
