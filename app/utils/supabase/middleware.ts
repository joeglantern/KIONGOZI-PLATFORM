import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getCookieDomain } from "./cookie-domain";

// Route prefixes that require an authenticated session. Unauthenticated
// requests to these are redirected to /login server-side (no content flash).
// Role-specific gating (admin/instructor) happens in those areas' layouts.
// Note: /courses, /community and /impact-map are intentionally excluded so any
// public content there keeps working; their pages guard themselves.
const PROTECTED_PREFIXES = [
    '/dashboard',
    '/my-learning',
    '/profile',
    '/settings',
    '/messages',
    '/complete-profile',
    '/onboarding',
    '/missions',
    '/lms',
    '/bookmarks',
    '/instructor',
    '/admin',
];

function isProtectedPath(pathname: string): boolean {
    return PROTECTED_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
}

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
                        const domain = getCookieDomain();
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
    const { data: { session } } = await supabase.auth.getSession();

    // Server-side gate: bounce unauthenticated requests to protected areas to
    // /login with a ?next= so they return after signing in.
    if (!session && isProtectedPath(request.nextUrl.pathname)) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);
        return NextResponse.redirect(loginUrl);
    }

    return response;
}
