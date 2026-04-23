import type { NextRequest } from 'next/server';
import { updateSession } from '@/app/utils/supabase/middleware';

export async function middleware(request: NextRequest) {
    return updateSession(request);
}

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/courses/:path*',
        '/my-learning/:path*',
        '/instructor/:path*',
        '/profile/:path*',
        '/settings/:path*',
        '/messages/:path*',
        '/complete-profile/:path*',
        '/lms/:path*',
        '/bookmarks/:path*',
        '/impact-map/:path*',
        '/community/:path*',
    ],
};
