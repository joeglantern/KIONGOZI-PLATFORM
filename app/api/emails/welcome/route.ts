import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import WelcomeEmail from '@/app/emails/WelcomeEmail';
import { rateLimit, tooManyRequests } from '@/lib/rate-limit';
import { requireUser } from '@/lib/auth/guard';

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder');

export async function POST(request: NextRequest) {
    try {
        // Require an authenticated session, closes the anonymous mass-mail hole.
        const gate = await requireUser();
        if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
        const { user } = gate;

        // A few welcome emails per user per hour is plenty.
        const limit = rateLimit(`welcome:${user.id}`, 3, 60 * 60 * 1000);
        if (!limit.success) return tooManyRequests(limit);

        const body = await request.json().catch(() => ({}));
        const { firstName } = body ?? {};

        // Only ever send to the authenticated user's own address, the recipient
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
