import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import WelcomeEmail from '@/app/emails/WelcomeEmail';
import { createClient } from '@/app/utils/supabase/server';
import { rateLimit } from '@/lib/rate-limit';

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder');

export async function POST(request: NextRequest) {
    try {
        // Require an authenticated session — closes the anonymous mass-mail hole.
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // A few welcome emails per user per hour is plenty.
        const limit = rateLimit(`welcome:${user.id}`, 3, 60 * 60 * 1000);
        if (!limit.success) {
            return NextResponse.json(
                { error: 'Too many requests' },
                { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
            );
        }

        const body = await request.json().catch(() => ({}));
        const { firstName } = body ?? {};

        // Only ever send to the authenticated user's own address — the recipient
        // is never taken from the request body.
        const email = user.email;
        if (!email) {
            return NextResponse.json({ error: 'No email on account' }, { status: 400 });
        }

        const data = await resend.emails.send({
            from: 'Kiongozi Platform <hello@kiongozi.org>', // Must be a verified domain in Resend
            to: [email],
            subject: 'Welcome to Kiongozi! 🇰🇪',
            react: WelcomeEmail({ firstName }),
        });

        return NextResponse.json(data);
    } catch (error) {
        console.error('Welcome email error:', error);
        return NextResponse.json({ error: 'Failed to send welcome email' }, { status: 500 });
    }
}
