import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    response = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) => {
                        const domain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined;
                        response.cookies.set(name, value, { ...options, domain });
                    });
                },
            },
        }
    );

    // getSession() reads from cookies and refreshes expired tokens locally —
    // no network call to Supabase, so it never hits the auth rate limit.
    // getUser() (network call) belongs in individual server components/routes
    // that need to verify the token server-side.
    await supabase.auth.getSession();

    return response;
}
