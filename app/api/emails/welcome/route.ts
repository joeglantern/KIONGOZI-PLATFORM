import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import WelcomeEmail from '@/app/emails/WelcomeEmail';

// This would typically be stored in your .env
const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder');

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, firstName } = body;

        if (!email) {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            );
        }

        const data = await resend.emails.send({
            from: 'Kiongozi Platform <hello@kiongozi.org>', // Must be a verified domain in Resend
            to: [email],
            subject: 'Welcome to Kiongozi! 🇰🇪',
            react: WelcomeEmail({ firstName }),
        });

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error }, { status: 500 });
    }
}
