import { NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get('next') ?? '/dashboard';

    if (code) {
        try {
            const supabase = await createClient();
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (!error) {
                const forwardedHost = request.headers.get('x-forwarded-host'); // original origin before load balancer
                const isLocalEnv = origin.startsWith('http://localhost');
                if (isLocalEnv) {
                    return NextResponse.redirect(`${origin}${next}`);
                } else if (forwardedHost) {
                    return NextResponse.redirect(`https://${forwardedHost}${next}`);
                } else {
                    return NextResponse.redirect(`${origin}${next}`);
                }
            }
            console.error('Auth callback error:', error);
        } catch (e) {
            console.error('Auth callback exception:', e);
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
